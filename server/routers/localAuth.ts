// =============================================================================
// TaxAce — Local Email/Password Authentication Router
// Security: taxace-auth-security skill applied
// - Layer 9: Brute force protection (5 failed → 30 min lockout, 10 failed → owner alert)
// - Layer 8: Full audit log for all auth events
// - Layer 7: owner role support (owner treated as super-admin)
// - Layer 3: bcrypt rounds = 12, min password length = 8
// =============================================================================

import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "../_core/env";
import { sendPasswordResetEmail } from "../email";
import { insertAuditLog } from "../db";
import { notifyOwner } from "../_core/notification";
import {
  hashPassword,
  hashResetToken,
  hasRecentlyUsedPassword,
  isPasswordExpired,
  passwordExpiresAt,
  rememberSupersededPassword,
  RESET_TOKEN_EXPIRY_MS,
} from "../_core/passwordSecurity";
import {
  clearSessionCookie,
  createSession,
  listActiveUserSessions,
  parseSessionToken,
  revokeAllUserSessions,
  revokeSessionById,
  revokeSessionByToken,
  sessionCookie,
} from "../_core/sessionManager";

const SESSION_DURATION_HOURS = 8;
const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const OWNER_ALERT_THRESHOLD = 10; // Notify owner after 10 cumulative failures

// ── JWT helpers ──────────────────────────────────────────────────────────────

function getJwtSecret(): Uint8Array {
  const secret = ENV.cookieSecret;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signSessionJwt(userId: number, role: string): Promise<string> {
  return new SignJWT({ sub: String(userId), role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(getJwtSecret());
}

export async function verifySessionJwt(token: string): Promise<{ sub: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as { sub: string; role: string };
  } catch {
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getClientIp(ctx: { req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string } } }): string {
  const forwarded = ctx.req.headers["x-forwarded-for"];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) ?? ctx.req.socket.remoteAddress ?? "unknown";
}

// ── Router ───────────────────────────────────────────────────────────────────

export const localAuthRouter = router({
  /**
   * POST /trpc/localAuth.login
   * Verifies email + password, issues an 8-hour session cookie.
   * Layer 9: Checks lockout, increments failed attempts, locks after 5 failures.
   * Layer 8: Logs user.login and user.login_failed events.
   */
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const ip = getClientIp(ctx as Parameters<typeof getClientIp>[0]);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase().trim()))
        .limit(1);

      // Generic error to prevent email enumeration
      if (!user || !user.passwordHash) {
        await insertAuditLog({
          action: "user.login_failed",
          resource: "auth",
          details: JSON.stringify({ email: input.email, reason: "user_not_found" }),
          ipAddress: ip,
        });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      // Check account lockout
      const now = Date.now();
      if (user.lockedUntil && user.lockedUntil > now) {
        const minutesLeft = Math.ceil((user.lockedUntil - now) / 60000);
        await insertAuditLog({
          userOpenId: user.openId,
          userName: user.name ?? undefined,
          action: "user.login_failed",
          resource: "auth",
          details: JSON.stringify({ reason: "account_locked", lockedUntil: user.lockedUntil }),
          ipAddress: ip,
        });
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Account is locked due to too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
        });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);

      if (!valid) {
        const newFailedCount = (user.failedLoginAttempts ?? 0) + 1;
        const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;
        const lockedUntil = shouldLock ? now + LOCKOUT_DURATION_MS : null;

        await db.update(users).set({
          failedLoginAttempts: newFailedCount,
          lockedUntil: lockedUntil,
        }).where(eq(users.id, user.id));

        await insertAuditLog({
          userOpenId: user.openId,
          userName: user.name ?? undefined,
          action: "user.login_failed",
          resource: "auth",
          details: JSON.stringify({ reason: "wrong_password", attempt: newFailedCount, locked: shouldLock }),
          ipAddress: ip,
        });

        if (shouldLock) {
          await insertAuditLog({
            userOpenId: user.openId,
            userName: user.name ?? undefined,
            action: "user.locked",
            resource: "auth",
            details: JSON.stringify({ attempt: newFailedCount, lockedUntil }),
            ipAddress: ip,
          });
        }

        // Notify owner when threshold is reached
        if (newFailedCount >= OWNER_ALERT_THRESHOLD || shouldLock) {
          notifyOwner({
            title: `⚠️ Security Alert: Account Locked`,
            content: `Account for ${user.email} has been locked after ${newFailedCount} failed login attempts from IP ${ip}.`,
          }).catch(() => {}); // Non-blocking
        }

        if (shouldLock) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Too many failed attempts. Account locked for 30 minutes.`,
          });
        }

        const remaining = MAX_FAILED_ATTEMPTS - newFailedCount;
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Invalid email or password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before lockout.`,
        });
      }

      const requiresPasswordChange = user.mustChangePassword || isPasswordExpired(user);

      // Successful login — reset counters and flag a newly expired password
      // for change before dashboard work begins.
      await db.update(users).set({
        lastSignedIn: new Date(),
        lastLoginIp: ip,
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: requiresPasswordChange,
      }).where(eq(users.id, user.id));

      await insertAuditLog({
        userOpenId: user.openId,
        userName: user.name ?? undefined,
        action: "user.login",
        resource: "auth",
        details: JSON.stringify({ email: user.email, role: user.role }),
        ipAddress: ip,
      });

      const createdSession = await createSession({
        user,
        ipAddress: ip,
        userAgent: ctx.req.headers["user-agent"]?.toString(),
        // MFA-enabled users receive a pending session that cannot access
        // protected procedures until they complete the login challenge.
        mfaVerified: !user.mfaEnabled,
      });

      // Set opaque, HttpOnly session cookie. The database retains only its hash.
      ctx.res.setHeader(
        "Set-Cookie",
        sessionCookie(createdSession.token, Math.max(1, Math.floor((createdSession.expiresAt - Date.now()) / 1000)))
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: requiresPasswordChange,
        mfaRequired: user.mfaEnabled,
      };
    }),

  /**
   * POST /trpc/localAuth.logout
   * Clears the session cookie.
   * Layer 8: Logs user.logout event.
   */
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const ip = getClientIp(ctx as Parameters<typeof getClientIp>[0]);
    const token = parseSessionToken(ctx.req.headers.cookie);
    if (token) await revokeSessionByToken(token);
    await insertAuditLog({
      userOpenId: ctx.user.openId,
      userName: ctx.user.name ?? undefined,
      action: "user.logout",
      resource: "auth",
      details: JSON.stringify({ email: ctx.user.email }),
      ipAddress: ip,
    });
    ctx.res.setHeader(
      "Set-Cookie",
      clearSessionCookie()
    );
    return { ok: true };
  }),

  /**
   * GET /trpc/localAuth.me
   * Returns the currently authenticated user from the session cookie.
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
      mustChangePassword: ctx.user.mustChangePassword,
      mfaEnabled: ctx.user.mfaEnabled,
      passwordChangedAt: ctx.user.passwordChangedAt,
    };
  }),

  /**
   * POST /trpc/localAuth.forgotPassword
   * Generates a reset token and emails it to the user.
   * Layer 8: Logs password_reset_requested event.
   */
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { ok: true };

      const ip = getClientIp(ctx as Parameters<typeof getClientIp>[0]);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase().trim()))
        .limit(1);

      // Always return success to prevent email enumeration
      if (!user) return { ok: true };

      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

      await db.update(users).set({
        resetToken: hashResetToken(token),
        resetTokenExpiry: expiry,
      }).where(eq(users.id, user.id));

      await insertAuditLog({
        userOpenId: user.openId,
        userName: user.name ?? undefined,
        action: "user.password_reset_requested",
        resource: "auth",
        details: JSON.stringify({ email: user.email }),
        ipAddress: ip,
      });

      await sendPasswordResetEmail({
        to: user.email!,
        name: user.name ?? "Team Member",
        token,
      });

      return { ok: true };
    }),

  /**
   * POST /trpc/localAuth.resetPassword
   * Verifies the reset token and sets a new password.
   * Layer 8: Logs password_reset_completed event.
   */
  resetPassword: publicProcedure
    .input(z.object({
      token: z.string().min(1),
      newPassword: z.string().min(12, "Password must contain at least 12 characters"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.resetToken, hashResetToken(input.token)))
        .limit(1);

      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Reset link is invalid or has expired." });
      }

      if (await hasRecentlyUsedPassword(user.id, user.passwordHash, input.newPassword)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a password that has not been used recently." });
      }
      let hash: string;
      try {
        hash = await hashPassword(input.newPassword);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Password does not meet security requirements." });
      }
      await rememberSupersededPassword(user.id, user.passwordHash);
      await revokeAllUserSessions(user.id);

      await db.update(users).set({
        passwordHash: hash,
        resetToken: null,
        resetTokenExpiry: null,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordChangedAt: Date.now(),
      }).where(eq(users.id, user.id));

      await insertAuditLog({
        userOpenId: user.openId,
        userName: user.name ?? undefined,
        action: "user.password_reset_completed",
        resource: "auth",
        details: JSON.stringify({ email: user.email }),
      });

      return { ok: true };
    }),

  /**
   * POST /trpc/localAuth.changePassword
   * Authenticated user changes their own password.
   * Layer 8: Logs password_changed event.
   */
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(12, "Password must contain at least 12 characters"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user?.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No password set on this account." });
      }

      const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
      }

      if (await hasRecentlyUsedPassword(user.id, user.passwordHash, input.newPassword)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a password that has not been used recently." });
      }
      let hash: string;
      try {
        hash = await hashPassword(input.newPassword);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Password does not meet security requirements." });
      }
      await rememberSupersededPassword(user.id, user.passwordHash);
      await db.update(users).set({
        passwordHash: hash,
        mustChangePassword: false,
        passwordChangedAt: Date.now(),
      }).where(eq(users.id, user.id));
      await revokeAllUserSessions(user.id, ctx.sessionId ?? undefined);

      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? undefined,
        action: "user.password_changed",
        resource: "auth",
        details: JSON.stringify({ email: user.email }),
      });

      return { ok: true };
    }),

  /**
   * POST /trpc/localAuth.adminSetPassword
   * Admin sets any user's password and optionally forces a change on next login.
   * Layer 8: Logs password_changed event.
   */
  adminSetPassword: adminProcedure
    .input(z.object({
      userId: z.number().int().positive(),
      newPassword: z.string().min(12, "Password must contain at least 12 characters"),
      mustChangePassword: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [target] = await db
        .select({ id: users.id, email: users.email, openId: users.openId, name: users.name, passwordHash: users.passwordHash, role: users.role })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }
      if (target.role === "owner" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the account owner can reset an owner password." });
      }

      if (await hasRecentlyUsedPassword(target.id, target.passwordHash, input.newPassword)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a password that has not been used recently." });
      }
      let hash: string;
      try {
        hash = await hashPassword(input.newPassword);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Password does not meet security requirements." });
      }
      await rememberSupersededPassword(target.id, target.passwordHash);
      await revokeAllUserSessions(target.id);
      await db.update(users).set({
        passwordHash: hash,
        mustChangePassword: input.mustChangePassword,
        resetToken: null,
        resetTokenExpiry: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordChangedAt: Date.now(),
      }).where(eq(users.id, input.userId));

      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? undefined,
        action: "user.password_changed",
        resource: "auth",
        details: JSON.stringify({ targetEmail: target.email, setBy: ctx.user.email, adminOverride: true }),
      });

      return { ok: true };
    }),

  /**
   * GET /trpc/localAuth.listUsers  (admin only)
   * Returns all users for the team management UI.
   */
  listUsers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      mustChangePassword: users.mustChangePassword,
      failedLoginAttempts: users.failedLoginAttempts,
      lockedUntil: users.lockedUntil,
      mfaEnabled: users.mfaEnabled,
      lastSignedIn: users.lastSignedIn,
      createdAt: users.createdAt,
      passwordChangedAt: users.passwordChangedAt,
    }).from(users).orderBy(users.createdAt);
  }),

  /**
   * POST /trpc/localAuth.updateUserRole  (admin only)
   * Layer 8: Logs role_changed event.
   */
  updateUserRole: adminProcedure
    .input(z.object({
      userId: z.number().int().positive(),
      role: z.enum(["user", "admin", "preparer", "owner"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [target] = await db
        .select({ email: users.email, openId: users.openId, name: users.name, role: users.role })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

      if (target.role === "owner" && input.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "The owner account cannot be demoted through the dashboard." });
      }
      if ((target.role === "owner" || input.role === "owner") && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the account owner can manage owner-level access." });
      }

      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));

      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? undefined,
        action: "user.role_changed",
        resource: "auth",
        details: JSON.stringify({
          targetEmail: target.email,
          previousRole: target.role,
          newRole: input.role,
          changedBy: ctx.user.email,
        }),
      });

      return { ok: true };
    }),

  /**
   * POST /trpc/localAuth.createUser  (admin only)
   * Creates a new user account with a temporary password.
   * Layer 8: Logs user.created event.
   */
  createUser: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(["user", "admin", "preparer", "owner"]).default("user"),
      tempPassword: z.string().min(12),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email.toLowerCase().trim()))
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
      }
      if (["admin", "owner"].includes(input.role) && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the account owner can create administrator-level accounts." });
      }

      let hash: string;
      try {
        hash = await hashPassword(input.tempPassword);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Temporary password does not meet security requirements." });
      }
      const openId = `local_${crypto.randomBytes(16).toString("hex")}`;

      await db.insert(users).values({
        openId,
        name: input.name,
        email: input.email.toLowerCase().trim(),
        role: input.role,
        loginMethod: "local",
        passwordHash: hash,
        mustChangePassword: true,
        passwordChangedAt: Date.now(),
        failedLoginAttempts: 0,
        mfaEnabled: false,
      });

      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? undefined,
        action: "user.created",
        resource: "auth",
        details: JSON.stringify({
          newUserEmail: input.email,
          role: input.role,
          createdBy: ctx.user.email,
        }),
      });

      return { ok: true };
    }),

  /**
   * POST /trpc/localAuth.unlockAccount  (admin only)
   * Manually unlocks a locked account.
   */
  unlockAccount: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [target] = await db
        .select({ email: users.email, openId: users.openId, role: users.role })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      if (target.role === "owner" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the account owner can unlock an owner account." });
      }

      await db.update(users).set({
        failedLoginAttempts: 0,
        lockedUntil: null,
      }).where(eq(users.id, input.userId));

      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? undefined,
        action: "user.unlocked",
        resource: "auth",
        details: JSON.stringify({ targetEmail: target.email, unlockedBy: ctx.user.email }),
      });

      return { ok: true };
    }),

  /** Returns password rotation timing for the currently logged-in account. */
  getPasswordStatus: protectedProcedure.query(async ({ ctx }) => {
    const expiresAt = passwordExpiresAt(ctx.user);
    return {
      passwordChangedAt: ctx.user.passwordChangedAt,
      expiresAt,
      isExpired: isPasswordExpired(ctx.user),
      daysRemaining: expiresAt === null ? null : Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000))),
    };
  }),

  /** Returns the caller's non-expired, non-revoked sessions without exposing tokens. */
  listActiveSessions: protectedProcedure.query(async ({ ctx }) => {
    const activeSessions = await listActiveUserSessions(ctx.user.id);
    return activeSessions.map((session) => ({
      ...session,
      isCurrent: session.id === ctx.sessionId,
    }));
  }),

  /** Revokes one of the caller's other active sessions. */
  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const revoked = await revokeSessionById(ctx.user.id, input.sessionId);
      if (!revoked) throw new TRPCError({ code: "NOT_FOUND", message: "Active session not found." });
      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? undefined,
        action: "session.revoked",
        resource: "auth",
        details: JSON.stringify({ sessionId: input.sessionId, revokedBy: ctx.user.email }),
        ipAddress: getClientIp(ctx as Parameters<typeof getClientIp>[0]),
      });
      return { ok: true };
    }),

  /** Revokes every session for the caller except the device making this request. */
  revokeAllOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
    const count = await revokeAllUserSessions(ctx.user.id, ctx.sessionId ?? undefined);
    await insertAuditLog({
      userOpenId: ctx.user.openId,
      userName: ctx.user.name ?? undefined,
      action: "session.revoked",
      resource: "auth",
      details: JSON.stringify({ scope: "all_other_sessions", count, revokedBy: ctx.user.email }),
      ipAddress: getClientIp(ctx as Parameters<typeof getClientIp>[0]),
    });
    return { ok: true, count };
  }),
});
