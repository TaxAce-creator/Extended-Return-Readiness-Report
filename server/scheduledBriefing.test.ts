// =============================================================================
// Scheduled Briefing Endpoint Tests
// Verifies that POST /api/scheduled/briefing:
//   - Returns 401 when no valid cron secret is present
//   - Returns 200 when the Vercel cron bearer token is valid
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ── Hoist mock functions so they are available before vi.mock() calls ─────────
const mockGetLatestCanopyReport = vi.hoisted(() => vi.fn());
const mockGetRecentIncompleteBriefingActions = vi.hoisted(() => vi.fn());
const mockSaveBriefingActions = vi.hoisted(() => vi.fn());
const mockInvokeLLM = vi.hoisted(() => vi.fn());
const mockNotifyOwner = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({
  getLatestCanopyReport: mockGetLatestCanopyReport,
  getRecentIncompleteBriefingActions: mockGetRecentIncompleteBriefingActions,
  saveBriefingActions: mockSaveBriefingActions,
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: mockInvokeLLM,
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: mockNotifyOwner,
}));

import { scheduledBriefingRouter } from "./webhooks/scheduledBriefing";

// ── Build a minimal Express app for testing ───────────────────────────────────
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/scheduled", scheduledBriefingRouter);
  return app;
}

describe("Scheduled Briefing — POST /api/scheduled/briefing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    // Default happy-path mocks
    mockGetLatestCanopyReport.mockResolvedValue({
      receivedAt: new Date("2026-05-01").getTime(),
      rowCount: 42,
    });
    mockGetRecentIncompleteBriefingActions.mockResolvedValue([]);
    mockSaveBriefingActions.mockResolvedValue(undefined);
    mockInvokeLLM.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              "## 🔴 Top Risks\n- Risk 1\n\n## 🟡 Bottlenecks\n- Bottleneck 1\n\n## ✅ Recommended Actions\n- Action 1\n---\n{\"actions\":[{\"text\":\"Action 1\",\"category\":\"action\"}]}",
          },
        },
      ],
    });
    mockNotifyOwner.mockResolvedValue(true);
  });

  it("returns 401 when no valid cron secret is present", async () => {
    const app = buildApp();
    const res = await request(app).post("/api/scheduled/briefing").send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Unauthorized/i);
  });

  it("returns 200 with success when a valid cron secret is present", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/api/scheduled/briefing")
      .set("Authorization", "Bearer test-cron-secret")
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notified).toBe(true);
    expect(res.body.generatedAt).toBeDefined();
  });
});
