// =============================================================================
// AtRiskPanel — At-Risk Deadline Alert v3
// Risk Score Formula:
//   urgencyScore  = 100 if overdue, else max(0, 100 - daysLeft * 7)
//   stagesScore   = (stagesRemaining / totalStages) * 100
//   riskScore     = round(urgencyScore * 0.6 + stagesScore * 0.4)
// Shows clients due within 21 days that have NOT yet reached Final Review
// =============================================================================

import { useMemo } from "react";
import { type DashboardData, type TaxRecord, WORKFLOW_STAGES } from "@/lib/csvParser";
import { AlertTriangle, Clock, User, ChevronRight, Flame, TrendingUp } from "lucide-react";

interface AtRiskPanelProps {
  data: DashboardData;
  onClientSelect?: (clientName: string) => void;
}

const FINAL_REVIEW_STAGE = "TP: Tax Return Final Review";
const FINAL_REVIEW_IDX = WORKFLOW_STAGES.findIndex(
  (s) => s.key.toLowerCase() === FINAL_REVIEW_STAGE.toLowerCase()
);
const TOTAL_STAGES = WORKFLOW_STAGES.length;

function getDaysUntilDue(dueDateStr: string): number | null {
  if (!dueDateStr) return null;
  const parts = dueDateStr.trim().split("/");
  let due: Date;
  if (parts.length === 3) {
    due = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  } else {
    due = new Date(dueDateStr);
  }
  if (isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStageIndex(taskName: string): number {
  return WORKFLOW_STAGES.findIndex(
    (s) => s.key.toLowerCase() === taskName.toLowerCase()
  );
}

/** Compute 0–100 risk score for a client */
function computeRiskScore(daysUntilDue: number, stageIdx: number): number {
  // Urgency component (60% weight): 100 if overdue, decreases as days increase
  const urgencyScore = daysUntilDue <= 0
    ? 100
    : Math.max(0, 100 - daysUntilDue * 5);

  // Stages remaining component (40% weight): more stages left = higher risk
  const stagesRemaining = stageIdx >= 0 ? Math.max(0, FINAL_REVIEW_IDX - stageIdx) : FINAL_REVIEW_IDX;
  const stagesScore = FINAL_REVIEW_IDX > 0 ? (stagesRemaining / FINAL_REVIEW_IDX) * 100 : 0;

  return Math.min(100, Math.round(urgencyScore * 0.6 + stagesScore * 0.4));
}

function getRiskLevel(score: number): { label: string; color: string; bg: string; border: string } {
  if (score >= 80) return { label: "Critical", color: "oklch(0.50 0.20 25)", bg: "oklch(0.97 0.04 25)", border: "oklch(0.80 0.12 25)" };
  if (score >= 60) return { label: "High",     color: "oklch(0.55 0.18 40)", bg: "oklch(0.97 0.04 40)", border: "oklch(0.82 0.10 40)" };
  if (score >= 40) return { label: "Medium",   color: "oklch(0.58 0.16 60)", bg: "oklch(0.97 0.04 60)", border: "oklch(0.84 0.10 60)" };
  return              { label: "Watch",    color: "oklch(0.50 0.10 155)", bg: "oklch(0.97 0.02 155)", border: "oklch(0.85 0.04 155)" };
}

function RiskScoreBar({ score }: { score: number }) {
  const level = getRiskLevel(score);
  return (
    <div className="flex items-center gap-2 shrink-0" style={{ minWidth: 90 }}>
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 5, backgroundColor: "oklch(0.92 0.01 85)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${score}%`,
            backgroundColor: level.color,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.68rem",
          fontWeight: 700,
          color: level.color,
          minWidth: 24,
          textAlign: "right",
        }}
      >
        {score}
      </span>
    </div>
  );
}

export function AtRiskPanel({ data, onClientSelect }: AtRiskPanelProps) {
  const atRiskClients = useMemo(() => {
    const clientMap = new Map<string, TaxRecord[]>();
    data.rawRecords.forEach((r) => {
      if (!r.client) return;
      if (!clientMap.has(r.client)) clientMap.set(r.client, []);
      clientMap.get(r.client)!.push(r);
    });

    const results: {
      name: string;
      daysUntilDue: number;
      dueDate: string;
      currentStage: string;
      currentStageIdx: number;
      assignee: string;
      returnType: string;
      isOverdue: boolean;
      riskScore: number;
      riskLevel: ReturnType<typeof getRiskLevel>;
    }[] = [];

    clientMap.forEach((records, clientName) => {
      let maxStageIdx = -1;
      let latestRecord: TaxRecord | null = null;
      records.forEach((r) => {
        const idx = getStageIndex(r.task);
        if (idx > maxStageIdx) {
          maxStageIdx = idx;
          latestRecord = r;
        }
      });

      if (!latestRecord) return;
      const rec = latestRecord as TaxRecord;

      // Skip if already past Final Review
      if (maxStageIdx >= FINAL_REVIEW_IDX && FINAL_REVIEW_IDX >= 0) return;

      const daysUntilDue = getDaysUntilDue(rec.dueDate);
      if (daysUntilDue === null) return;

      // Show clients due within 21 days (expanded from 14)
      if (daysUntilDue <= 21) {
        const riskScore = computeRiskScore(daysUntilDue, maxStageIdx);
        results.push({
          name: clientName,
          daysUntilDue,
          dueDate: rec.dueDate,
          currentStage: rec.task,
          currentStageIdx: maxStageIdx,
          assignee: rec.assignee,
          returnType: rec.returnType,
          isOverdue: daysUntilDue < 0,
          riskScore,
          riskLevel: getRiskLevel(riskScore),
        });
      }
    });

    // Sort by risk score descending (highest risk first)
    return results.sort((a, b) => b.riskScore - a.riskScore);
  }, [data]);

  if (atRiskClients.length === 0) return null;

  const overdueCount = atRiskClients.filter((c) => c.isOverdue).length;
  const criticalCount = atRiskClients.filter((c) => c.riskScore >= 80).length;
  const avgRisk = Math.round(atRiskClients.reduce((s, c) => s + c.riskScore, 0) / atRiskClients.length);

  return (
    <div
      className="rounded-2xl overflow-hidden fade-in-up"
      style={{
        border: "1px solid oklch(0.86 0.08 30)",
        backgroundColor: "oklch(1 0 0)",
        boxShadow: "0 4px 24px oklch(0.55 0.18 30 / 0.10), 0 1px 4px oklch(0.55 0.18 30 / 0.06)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between flex-wrap gap-3"
        style={{
          background: "linear-gradient(135deg, oklch(0.96 0.04 30) 0%, oklch(0.98 0.025 30) 100%)",
          borderBottom: "1px solid oklch(0.88 0.07 30)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, oklch(0.55 0.18 30), oklch(0.48 0.20 25))",
              boxShadow: "0 3px 12px oklch(0.55 0.18 30 / 0.40)",
            }}
          >
            <Flame size={18} color="white" />
          </div>
          <div>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1rem",
                fontWeight: 700,
                color: "oklch(0.28 0.12 30)",
                lineHeight: 1.2,
              }}
            >
              At-Risk Clients
            </h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.73rem", color: "oklch(0.50 0.08 30)", marginTop: "1px" }}>
              Due within 21 days · sorted by risk score
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {overdueCount > 0 && (
            <span
              className="flex items-center gap-1"
              style={{
                fontSize: "0.72rem", fontWeight: 700,
                padding: "4px 10px", borderRadius: "999px",
                background: "linear-gradient(135deg, oklch(0.55 0.18 30), oklch(0.48 0.20 25))",
                color: "white",
                boxShadow: "0 2px 8px oklch(0.55 0.18 30 / 0.35)",
              }}
            >
              <AlertTriangle size={11} />
              {overdueCount} Overdue
            </span>
          )}
          {criticalCount > 0 && (
            <span
              style={{
                fontSize: "0.72rem", fontWeight: 700,
                padding: "4px 10px", borderRadius: "999px",
                backgroundColor: "oklch(0.72 0.14 55)", color: "white",
                boxShadow: "0 2px 8px oklch(0.72 0.14 55 / 0.30)",
              }}
            >
              {criticalCount} Critical
            </span>
          )}
          <span
            className="flex items-center gap-1"
            style={{
              fontSize: "0.72rem", fontWeight: 600,
              padding: "4px 10px", borderRadius: "999px",
              backgroundColor: "oklch(0.90 0.05 30)", color: "oklch(0.40 0.10 30)",
              border: "1px solid oklch(0.84 0.08 30)",
            }}
          >
            <TrendingUp size={11} />
            Avg Risk: {avgRisk}
          </span>
          <span
            style={{
              fontSize: "0.72rem", fontWeight: 600,
              padding: "4px 10px", borderRadius: "999px",
              backgroundColor: "oklch(0.90 0.05 30)", color: "oklch(0.40 0.10 30)",
              border: "1px solid oklch(0.84 0.08 30)",
            }}
          >
            {atRiskClients.length} Total
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid px-5 py-2"
        style={{
          gridTemplateColumns: "1fr 90px 100px 80px",
          borderBottom: "1px solid oklch(0.93 0.008 85)",
          backgroundColor: "oklch(0.975 0.008 85)",
        }}
      >
        {["Client", "Due", "Stage", "Risk"].map((h) => (
          <p
            key={h}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "oklch(0.50 0.04 155)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              textAlign: h === "Risk" ? "right" : "left",
            }}
          >
            {h}
          </p>
        ))}
      </div>

      {/* Client rows */}
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {atRiskClients.map((client, idx) => {
          const stageInfo = WORKFLOW_STAGES[client.currentStageIdx];
          const urgencyLabel = client.isOverdue
            ? `${Math.abs(client.daysUntilDue)}d overdue`
            : client.daysUntilDue === 0
            ? "Due today"
            : `${client.daysUntilDue}d left`;

          return (
            <div
              key={`${client.name}-${idx}`}
              className="grid items-center px-5 py-3 transition-all group"
              style={{
                gridTemplateColumns: "1fr 90px 100px 80px",
                borderBottom: "1px solid oklch(0.95 0.008 85)",
                cursor: onClientSelect ? "pointer" : "default",
                backgroundColor: client.riskScore >= 80 ? "oklch(0.99 0.02 25 / 0.4)" : "transparent",
              }}
              onClick={() => onClientSelect?.(client.name)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "oklch(0.975 0.008 85)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = client.riskScore >= 80 ? "oklch(0.99 0.02 25 / 0.4)" : "transparent"; }}
            >
              {/* Client name + return type */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "oklch(0.22 0.07 155)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {client.name}
                  </span>
                  {client.returnType && (
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        padding: "1px 5px",
                        borderRadius: "5px",
                        backgroundColor: "oklch(0.93 0.025 155)",
                        color: "oklch(0.28 0.07 155)",
                        flexShrink: 0,
                      }}
                    >
                      {client.returnType}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <User size={10} style={{ color: "oklch(0.62 0.04 155)" }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "oklch(0.55 0.04 155)" }}>
                    {client.assignee || "Unassigned"}
                  </span>
                </div>
              </div>

              {/* Due date */}
              <div>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: client.riskLevel.color,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Clock size={10} style={{ flexShrink: 0 }} />
                  {urgencyLabel}
                </span>
              </div>

              {/* Stage */}
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: stageInfo?.color || "#6b7280" }}
                />
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.72rem",
                    color: "oklch(0.45 0.04 155)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {stageInfo?.short || "Unknown"}
                </span>
              </div>

              {/* Risk score bar */}
              <div className="flex justify-end">
                <RiskScoreBar score={client.riskScore} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
