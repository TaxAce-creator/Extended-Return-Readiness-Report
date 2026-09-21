// =============================================================================
// TaxAce — MFA (TOTP) Router
// Layer 4: Multi-Factor Authentication using TOTP (Google Authenticator compatible)
// - mfa.setup: generate secret + QR code URI
// - mfa.verify: validate TOTP code and enable MFA
// - mfa.disable: admin can disable MFA for any user
// - mfa.validateCode: validate TOTP during login (called after password check)
// =============================================================================

import { z } from "zod";
import * as OTPAuth from "otpauth";
import * as QRCode from "qrcode";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { insertAuditLog } from "../db";
import { decryptMfaSecret, encryptMfaSecret } from "../_core/mfaCrypto";
import {
  createSession,
  parseSessionToken,
  resolveSession,
  revokeSessionByToken,
  sessionCookie,
} from "../_core/sessionManager";

const ISSUER = "TaxAce Group";
const BACKUP_CODE_COUNT = 10;
const BCRYPT_ROUNDS = 10; // Lower rounds for backup codes (they're already random)

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () =>
    crypto.randomBytes(5).toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-")
  );
}

async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(code => bcrypt.hash(code, BCRYPT_ROUNDS)));
}

function createTotp(secret: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

// ── Router ───────────────────────────────────────────────────────────────────

export const mfaRouter = router({
  /**
   * POST /trpc/mfa.setup
   * Generates a new TOTP secret and returns the QR code URI.
   * The secret is NOT saved until mfa.verify is called.
   */
  setup: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

    // Generate a new TOTP secret
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      label: user.email ?? user.name ?? "TaxAce User",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    const secret = totp.secret.base32;
    const uri = totp.toString();

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(uri);

    // Store the pending secret temporarily (will be confirmed by mfa.verify)
    // We store it in the mfaSecret field but mfaEnabled stays false until verified
    await db.update(users).set({ mfaSecret: encryptMfaSecret(secret) }).where(eq(users.id, ctx.user.id));

    return {
      secret,
      uri,
      qrCodeDataUrl,
    };
  }),

  /**
   * POST /trpc/mfa.verify
   * Validates the TOTP code and enables MFA. Returns backup codes.
   */
  verify: protectedProcedure
    .input(z.object({
      code: z.string().length(6, "Code must be 6 digits"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [user] = await db
        .select({ mfaSecret: users.mfaSecret, mfaEnabled: users.mfaEnabled })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user?.mfaSecret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "MFA setup not initiated. Call mfa.setup first." });
      }

      let totp: OTPAuth.TOTP;
      try {
        totp = createTotp(decryptMfaSecret(user.mfaSecret), ctx.user.email ?? "TaxAce User");
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "MFA setup data could not be read. Start setup again or contact an administrator." });
      }

      const delta = totp.validate({ token: input.code, window: 1 });

      if (delta === null) {
        await insertAuditLog({
          userOpenId: ctx.user.openId,
          userName: ctx.user.name ?? undefined,
          action: "user.mfa_failed",
          resource: "auth",
          details: JSON.stringify({ reason: "setup_verification_failed" }),
        });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid verification code. Please try again." });
      }

      // Generate backup codes
      const plainCodes = generateBackupCodes();
      const hashedCodes = await hashBackupCodes(plainCodes);

      await db.update(users).set({
        mfaEnabled: true,
        mfaBackupCodes: JSON.stringify(hashedCodes),
      }).where(eq(users.id, ctx.user.id));

      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? undefined,
        action: "user.mfa_enabled",
        resource: "auth",
        details: JSON.stringify({ email: ctx.user.email }),
      });

      return {
        ok: true,
        backupCodes: plainCodes, // Shown once — user must save these
      };
    }),

  /**
   * POST /trpc/mfa.disable
   * Disables MFA. Admin can disable for any user; user can disable their own.
   */
  disable: protectedProcedure
    .input(z.object({
      userId: z.number().int().positive().optional(), // If omitted, disables own MFA
      currentPassword: z.string().optional(), // Required when disabling own MFA
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const targetId = input.userId ?? ctx.user.id;
      const isSelf = targetId === ctx.user.id;
      const isAdmin = ["admin", "owner"].includes(ctx.user.role);

      // Non-admins can only disable their own MFA
      if (!isSelf && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only disable your own MFA." });
      }

      // When disabling own MFA, require current password as confirmation.
      if (isSelf && !input.currentPassword) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enter your current password to disable two-factor authentication." });
      }
      if (isSelf && input.currentPassword) {
        const [user] = await db
          .select({ passwordHash: users.passwordHash })
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);

        if (user?.passwordHash) {
          const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
          if (!valid) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Password is incorrect." });
          }
        }
      }

      await db.update(users).set({
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
      }).where(eq(users.id, targetId));

      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? undefined,
        action: "user.mfa_disabled",
        resource: "auth",
        details: JSON.stringify({
          targetUserId: targetId,
          disabledBy: ctx.user.email,
          adminOverride: !isSelf,
        }),
      });

      return { ok: true };
    }),

  /**
   * POST /trpc/mfa.validateCode
   * Validates a TOTP code or backup code during the MFA login step.
   * Called after successful password verification.
   */
  validateCode: protectedProcedure
    .input(z.object({
      code: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [user] = await db
        .select({ mfaSecret: users.mfaSecret, mfaEnabled: users.mfaEnabled, mfaBackupCodes: users.mfaBackupCodes })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user?.mfaEnabled || !user.mfaSecret) {
        return { ok: true, usedBackupCode: false }; // MFA not enabled — pass through
      }

      // Try the encrypted TOTP secret first.
      let totp: OTPAuth.TOTP;
      try {
        totp = createTotp(decryptMfaSecret(user.mfaSecret), ctx.user.email ?? "TaxAce User");
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "MFA configuration could not be read. Contact an administrator." });
      }

      const delta = totp.validate({ token: input.code.replace(/\s/g, ""), window: 1 });

      if (delta !== null) {
        return { ok: true, usedBackupCode: false };
      }

      // Try backup codes
      if (user.mfaBackupCodes) {
        const hashedCodes: string[] = JSON.parse(user.mfaBackupCodes);
        for (let i = 0; i < hashedCodes.length; i++) {
          const match = await bcrypt.compare(input.code.replace(/\s/g, ""), hashedCodes[i]);
          if (match) {
            // Consume the backup code (remove it from the list)
            hashedCodes.splice(i, 1);
            await db.update(users).set({
              mfaBackupCodes: JSON.stringify(hashedCodes),
            }).where(eq(users.id, ctx.user.id));

            await insertAuditLog({
              userOpenId: ctx.user.openId,
              userName: ctx.user.name ?? undefined,
              action: "user.mfa_backup_code_used",
              resource: "auth",
              details: JSON.stringify({ remaining: hashedCodes.length }),
            });

            return { ok: true, usedBackupCode: true, remainingBackupCodes: hashedCodes.length };
          }
        }
      }

      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? undefined,
        action: "user.mfa_failed",
        resource: "auth",
        details: JSON.stringify({ reason: "verification_failed" }),
      });
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid authentication code." });
    }),

  /**
   * Completes the post-password MFA challenge. The pending opaque session is
   * revoked and replaced with a new verified session so the session token is
   * rotated at privilege elevation.
   */
  completeLogin: publicProcedure
    .input(z.object({ code: z.string().min(6) }))
    .mutation(async ({ input, ctx }) => {
      const token = parseSessionToken(ctx.req.headers.cookie);
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your sign-in challenge has expired. Please sign in again." });
      const access = await resolveSession(token);
      if (!access || access.mfaVerified || !access.user.mfaEnabled || !access.user.mfaSecret) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Your sign-in challenge has expired. Please sign in again." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [stored] = await db
        .select({ mfaSecret: users.mfaSecret, mfaBackupCodes: users.mfaBackupCodes })
        .from(users)
        .where(eq(users.id, access.user.id))
        .limit(1);
      if (!stored?.mfaSecret) throw new TRPCError({ code: "BAD_REQUEST", message: "MFA configuration is unavailable." });

      let valid = false;
      let usedBackupCode = false;
      try {
        valid = createTotp(decryptMfaSecret(stored.mfaSecret), access.user.email ?? "TaxAce User")
          .validate({ token: input.code.replace(/\s/g, ""), window: 1 }) !== null;
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "MFA configuration could not be read. Contact an administrator." });
      }

      if (!valid && stored.mfaBackupCodes) {
        const codes: string[] = JSON.parse(stored.mfaBackupCodes);
        for (let i = 0; i < codes.length; i++) {
          if (await bcrypt.compare(input.code.replace(/\s/g, ""), codes[i])) {
            codes.splice(i, 1);
            await db.update(users).set({ mfaBackupCodes: JSON.stringify(codes) }).where(eq(users.id, access.user.id));
            valid = true;
            usedBackupCode = true;
            await insertAuditLog({
              userOpenId: access.user.openId,
              userName: access.user.name ?? undefined,
              action: "user.mfa_backup_code_used",
              resource: "auth",
              details: JSON.stringify({ remaining: codes.length, purpose: "login" }),
            });
            break;
          }
        }
      }

      if (!valid) {
        await insertAuditLog({
          userOpenId: access.user.openId,
          userName: access.user.name ?? undefined,
          action: "user.mfa_failed",
          resource: "auth",
          details: JSON.stringify({ reason: "login_challenge_failed" }),
        });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid authentication code." });
      }

      await revokeSessionByToken(token);
      const nextSession = await createSession({
        user: access.user,
        ipAddress: ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0] ?? ctx.req.socket.remoteAddress,
        userAgent: ctx.req.headers["user-agent"]?.toString(),
        mfaVerified: true,
      });
      ctx.res.setHeader("Set-Cookie", sessionCookie(nextSession.token, Math.max(1, Math.floor((nextSession.expiresAt - Date.now()) / 1000))));
      await insertAuditLog({
        userOpenId: access.user.openId,
        userName: access.user.name ?? undefined,
        action: "user.mfa_verified",
        resource: "auth",
        details: JSON.stringify({ usedBackupCode }),
      });
      return { ok: true, usedBackupCode };
    }),

  /**
   * GET /trpc/mfa.getStatus
   * Returns the current user's MFA status.
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { mfaEnabled: false };

    const [user] = await db
      .select({ mfaEnabled: users.mfaEnabled, mfaBackupCodes: users.mfaBackupCodes })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    const backupCodesRemaining = user?.mfaBackupCodes
      ? (JSON.parse(user.mfaBackupCodes) as string[]).length
      : 0;

    return {
      mfaEnabled: user?.mfaEnabled ?? false,
      backupCodesRemaining,
    };
  }),
});
