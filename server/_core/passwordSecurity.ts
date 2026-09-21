import crypto from "crypto";
import bcrypt from "bcryptjs";
import { desc, eq } from "drizzle-orm";
import { passwordHistory, users, type User } from "../../drizzle/schema";
import { getDb } from "../db";

export const BCRYPT_ROUNDS = 12;
export const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
export const PASSWORD_HISTORY_LIMIT = 5;

export type PasswordPolicyResult = {
  valid: boolean;
  failures: string[];
};

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const failures: string[] = [];
  if (password.length < 12) failures.push("Password must contain at least 12 characters.");
  if (!/[a-z]/.test(password)) failures.push("Password must include a lowercase letter.");
  if (!/[A-Z]/.test(password)) failures.push("Password must include an uppercase letter.");
  if (!/\d/.test(password)) failures.push("Password must include a number.");
  if (!/[^A-Za-z0-9]/.test(password)) failures.push("Password must include a special character.");
  return { valid: failures.length === 0, failures };
}

export function assertPasswordPolicy(password: string): void {
  const result = validatePasswordPolicy(password);
  if (!result.valid) throw new Error(result.failures.join(" "));
}

export function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function passwordExpiresAt(user: Pick<User, "role" | "passwordChangedAt">): number | null {
  if (!user.passwordChangedAt) return null;
  const duration = user.role === "owner" || user.role === "admin"
    ? 90 * 24 * 60 * 60 * 1000
    : 180 * 24 * 60 * 60 * 1000;
  return user.passwordChangedAt + duration;
}

export function isPasswordExpired(user: Pick<User, "role" | "passwordChangedAt">, now = Date.now()): boolean {
  const expiresAt = passwordExpiresAt(user);
  return expiresAt !== null && expiresAt <= now;
}

export async function hasRecentlyUsedPassword(userId: number, currentPasswordHash: string | null, candidate: string): Promise<boolean> {
  if (currentPasswordHash && await bcrypt.compare(candidate, currentPasswordHash)) return true;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const history = await db
    .select({ passwordHash: passwordHistory.passwordHash })
    .from(passwordHistory)
    .where(eq(passwordHistory.userId, userId))
    .orderBy(desc(passwordHistory.createdAt))
    .limit(PASSWORD_HISTORY_LIMIT);
  for (const entry of history) {
    if (await bcrypt.compare(candidate, entry.passwordHash)) return true;
  }
  return false;
}

/** Saves the superseded hash and retains only the five most recent historical values. */
export async function rememberSupersededPassword(userId: number, previousHash: string | null): Promise<void> {
  if (!previousHash) return;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(passwordHistory).values({
    userId,
    passwordHash: previousHash,
    createdAt: Date.now(),
  });
  const history = await db
    .select({ id: passwordHistory.id })
    .from(passwordHistory)
    .where(eq(passwordHistory.userId, userId))
    .orderBy(desc(passwordHistory.createdAt));
  const excess = history.slice(PASSWORD_HISTORY_LIMIT);
  await Promise.all(excess.map((entry) => db.delete(passwordHistory).where(eq(passwordHistory.id, entry.id))));
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordPolicy(password);
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
