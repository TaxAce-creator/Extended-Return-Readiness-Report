// =============================================================================
// ClientLookup — Client Journey Tab
// Search any client name and see their complete record:
// stage, assignee, return type, due date, overdue status, and all tasks
// =============================================================================

import { useState, useMemo } from "react";
import { type DashboardData, type TaxRecord, WORKFLOW_STAGES, STATUS_COLORS } from "@/lib/csvParser";
import { Search, User, AlertTriangle, CheckCircle2, Clock, FileText, Calendar, ChevronDown, ChevronUp, Timer, StickyNote } from "lucide-react";
import { ClientActionPanel } from "./ClientActionPanel";

// ─── Stuck client detection ──────────────────────────────────────────────────
// A task is "stuck" if it is overdue AND the due date has already passed by
// more than STUCK_THRESHOLD_DAYS days (i.e., it has been sitting past its
// deadline for a meaningful period without moving forward).
const STUCK_THRESHOLD_DAYS = 14;

function getDaysOverdue(dueDate: string | undefined): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return null;
  const diffMs = Date.now() - due.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days > 0 ? days : null;
}

interface ClientLookupProps {
  data: DashboardData;
}

interface ClientSummary {
  name: string;
  tasks: TaxRecord[];
  currentStages: string[];
  assignees: string[];
  returnTypes: string[];
  dueDates: string[];
  overdueCount: number;
  hasOverdue: boolean;
  latestStageIndex: number;
  isStuck: boolean;       // true if any task is overdue by 14+ days
  maxDaysOverdue: number; // highest days-overdue value across all tasks
}

function buildClientMap(data: DashboardData): Map<string, ClientSummary> {
  const map = new Map<string, ClientSummary>();

  data.rawRecords.forEach((record) => {
    const name = record.client.trim();
    if (!name) return;

    if (!map.has(name)) {
      map.set(name, {
        name,
        tasks: [],
        currentStages: [],
        assignees: [],
        returnTypes: [],
        dueDates: [],
        overdueCount: 0,
        hasOverdue: false,
        latestStageIndex: -1,
        isStuck: false,
        maxDaysOverdue: 0,
      });
    }

    const summary = map.get(name)!;
    summary.tasks.push(record);

    if (!summary.currentStages.includes(record.task)) {
      summary.currentStages.push(record.task);
    }

    record.assignee.split(",").forEach((a) => {
      const trimmed = a.trim();
      if (trimmed && !summary.assignees.includes(trimmed)) {
        summary.assignees.push(trimmed);
      }
    });

    if (record.returnType && !summary.returnTypes.includes(record.returnType)) {
      summary.returnTypes.push(record.returnType);
    }

    if (record.dueDate && !summary.dueDates.includes(record.dueDate)) {
      summary.dueDates.push(record.dueDate);
    }

    if (record.isOverdue) {
      summary.overdueCount++;
      summary.hasOverdue = true;
      const daysOver = getDaysOverdue(record.dueDate);
      if (daysOver !== null) {
        if (daysOver > summary.maxDaysOverdue) summary.maxDaysOverdue = daysOver;
        if (daysOver >= STUCK_THRESHOLD_DAYS) summary.isStuck = true;
      }
    }

    // Find the furthest stage index this client has reached
    const stageIdx = WORKFLOW_STAGES.findIndex(
      (s) => s.key.toLowerCase() === record.task.toLowerCase()
    );
    if (stageIdx > summary.latestStageIndex) {
      summary.latestStageIndex = stageIdx;
    }
  });

  return map;
}

function getProgressPercent(latestStageIndex: number): number {
  if (latestStageIndex < 0) return 0;
  return Math.round(((latestStageIndex + 1) / WORKFLOW_STAGES.length) * 100);
}

function getProgressColor(percent: number, hasOverdue: boolean): string {
  if (hasOverdue) return "#dc2626";
  if (percent >= 80) return "#16a34a";
  if (percent >= 50) return "#2563eb";
  return "#d97706";
}

export function ClientLookup({ data }: ClientLookupProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [actionPanelClient, setActionPanelClient] = useState<string | null>(null);

  const clientMap = useMemo(() => buildClientMap(data), [data]);

  const allClients = useMemo(
    () => Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    [clientMap]
  );

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return allClients;
    const q = searchQuery.toLowerCase();
    return allClients.filter((c) => c.name.toLowerCase().includes(q));
  }, [allClients, searchQuery]);

  const selectedSummary = selectedClient ? clientMap.get(selectedClient) : null;

  const stageOrder = useMemo(() => {
    const order = new Map<string, number>();
    WORKFLOW_STAGES.forEach((s, i) => order.set(s.key.toLowerCase(), i));
    return order;
  }, []);

  const sortedTasks = useMemo(() => {
    if (!selectedSummary) return [];
    return [...selectedSummary.tasks].sort((a, b) => {
      const ai = stageOrder.get(a.task.toLowerCase()) ?? 999;
      const bi = stageOrder.get(b.task.toLowerCase()) ?? 999;
      return ai - bi;
    });
  }, [selectedSummary, stageOrder]);

  return (
    <div className="space-y-5">
      {/* Search Header */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, oklch(0.22 0.07 155), oklch(0.28 0.07 155))",
          boxShadow: "0 4px 24px oklch(0.22 0.07 155 / 0.25)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "oklch(1 0 0 / 0.15)" }}
          >
            <Search size={20} color="white" />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "white",
                lineHeight: 1.2,
              }}
            >
              Client Lookup
            </h2>
            <p style={{ fontSize: "0.8rem", color: "oklch(0.85 0.04 155)", marginTop: 2 }}>
              {allClients.length} clients in pipeline — search by name to view full journey
            </p>
          </div>
        </div>

        <div className="relative">
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "oklch(0.6 0.04 155)",
            }}
          />
          <input
            type="text"
            placeholder="Type a client name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedClient(null);
            }}
            style={{
              width: "100%",
              padding: "12px 14px 12px 40px",
              borderRadius: 12,
              border: "1px solid oklch(0.88 0.015 85)",
              backgroundColor: "white",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.9rem",
              color: "oklch(0.22 0.07 155)",
              outline: "none",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Client List */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: "1px solid oklch(0.88 0.015 85)",
            backgroundColor: "white",
            boxShadow: "0 2px 12px oklch(0.22 0.07 155 / 0.06)",
            maxHeight: 600,
            overflowY: "auto",
          }}
        >
          <div
            className="px-4 py-3 sticky top-0"
            style={{
              borderBottom: "1px solid oklch(0.93 0.015 85)",
              backgroundColor: "oklch(0.97 0.008 85)",
            }}
          >
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "oklch(0.45 0.05 155)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {filteredClients.length} {filteredClients.length === 1 ? "Client" : "Clients"}
            </span>
          </div>

          {filteredClients.length === 0 ? (
            <div className="p-8 text-center">
              <User size={32} style={{ color: "oklch(0.75 0.02 85)", margin: "0 auto 8px" }} />
              <p style={{ fontSize: "0.85rem", color: "oklch(0.55 0.03 85)" }}>No clients found</p>
            </div>
          ) : (
            filteredClients.map((client) => {
              const isSelected = selectedClient === client.name;
              const progress = getProgressPercent(client.latestStageIndex);
              const progressColor = getProgressColor(progress, client.hasOverdue);

              return (
                <button
                  key={client.name}
                  onClick={() => setSelectedClient(isSelected ? null : client.name)}
                  className="w-full text-left px-4 py-3 transition-all"
                  style={{
                    borderBottom: "1px solid oklch(0.95 0.008 85)",
                    backgroundColor: isSelected ? "oklch(0.95 0.02 155)" : "transparent",
                    borderLeft: isSelected ? "3px solid oklch(0.28 0.07 155)" : "3px solid transparent",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: isSelected ? 600 : 500,
                        color: "oklch(0.22 0.07 155)",
                      }}
                    >
                      {client.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {client.isStuck && (
                        <span
                          style={{
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 20,
                            backgroundColor: "oklch(0.55 0.18 30)",
                            color: "white",
                            letterSpacing: "0.04em",
                          }}
                        >
                          STUCK
                        </span>
                      )}
                      {client.hasOverdue && !client.isStuck && (
                        <AlertTriangle size={13} style={{ color: "#dc2626", flexShrink: 0 }} />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: "oklch(0.92 0.01 85)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${progress}%`,
                          height: "100%",
                          backgroundColor: progressColor,
                          borderRadius: 2,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "oklch(0.55 0.03 85)", flexShrink: 0 }}>
                      {progress}%
                    </span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "oklch(0.55 0.03 85)", marginTop: 2 }}>
                    {client.tasks.length} task{client.tasks.length !== 1 ? "s" : ""} · {client.returnTypes.join(", ") || "—"}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Client Detail Panel */}
        <div className="lg:col-span-2">
          {!selectedSummary ? (
            <div
              className="rounded-2xl flex flex-col items-center justify-center"
              style={{
                border: "1px dashed oklch(0.82 0.02 85)",
                backgroundColor: "oklch(0.98 0.005 85)",
                minHeight: 400,
                padding: 40,
              }}
            >
              <User size={48} style={{ color: "oklch(0.78 0.02 85)", marginBottom: 16 }} />
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.1rem",
                  color: "oklch(0.55 0.03 85)",
                  textAlign: "center",
                }}
              >
                Select a client to view their full journey
              </p>
              <p style={{ fontSize: "0.82rem", color: "oklch(0.65 0.02 85)", marginTop: 8, textAlign: "center" }}>
                Click any name in the list, or search above to find a specific client
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Client Header Card */}
              <div
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: "white",
                  border: "1px solid oklch(0.88 0.015 85)",
                  boxShadow: "0 2px 12px oklch(0.22 0.07 155 / 0.06)",
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "1.3rem",
                        fontWeight: 700,
                        color: "oklch(0.22 0.07 155)",
                      }}
                    >
                      {selectedSummary.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {selectedSummary.returnTypes.map((rt) => (
                        <span
                          key={rt}
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "2px 10px",
                            borderRadius: 20,
                            backgroundColor: "oklch(0.93 0.02 155)",
                            color: "oklch(0.28 0.07 155)",
                          }}
                        >
                          {rt}
                        </span>
                      ))}
                      {selectedSummary.isStuck && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "2px 10px",
                            borderRadius: 20,
                            backgroundColor: "oklch(0.55 0.18 30)",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Timer size={11} />
                          STUCK — {selectedSummary.maxDaysOverdue}d overdue
                        </span>
                      )}
                      {selectedSummary.hasOverdue && !selectedSummary.isStuck && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "2px 10px",
                            borderRadius: 20,
                            backgroundColor: "#fef2f2",
                            color: "#dc2626",
                          }}
                        >
                          {selectedSummary.overdueCount} Overdue
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => setActionPanelClient(selectedSummary.name)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                      style={{
                        background: "linear-gradient(135deg, oklch(0.28 0.07 155) 0%, oklch(0.22 0.07 155) 100%)",
                        color: "white",
                        border: "1px solid oklch(0.35 0.07 155)",
                        flexShrink: 0,
                      }}
                    >
                      <StickyNote size={14} />
                      Actions
                    </button>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "1.8rem",
                        fontWeight: 700,
                        color: getProgressColor(
                          getProgressPercent(selectedSummary.latestStageIndex),
                          selectedSummary.hasOverdue
                        ),
                        lineHeight: 1,
                      }}
                    >
                      {getProgressPercent(selectedSummary.latestStageIndex)}%
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "oklch(0.55 0.03 85)", marginTop: 2 }}>
                      pipeline progress
                    </div>
                  </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "oklch(0.93 0.01 85)",
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: `${getProgressPercent(selectedSummary.latestStageIndex)}%`,
                      height: "100%",
                      backgroundColor: getProgressColor(
                        getProgressPercent(selectedSummary.latestStageIndex),
                        selectedSummary.hasOverdue
                      ),
                      borderRadius: 4,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>

                {/* Meta Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetaCard
                    icon={<User size={14} />}
                    label="Assigned To"
                    value={selectedSummary.assignees.join(", ") || "—"}
                  />
                  <MetaCard
                    icon={<FileText size={14} />}
                    label="Return Type"
                    value={selectedSummary.returnTypes.join(", ") || "—"}
                  />
                  <MetaCard
                    icon={<Calendar size={14} />}
                    label="Due Date(s)"
                    value={selectedSummary.dueDates.join(", ") || "—"}
                  />
                  <MetaCard
                    icon={<Clock size={14} />}
                    label="Active Tasks"
                    value={`${selectedSummary.tasks.length} task${selectedSummary.tasks.length !== 1 ? "s" : ""}`}
                  />
                </div>
              </div>

              {/* Task Timeline */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: "white",
                  border: "1px solid oklch(0.88 0.015 85)",
                  boxShadow: "0 2px 12px oklch(0.22 0.07 155 / 0.06)",
                }}
              >
                <div
                  className="px-5 py-3"
                  style={{ borderBottom: "1px solid oklch(0.93 0.015 85)" }}
                >
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "oklch(0.45 0.05 155)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Task Timeline — {sortedTasks.length} Active Task{sortedTasks.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="divide-y divide-stone-100">
                  {sortedTasks.map((task, idx) => {
                    const stageIdx = WORKFLOW_STAGES.findIndex(
                      (s) => s.key.toLowerCase() === task.task.toLowerCase()
                    );
                    const stage = stageIdx >= 0 ? WORKFLOW_STAGES[stageIdx] : null;
                    const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS["No status"];
                    const isExpanded = expandedTask === `${task.task}-${idx}`;

                    return (
                      <div key={`${task.task}-${idx}`}>
                        <button
                          onClick={() =>
                            setExpandedTask(isExpanded ? null : `${task.task}-${idx}`)
                          }
                          className="w-full text-left px-5 py-4 transition-all"
                          style={{
                            backgroundColor: isExpanded ? "oklch(0.97 0.008 85)" : "transparent",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {/* Stage Number */}
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                backgroundColor: stage ? stage.color : "#6b7280",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "white" }}>
                                {stageIdx >= 0 ? stageIdx + 1 : "?"}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    color: "oklch(0.22 0.07 155)",
                                  }}
                                >
                                  {stage?.short || task.task}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 600,
                                    padding: "2px 8px",
                                    borderRadius: 20,
                                    backgroundColor: `${statusColor}18`,
                                    color: statusColor,
                                    border: `1px solid ${statusColor}30`,
                                  }}
                                >
                                  {task.status || "No status"}
                                </span>
                                {task.isOverdue && (
                                  <span
                                    style={{
                                      fontSize: "0.72rem",
                                      fontWeight: 600,
                                      padding: "2px 8px",
                                      borderRadius: 20,
                                      backgroundColor: "#fef2f2",
                                      color: "#dc2626",
                                    }}
                                  >
                                    Overdue
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "oklch(0.55 0.03 85)",
                                  marginTop: 2,
                                }}
                              >
                                {task.assignee || "Unassigned"} · Due: {task.dueDate || "—"}
                              </div>
                            </div>

                            {isExpanded ? (
                              <ChevronUp size={14} style={{ color: "oklch(0.55 0.03 85)", flexShrink: 0 }} />
                            ) : (
                              <ChevronDown size={14} style={{ color: "oklch(0.55 0.03 85)", flexShrink: 0 }} />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div
                            className="px-5 pb-4"
                            style={{ backgroundColor: "oklch(0.97 0.008 85)" }}
                          >
                            <div
                              className="rounded-xl p-4 grid grid-cols-2 gap-3"
                              style={{
                                backgroundColor: "white",
                                border: "1px solid oklch(0.9 0.01 85)",
                              }}
                            >
                              <DetailRow label="Full Stage Name" value={task.task} />
                              <DetailRow label="Task Type" value={task.taskType || "—"} />
                              <DetailRow label="Assignee" value={task.assignee || "Unassigned"} />
                              <DetailRow label="Due Date" value={task.dueDate || "—"} />
                              <DetailRow label="Return Type" value={task.returnType || "—"} />
                              <DetailRow label="Tax Year" value={task.taxYear || "—"} />
                              {task.parentTask && (
                                <DetailRow label="Parent Task" value={task.parentTask} />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Client Action Panel slide-over */}
      {actionPanelClient && (
        <ClientActionPanel
          clientName={actionPanelClient}
          onClose={() => setActionPanelClient(null)}
        />
      )}
    </div>
  );
}

function MetaCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ backgroundColor: "oklch(0.97 0.008 85)", border: "1px solid oklch(0.92 0.01 85)" }}
    >
      <div className="flex items-center gap-1.5 mb-1" style={{ color: "oklch(0.55 0.04 155)" }}>
        {icon}
        <span style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: "0.82rem",
          fontWeight: 600,
          color: "oklch(0.22 0.07 155)",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "oklch(0.55 0.04 155)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: "0.82rem", color: "oklch(0.25 0.06 155)", wordBreak: "break-word" }}>
        {value}
      </div>
    </div>
  );
}
