// =============================================================================
// NoStatusAlert — Unowned / No-Status Task Alert Panel
// Flags tasks that have no status or no assignee — these are "orphaned" tasks
// that could fall through the cracks without accountability
// =============================================================================

import { useMemo } from "react";
import { type DashboardData, type TaxRecord, WORKFLOW_STAGES } from "@/lib/csvParser";
import { AlertCircle, User, FileText } from "lucide-react";

interface NoStatusAlertProps {
  data: DashboardData;
}

export function NoStatusAlert({ data }: NoStatusAlertProps) {
  const { noStatusTasks, unassignedTasks } = useMemo(() => {
    const noStatus: TaxRecord[] = [];
    const unassigned: TaxRecord[] = [];

    data.rawRecords.forEach((r) => {
      const statusLower = (r.status || "").toLowerCase().trim();
      const isNoStatus =
        !statusLower ||
        statusLower === "no status" ||
        statusLower === "" ||
        statusLower === "none";

      if (isNoStatus) noStatus.push(r);

      const hasAssignee = r.assignee && r.assignee.trim().length > 0;
      if (!hasAssignee) unassigned.push(r);
    });

    return { noStatusTasks: noStatus, unassignedTasks: unassigned };
  }, [data]);

  // Group no-status by stage
  const noStatusByStage = useMemo(() => {
    const map = new Map<string, { stage: string; stageShort: string; color: string; count: number; clients: string[] }>();
    noStatusTasks.forEach((r) => {
      const stageInfo = WORKFLOW_STAGES.find((s) => s.key.toLowerCase() === r.task.toLowerCase());
      const key = r.task;
      if (!map.has(key)) {
        map.set(key, {
          stage: r.task,
          stageShort: stageInfo?.short || r.task,
          color: stageInfo?.color || "#6b7280",
          count: 0,
          clients: [],
        });
      }
      const entry = map.get(key)!;
      entry.count++;
      if (!entry.clients.includes(r.client) && r.client) {
        entry.clients.push(r.client);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [noStatusTasks]);

  if (noStatusTasks.length === 0 && unassignedTasks.length === 0) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: "1px solid oklch(0.85 0.06 240)",
        backgroundColor: "white",
        boxShadow: "0 2px 12px oklch(0.45 0.08 240 / 0.08)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, oklch(0.94 0.04 240), oklch(0.97 0.02 240))",
          borderBottom: "1px solid oklch(0.88 0.05 240)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "oklch(0.45 0.08 240)", boxShadow: "0 2px 8px oklch(0.45 0.08 240 / 0.35)" }}
          >
            <AlertCircle size={18} color="white" />
          </div>
          <div>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1rem",
                fontWeight: 700,
                color: "oklch(0.22 0.08 240)",
                lineHeight: 1.2,
              }}
            >
              Accountability Gaps
            </h3>
            <p style={{ fontSize: "0.75rem", color: "oklch(0.45 0.06 240)", marginTop: 1 }}>
              Tasks with no status or no assignee — action required
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {noStatusTasks.length > 0 && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 20,
                backgroundColor: "oklch(0.45 0.08 240)",
                color: "white",
              }}
            >
              {noStatusTasks.length} No Status
            </span>
          )}
          {unassignedTasks.length > 0 && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 20,
                backgroundColor: "oklch(0.55 0.10 280)",
                color: "white",
              }}
            >
              {unassignedTasks.length} Unassigned
            </span>
          )}
        </div>
      </div>

      {/* Two-column breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-100">
        {/* No-Status by Stage */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} style={{ color: "oklch(0.45 0.08 240)" }} />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "oklch(0.35 0.07 240)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              No Status — Top Stages
            </span>
          </div>
          <div className="space-y-2">
            {noStatusByStage.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "oklch(0.65 0.03 85)" }}>No issues found</p>
            ) : (
              noStatusByStage.map((item) => (
                <div key={item.stage} className="flex items-center gap-2">
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: item.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: "0.8rem",
                      color: "oklch(0.30 0.06 155)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.stageShort}
                  </span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "oklch(0.45 0.08 240)",
                      flexShrink: 0,
                    }}
                  >
                    {item.count}
                  </span>
                  {/* Mini bar */}
                  <div
                    style={{
                      width: 60,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "oklch(0.93 0.02 240)",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min((item.count / noStatusTasks.length) * 100 * 3, 100)}%`,
                        height: "100%",
                        backgroundColor: "oklch(0.45 0.08 240)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unassigned Summary */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={14} style={{ color: "oklch(0.55 0.10 280)" }} />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "oklch(0.35 0.08 280)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Unassigned Tasks
            </span>
          </div>
          {unassignedTasks.length === 0 ? (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "0.85rem", color: "oklch(0.40 0.10 155)" }}>
                ✓ All tasks have assignees
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Group unassigned by stage */}
              {(() => {
                const stageMap = new Map<string, number>();
                unassignedTasks.forEach((r) => {
                  const stageInfo = WORKFLOW_STAGES.find((s) => s.key.toLowerCase() === r.task.toLowerCase());
                  const key = stageInfo?.short || r.task;
                  stageMap.set(key, (stageMap.get(key) || 0) + 1);
                });
                return Array.from(stageMap.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([stage, count]) => (
                    <div key={stage} className="flex items-center gap-2">
                      <User size={11} style={{ color: "oklch(0.65 0.06 280)", flexShrink: 0 }} />
                      <span
                        style={{
                          flex: 1,
                          fontSize: "0.8rem",
                          color: "oklch(0.30 0.06 155)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {stage}
                      </span>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: "oklch(0.55 0.10 280)",
                          flexShrink: 0,
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  ));
              })()}
              {unassignedTasks.length > 5 && (
                <p style={{ fontSize: "0.72rem", color: "oklch(0.60 0.04 85)", marginTop: 4 }}>
                  + {unassignedTasks.length - 5} more unassigned tasks
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
