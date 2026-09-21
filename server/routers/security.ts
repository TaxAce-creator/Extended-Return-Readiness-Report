// =============================================================================
// TaxAce — Security Router
// Layer 6: IP Allowlisting — manage allowed IPs and enforce blocking
// Layer 9: Account management — unlock locked accounts
// =============================================================================

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { ipAllowlist, dashboardSettings } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { insertAuditLog } from "../db";

// ── IP Allowlist ──────────────────────────────────────────────────────────────

export const securityRouter = router({
  /**
   * GET /trpc/security.listIpAllowlist
   * Returns all IP allowlist entries.
   */
  listIpAllowlist: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(ipAllowlist).orderBy(desc(ipAllowlist.createdAt));
  }),

  /**
   * POST /trpc/security.addIpAllowlist
   * Adds an IP address to the allowlist.
   */
  addIpAllowlist: adminProcedure
    .input(z.object({
      label: z.string().min(1, "Label is required"),
      ipAddress: z.string().min(7, "IP address is required").max(64),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(ipAllowlist).values({
        label: input.label,
        ipAddress: input.ipAddress.trim(),
        addedBy: ctx.user.name ?? ctx.user.email ?? "admin",
        addedByOpenId: ctx.user.openId,
        isActive: true,
      });

      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? undefined,
        action: "security.ip_added",
        resource: "ip_allowlist",
        details: JSON.stringify({ label: input.label, ipAddress: input.ipAddress }),
      });

      return { ok: true };
    }),

  /**
   * POST /trpc/security.toggleIpAllowlist
   * Enables or disables an IP allowlist entry.
   */
  toggleIpAllowlist: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(ipAllowlist).set({ isActive: input.isActive }).where(eq(ipAllowlist.id, input.id));

      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? undefined,
        action: input.isActive ? "security.ip_enabled" : "security.ip_disabled",
        resource: "ip_allowlist",
        details: JSON.stringify({ id: input.id }),
      });

      return { ok: true };
    }),

  /**
   * DELETE /trpc/security.deleteIpAllowlist
   * Removes an IP address from the allowlist.
   */
  deleteIpAllowlist: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [entry] = await db.select().from(ipAllowlist).where(eq(ipAllowlist.id, input.id)).limit(1);

      await db.delete(ipAllowlist).where(eq(ipAllowlist.id, input.id));

      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? undefined,
        action: "security.ip_removed",
        resource: "ip_allowlist",
        details: JSON.stringify({ label: entry?.label, ipAddress: entry?.ipAddress }),
      });

      return { ok: true };
    }),

  /**
   * GET /trpc/security.getIpBlockingEnabled
   * Returns whether IP blocking is currently enabled.
   */
  getIpBlockingEnabled: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return false;
    const [row] = await db
      .select({ value: dashboardSettings.value })
      .from(dashboardSettings)
      .where(eq(dashboardSettings.key, "ip_blocking_enabled"))
      .limit(1);
    return row?.value === "true";
  }),

  /**
   * POST /trpc/security.setIpBlockingEnabled
   * Enables or disables IP blocking globally.
   */
  setIpBlockingEnabled: adminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(dashboardSettings).values({
        key: "ip_blocking_enabled",
        value: String(input.enabled),
        label: "IP Blocking Enabled",
        category: "security",
      }).onConflictDoUpdate({
        target: dashboardSettings.key,
        set: { value: String(input.enabled) },
      });

      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? undefined,
        action: input.enabled ? "security.ip_blocking_enabled" : "security.ip_blocking_disabled",
        resource: "security_settings",
        details: JSON.stringify({ changedBy: ctx.user.email }),
      });

      return { ok: true };
    }),

  /**
   * GET /trpc/security.getMyIp
   * Returns the current user's detected IP address.
   * Useful for adding your own IP to the allowlist.
   */
  getMyIp: protectedProcedure.query(({ ctx }) => {
    const forwarded = ctx.req.headers["x-forwarded-for"];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) ?? ctx.req.socket.remoteAddress ?? "unknown";
    return { ip };
  }),
});
