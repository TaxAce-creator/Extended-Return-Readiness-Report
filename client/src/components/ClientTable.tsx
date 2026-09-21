// =============================================================================
// TaxAce Dashboard — Client Table Component
// Detailed view of clients in a selected workflow stage
// =============================================================================

import { type StageData, filterRecords, STATUS_COLORS, WORKFLOW_STAGES } from "@/lib/csvParser";
import { X, AlertTriangle, Calendar, User, FileText, ChevronDown, ChevronUp, StickyNote } from "lucide-react";
import { useState } from "react";
import { ClientActionPanel } from "./ClientActionPanel";

interface ClientTableProps {
  stage: StageData;
  assigneeFilter: string;
  returnTypeFilter: string;
  searchQuery: string;
  overdueOnly?: boolean;
  onClose: () => void;
}

const STAGE_COLORS_MAP = Object.fromEntries(
  WORKFLOW_STAGES.map((s) => [s.key, s.color])
);

type SortField = "client" | "assignee" | "dueDate" | "status" | "returnType";
type SortDir = "asc" | "desc";

export function ClientTable({
  stage,
  assigneeFilter,
  returnTypeFilter,
  searchQuery,
  overdueOnly = false,
  onClose,
}: ClientTableProps) {
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [actionPanelClient, setActionPanelClient] = useState<string | null>(null);

  let filtered = filterRecords(
    stage.records,
    assigneeFilter,
    returnTypeFilter,
    searchQuery
  );
  if (overdueOnly) filtered = filtered.filter((r) => r.isOverdue);

  const sorted = [...filtered].sort((a, b) => {
    let valA: string | number = "";
    let valB: string | number = "";

    if (sortField === "dueDate") {
      valA = a.dueDateObj?.getTime() ?? Infinity;
      valB = b.dueDateObj?.getTime() ?? Infinity;
    } else if (sortField === "client") {
      valA = a.client.toLowerCase();
      valB = b.client.toLowerCase();
    } else if (sortField === "assignee") {
      valA = a.assignee.toLowerCase();
      valB = b.assignee.toLowerCase();
    } else if (sortField === "status") {
      valA = a.status.toLowerCase();
      valB = b.status.toLowerCase();
    } else if (sortField === "returnType") {
      valA = a.returnType.toLowerCase();
      valB = b.returnType.toLowerCase();
    }

    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const stageColor = STAGE_COLORS_MAP[stage.stageKey] || "oklch(0.28 0.07 155)";

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return dateStr;
  };

  const overdueCount = filtered.filter((r) => r.isOverdue).length;

  return (
    <>
    <div
      className="rounded-xl overflow-hidden fade-in-up"
      style={{
        border: `1px solid oklch(0.89 0.015 85)`,
        boxShadow: "0 4px 24px oklch(0.28 0.07 155 / 0.1)",
        borderTop: `3px solid ${stageColor}`,
      }}
    >
      {/* Table header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ backgroundColor: "oklch(1 0 0)", borderBottom: "1px solid oklch(0.92 0.01 85)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-8 rounded-full"
            style={{ backgroundColor: stageColor }}
          />
          <div>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: "1rem",
                color: "oklch(0.22 0.07 155)",
                lineHeight: 1.2,
              }}
            >
              {stage.stageLabel}
            </h3>
            <div className="flex items-center gap-3 mt-0.5">
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.75rem",
                  color: "oklch(0.52 0.04 155)",
                }}
              >
                {filtered.length} client{filtered.length !== 1 ? "s" : ""}
              </span>
              {overdueCount > 0 && (
                <span
                  className="flex items-center gap-1"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.7rem",
                    color: "oklch(0.62 0.14 30)",
                  }}
                >
                  <AlertTriangle size={11} />
                  {overdueCount} overdue
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status breakdown pills */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {Object.entries(stage.statusBreakdown).map(([status, count]) => (
            <span
              key={status}
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${STATUS_COLORS[status] || "#6b7280"}18`,
                color: STATUS_COLORS[status] || "#6b7280",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.7rem",
              }}
            >
              {status}: {count}
            </span>
          ))}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: "oklch(0.52 0.04 155)" }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ backgroundColor: "oklch(0.99 0.004 85)" }}>
        {sorted.length === 0 ? (
          <div className="py-12 text-center">
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: "oklch(0.60 0.04 155)", fontSize: "0.9rem" }}>
              No clients match the current filters.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(0.91 0.01 85)" }}>
                <SortHeader
                  label="Client"
                  field="client"
                  current={sortField}
                  dir={sortDir}
                  onSort={handleSort}
                  icon={<User size={12} />}
                />
                <SortHeader
                  label="Assignee"
                  field="assignee"
                  current={sortField}
                  dir={sortDir}
                  onSort={handleSort}
                  icon={<User size={12} />}
                />
                <SortHeader
                  label="Due Date"
                  field="dueDate"
                  current={sortField}
                  dir={sortDir}
                  onSort={handleSort}
                  icon={<Calendar size={12} />}
                />
                <SortHeader
                  label="Return Type"
                  field="returnType"
                  current={sortField}
                  dir={sortDir}
                  onSort={handleSort}
                  icon={<FileText size={12} />}
                />
                <SortHeader
                  label="Status"
                  field="status"
                  current={sortField}
                  dir={sortDir}
                  onSort={handleSort}
                  icon={null}
                />
                <th className="px-4 py-2.5" style={{ backgroundColor: "oklch(0.97 0.006 85)" }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", fontWeight: 600, color: "oklch(0.45 0.04 155)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((record, idx) => (
                <tr
                  key={`${record.client}-${idx}`}
                  className="client-card transition-colors"
                  style={{
                    borderBottom: "1px solid oklch(0.93 0.008 85)",
                    backgroundColor: record.isOverdue
                      ? "oklch(0.99 0.01 30)"
                      : idx % 2 === 0
                      ? "oklch(1 0 0)"
                      : "oklch(0.99 0.004 85)",
                    borderLeft: record.isOverdue ? `3px solid oklch(0.62 0.14 30)` : "3px solid transparent",
                  }}
                >
                  {/* Client */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {record.isOverdue && (
                        <AlertTriangle size={12} style={{ color: "oklch(0.62 0.14 30)", flexShrink: 0 }} />
                      )}
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 500,
                          fontSize: "0.85rem",
                          color: "oklch(0.22 0.07 155)",
                        }}
                      >
                        {record.client}
                      </span>
                    </div>
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {record.assignee
                        .split(",")
                        .map((a) => a.trim())
                        .filter(Boolean)
                        .map((a, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: "oklch(0.92 0.03 155)",
                              color: "oklch(0.28 0.07 155)",
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "0.7rem",
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {a}
                          </span>
                        ))}
                    </div>
                  </td>

                  {/* Due Date */}
                  <td className="px-4 py-3">
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.8rem",
                        color: record.isOverdue
                          ? "oklch(0.62 0.14 30)"
                          : "oklch(0.40 0.04 155)",
                        fontWeight: record.isOverdue ? 600 : 400,
                      }}
                    >
                      {formatDate(record.dueDate)}
                      {record.isOverdue && " ⚠"}
                    </span>
                  </td>

                  {/* Return Type */}
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: "oklch(0.93 0.02 240)",
                        color: "oklch(0.35 0.1 240)",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                      }}
                    >
                      {record.returnType || "—"}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${STATUS_COLORS[record.status] || "#6b7280"}18`,
                        color: STATUS_COLORS[record.status] || "#6b7280",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "0.72rem",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {record.status}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActionPanelClient(record.client); }}
                      className="p-1.5 rounded-lg transition-colors"
                      title="Notes, Flags & Reminders"
                      style={{ color: "oklch(0.52 0.04 155)", backgroundColor: "oklch(0.93 0.01 85)" }}
                    >
                      <StickyNote size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
    {actionPanelClient && (
      <ClientActionPanel
        clientName={actionPanelClient}
        onClose={() => setActionPanelClient(null)}
      />
    )}
    </>
  );
}

function SortHeader({
  label,
  field,
  current,
  dir,
  onSort,
  icon,
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
  icon: React.ReactNode;
}) {
  const isActive = current === field;
  return (
    <th
      className="px-4 py-2.5 text-left cursor-pointer select-none hover:bg-gray-50 transition-colors"
      onClick={() => onSort(field)}
      style={{ backgroundColor: "oklch(0.97 0.006 85)" }}
    >
      <div className="flex items-center gap-1.5">
        {icon && <span style={{ color: "oklch(0.60 0.04 155)" }}>{icon}</span>}
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: isActive ? "oklch(0.28 0.07 155)" : "oklch(0.45 0.04 155)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
        {isActive ? (
          dir === "asc" ? (
            <ChevronUp size={12} style={{ color: "oklch(0.28 0.07 155)" }} />
          ) : (
            <ChevronDown size={12} style={{ color: "oklch(0.28 0.07 155)" }} />
          )
        ) : null}
      </div>
    </th>
  );
}
