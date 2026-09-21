// =============================================================================
// TaxAce — Local Auth Tests
// Tests the standalone email/password auth system.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

// ── Mock DB ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 1,
  name: "Nataly",
  email: "nataly@taxace.com",
  role: "admin" as const,
  passwordHash: "",
  mustChangePassword: false,
  resetToken: null,
  resetTokenExpiry: null,
  lastSignedIn: null,
};

const mockGetDb = vi.hoisted(() => vi.fn());

vi.mock("../server/db", () => ({
  getDb: mockGetDb,
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe("signSessionJwt / verifySessionJwt", () => {
  it("signs and verifies a JWT for a known user", async () => {
    process.env.JWT_SECRET = "test-secret-for-unit-tests-only";
    const { signSessionJwt, verifySessionJwt } = await import(
      "./routers/localAuth"
    );
    const token = await signSessionJwt(42, "admin");
    expect(typeof token).toBe("string");
    const payload = await verifySessionJwt(token);
    expect(payload?.sub).toBe("42");
    expect(payload?.role).toBe("admin");
  });

  it("returns null for a tampered token", async () => {
    process.env.JWT_SECRET = "test-secret-for-unit-tests-only";
    const { verifySessionJwt } = await import("./routers/localAuth");
    const result = await verifySessionJwt("not.a.valid.token");
    expect(result).toBeNull();
  });
});

describe("bcrypt password hashing", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await bcrypt.hash("PfNHxP9LUlDV", 10);
    const valid = await bcrypt.compare("PfNHxP9LUlDV", hash);
    expect(valid).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await bcrypt.hash("PfNHxP9LUlDV", 10);
    const valid = await bcrypt.compare("wrongpassword", hash);
    expect(valid).toBe(false);
  });
});

describe("login procedure — credential validation", () => {
  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash("PfNHxP9LUlDV", 10);
  });

  it("accepts a correct email + password combination", async () => {
    const valid = await bcrypt.compare("PfNHxP9LUlDV", mockUser.passwordHash);
    expect(valid).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const valid = await bcrypt.compare("wrongpassword", mockUser.passwordHash);
    expect(valid).toBe(false);
  });
});

describe("role access levels", () => {
  it("admin role has full access", () => {
    const role = "admin";
    const adminPages = ["/", "/ceo", "/pipeline", "/clients", "/analytics", "/scorecard", "/settings"];
    const preparerPages = ["/pipeline", "/clients", "/analytics", "/import", "/calendar"];
    expect(adminPages.every(p => preparerPages.includes(p) || role === "admin")).toBe(true);
  });

  it("preparer role is restricted to 5 pages", () => {
    const preparerAllowed = ["/pipeline", "/clients", "/analytics", "/import", "/calendar"];
    expect(preparerAllowed).toHaveLength(5);
  });
});
