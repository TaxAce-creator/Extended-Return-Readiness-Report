// =============================================================================
// Canopy Report Router
// Handles Zapier webhook ingestion and tRPC procedures for the dashboard
//
// SECURITY: All procedures require authentication (protectedProcedure).
// Unauthenticated requests receive a 401 UNAUTHORIZED response.
//
// DEDUPLICATION: SHA-256 content hash prevents duplicate CSV uploads from
// polluting the Week-over-Week comparison and inflating upload history.
//
// KPI SNAPSHOTS: Every upload captures a snapshot of the 6 CEO KPI values
// so the CEO View can render 4-upload trend sparklines without re-parsing
// large CSV files on the client.
// =============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  insertCanopyReport,
  getLatestCanopyReport,
  getRecentCanopyReports,
  getLatestTwoReports,
  hashCsvContent,
  isCanopyReportDuplicate,
  insertKpiSnapshot,
  getRecentKpiSnapshots,
} from "../db";

// ── Lightweight KPI computation from raw CSV ──────────────────────────────────
// Mirrors the logic in client/src/lib/csvParser.ts but runs server-side so we
// don't need to ship the full CSV to the browser just for sparklines.
function computeKpisFromCsv(csvContent: string, reportId: number) {
  const allLines = csvContent.split(/\r?\n/).filter(Boolean);
  if (allLines.length < 2) return null;

  // Skip Canopy metadata lines at the top — find the real header row
  const KNOWN_COLS = ["subtask name", "subtask status", "task", "status", "client name", "client", "task name", "custom field value", "assignee"];
  let headerLineIdx = 0;
  for (let i = 0; i < Math.min(allLines.length, 20); i++) {
    const h = allLines[i].toLowerCase();
    if (KNOWN_COLS.some((col) => h.includes(col))) { headerLineIdx = i; break; }
  }
  const lines = allLines.slice(headerLineIdx);
  if (lines.length < 2) return null;

  // Parse headers using a simple CSV split (handles quoted fields)
  const parseSimple = (line: string) => line.split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
  const headers = parseSimple(lines[0]);

  // Task/stage: prefer "subtask name" (new format) over "task" (legacy)
  const taskIdx =
    headers.indexOf("subtask name") !== -1 ? headers.indexOf("subtask name") :
    headers.indexOf("task name") !== -1 ? headers.indexOf("task name") :
    headers.findIndex((h) => h === "task" || h.includes("stage"));

  // Assignee: prefer "custom field value" (new — holds preparer name) over "assignee"
  const assigneeIdx =
    headers.indexOf("custom field value") !== -1 ? headers.indexOf("custom field value") :
    headers.findIndex((h) => h.includes("assignee") || h.includes("preparer") || h.includes("assigned"));

  // Due date: prefer "subtask due date" (new) over "due date"
  const dueDateIdx =
    headers.indexOf("subtask due date") !== -1 ? headers.indexOf("subtask due date") :
    headers.findIndex((h) => h.includes("due") || h.includes("deadline"));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stageCount = new Map<string, number>();
  const preparerOverdue = new Map<string, number>();
  const preparerTotal = new Map<string, number>();
  let totalActive = 0;
  let overdueCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 2) continue;
    totalActive++;

    // Stage / task
    const stage = taskIdx >= 0 ? (cols[taskIdx] ?? "").trim() : "";
    if (stage) stageCount.set(stage, (stageCount.get(stage) ?? 0) + 1);

    // Overdue check
    let isOverdue = false;
    if (dueDateIdx >= 0) {
      const raw = (cols[dueDateIdx] ?? "").trim();
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime()) && d < today) isOverdue = true;
      }
    }
    if (isOverdue) overdueCount++;

    // Preparer tracking
    const assigneeRaw = assigneeIdx >= 0 ? (cols[assigneeIdx] ?? "").trim() : "";
    const assignees = assigneeRaw.split(",").map((a) => a.trim()).filter(Boolean);
    assignees.forEach((name) => {
      preparerTotal.set(name, (preparerTotal.get(name) ?? 0) + 1);
      if (isOverdue) preparerOverdue.set(name, (preparerOverdue.get(name) ?? 0) + 1);
    });
  }

  // Top bottleneck = stage with most clients
  let bottleneckStage = "";
  let bottleneckCount = 0;
  stageCount.forEach((count, stage) => {
    if (count > bottleneckCount) { bottleneckCount = count; bottleneckStage = stage; }
  });

  // Most-behind preparer = highest overdue count
  let mostBehindName = "";
  let mostBehindOverdueCount = 0;
  preparerOverdue.forEach((count, name) => {
    if (count > mostBehindOverdueCount) { mostBehindOverdueCount = count; mostBehindName = name; }
  });

  const overdueRate = totalActive > 0 ? Math.round((overdueCount / totalActive) * 100) : 0;

  return {
    reportId,
    totalActive,
    overdueRate,
    overdueCount,
    bottleneckCount,
    bottleneckStage: bottleneckStage || null,
    mostBehindOverdueCount,
    mostBehindName: mostBehindName || null,
  };
}

export const canopyRouter = router({
  /** Returns the latest stored Canopy CSV report — requires login */
  getLatest: protectedProcedure.query(async () => {
    const report = await getLatestCanopyReport();
    return report ?? null;
  }),

  /** Returns the N most recent report summaries (no CSV content) — requires login */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      return getRecentCanopyReports(input.limit);
    }),

  /** Returns the two most recent full reports (with CSV content) for Week-over-Week comparison — requires login */
  getLatestTwo: protectedProcedure.query(async () => {
    return getLatestTwoReports();
  }),

  /** Returns the N most recent KPI snapshots for CEO View sparklines — requires login */
  getKpiSnapshots: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(4) }))
    .query(async ({ input }) => {
      return getRecentKpiSnapshots(input.limit);
    }),

  /**
   * Called by the frontend when a user manually uploads a CSV — requires login.
   * Rejects duplicate uploads using SHA-256 content hash to prevent the
   * Week-over-Week view from showing zero deltas when the same file is re-uploaded.
   * After a successful insert, captures a KPI snapshot for sparkline history.
   */
  saveManualUpload: protectedProcedure
    .input(
      z.object({
        csvContent: z.string().min(1),
        rowCount: z.number().int().min(0),
        filename: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Compute SHA-256 hash and check for duplicates before inserting
      const contentHash = hashCsvContent(input.csvContent);
      const isDuplicate = await isCanopyReportDuplicate(contentHash);

      if (isDuplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "This CSV file has already been uploaded. The dashboard is already up to date with this report.",
        });
      }

      const reportId = await insertCanopyReport({
        csvContent: input.csvContent,
        rowCount: input.rowCount,
        source: "manual",
        filename: input.filename ?? null,
        contentHash,
      });

      // ── Capture KPI snapshot for sparkline history ───────────────────────
      try {
        const kpis = computeKpisFromCsv(input.csvContent, reportId);
        if (kpis) {
          await insertKpiSnapshot(kpis);
        }
      } catch (err) {
        // Non-fatal — snapshot failure should not block the upload
        console.warn("[KPI Snapshot] Failed to capture snapshot:", err);
      }

      return { success: true, contentHash };
    }),
});
