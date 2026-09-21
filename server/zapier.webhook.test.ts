// =============================================================================
// Zapier Webhook Tests
// Validates the webhook endpoint accepts valid requests and rejects invalid ones
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module before importing the router
vi.mock("./db", () => ({
  insertCanopyReport: vi.fn().mockResolvedValue(undefined),
  getLatestCanopyReport: vi.fn().mockResolvedValue(null),
  getRecentCanopyReports: vi.fn().mockResolvedValue([]),
  hashCsvContent: vi.fn().mockReturnValue("abc123hash"),
  isCanopyReportDuplicate: vi.fn().mockResolvedValue(false),
}));

import express from "express";
import request from "supertest";
import { zapierWebhookRouter } from "./webhooks/zapier";

// Use the actual injected secret from the platform environment
const REAL_SECRET = process.env.ZAPIER_WEBHOOK_SECRET;

function createTestApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use("/api/webhooks", zapierWebhookRouter);
  return app;
}

const SAMPLE_CSV = `Status,Task,Client,Task Type,Assignee,Parent Task,Due date,Return Type,Tax Year
Needs review,TP: Client Tax Return in Process - Inputting,Smith John,Client Request,Amber Bankhead,TP - Delivery: Tax Preparation (26),4/15/2026,1040,2025
Needs review,TP: Sent to Tax Manager - Initial Review,Doe Jane,Client Request,Nataly Zamora,TP - Delivery: Tax Preparation (26),4/15/2026,1040,2025`;

describe("Zapier Webhook — /api/webhooks/zapier-canopy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a valid request with the correct secret", async () => {
    if (!REAL_SECRET) {
      console.warn("ZAPIER_WEBHOOK_SECRET not set — skipping auth test");
      return;
    }
    const app = createTestApp();
    const res = await request(app)
      .post("/api/webhooks/zapier-canopy")
      .set("x-webhook-secret", REAL_SECRET)
      .send({ csvContent: SAMPLE_CSV, filename: "test-report.csv" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.rowCount).toBe(2);
  });

  it("rejects requests with wrong secret", async () => {
    if (!REAL_SECRET) {
      console.warn("ZAPIER_WEBHOOK_SECRET not set — skipping rejection test");
      return;
    }
    const app = createTestApp();
    const res = await request(app)
      .post("/api/webhooks/zapier-canopy")
      .set("x-webhook-secret", "definitely-wrong-secret-xyz")
      .send({ csvContent: SAMPLE_CSV });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized — invalid webhook secret.");
  });

  it("rejects requests with empty CSV content when using correct secret", async () => {
    if (!REAL_SECRET) {
      console.warn("ZAPIER_WEBHOOK_SECRET not set — skipping empty CSV test");
      return;
    }
    const app = createTestApp();
    const res = await request(app)
      .post("/api/webhooks/zapier-canopy")
      .set("x-webhook-secret", REAL_SECRET)
      .send({ csvContent: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No CSV content provided");
  });

  it("accepts secret via query parameter", async () => {
    if (!REAL_SECRET) {
      console.warn("ZAPIER_WEBHOOK_SECRET not set — skipping query param test");
      return;
    }
    const app = createTestApp();
    const res = await request(app)
      .post(`/api/webhooks/zapier-canopy?secret=${encodeURIComponent(REAL_SECRET)}`)
      .send({ csvContent: SAMPLE_CSV });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
