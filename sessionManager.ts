import crypto from "crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { sessions, users, type User } from "../../drizzle/schema";
import { getDb } from "../db";

export const SESSION_COOKIE_NAME = "ta_session";
export const STANDARD_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
export const PRIVILEGED_SESSION_DURATION_MS = 4 * 60 * 60 * 1000;
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const MAX_CONCURRENT_SESSIONS = 3;

export type SessionAccess = {
  sessionId: number;
  user: User;
  mfaVerified: boolean;
};

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function sessionDurationForRole(role: User["role"]): number {
  return role === "owner" || role === "admin"
    ? PRIVILEGED_SESSION_DURATION_MS
    : STANDARD_SESSION_DURATION_MS;
}

export function parseSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)ta_session=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax; Secure`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

export async function createSession(input: {
  user: User;
  ipAddress?: string;
  userAgent?: string;
  mfaVerified: boolean;
}): Promise<{ token: string; expiresAt: number; sessionId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const now = Date.now();
  const token = crypto.randomBytes(48).toString("base64url");
  const expiresAt = now + sessionDurationForRole(input.user.role);

  const activeSessions = await db
    .select({ id: sessions.id, expiresAt: sessions.expiresAt, lastActiveAt: sessions.lastActiveAt })
    .from(sessions)
    .where(and(eq(sessions.userId, input.user.id), eq(sessions.isRevoked, false)))
    .orderBy(asc(sessions.createdAt));

  const sessionsToRevoke = activeSessions.filter(
    (session) => session.expiresAt <= now || now - session.lastActiveAt >= IDLE_TIMEOUT_MS
  );

  if (sessionsToRevoke.length > 0) {
    await Promise.all(
      sessionsToRevoke.map((session) =>
        db.update(sessions).set({ isRevoked: true }).where(eq(sessions.id, session.id))
      )
    );
  }

  const stillActive = activeSessions.filter(
    (session) => !sessionsToRevoke.some((revoked) => revoked.id === session.id)
  );
  const overflowCount = Math.max(0, stillActive.length - (MAX_CONCURRENT_SESSIONS - 1));

  if (overflowCount > 0) {
    await Promise.all(
      stillActive.slice(0, overflowCount).map((session) =>
        db.update(sessions).set({ isRevoked: true }).where(eq(sessions.id, session.id))
      )
    );
  }

  const result = await db.insert(sessions).values({
    userId: input.user.id,
    tokenHash: hashToken(token),
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    createdAt: now,
    lastActiveAt: now,
    expiresAt,
    isRevoked: false,
    mfaVerified: input.mfaVerified,
  });

  const sessionId = (result as unknown as [{ insertId: number }])[0]?.insertId ?? 0;
  return { token, expiresAt, sessionId };
}

export async function resolveSession(token: string): Promise<SessionAccess | null> {
  const db = await getDb();
  if (!db) return null;

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, hashToken(token)))
    .limit(1);

  if (!session || session.isRevoked) return null;

  const now = Date.now();
  const expired = session.expiresAt <= now;
  const idle = now - session.lastActiveAt >= IDLE_TIMEOUT_MS;
  if (expired || idle) {
    await db.update(sessions).set({ isRevoked: true }).where(eq(sessions.id, session.id));
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) {
    await db.update(sessions).set({ isRevoked: true }).where(eq(sessions.id, session.id));
    return null;
  }

  if (now - session.lastActiveAt >= 60_000) {
    await db.update(sessions).set({ lastActiveAt: now }).where(eq(sessions.id, session.id));
  }

  return { sessionId: session.id, user, mfaVerified: session.mfaVerified };
}

export async function markSessionMfaVerified(sessionId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(sessions).set({ mfaVerified: true, lastActiveAt: Date.now() }).where(eq(sessions.id, sessionId));
}

export async function revokeSessionByToken(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(sessions).set({ isRevoked: true }).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function revokeSessionById(userId: number, sessionId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [session] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .limit(1);
  if (!session) return false;
  await db.update(sessions).set({ isRevoked: true }).where(eq(sessions.id, sessionId));
  return true;
}

export async function revokeAllUserSessions(userId: number, exceptSessionId?: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const active = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.isRevoked, false)));
  const targets = active.filter((session) => session.id !== exceptSessionId);
  await Promise.all(
    targets.map((session) => db.update(sessions).set({ isRevoked: true }).where(eq(sessions.id, session.id)))
  );
  return targets.length;
}

export async function listActiveUserSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = Date.now();
  const records = await db
    .select({
      id: sessions.id,
      ipAddress: sessions.ipAddress,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
      lastActiveAt: sessions.lastActiveAt,
      expiresAt: sessions.expiresAt,
      mfaVerified: sessions.mfaVerified,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.isRevoked, false)))
    .orderBy(desc(sessions.createdAt));

  return records.filter((session) => session.expiresAt > now && now - session.lastActiveAt < IDLE_TIMEOUT_MS);
}
