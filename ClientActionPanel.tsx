// =============================================================================
// ClientActionPanel — Slide-over drawer for per-client notes, flags, reminders
// Premium dark glassmorphism style matching the TaxAce design system
// =============================================================================
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  X,
  StickyNote,
  Flag,
  Bell,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Star,
  FileText,
  PhoneOff,
  Calendar,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type NoteType = "general" | "escalation" | "compliance" | "reminder";

interface Props {
  clientName: string;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const NOTE_TYPE_META: Record<NoteType, { label: string; color: string; icon: React.ReactNode }> = {
  general: {
    label: "General",
    color: "text-[var(--ta-cream)] bg-white/10",
    icon: <StickyNote className="w-3 h-3" />,
  },
  escalation: {
    label: "Escalation",
    color: "text-red-300 bg-red-900/30",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  compliance: {
    label: "Compliance",
    color: "text-amber-300 bg-amber-900/30",
    icon: <FileText className="w-3 h-3" />,
  },
  reminder: {
    label: "Reminder",
    color: "text-blue-300 bg-blue-900/30",
    icon: <Bell className="w-3 h-3" />,
  },
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateOnly(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ClientActionPanel({ clientName, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"notes" | "flags" | "reminders">("notes");
  const [newNote, setNewNote] = useState("");
  const [newNoteType, setNewNoteType] = useState<NoteType>("general");
  const [newReminderText, setNewReminderText] = useState("");
  const [newReminderDate, setNewReminderDate] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  // ── Data queries ──────────────────────────────────────────────────────────

  const { data: notes = [], isLoading: notesLoading } = trpc.clientActions.getNotes.useQuery(
    { clientName },
    { enabled: !!clientName }
  );

  const { data: flags, isLoading: flagsLoading } = trpc.clientActions.getFlags.useQuery(
    { clientName },
    { enabled: !!clientName }
  );

  const { data: reminders = [], isLoading: remindersLoading } = trpc.clientActions.getReminders.useQuery(
    { clientName },
    { enabled: !!clientName }
  );

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addNote = trpc.clientActions.addNote.useMutation({
    onSuccess: () => {
      utils.clientActions.getNotes.invalidate({ clientName });
      setNewNote("");
      toast.success("Note added");
    },
    onError: (e) => toast.error(`Failed to add note: ${e.message}`),
  });

  const deleteNote = trpc.clientActions.deleteNote.useMutation({
    onSuccess: () => {
      utils.clientActions.getNotes.invalidate({ clientName });
      toast.success("Note deleted");
    },
    onError: (e) => toast.error(`Failed to delete note: ${e.message}`),
  });

  const updateFlags = trpc.clientActions.updateFlags.useMutation({
    onSuccess: () => {
      utils.clientActions.getFlags.invalidate({ clientName });
    },
    onError: (e) => toast.error(`Failed to update flag: ${e.message}`),
  });

  const addReminder = trpc.clientActions.addReminder.useMutation({
    onSuccess: () => {
      utils.clientActions.getReminders.invalidate({ clientName });
      setNewReminderText("");
      setNewReminderDate("");
      toast.success("Reminder set");
    },
    onError: (e) => toast.error(`Failed to add reminder: ${e.message}`),
  });

  const dismissReminder = trpc.clientActions.dismissReminder.useMutation({
    onSuccess: () => {
      utils.clientActions.getReminders.invalidate({ clientName });
      toast.success("Reminder dismissed");
    },
    onError: (e) => toast.error(`Failed to dismiss reminder: ${e.message}`),
  });

  // ── Close on outside click ─────────────────────────────────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleAddNote() {
    if (!newNote.trim()) return;
    addNote.mutate({ clientName, note: newNote.trim(), noteType: newNoteType });
  }

  function handleToggleFlag(field: "isEscalated" | "isVip" | "extensionFiled" | "doNotContact") {
    const current = flags?.[field] ?? false;
    updateFlags.mutate({ clientName, [field]: !current });
  }

  function handleAddReminder() {
    if (!newReminderText.trim() || !newReminderDate) return;
    addReminder.mutate({
      clientName,
      reminderText: newReminderText.trim(),
      remindAt: new Date(newReminderDate),
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabs = [
    { id: "notes" as const, label: "Notes", icon: <StickyNote className="w-4 h-4" />, count: notes.length },
    { id: "flags" as const, label: "Flags", icon: <Flag className="w-4 h-4" /> },
    { id: "reminders" as const, label: "Reminders", icon: <Bell className="w-4 h-4" />, count: reminders.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        style={{
          background: "linear-gradient(135deg, rgba(18,24,16,0.98) 0%, rgba(22,30,20,0.98) 100%)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--ta-gold)] font-semibold mb-1">
              Client Actions
            </p>
            <h2 className="text-lg font-semibold text-[var(--ta-cream)] leading-tight">
              {clientName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-[var(--ta-gold)] border-b-2 border-[var(--ta-gold)]"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === tab.id
                      ? "bg-[var(--ta-gold)] text-[var(--ta-forest)]"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── NOTES TAB ── */}
          {activeTab === "notes" && (
            <>
              {/* Add note form */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <p className="text-xs uppercase tracking-widest text-white/40 font-semibold">Add Note</p>
                <select
                  value={newNoteType}
                  onChange={(e) => setNewNoteType(e.target.value as NoteType)}
                  className="w-full text-sm rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-[var(--ta-cream)] focus:outline-none focus:border-[var(--ta-gold)]"
                >
                  <option value="general">General</option>
                  <option value="escalation">Escalation</option>
                  <option value="compliance">Compliance (Circular 230)</option>
                  <option value="reminder">Reminder</option>
                </select>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter note..."
                  rows={3}
                  className="w-full text-sm rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-[var(--ta-cream)] placeholder-white/30 focus:outline-none focus:border-[var(--ta-gold)] resize-none"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addNote.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, var(--ta-gold) 0%, #c8a84b 100%)",
                    color: "var(--ta-forest)",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  {addNote.isPending ? "Adding..." : "Add Note"}
                </button>
              </div>

              {/* Notes list */}
              {notesLoading ? (
                <div className="text-center text-white/40 py-8 text-sm">Loading notes...</div>
              ) : notes.length === 0 ? (
                <div className="text-center text-white/30 py-8 text-sm">
                  <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No notes yet
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => {
                    const meta = NOTE_TYPE_META[note.noteType as NoteType] ?? NOTE_TYPE_META.general;
                    return (
                      <div
                        key={note.id}
                        className="rounded-xl p-4 space-y-2"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${meta.color}`}
                          >
                            {meta.icon}
                            {meta.label}
                          </span>
                          <button
                            onClick={() => deleteNote.mutate({ noteId: note.id })}
                            className="p-1 rounded text-white/30 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-sm text-[var(--ta-cream)] leading-relaxed">{note.note}</p>
                        <p className="text-xs text-white/30">
                          {note.authorName} · {formatDate(note.createdAt)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── FLAGS TAB ── */}
          {activeTab === "flags" && (
            <>
              {flagsLoading ? (
                <div className="text-center text-white/40 py-8 text-sm">Loading flags...</div>
              ) : (
                <div className="space-y-3">
                  {[
                    {
                      field: "isEscalated" as const,
                      label: "Escalated",
                      desc: "Mark this client as requiring immediate attention",
                      icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
                      activeColor: "border-red-500/40 bg-red-900/20",
                    },
                    {
                      field: "isVip" as const,
                      label: "VIP Client",
                      desc: "High-value client requiring white-glove service",
                      icon: <Star className="w-5 h-5 text-amber-400" />,
                      activeColor: "border-amber-500/40 bg-amber-900/20",
                    },
                    {
                      field: "extensionFiled" as const,
                      label: "Extension Filed",
                      desc: "Tax extension has been filed for this client",
                      icon: <FileText className="w-5 h-5 text-blue-400" />,
                      activeColor: "border-blue-500/40 bg-blue-900/20",
                    },
                    {
                      field: "doNotContact" as const,
                      label: "Do Not Contact",
                      desc: "Do not reach out to this client without authorization",
                      icon: <PhoneOff className="w-5 h-5 text-purple-400" />,
                      activeColor: "border-purple-500/40 bg-purple-900/20",
                    },
                  ].map(({ field, label, desc, icon, activeColor }) => {
                    const isActive = flags?.[field] ?? false;
                    return (
                      <button
                        key={field}
                        onClick={() => handleToggleFlag(field)}
                        disabled={updateFlags.isPending}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                          isActive
                            ? activeColor
                            : "border-white/08 bg-white/04 hover:bg-white/08"
                        }`}
                        style={
                          !isActive
                            ? { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }
                            : {}
                        }
                      >
                        <div className="flex-shrink-0">{icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--ta-cream)]">{label}</p>
                          <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                          {field === "isEscalated" && isActive && flags?.escalatedAt && (
                            <p className="text-xs text-red-300 mt-1">
                              Escalated by {flags.escalatedBy ?? "unknown"} on {formatDateOnly(flags.escalatedAt)}
                            </p>
                          )}
                        </div>
                        <div
                          className={`w-10 h-6 rounded-full flex items-center transition-all flex-shrink-0 ${
                            isActive ? "bg-[var(--ta-gold)] justify-end pr-1" : "bg-white/10 justify-start pl-1"
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── REMINDERS TAB ── */}
          {activeTab === "reminders" && (
            <>
              {/* Add reminder form */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <p className="text-xs uppercase tracking-widest text-white/40 font-semibold">Set Reminder</p>
                <input
                  type="text"
                  value={newReminderText}
                  onChange={(e) => setNewReminderText(e.target.value)}
                  placeholder="Reminder text..."
                  className="w-full text-sm rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-[var(--ta-cream)] placeholder-white/30 focus:outline-none focus:border-[var(--ta-gold)]"
                />
                <input
                  type="datetime-local"
                  value={newReminderDate}
                  onChange={(e) => setNewReminderDate(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-[var(--ta-cream)] focus:outline-none focus:border-[var(--ta-gold)]"
                  style={{ colorScheme: "dark" }}
                />
                <button
                  onClick={handleAddReminder}
                  disabled={!newReminderText.trim() || !newReminderDate || addReminder.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, var(--ta-gold) 0%, #c8a84b 100%)",
                    color: "var(--ta-forest)",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  {addReminder.isPending ? "Setting..." : "Set Reminder"}
                </button>
              </div>

              {/* Reminders list */}
              {remindersLoading ? (
                <div className="text-center text-white/40 py-8 text-sm">Loading reminders...</div>
              ) : reminders.length === 0 ? (
                <div className="text-center text-white/30 py-8 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No active reminders
                </div>
              ) : (
                <div className="space-y-3">
                  {reminders.map((reminder) => {
                    const isPast = new Date(reminder.remindAt) <= new Date();
                    return (
                      <div
                        key={reminder.id}
                        className={`rounded-xl p-4 space-y-2 ${
                          isPast
                            ? "border border-red-500/30 bg-red-900/10"
                            : "border border-white/08 bg-white/04"
                        }`}
                        style={!isPast ? { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" } : {}}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Calendar className={`w-4 h-4 flex-shrink-0 ${isPast ? "text-red-400" : "text-blue-400"}`} />
                            <p className="text-sm text-[var(--ta-cream)] leading-snug">{reminder.reminderText}</p>
                          </div>
                          <button
                            onClick={() => dismissReminder.mutate({ reminderId: reminder.id })}
                            className="p-1 rounded text-white/30 hover:text-green-400 hover:bg-green-900/20 transition-colors flex-shrink-0"
                            title="Dismiss"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className={`text-xs ${isPast ? "text-red-300" : "text-white/40"}`}>
                          {isPast ? "⚠ Due: " : "Due: "}{formatDate(reminder.remindAt)}
                        </p>
                        {reminder.createdBy && (
                          <p className="text-xs text-white/25">Set by {reminder.createdBy}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
