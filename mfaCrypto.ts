import crypto from "crypto";
import { ENV } from "./env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function encryptionKey(): Buffer {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required to protect MFA secrets.");
  return crypto.createHash("sha256").update(`taxace-mfa-v1:${ENV.cookieSecret}`, "utf8").digest();
}

/** Stores versioned AES-256-GCM ciphertext as base64url(iv|tag|ciphertext). */
export function encryptMfaSecret(plainSecret: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainSecret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
}

/** Reads only ciphertext written by encryptMfaSecret and rejects malformed/tampered values. */
export function decryptMfaSecret(value: string): string {
  if (!value.startsWith("v1.")) {
    throw new Error("Unsupported MFA secret format.");
  }
  const packed = Buffer.from(value.slice(3), "base64url");
  if (packed.length <= IV_BYTES + AUTH_TAG_BYTES) throw new Error("Malformed MFA secret.");
  const iv = packed.subarray(0, IV_BYTES);
  const tag = packed.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const ciphertext = packed.subarray(IV_BYTES + AUTH_TAG_BYTES);
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
