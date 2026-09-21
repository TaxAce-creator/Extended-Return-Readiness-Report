// =============================================================================
// AI Daily Briefing Router
// Generates a morning briefing using the LLM based on the latest Canopy report.
// Analyzes bottlenecks, overdue clients, and top risks.
//
// MEMORY: Incomplete action items from the last 7 days are passed to the LLM
// so it does not repeat recommendations that are already in progress.
// =============================================================================

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import {
  getLatestCanopyReport,
  saveBriefingActions,
  completeBriefingAction,
  getBriefingActions,
  getRecentIncompleteBriefingActions,
} from "../db";

export const briefingRouter = router({
  /** Generate a new AI morning briefing with LLM memory of incomplete actions */
  generate: protectedProcedure
    .input(
      z.object({
        /** Caller passes a rich summary of the current dashboard state */
        dashboardSummary: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const report = await getLatestCanopyReport();
      const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // ── Build context ──────────────────────────────────────────────────────
      const dataContext = input.dashboardSummary
        ? input.dashboardSummary
        : report
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

      const userMessage = `Here is the current dashboard state:
${dataContext}${memoryContext}

Generate the morning briefing for NZ.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });

      const rawContent = (response.choices?.[0]?.message?.content as string) ?? "";

      // ── Parse action items from the JSON block ─────────────────────────────
      let briefingText = rawContent;
      const jsonSeparatorIdx = rawContent.lastIndexOf("---");
      if (jsonSeparatorIdx !== -1) {
        briefingText = rawContent.slice(0, jsonSeparatorIdx).trim();
        const jsonPart = rawContent.slice(jsonSeparatorIdx + 3).trim();
        try {
          const parsed = JSON.parse(jsonPart);
          if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
            const userId = ctx.user?.id ?? 0;
            const today = new Date().toISOString().slice(0, 10);
            await saveBriefingActions(
              parsed.actions.map((a: { text: string; category: string }) => ({
                actionText: a.text,
                section: a.category ?? "action",
                briefingDate: today,
                createdBy: userId,
              }))
            );
          }
        } catch {
          // JSON parsing failed — briefing still works, just no action items saved
        }
      }

      return {
        content: briefingText || rawContent,
        generatedAt: new Date().toISOString(),
      };
    }),

  /** Get recent briefing action items (last 30) with completion status */
  getActions: protectedProcedure.query(async () => {
    return getBriefingActions(30);
  }),

  /** Mark a briefing action item as complete */
  markDone: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const completedBy = ctx.user?.name ?? ctx.user?.email ?? "unknown";
      await completeBriefingAction(input.id, completedBy);
      return { success: true };
    }),
});
