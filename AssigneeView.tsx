// =============================================================================
// TaxAce Dashboard — Assignee Workload View v2
// Shows each tax preparer's task distribution across all 23 workflow stages
// Tier 2: Premium card design, better capacity badges, improved stage breakdown
// =============================================================================

import { useMemo, useState } from "react";
import { type DashboardData, type TaxRecord, WORKFLOW_STAGES, filterRecords } from "@/lib/csvParser";
import { AlertTriangle, ChevronDown, ChevronUp, Users, TrendingUp } from "lucide-react";

interface AssigneeViewProps {
  data: DashboardData;
  returnTypeFilter: string;
  searchQuery: string;
  overdueOnly?: boolean;
}

interface AssigneeStats {
  name: string;
  total: number;
  overdue: number;
  stageBreakdown: { stageShort: string; stageLabel: string; count: number; overdue: number; color: string }[];
  records: TaxRecord[];
}

export function AssigneeView({ data, returnTypeFilter, searchQuery, overdueOnly = false }: AssigneeViewProps) {
  const [expandedAssignee, setExpandedAssignee] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"total" | "overdue" | "name">("total");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const assigneeStats = useMemo<AssigneeStats[]>(() => {
    const map = new Map<string, TaxRecord[]>();

    data.rawRecords.forEach((record) => {
      const passes = filterRecords([record], "all", returnTypeFilter, searchQuery).length > 0;
      if (!passes) return;
      if (overdueOnly && !record.isOverdue) return;

      const assignees = record.assignee
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      if (assignees.length === 0) {
        const key = "Unassigned";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(record);
      } else {
        assignees.forEach((a) => {
          if (!map.has(a)) map.set(a, []);
          map.get(a)!.push(record);
        });
      }
    });

    return Array.from(map.entries()).map(([name, records]) => {
      const overdue = records.filter((r) => r.isOverdue).length;

      const stageBreakdown = WORKFLOW_STAGES.map((s) => {
        const stageRecords = records.filter(
          (r) => r.task.trim().toLowerCase() === s.key.toLowerCase()
        );
        return {
          stageShort: s.short,
          stageLabel: s.label,
          count: stageRecords.length,
          overdue: stageRecords.filter((r) => r.isOverdue).length,
          color: s.color,
        };
      }).filter((s) => s.count > 0);

      return { name, total: records.length, overdue, stageBreakdown, records };
    });
  }, [data, returnTypeFilter, searchQuery, overdueOnly]);

  const sorted = useMemo(() => {
    return [...assigneeStats].sort((a, b) => {
      let diff = 0;
      if (sortBy === "total") diff = a.total - b.total;
      else if (sortBy === "overdue") diff = a.overdue - b.overdue;
      else diff = a.name.localeCompare(b.name);
      return sortDir === "desc" ? -diff : diff;
    });
  }, [assigneeStats, sortBy, sortDir]);

  const handleSort = (field: "total" | "overdue" | "name") => {
    if (sortBy === field) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  const maxTotal = Math.max(...sorted.map((a) => a.total), 1);
  const avgTotal = sorted.length > 0 ? sorted.reduce((s, a) => s + a.total, 0) / sorted.length : 0;

  const getCapacityLabel = (total: number): { label: string; color: string; bg: string; border: string } => {
    if (total > avgTotal * 1.5) return {
      label: "Overloaded",
      color: "oklch(0.50 0.20 25)",
      bg: "oklch(0.96 0.04 25)",
      border: "oklch(0.80 0.10 25)",
    };
    if (total > avgTotal * 1.2) return {
      label: "High",
      color: "oklch(0.58 0.16 60)",
      bg: "oklch(0.96 0.04 60)",
      border: "oklch(0.80 0.10 60)",
    };
    if (total < avgTotal * 0.5) return {
      label: "Light",
      color: "oklch(0.45 0.12 240)",
      bg: "oklch(0.95 0.03 240)",
      border: "oklch(0.80 0.08 240)",
    };
    return {
      label: "Normal",
      color: "oklch(0.35 0.12 155)",
      bg: "oklch(0.94 0.03 155)",
      border: "oklch(0.78 0.07 155)",
    };
  };

  const toggleExpand = (name: string) => {
    setExpandedAssignee(expandedAssignee === name ? null : name);
  };

  const totalTasks = sorted.reduce((s, a) => s + a.total, 0);
  const totalOverdue = sorted.reduce((s, a) => s + a.overdue, 0);

  return (
    <div
      className="rounded-2xl overflow-hidden fade-in-up"
      style={{
        border: "1px solid oklch(0.89 0.015 85)",
        boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.07), 0 1px 3px oklch(0.28 0.07 155 / 0.04)",
        backgroundColor: "oklch(1 0 0)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between flex-wrap gap-3"
        style={{
          background: "linear-gradient(135deg, oklch(0.97 0.012 155), oklch(0.99 0.005 85))",
          borderBottom: "1px solid oklch(0.91 0.012 85)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.35 0.08 155))",
              boxShadow: "0 2px 8px oklch(0.28 0.07 155 / 0.30)",
            }}
          >
            <Users size={16} color="oklch(0.75 0.14 75)" />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: "1.1rem",
                color: "oklch(0.22 0.07 155)",
                lineHeight: 1.2,
              }}
            >
              Workload by Assignee
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.76rem",
                color: "oklch(0.52 0.04 155)",
                marginTop: "2px",
              }}
            >
              {sorted.length} preparers · {totalTasks} total tasks · {totalOverdue} overdue
            </p>
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "oklch(0.55 0.04 155)" }}>
            Sort:
          </span>
          {(["total", "overdue", "name"] as const).map((field) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.72rem",
                fontWeight: sortBy === field ? 700 : 500,
                backgroundColor: sortBy === field ? "oklch(0.28 0.07 155)" : "oklch(0.94 0.012 85)",
                color: sortBy === field ? "white" : "oklch(0.48 0.04 155)",
                border: "1px solid transparent",
              }}
            >
              {field.charAt(0).toUpperCase() + field.slice(1)}
              {sortBy === field && (
                sortDir === "desc" ? <ChevronDown size={11} /> : <ChevronUp size={11} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Assignee rows */}
      <div>
        {sorted.length === 0 ? (
          <div className="py-12 text-center">
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: "oklch(0.60 0.04 155)", fontSize: "0.9rem" }}>
              No data matches current filters.
            </p>
          </div>
        ) : (
          sorted.map((assignee, idx) => {
            const isExpanded = expandedAssignee === assignee.name;
            const barPct = (assignee.total / maxTotal) * 100;
            const overduePct = assignee.total > 0 ? (assignee.overdue / assignee.total) * 100 : 0;
            const cap = getCapacityLabel(assignee.total);
            const initials = assignee.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

            return (
              <div key={assignee.name}>
                {/* Main row */}
                <button
                  onClick={() => toggleExpand(assignee.name)}
                  className="w-full text-left px-5 py-3.5 transition-all focus:outline-none group"
                  style={{
                    backgroundColor: isExpanded
                      ? "oklch(0.97 0.012 155)"
                      : idx % 2 === 0
                      ? "oklch(1 0 0)"
                      : "oklch(0.99 0.004 85)",
                    borderBottom: "1px solid oklch(0.93 0.008 85)",
                    borderLeft: isExpanded ? "3px solid oklch(0.28 0.07 155)" : "3px solid transparent",
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
                      style={{
                        background: isExpanded
                          ? "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.35 0.08 155))"
                          : "oklch(0.93 0.025 155)",
                        color: isExpanded ? "white" : "oklch(0.28 0.07 155)",
                        boxShadow: isExpanded ? "0 2px 8px oklch(0.28 0.07 155 / 0.25)" : "none",
                      }}
                    >
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", fontWeight: 700 }}>
                        {initials}
                      </span>
                    </div>

                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: isExpanded ? "oklch(0.20 0.07 155)" : "oklch(0.28 0.06 155)",
                          }}
                        >
                          {assignee.name}
                        </span>
                        <div className="flex items-center gap-2.5">
                          {/* Capacity badge */}
                          <span
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "0.67rem",
                              fontWeight: 700,
                              color: cap.color,
                              backgroundColor: cap.bg,
                              border: `1px solid ${cap.border}`,
                              borderRadius: "6px",
                              padding: "1px 7px",
                              letterSpacing: "0.03em",
                            }}
                          >
                            {cap.label}
                          </span>
                          {assignee.overdue > 0 && (
                            <span
                              className="flex items-center gap-1"
                              style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                color: "oklch(0.55 0.18 30)",
                              }}
                            >
                              <AlertTriangle size={10} />
                              {assignee.overdue}
                            </span>
                          )}
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontWeight: 700,
                              fontSize: "1rem",
                              color: "oklch(0.28 0.07 155)",
                              minWidth: "2rem",
                              textAlign: "right",
                            }}
                          >
                            {assignee.total}
                          </span>
                          <span style={{ color: "oklch(0.60 0.04 155)" }}>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar with overdue overlay */}
                      <div
                        className="rounded-full overflow-hidden"
                        style={{ height: "5px", backgroundColor: "oklch(0.91 0.012 85)" }}
                      >
                        <div
                          className="h-full rounded-full relative transition-all duration-500"
                          style={{
                            width: `${barPct}%`,
                            backgroundColor: "oklch(0.38 0.08 155)",
                          }}
                        >
                          {assignee.overdue > 0 && (
                            <div
                              className="absolute right-0 top-0 h-full rounded-r-full"
                              style={{
                                width: `${overduePct}%`,
                                backgroundColor: "oklch(0.55 0.18 30)",
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded stage breakdown */}
                {isExpanded && (
                  <div
                    className="px-5 py-4"
                    style={{
                      backgroundColor: "oklch(0.975 0.010 155)",
                      borderBottom: "1px solid oklch(0.88 0.015 155)",
                      borderLeft: "3px solid oklch(0.28 0.07 155)",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: "oklch(0.42 0.06 155)",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        marginBottom: "0.75rem",
                      }}
                    >
                      Stage Breakdown — {assignee.name}
                    </p>

                    {assignee.stageBreakdown.length === 0 ? (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "oklch(0.60 0.04 155)" }}>
                        No tasks in any stage.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {assignee.stageBreakdown.map((stage) => (
                          <div
                            key={stage.stageShort}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                            style={{
                              backgroundColor: `${stage.color}12`,
                              border: `1px solid ${stage.color}30`,
                              boxShadow: `0 1px 3px ${stage.color}15`,
                            }}
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: stage.color }}
                            />
                            <div>
                              <p
                                style={{
                                  fontFamily: "'DM Sans', sans-serif",
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  color: stage.color,
                                  lineHeight: 1.2,
                                }}
                              >
                                {stage.stageShort}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "0.88rem",
                                    fontWeight: 700,
                                    color: "oklch(0.22 0.07 155)",
                                  }}
                                >
                                  {stage.count}
                                </span>
                                {stage.overdue > 0 && (
                                  <span
                                    style={{
                                      fontFamily: "'DM Mono', monospace",
                                      fontSize: "0.62rem",
                                      color: "oklch(0.55 0.18 30)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    ⚠{stage.overdue}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Return type breakdown */}
                    {(() => {
                      const rtMap: Record<string, number> = {};
                      assignee.records.forEach((r) => {
                        if (r.returnType) rtMap[r.returnType] = (rtMap[r.returnType] || 0) + 1;
                      });
                      const rtEntries = Object.entries(rtMap).sort((a, b) => b[1] - a[1]);
                      if (rtEntries.length === 0) return null;
                      return (
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <span
                            className="flex items-center gap-1"
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "0.7rem",
                              color: "oklch(0.52 0.04 155)",
                            }}
                          >
                            <TrendingUp size={11} />
                            Return types:
                          </span>
                          {rtEntries.map(([rt, count]) => (
                            <span
                              key={rt}
                              className="px-2 py-0.5 rounded-md"
                              style={{
                                backgroundColor: "oklch(0.93 0.025 240)",
                                color: "oklch(0.35 0.10 240)",
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                border: "1px solid oklch(0.82 0.06 240)",
                              }}
                            >
                              {rt} × {count}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer summary */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, oklch(0.97 0.008 85), oklch(0.98 0.005 85))",
          borderTop: "1px solid oklch(0.91 0.010 85)",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.74rem",
            color: "oklch(0.52 0.04 155)",
          }}
        >
          {sorted.length} preparers · {totalTasks} total tasks
        </span>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "0.72rem",
            fontWeight: 600,
            color: totalOverdue > 0 ? "oklch(0.55 0.18 30)" : "oklch(0.35 0.12 155)",
          }}
        >
          {totalOverdue > 0 ? `⚠ ${totalOverdue} overdue` : "✓ No overdue tasks"}
        </span>
      </div>
    </div>
  );
}
