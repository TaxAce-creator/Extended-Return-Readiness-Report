// =============================================================================
// Zapier Webhook Handler
// POST /api/webhooks/zapier-canopy
//
// Zapier sends the Canopy CSV as a plain text body (Content-Type: text/plain)
// or as a JSON payload with a `csvContent` field.
//
// Zapier Zap setup:
//   Trigger: Gmail → New Email Matching Search (from:canopy subject:report)
//   Action 1: Formatter → Utilities → Import CSV (attachment)
//   Action 2: Webhooks by Zapier → POST → https://your-domain/api/webhooks/zapier-canopy
//     Body type: JSON
//     Data: { "csvContent": "<full CSV text>", "filename": "<filename>" }
//     Headers: { "x-webhook-secret": "<your ZAPIER_WEBHOOK_SECRET value>" }
//
// SECURITY: ZAPIER_WEBHOOK_SECRET is REQUIRED. Requests without a valid secret
// are rejected with 401. Set this in your environment secrets.
// =============================================================================

import { Router, Request, Response } from "express";
import { insertCanopyReport, hashCsvContent, isCanopyReportDuplicate } from "../db";

export const zapierWebhookRouter = Router();

// ZAPIER_WEBHOOK_SECRET must be set in environment variables.
// If it is not set, ALL webhook requests are rejected to prevent accidental
// exposure of client data through an unprotected endpoint.
const WEBHOOK_SECRET = process.env.ZAPIER_WEBHOOK_SECRET;

zapierWebhookRouter.post("/zapier-canopy", async (req: Request, res: Response) => {
  try {
    // ── Secret validation (mandatory) ─────────────────────────────────────
    // Accept secret from header (preferred) or query param (Zapier fallback)
    const providedSecret =
      (req.headers["x-webhook-secret"] as string | undefined) ||
      (req.query.secret as string | undefined);

    if (!WEBHOOK_SECRET) {
      // Secret not configured — reject all requests to prevent data exposure
      console.error(
        "[Zapier Webhook] ZAPIER_WEBHOOK_SECRET is not set. " +
        "All webhook requests are rejected until a secret is configured."
      );
      res.status(503).json({
        error: "Webhook endpoint not configured. Contact the administrator.",
      });
      return;
    }

    if (providedSecret !== WEBHOOK_SECRET) {
      console.warn(
        "[Zapier Webhook] Rejected request — invalid or missing secret. " +
        `IP: ${req.ip}, UA: ${req.headers["user-agent"]}`
      );
      res.status(401).json({ error: "Unauthorized — invalid webhook secret." });
      return;
    }

    // ── Parse CSV content ─────────────────────────────────────────────────
    let csvContent: string | undefined;
    let filename: string | undefined;

    // Support both JSON body and raw text body
    if (typeof req.body === "string") {
      csvContent = req.body;
    } else if (req.body && typeof req.body.csvContent === "string") {
      csvContent = req.body.csvContent;
      filename = req.body.filename;
    } else if (req.body && typeof req.body.csv === "string") {
      csvContent = req.body.csv;
      filename = req.body.filename;
    }

    if (!csvContent || csvContent.trim().length === 0) {
      res.status(400).json({ error: "No CSV content provided" });
      return;
    }

    // Count data rows (subtract 1 for header)
    const lines = csvContent.split("\n").filter((l) => l.trim().length > 0);
    const rowCount = Math.max(0, lines.length - 1);

    // ── Deduplication check ───────────────────────────────────────────────
    const contentHash = hashCsvContent(csvContent);
    const isDuplicate = await isCanopyReportDuplicate(contentHash);

    if (isDuplicate) {
      console.log(
        `[Zapier Webhook] Duplicate report rejected (hash: ${contentHash.slice(0, 8)}...). Dashboard already up to date.`
      );
      res.status(200).json({
        success: true,
        duplicate: true,
        message: "Duplicate report — dashboard already up to date with this data.",
      });
      return;
    }

    await insertCanopyReport({
      csvContent,
      rowCount,
      source: "zapier",
      filename: filename ?? `canopy-report-${new Date().toISOString().slice(0, 10)}.csv`,
      contentHash,
    });

    console.log(
      `[Zapier Webhook] Received Canopy report: ${rowCount} rows, file: ${filename ?? "unnamed"}, hash: ${contentHash.slice(0, 8)}...`
    );

    res.status(200).json({
      success: true,
      rowCount,
      message: `Dashboard updated with ${rowCount} tasks`,
    });
  } catch (err) {
    console.error("[Zapier Webhook] Error processing request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
