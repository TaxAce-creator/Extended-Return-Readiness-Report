// =============================================================================
// Canopy Security Tests
// Verifies that all canopy procedures require authentication (protectedProcedure)
// and that unauthenticated callers receive UNAUTHORIZED errors.
// =============================================================================

import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

/** Creates a context with no authenticated user (simulates an unauthenticated request) */
function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

/** Creates a context with a valid authenticated user */
function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-open-id",
      email: "nz@taxacegroup.com",
      name: "NZ",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("canopy security — unauthenticated access is blocked", () => {
  it("canopy.getLatest rejects unauthenticated callers with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.canopy.getLatest()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("canopy.getHistory rejects unauthenticated callers with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.canopy.getHistory({ limit: 5 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("canopy.saveManualUpload rejects unauthenticated callers with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.canopy.saveManualUpload({
        csvContent: "col1,col2\nval1,val2",
        rowCount: 1,
        filename: "test.csv",
      })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("canopy security — authenticated access is permitted", () => {
  it("canopy.getLatest resolves (or throws a non-auth error) for authenticated callers", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    // In test environment the DB may not be available, so we accept either a
    // successful result or a non-UNAUTHORIZED error (e.g. DB connection error).
    try {
      const result = await caller.canopy.getLatest();
      // If DB is available, result is null or a report object
      expect(result === null || typeof result === "object").toBe(true);
    } catch (err) {
      // Must NOT be an auth error
      if (err instanceof TRPCError) {
        expect(err.code).not.toBe("UNAUTHORIZED");
        expect(err.code).not.toBe("FORBIDDEN");
      }
    }
  });
});
