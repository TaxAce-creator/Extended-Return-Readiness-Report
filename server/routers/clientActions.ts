// =============================================================================
// clientActions router
// Protected procedures for managing per-client notes, flags, and reminders.
// All operations are owner/manager-only (protectedProcedure).
// =============================================================================
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getClientNotes,
  addClientNote,
  deleteClientNote,
  getClientFlags,
  upsertClientFlags,
  getClientReminders,
  addClientReminder,
  dismissClientReminder,
  getDueReminders,
} from "../db";

export const clientActionsRouter = router({
  // ── Notes ──────────────────────────────────────────────────────────────────

  /** Get all notes for a specific client */
  getNotes: protectedProcedure
    .input(z.object({ clientName: z.string().min(1) }))
    .query(({ input }) => getClientNotes(input.clientName)),

  /** Add a new note for a client */
  addNote: protectedProcedure
    .input(
      z.object({
        clientName: z.string().min(1),
        note: z.string().min(1).max(2000),
        noteType: z
          .enum(["general", "escalation", "compliance", "reminder"])
          .default("general"),
      })
    )
    .mutation(({ input, ctx }) =>
      addClientNote({
        clientName: input.clientName,
        note: input.note,
        noteType: input.noteType,
        authorName: ctx.user.name ?? "Unknown",
        authorOpenId: ctx.user.openId,
      })
    ),

  /** Delete a note by ID (owner only) */
  deleteNote: protectedProcedure
    .input(z.object({ noteId: z.number().int().positive() }))
    .mutation(({ input }) => deleteClientNote(input.noteId)),

  // ── Flags ──────────────────────────────────────────────────────────────────

  /** Get flags for a specific client */
  getFlags: protectedProcedure
    .input(z.object({ clientName: z.string().min(1) }))
    .query(({ input }) => getClientFlags(input.clientName)),

  /** Upsert flags for a client (escalate, VIP, extension filed, do not contact) */
  updateFlags: protectedProcedure
    .input(
      z.object({
        clientName: z.string().min(1),
        isEscalated: z.boolean().optional(),
        isVip: z.boolean().optional(),
        extensionFiled: z.boolean().optional(),
        doNotContact: z.boolean().optional(),
      })
    )
    .mutation(({ input, ctx }) =>
      upsertClientFlags({
        clientName: input.clientName,
        isEscalated: input.isEscalated,
        isVip: input.isVip,
        extensionFiled: input.extensionFiled,
        doNotContact: input.doNotContact,
        escalatedBy: input.isEscalated ? (ctx.user.name ?? "Unknown") : undefined,
      })
    ),

  // ── Reminders ──────────────────────────────────────────────────────────────

  /** Get all active (non-dismissed) reminders for a client */
  getReminders: protectedProcedure
    .input(z.object({ clientName: z.string().min(1) }))
    .query(({ input }) => getClientReminders(input.clientName)),

  /** Get all reminders due today or earlier (for CEO View / Overview alerts) */
  getDueReminders: protectedProcedure
    .query(() => getDueReminders()),

  /** Add a reminder for a client */
  addReminder: protectedProcedure
    .input(
      z.object({
        clientName: z.string().min(1),
        reminderText: z.string().min(1).max(500),
        remindAt: z.date(),
      })
    )
    .mutation(({ input, ctx }) =>
      addClientReminder({
        clientName: input.clientName,
        reminderText: input.reminderText,
        remindAt: input.remindAt,
        createdBy: ctx.user.name ?? "Unknown",
      })
    ),

  /** Dismiss a reminder */
  dismissReminder: protectedProcedure
    .input(z.object({ reminderId: z.number().int().positive() }))
    .mutation(({ input }) => dismissClientReminder(input.reminderId)),
});
