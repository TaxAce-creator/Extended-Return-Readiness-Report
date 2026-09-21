// =============================================================================
// Scheduled AI Briefing Webhook
// GET/POST /api/scheduled/briefing
//
// Called daily by Vercel Cron.
// Generates an AI morning briefing from the latest Canopy report and
// sends it to the configured Slack security/operations channel.
//
// Auth: Authorization: Bearer <CRON_SECRET>.
// =============================================================================

import { Router, Request, Response } from "express";
import { getLatestCanopyReport, getRecentIncompleteBriefingActions, saveBriefingActions } from "../db";
import { invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";

export const scheduledBriefingRouter = Router();

async function runBriefing(req: Request, res: Response) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const supplied = req.headers.authorization;
    if (!cronSecret || supplied !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: "Unauthorized cron request." });
      return;
    }

    // ── Load latest Canopy report ─────────────────────────────────────────
    const report = await getLatestCanopyReport();
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const dataContext = report
      ? `Latest Canopy report received on ${new Date(report.receivedAt).toLocaleDateString()}. Contains ${report.rowCount} task rows.`
      : "No Canopy report has been uploaded yet.";

    // ── Load incomplete action items from previous briefings (memory) ──────
    const incompleteActions = await getRecentIncompleteBriefingActions(7);
    const memoryContext =
      incompleteActions.length > 0
        ? `\n\nPREVIOUS INCOMPLETE ACTION ITEMS (do NOT repeat these — they are already being worked on):\n${incompleteActions
            .map((a, i) => `${i + 1}. [${(a.section ?? "action").toUpperCase()}] ${a.actionText}`)
            .join("\n")}`
        : "";

    const systemPrompt = `You are the AI operations assistant for TaxAce Group Inc., a concierge luxury tax strategy firm.
Your job is to generate a concise, actionable morning briefing for the CEO (NZ) based on the current tax preparation pipeline data.
Today is ${today}.

Your briefing must be:
- Direct and executive-level (no fluff, no pleasantries)
- Organized into exactly 3 sections: ## 🔴 Top Risks, ## 🟡 Bottlenecks, ## ✅ Recommended Actions
- Each section has exactly 3 bullet points maximum
- Use specific numbers when available
- Tone: confident, professional, urgent where warranted
- After the 3 sections, add a JSON block at the very end (after a --- separator) with this exact structure:
  {"actions": [{"text": "action item text", "category": "risk|bottleneck|action"}, ...]}
  Include only the 3 Recommended Actions as action items in the JSON.

Format the main briefing in clean Markdown. The JSON block is for internal use only.`;

    const userMessage = `Here is the current dashboard state:\n${dataContext}${memoryContext}\n\nGenerate the morning briefing for NZ.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const rawContent = (response.choices?.[0]?.message?.content as string) ?? "";

    // ── Parse and save action items ────────────────────────────────────────
    let briefingText = rawContent;
    const jsonSeparatorIdx = rawContent.lastIndexOf("---");
    if (jsonSeparatorIdx !== -1) {
      briefingText = rawContent.slice(0, jsonSeparatorIdx).trim();
      const jsonPart = rawContent.slice(jsonSeparatorIdx + 3).trim();
      try {
        const parsed = JSON.parse(jsonPart);
        if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
          const todayStr = new Date().toISOString().slice(0, 10);
          await saveBriefingActions(
            parsed.actions.map((a: { text: string; category: string }) => ({
              actionText: a.text,
              section: a.category ?? "action",
              briefingDate: todayStr,
            }))
          );
        }
      } catch {
        // JSON parsing failed — briefing still works
      }
    }

    const finalBriefing = briefingText || rawContent;

    // ── Send as owner notification ─────────────────────────────────────────
    const notified = await notifyOwner({
      title: `📋 TaxAce Morning Briefing — ${today}`,
      content: finalBriefing.slice(0, 4000), // Notification content limit
    });

    res.json({
      success: true,
      notified,
      generatedAt: new Date().toISOString(),
      preview: finalBriefing.slice(0, 200) + "…",
    });
  } catch (error) {
    console.error("[Scheduled Briefing] Error:", error);
    res.status(500).json({ error: "Internal server error generating briefing." });
  }
}

scheduledBriefingRouter.get("/briefing", runBriefing);
scheduledBriefingRouter.post("/briefing", runBriefing);
