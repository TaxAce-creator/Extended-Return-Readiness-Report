import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getDb } from "../db";
import { users, ipAllowlist, dashboardSettings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { clearSessionCookie, parseSessionToken, resolveSession } from "./sessionManager";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  sessionId: number | null;
  sessionMfaVerified: boolean;
};

// ── IP Allowlist Check (Layer 6) ─────────────────────────────────────────────

async function isIpAllowed(requestIp: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return true; // Fail open if DB unavailable

    // Check if IP blocking is enabled
    const [setting] = await db
      .select({ value: dashboardSettings.value })
      .from(dashboardSettings)
      .where(eq(dashboardSettings.key, "ip_blocking_enabled"))
      .limit(1);

    if (setting?.value !== "true") return true; // Blocking disabled — allow all

    // Check if this IP is in the active allowlist
    const [entry] = await db
      .select({ id: ipAllowlist.id })
      .from(ipAllowlist)
      .where(and(eq(ipAllowlist.ipAddress, requestIp), eq(ipAllowlist.isActive, true)))
      .limit(1);

    return !!entry;
  } catch {
    return true; // Fail open on error
  }
}

function getClientIp(req: CreateExpressContextOptions["req"]): string {
  const forwarded = req.headers["x-forwarded-for"];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) ?? req.socket.remoteAddress ?? "unknown";
}

// ── Public paths exempt from IP blocking ────────────────────────────────────
// Login page must always be accessible so admins can log in and manage the list
const IP_BLOCK_EXEMPT_PATHS = [
  "/api/trpc/localAuth.login",
  "/api/trpc/localAuth.me",
  "/api/trpc/localAuth.forgotPassword",
  "/api/trpc/localAuth.resetPassword",
  "/api/oauth",
];

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let sessionId: number | null = null;
  let sessionMfaVerified = false;

  try {
    const token = parseSessionToken(opts.req.headers.cookie);
    if (token) {
      const access = await resolveSession(token);
      if (!access) {
        opts.res.setHeader("Set-Cookie", clearSessionCookie());
      } else {
        sessionId = access.sessionId;
        sessionMfaVerified = access.mfaVerified;
        // An MFA-enrolled user receives no protected access until the pending
        // session is completed by the dedicated MFA login flow.
        if (!access.user.mfaEnabled || access.mfaVerified) {
          user = access.user;
        }
      }
    }
  } catch {
    user = null;
  }

  // ── IP Allowlist Enforcement ─────────────────────────────────────────────
  // Skip check for login/auth paths so admins can always access the login page
  const requestPath = opts.req.path ?? opts.req.url ?? "";
  const isExempt = IP_BLOCK_EXEMPT_PATHS.some(p => requestPath.startsWith(p));

  if (!isExempt) {
    const clientIp = getClientIp(opts.req);
    const allowed = await isIpAllowed(clientIp);

    if (!allowed) {
      // Throw a TRPC error — this will be caught and returned as a 403
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Access denied. Your IP address (${clientIp}) is not on the approved list. Contact your administrator.`,
      });
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    sessionId,
    sessionMfaVerified,
  };
}
