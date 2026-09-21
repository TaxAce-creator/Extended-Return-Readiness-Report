import { describe, expect, it } from "vitest";
import { decryptMfaSecret, encryptMfaSecret } from "./_core/mfaCrypto";
import { hashResetToken, validatePasswordPolicy } from "./_core/passwordSecurity";
import { clearSessionCookie, parseSessionToken, sessionCookie } from "./_core/sessionManager";

describe("password policy", () => {
  it("requires the full TaxAce password complexity policy", () => {
    expect(validatePasswordPolicy("short").valid).toBe(false);
    expect(validatePasswordPolicy("ValidPassword2026!").valid).toBe(true);
  });

  it("hashes reset tokens deterministically without retaining the raw value", () => {
    const raw = "a1b2c3d4";
    const hashed = hashResetToken(raw);
    expect(hashed).toHaveLength(64);
    expect(hashed).not.toBe(raw);
    expect(hashResetToken(raw)).toBe(hashed);
  });
});

describe("MFA secret encryption", () => {
  it("round-trips a TOTP secret through authenticated encryption", () => {
    const encrypted = encryptMfaSecret("JBSWY3DPEHPK3PXP");
    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptMfaSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP");
  });
});

describe("opaque session cookies", () => {
  it("parses the opaque session value while retaining secure cookie attributes", () => {
    const header = sessionCookie("opaque-session-token", 600);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Lax");
    expect(parseSessionToken(header)).toBe("opaque-session-token");
    expect(clearSessionCookie()).toContain("Max-Age=0");
  });
});
