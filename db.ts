import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  canopyReports, InsertCanopyReport,
  InsertUser, users,
  dashboardSettings, InsertDashboardSetting,
  teamMembers, InsertTeamMember,
  auditLog, InsertAuditLogEntry,
  briefingActions, InsertBriefingAction, BriefingAction,
  kpiSnapshots, InsertKpiSnapshot,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ── Canopy Report helpers ──────────────────────────────────────────────────

/** Compute SHA-256 hex hash of a string (used for CSV deduplication). */
export function hashCsvContent(csvContent: string): string {
  return createHash("sha256").update(csvContent, "utf8").digest("hex");
}

/** Check if a report with this content hash already exists. Returns true if duplicate. */
export async function isCanopyReportDuplicate(contentHash: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: canopyReports.id })
    .from(canopyReports)
    .where(eq(canopyReports.contentHash, contentHash))
    .limit(1);
  return rows.length > 0;
}

/** Insert a new Canopy CSV report (from Zapier or manual upload). Returns the inserted row ID. */
export async function insertCanopyReport(report: InsertCanopyReport): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [inserted] = await db
    .insert(canopyReports)
    .values(report)
    .returning({ id: canopyReports.id });
  return inserted?.id ?? 0;
}

/** Return the most recently received report (or null if none exist). */
export async function getLatestCanopyReport() {
  const db = await getDb();
  if (!db) return null;
  // Prefer the subtask/task pipeline CSV (contains Subtask Name, Subtask Status columns)
  // over the client archive CSV (contains only Client Name, Preparer columns).
  // The subtask CSV filename contains "Subtask" or has higher row counts.
  // We detect it by looking for a CSV whose content includes "Subtask Name" or "Task Name" headers.
  // Strategy: get the 4 most recent reports and pick the one with actual task pipeline data.
  const candidates = await db
    .select()
    .from(canopyReports)
    .orderBy(desc(canopyReports.receivedAt))
    .limit(4);
  if (candidates.length === 0) return null;
  // Prefer a report whose CSV content contains pipeline task headers
  const TASK_HEADERS = ["subtask name", "task name", "subtask status", "task status"];
  const taskReport = candidates.find((r) => {
    const preview = (r.csvContent ?? "").toLowerCase().slice(0, 2000);
    return TASK_HEADERS.some((h) => preview.includes(h));
  });
  return taskReport ?? candidates[0];
}

/** Return the two most recent full reports (with CSV content) for WoW comparison.
 * Only returns task pipeline CSVs (those with Subtask Name / Task Name headers),
 * skipping client archive CSVs that contain no pipeline stage data.
 */
export async function getLatestTwoReports() {
  const db = await getDb();
  if (!db) return [];
  // Fetch more candidates so we can filter out archive CSVs
  const candidates = await db
    .select()
    .from(canopyReports)
    .orderBy(desc(canopyReports.receivedAt))
    .limit(8);
  const TASK_HEADERS = ["subtask name", "task name", "subtask status", "task status"];
  const taskReports = candidates.filter((r) => {
    const preview = (r.csvContent ?? "").toLowerCase().slice(0, 2000);
    return TASK_HEADERS.some((h) => preview.includes(h));
  });
  // Return up to 2 task reports; fall back to raw candidates if none found
  return taskReports.length > 0 ? taskReports.slice(0, 2) : candidates.slice(0, 2);
}

// ── Dashboard Settings helpers ─────────────────────────────────────────────

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dashboardSettings).orderBy(dashboardSettings.category, dashboardSettings.key);
}

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(dashboardSettings).where(eq(dashboardSettings.key, key)).limit(1);
  return rows.length > 0 ? rows[0] : null;
}

export async function upsertSetting(setting: InsertDashboardSetting) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(dashboardSettings).values(setting).onConflictDoUpdate({ target: dashboardSettings.key, set: { value: setting.value, label: setting.label, category: setting.category, updatedBy: setting.updatedBy } });
}

export async function deleteSetting(key: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(dashboardSettings).where(eq(dashboardSettings.key, key));
}

// ── Team Members helpers ───────────────────────────────────────────────────

export async function getAllTeamMembers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamMembers).orderBy(teamMembers.location, teamMembers.name);
}

export async function upsertTeamMember(member: InsertTeamMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (member.id) {
    await db.update(teamMembers).set(member).where(eq(teamMembers.id, member.id));
  } else {
    await db.insert(teamMembers).values(member);
  }
}

export async function deleteTeamMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(teamMembers).where(eq(teamMembers.id, id));
}

// ── Audit Log helpers ──────────────────────────────────────────────────────

export async function insertAuditLog(entry: InsertAuditLogEntry) {
  const db = await getDb();
  if (!db) return; // Non-critical — fail silently
  try {
    await db.insert(auditLog).values(entry);
  } catch (e) {
    console.warn("[AuditLog] Failed to write:", e);
  }
}

export type AuditLogFilters = {
  limit?: number;
  action?: string;
  userOpenId?: string;
  startAt?: Date;
  endAt?: Date;
};

export async function getAuditLog(filters: AuditLogFilters = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.action) conditions.push(eq(auditLog.action, filters.action));
  if (filters.userOpenId) conditions.push(eq(auditLog.userOpenId, filters.userOpenId));
  if (filters.startAt) conditions.push(gte(auditLog.createdAt, filters.startAt));
  if (filters.endAt) conditions.push(lte(auditLog.createdAt, filters.endAt));

  const query = db.select().from(auditLog);
  return conditions.length > 0
    ? query.where(and(...conditions)).orderBy(desc(auditLog.createdAt)).limit(filters.limit ?? 100)
    : query.orderBy(desc(auditLog.createdAt)).limit(filters.limit ?? 100);
}

/** Return the N most recent reports for history display. */
export async function getRecentCanopyReports(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: canopyReports.id,
      rowCount: canopyReports.rowCount,
      source: canopyReports.source,
      filename: canopyReports.filename,
      receivedAt: canopyReports.receivedAt,
    })
    .from(canopyReports)
    .orderBy(desc(canopyReports.receivedAt))
    .limit(limit);
}

// ── Briefing Actions helpers ───────────────────────────────────────────────

/** Save a list of AI-generated action items for a briefing date. */
export async function saveBriefingActions(actions: InsertBriefingAction[]) {
  const db = await getDb();
  if (!db) return;
  if (actions.length === 0) return;
  await db.insert(briefingActions).values(actions);
}

/** Mark a briefing action as complete. */
export async function completeBriefingAction(id: number, completedBy: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(briefingActions)
    .set({ completedAt: new Date(), completedBy })
    .where(eq(briefingActions.id, id));
}

/** Get all briefing actions for a date range, including completion status. */
export async function getBriefingActions(limit = 30): Promise<BriefingAction[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(briefingActions)
    .orderBy(desc(briefingActions.createdAt))
    .limit(limit);
}

/** Get incomplete action items from the last N days (for LLM context). */
export async function getRecentIncompleteBriefingActions(days = 7): Promise<BriefingAction[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const rows = await db
    .select()
    .from(briefingActions)
    .orderBy(desc(briefingActions.createdAt))
    .limit(50);
  // Filter in JS to avoid complex SQL date arithmetic
  return rows.filter(
    (r) => !r.completedAt && new Date(r.createdAt) >= cutoff
  );
}

// ── Client Notes helpers ───────────────────────────────────────────────────

import {
  clientNotes, InsertClientNote,
  clientFlags, InsertClientFlag,
  clientReminders, InsertClientReminder,
} from "../drizzle/schema";

export async function getClientNotes(clientName: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(clientNotes)
    .where(eq(clientNotes.clientName, clientName))
    .orderBy(desc(clientNotes.createdAt));
}

export async function addClientNote(note: InsertClientNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(clientNotes).values(note);
}

export async function deleteClientNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clientNotes).where(eq(clientNotes.id, id));
}

// ── Client Flags helpers ───────────────────────────────────────────────────

export async function getClientFlags(clientName: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(clientFlags)
    .where(eq(clientFlags.clientName, clientName))
    .limit(1);
  return rows.length > 0 ? rows[0] : null;
}

export async function upsertClientFlags(data: InsertClientFlag & { escalatedBy?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateSet: Partial<InsertClientFlag> = {};
  if (data.isEscalated !== undefined) {
    updateSet.isEscalated = data.isEscalated;
    if (data.isEscalated) {
      updateSet.escalatedAt = new Date();
      updateSet.escalatedBy = data.escalatedBy ?? null;
    }
  }
  if (data.isVip !== undefined) updateSet.isVip = data.isVip;
  if (data.extensionFiled !== undefined) updateSet.extensionFiled = data.extensionFiled;
  if (data.doNotContact !== undefined) updateSet.doNotContact = data.doNotContact;

  await db
    .insert(clientFlags)
    .values({
      clientName: data.clientName,
      isEscalated: data.isEscalated ?? false,
      isVip: data.isVip ?? false,
      extensionFiled: data.extensionFiled ?? false,
      doNotContact: data.doNotContact ?? false,
      escalatedAt: data.isEscalated ? new Date() : undefined,
      escalatedBy: data.isEscalated ? (data.escalatedBy ?? null) : null,
    })
    .onConflictDoUpdate({ target: clientFlags.clientName, set: updateSet });
}

// ── Client Reminders helpers ───────────────────────────────────────────────

export async function getClientReminders(clientName: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(clientReminders)
    .where(
      and(
        eq(clientReminders.clientName, clientName),
        eq(clientReminders.isDismissed, false)
      )
    )
    .orderBy(clientReminders.remindAt);
}

export async function getDueReminders() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(clientReminders)
    .where(
      and(
        eq(clientReminders.isDismissed, false),
        lte(clientReminders.remindAt, new Date())
      )
    )
    .orderBy(clientReminders.remindAt)
    .limit(20);
}

export async function addClientReminder(reminder: InsertClientReminder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(clientReminders).values(reminder);
}

export async function dismissClientReminder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(clientReminders)
    .set({ isDismissed: true })
    .where(eq(clientReminders.id, id));
}

// ── KPI Snapshot helpers ─────────────────────────────────────────────────────────────────────────────

/** Save a KPI snapshot for a given report upload. */
export async function insertKpiSnapshot(snapshot: InsertKpiSnapshot) {
  const db = await getDb();
  if (!db) return; // graceful no-op if DB unavailable
  await db.insert(kpiSnapshots).values(snapshot);
}

/** Return the N most recent KPI snapshots (oldest first for sparkline rendering). */
export async function getRecentKpiSnapshots(limit = 4) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(kpiSnapshots)
    .orderBy(desc(kpiSnapshots.snapshotAt))
    .limit(limit);
  return rows.reverse(); // oldest → newest for left-to-right sparkline
}
