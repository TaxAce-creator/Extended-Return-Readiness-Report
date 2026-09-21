// =============================================================================
// WeekOverWeekView — Week-over-Week Pipeline Comparison
// Compares the two most recent Canopy CSV reports side-by-side.
// Shows stage-level delta (growth, shrinkage, new bottlenecks).
// Design: "Executive Clarity" — warm cream, forest green, amber accents
// =============================================================================

import { useMemo } from "react";
import { parseCanopyCSV, WORKFLOW_STAGES } from "@/lib/csvParser";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Upload } from "lucide-react";

interface ReportSummary {
  id: number;
  rowCount: number;
  source: string;
  filename: string | null;
  receivedAt: Date;
  csvContent: string;
}

interface WoWStageRow {
  stageShort: string;
  stageLabel: string;
  thisWeek: number;
  lastWeek: number;
  delta: number;
  deltaPercent: number;
  thisOverdue: number;
  lastOverdue: number;
  overdueChange: number;
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span
        className="flex items-center gap-1 px-2 py-0.5 rounded-lg"
        style={{
          backgroundColor: "oklch(0.93 0.01 85)",
          color: "oklch(0.55 0.03 85)",
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.72rem",
          fontWeight: 600,
        }}
      >
        <Minus size={10} />0
      </span>
    );
  }
  const isUp = delta > 0;
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-lg"
      style={{
        backgroundColor: isUp ? "oklch(0.92 0.06 145 / 0.25)" : "oklch(0.94 0.06 25 / 0.25)",
        color: isUp ? "oklch(0.40 0.10 145)" : "oklch(0.50 0.14 25)",
        fontFamily: "'DM Mono', monospace",
        fontSize: "0.72rem",
        fontWeight: 600,
      }}
    >
      {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {isUp ? "+" : ""}{delta}
    </span>
  );
}

export function WeekOverWeekView({ reportHistory }: { reportHistory: Omit<ReportSummary, "csvContent">[] }) {
  const { data: twoReports, isLoading } = trpc.canopy.getLatestTwo.useQuery();

  const comparison = useMemo<WoWStageRow[]>(() => {
    if (!twoReports || twoReports.length < 2) return [];
    try {
      const thisWeekData = parseCanopyCSV(twoReports[0].csvContent);
      const lastWeekData = parseCanopyCSV(twoReports[1].csvContent);

      return WORKFLOW_STAGES.map((stage) => {
        const thisStage = thisWeekData.stages.find((s) => s.stageKey === stage.key);
        const lastStage = lastWeekData.stages.find((s) => s.stageKey === stage.key);
        const thisWeek = thisStage?.count ?? 0;
        const lastWeek = lastStage?.count ?? 0;
        const delta = thisWeek - lastWeek;
        const deltaPercent = lastWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round((delta / lastWeek) * 100);
        const thisOverdue = thisStage?.overdueCount ?? 0;
        const lastOverdue = lastStage?.overdueCount ?? 0;
        return {
          stageShort: stage.short,
          stageLabel: stage.label,
          thisWeek,
          lastWeek,
          delta,
          deltaPercent,
          thisOverdue,
          lastOverdue,
          overdueChange: thisOverdue - lastOverdue,
        };
      }).filter((r) => r.thisWeek > 0 || r.lastWeek > 0);
    } catch {
      return [];
    }
  }, [twoReports]);

  const summaryStats = useMemo(() => {
    if (comparison.length === 0) return null;
    const totalThis = comparison.reduce((s, r) => s + r.thisWeek, 0);
    const totalLast = comparison.reduce((s, r) => s + r.lastWeek, 0);
    const bottlenecks = comparison.filter((r) => r.delta > 3);
    const cleared = comparison.filter((r) => r.delta < -3);
    const overdueUp = comparison.filter((r) => r.overdueChange > 0).reduce((s, r) => s + r.overdueChange, 0);
    return { totalThis, totalLast, totalDelta: totalThis - totalLast, bottlenecks, cleared, overdueUp };
  }, [comparison]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.35 0.08 155))" }}
          >
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(0.75 0.14 75)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: "oklch(0.52 0.04 155)" }}>
            Loading comparison data…
          </p>
        </div>
      </div>
    );
  }

  if (!twoReports || twoReports.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.35 0.08 155))",
            boxShadow: "0 4px 16px oklch(0.28 0.07 155 / 0.3)",
          }}
        >
          <Upload size={28} style={{ color: "oklch(0.75 0.14 75)" }} />
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.3rem", color: "oklch(0.22 0.07 155)", marginBottom: "0.5rem" }}>
          Two reports needed
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: "oklch(0.52 0.04 155)", maxWidth: "400px" }}>
          Upload at least two Canopy CSV reports to see week-over-week comparisons. The dashboard will automatically compare the two most recent uploads.
        </p>
        <div
          className="mt-5 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: "oklch(0.95 0.015 85)",
            border: "1px solid oklch(0.88 0.02 85)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.8rem",
            color: "oklch(0.45 0.04 155)",
          }}
        >
          Currently have <strong>{twoReports?.length ?? 0}</strong> report{(twoReports?.length ?? 0) !== 1 ? "s" : ""} stored.
        </div>
      </div>
    );
  }

  const thisReport = twoReports[0];
  const lastReport = twoReports[1];

  return (
    <div className="space-y-5 fade-in-up">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, oklch(0.22 0.07 155) 0%, oklch(0.28 0.07 155) 100%)",
          boxShadow: "0 4px 20px oklch(0.22 0.07 155 / 0.25)",
        }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.25rem", color: "oklch(0.97 0.008 85)" }}>
              Week-over-Week Comparison
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.72 0.04 155)", marginTop: "0.25rem" }}>
              Comparing <strong style={{ color: "oklch(0.88 0.04 155)" }}>{formatDate(thisReport.receivedAt)}</strong> vs <strong style={{ color: "oklch(0.88 0.04 155)" }}>{formatDate(lastReport.receivedAt)}</strong>
            </p>
          </div>
          {summaryStats && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: "oklch(0.30 0.07 155 / 0.6)", border: "1px solid oklch(0.40 0.07 155 / 0.5)" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "oklch(0.60 0.04 155)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Tasks</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "oklch(0.97 0.008 85)" }}>
                  {summaryStats.totalThis}
                  <span style={{ fontSize: "0.75rem", fontWeight: 400, color: summaryStats.totalDelta >= 0 ? "oklch(0.65 0.12 145)" : "oklch(0.65 0.12 25)", marginLeft: "0.4rem" }}>
                    {summaryStats.totalDelta >= 0 ? "+" : ""}{summaryStats.totalDelta}
                  </span>
                </p>
              </div>
              <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: "oklch(0.30 0.07 155 / 0.6)", border: "1px solid oklch(0.40 0.07 155 / 0.5)" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "oklch(0.60 0.04 155)", textTransform: "uppercase", letterSpacing: "0.08em" }}>New Bottlenecks</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: summaryStats.bottlenecks.length > 0 ? "oklch(0.75 0.14 75)" : "oklch(0.65 0.12 145)" }}>
                  {summaryStats.bottlenecks.length}
                </p>
              </div>
              <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: "oklch(0.30 0.07 155 / 0.6)", border: "1px solid oklch(0.40 0.07 155 / 0.5)" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "oklch(0.60 0.04 155)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Overdue Increase</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: summaryStats.overdueUp > 0 ? "oklch(0.60 0.18 25)" : "oklch(0.65 0.12 145)" }}>
                  {summaryStats.overdueUp > 0 ? `+${summaryStats.overdueUp}` : "None"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottleneck Alert ───────────────────────────────────────────────── */}
      {summaryStats && summaryStats.bottlenecks.length > 0 && (
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{
            backgroundColor: "oklch(0.97 0.04 75 / 0.3)",
            border: "1px solid oklch(0.85 0.08 75 / 0.5)",
          }}
        >
          <AlertTriangle size={18} style={{ color: "oklch(0.60 0.14 75)", marginTop: "0.1rem", flexShrink: 0 }} />
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.875rem", color: "oklch(0.40 0.10 75)" }}>
              {summaryStats.bottlenecks.length} stage{summaryStats.bottlenecks.length > 1 ? "s" : ""} grew significantly this week
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "oklch(0.52 0.08 75)", marginTop: "0.2rem" }}>
              {summaryStats.bottlenecks.map((b) => b.stageShort).join(", ")} — review these stages for capacity issues or blockers.
            </p>
          </div>
        </div>
      )}

      {/* ── Comparison Table ───────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "oklch(1 0 0)",
          border: "1px solid oklch(0.91 0.012 85)",
          boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06)",
        }}
      >
        {/* Table header */}
        <div
          className="grid px-5 py-3"
          style={{
            gridTemplateColumns: "1fr 80px 80px 90px 90px 90px",
            backgroundColor: "oklch(0.97 0.008 85)",
            borderBottom: "1px solid oklch(0.91 0.012 85)",
          }}
        >
          {["Stage", "This Week", "Last Week", "Change", "Overdue Now", "Overdue Δ"].map((h) => (
            <p
              key={h}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "oklch(0.45 0.04 155)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                textAlign: h === "Stage" ? "left" : "center",
              }}
            >
              {h}
            </p>
          ))}
        </div>

        {/* Table rows */}
        {comparison.map((row, idx) => {
          const isBottleneck = row.delta > 3;
          const isCleared = row.delta < -3;
          return (
            <div
              key={row.stageShort}
              className="grid px-5 py-3 transition-colors"
              style={{
                gridTemplateColumns: "1fr 80px 80px 90px 90px 90px",
                borderBottom: idx < comparison.length - 1 ? "1px solid oklch(0.94 0.008 85)" : "none",
                backgroundColor: isBottleneck
                  ? "oklch(0.97 0.04 75 / 0.15)"
                  : isCleared
                  ? "oklch(0.97 0.04 145 / 0.12)"
                  : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isBottleneck && !isCleared) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = "oklch(0.975 0.008 85)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isBottleneck && !isCleared) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
                }
              }}
            >
              {/* Stage name */}
              <div className="flex items-center gap-2">
                {isBottleneck && <AlertTriangle size={12} style={{ color: "oklch(0.60 0.14 75)", flexShrink: 0 }} />}
                {isCleared && <TrendingDown size={12} style={{ color: "oklch(0.45 0.12 145)", flexShrink: 0 }} />}
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.82rem",
                    fontWeight: isBottleneck ? 600 : 400,
                    color: isBottleneck ? "oklch(0.35 0.08 75)" : "oklch(0.30 0.06 155)",
                  }}
                >
                  {row.stageShort}
                </span>
              </div>

              {/* This week */}
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.875rem", fontWeight: 700, color: "oklch(0.22 0.07 155)", textAlign: "center" }}>
                {row.thisWeek}
              </p>

              {/* Last week */}
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.875rem", color: "oklch(0.55 0.04 155)", textAlign: "center" }}>
                {row.lastWeek}
              </p>

              {/* Delta */}
              <div className="flex justify-center">
                <DeltaBadge delta={row.delta} />
              </div>

              {/* Overdue now */}
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.875rem", fontWeight: row.thisOverdue > 0 ? 700 : 400, color: row.thisOverdue > 0 ? "oklch(0.50 0.14 25)" : "oklch(0.65 0.04 155)", textAlign: "center" }}>
                {row.thisOverdue}
              </p>

              {/* Overdue delta */}
              <div className="flex justify-center">
                {row.overdueChange !== 0 ? (
                  <DeltaBadge delta={row.overdueChange} />
                ) : (
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "oklch(0.70 0.03 155)", textAlign: "center" }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Report history ─────────────────────────────────────────────────── */}
      {reportHistory.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: "oklch(1 0 0)",
            border: "1px solid oklch(0.91 0.012 85)",
            boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06)",
          }}
        >
          <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "oklch(0.22 0.07 155)", marginBottom: "0.75rem" }}>
            Upload History
          </h3>
          <div className="space-y-2">
            {reportHistory.map((r, idx) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                style={{
                  backgroundColor: idx === 0 ? "oklch(0.28 0.07 155 / 0.06)" : "oklch(0.975 0.008 85)",
                  border: `1px solid ${idx === 0 ? "oklch(0.28 0.07 155 / 0.15)" : "oklch(0.91 0.012 85)"}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: idx === 0 ? "oklch(0.55 0.12 145)" : "oklch(0.75 0.04 155)" }}
                  />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.30 0.06 155)", fontWeight: idx === 0 ? 600 : 400 }}>
                    {r.filename ?? "Canopy Report"}
                  </span>
                  {idx === 0 && (
                    <span
                      className="px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: "oklch(0.55 0.12 145 / 0.15)", color: "oklch(0.40 0.10 145)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", fontWeight: 700 }}
                    >
                      LATEST
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "oklch(0.55 0.04 155)" }}>
                    {r.rowCount} tasks
                  </span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "oklch(0.60 0.04 155)" }}>
                    {formatDate(r.receivedAt)}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: r.source === "zapier" ? "oklch(0.75 0.14 75 / 0.15)" : "oklch(0.28 0.07 155 / 0.08)",
                      color: r.source === "zapier" ? "oklch(0.50 0.12 75)" : "oklch(0.45 0.06 155)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    {r.source}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
