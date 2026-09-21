// =============================================================================
// Settings Router
// Manages configurable dashboard settings (billing rates, firm info, etc.)
// and team member management.
// All procedures require authentication; write operations require admin role.
// =============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  getAllSettings, upsertSetting, deleteSetting,
  getAllTeamMembers, upsertTeamMember, deleteTeamMember,
  getAuditLog, insertAuditLog,
} from "../db";

// Default billing rates (used as seed values if not yet in DB)
export const DEFAULT_BILLING_RATES: Record<string, { label: string; rate: number }> = {
  "billing_rate_1040":    { label: "1040 Individual",       rate: 450  },
  "billing_rate_1040s":   { label: "1040 with Schedule C",  rate: 650  },
  "billing_rate_1120s":   { label: "1120S S-Corp",          rate: 1200 },
  "billing_rate_1065":    { label: "1065 Partnership",       rate: 1100 },
  "billing_rate_1120":    { label: "1120 C-Corp",            rate: 1400 },
  "billing_rate_990":     { label: "990 Non-Profit",         rate: 900  },
  "billing_rate_1041":    { label: "1041 Trust/Estate",      rate: 800  },
  "billing_rate_amended": { label: "Amended Return",         rate: 350  },
  "billing_rate_ext":     { label: "Extension Only",         rate: 150  },
};

export const settingsRouter = router({
  // ── Settings ──────────────────────────────────────────────────────────────

  getAll: protectedProcedure.query(async () => {
    return getAllSettings();
  }),

  upsert: adminProcedure
    .input(z.object({
      key: z.string().min(1).max(128),
      value: z.string(),
      label: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertSetting({
        key: input.key,
        value: input.value,
        label: input.label ?? null,
        category: input.category ?? "general",
        updatedBy: ctx.user.openId,
      });
      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? "Unknown",
        action: "settings_change",
        resource: input.key,
        details: JSON.stringify({ value: input.value }),
      });
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSetting(input.key);
      return { success: true };
    }),

  // ── Team Members ──────────────────────────────────────────────────────────

  getTeamMembers: protectedProcedure.query(async () => {
    return getAllTeamMembers();
  }),

  upsertTeamMember: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1).max(128),
      role: z.string().optional(),
      location: z.enum(["hq", "remote"]).default("hq"),
      capacity: z.number().int().min(1).max(200).default(30),
      isActive: z.boolean().default(true),
      canopyName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertTeamMember({
        id: input.id,
        name: input.name,
        role: input.role ?? null,
        location: input.location,
        capacity: input.capacity,
        isActive: input.isActive,
        canopyName: input.canopyName ?? null,
      });
      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? "Unknown",
        action: input.id ? "team_member_updated" : "team_member_added",
        resource: input.name,
      });
      return { success: true };
    }),

  deleteTeamMember: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteTeamMember(input.id);
      return { success: true };
    }),

  // ── Audit Log ─────────────────────────────────────────────────────────────

  getAuditLog: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(100),
      action: z.string().max(64).optional(),
      userOpenId: z.string().max(64).optional(),
      startAt: z.date().optional(),
      endAt: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return getAuditLog(input);
    }),

  exportAuditLog: adminProcedure
    .input(z.object({
      action: z.string().max(64).optional(),
      userOpenId: z.string().max(64).optional(),
      startAt: z.date().optional(),
      endAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rows = await getAuditLog({ ...input, limit: 500 });
      const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const csv = [
        ["Timestamp", "User", "User ID", "Action", "Resource", "Details", "IP Address"].map(escapeCsv).join(","),
        ...rows.map((row) => [row.createdAt.toISOString(), row.userName, row.userOpenId, row.action, row.resource, row.details, row.ipAddress].map(escapeCsv).join(",")),
      ].join("\n");
      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? "Unknown",
        action: "data.exported",
        resource: "audit_log",
        details: JSON.stringify({ rowCount: rows.length, filters: input }),
      });
      return { csv, rowCount: rows.length };
    }),

  logAction: protectedProcedure
    .input(z.object({
      action: z.string(),
      resource: z.string().optional(),
      details: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await insertAuditLog({
        userOpenId: ctx.user.openId,
        userName: ctx.user.name ?? "Unknown",
        action: input.action,
        resource: input.resource ?? null,
        details: input.details ?? null,
      });
      return { success: true };
    }),
});
