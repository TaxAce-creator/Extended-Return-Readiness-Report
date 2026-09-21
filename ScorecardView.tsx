// =============================================================================
// TaxAce Dashboard — Scorecard View (Tier 2)
// Preparer-level performance scorecard with:
//   • Throughput (total tasks assigned)
//   • Overdue Rate (% overdue of total)
//   • Return-Type Mix (breakdown of 1040 / 1120S / etc.)
//   • Stage Velocity (how far into the pipeline each preparer's clients are)
//   • Revenue Potential (estimated billing based on return-type rates)
// =============================================================================

import { useMemo, useState } from "react";
import { type DashboardData, WORKFLOW_STAGES } from "@/lib/csvParser";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { Award, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Users, BarChart2, ChevronDown, ChevronUp, Minus } from "lucide-react";

// ── Billing rate estimates (configurable) ────────────────────────────────────
const BILLING_RATES: Record<string, number> = {
  "1040": 450,
  "1040NR": 550,
  "1120S": 1200,
  "1120": 1500,
  "1065": 1100,
  "990": 800,
  "941": 350,
  "940": 300,
  "W-2": 75,
  "1099": 95,
  "Extension": 150,
  "Amended": 350,
  "State": 200,
};

const DEFAULT_RATE = 400;

function getBillingRate(returnType: string): number {
  if (!returnType) return DEFAULT_RATE;
  const upper = returnType.toUpperCase();
  for (const [key, rate] of Object.entries(BILLING_RATES)) {
    if (upper.includes(key.toUpperCase())) return rate;
  }
  return DEFAULT_RATE;
}

// Stage completion index — stages at index >= this are considered "late pipeline"
const LATE_PIPELINE_IDX = Math.floor(WORKFLOW_STAGES.length * 0.6);

interface PreparerStats {
  name: string;
  total: number;
  overdue: number;
  overdueRate: number;
  returnTypeMix: Record<string, number>;
  avgStageIdx: number;
  latePipelineCount: number;
  estimatedRevenue: number;
  topReturnType: string;
  completionScore: number; // 0-100 composite score
}

interface ScorecardViewProps {
  data: DashboardData;
}

const SCORE_COLORS = [
  "oklch(0.28 0.07 155)", // forest green — top
  "oklch(0.45 0.08 240)", // slate blue
  "oklch(0.62 0.14 75)",  // amber
  "oklch(0.55 0.18 30)",  // terracotta
  "oklch(0.50 0.10 280)", // purple
];

export function ScorecardView({ data }: ScorecardViewProps) {
  const [sortBy, setSortBy] = useState<"total" | "overdueRate" | "revenue" | "score">("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedPreparer, setExpandedPreparer] = useState<string | null>(null);

  const preparerStats = useMemo<PreparerStats[]>(() => {
    const map = new Map<string, PreparerStats>();

    data.rawRecords.forEach((r) => {
      const assignees = r.assignee
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      assignees.forEach((name) => {
        if (!map.has(name)) {
          map.set(name, {
            name,
            total: 0,
            overdue: 0,
            overdueRate: 0,
            returnTypeMix: {},
            avgStageIdx: 0,
            latePipelineCount: 0,
            estimatedRevenue: 0,
            topReturnType: "",
            completionScore: 0,
          });
        }
        const s = map.get(name)!;
        s.total++;
        if (r.isOverdue) s.overdue++;

        const rt = r.returnType || "Unknown";
        s.returnTypeMix[rt] = (s.returnTypeMix[rt] || 0) + 1;

        const stageIdx = WORKFLOW_STAGES.findIndex(
          (ws) => ws.key.toLowerCase() === r.task.toLowerCase()
        );
        if (stageIdx >= 0) {
          s.avgStageIdx = (s.avgStageIdx * (s.total - 1) + stageIdx) / s.total;
          if (stageIdx >= LATE_PIPELINE_IDX) s.latePipelineCount++;
        }

        s.estimatedRevenue += getBillingRate(rt);
      });
    });

    // Post-process
    map.forEach((s) => {
      s.overdueRate = s.total > 0 ? Math.round((s.overdue / s.total) * 100) : 0;

      // Top return type
      const sorted = Object.entries(s.returnTypeMix).sort((a, b) => b[1] - a[1]);
      s.topReturnType = sorted[0]?.[0] || "—";

      // Composite score: throughput (30%) + low overdue rate (40%) + pipeline progress (30%)
      const throughputScore = Math.min(s.total / 20, 1) * 30; // max at 20 tasks
      const overdueScore = Math.max(0, (1 - s.overdueRate / 100)) * 40;
      const progressScore = (s.avgStageIdx / WORKFLOW_STAGES.length) * 30;
      s.completionScore = Math.round(throughputScore + overdueScore + progressScore);
    });

    const arr = Array.from(map.values()).filter((s) => s.total > 0);

    return arr.sort((a, b) => {
      const aVal = sortBy === "total" ? a.total
        : sortBy === "overdueRate" ? a.overdueRate
        : sortBy === "revenue" ? a.estimatedRevenue
        : a.completionScore;
      const bVal = sortBy === "total" ? b.total
        : sortBy === "overdueRate" ? b.overdueRate
        : sortBy === "revenue" ? b.estimatedRevenue
        : b.completionScore;
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [data, sortBy, sortDir]);

  const totalRevenuePotential = preparerStats.reduce((s, p) => s + p.estimatedRevenue, 0);
  const avgOverdueRate = preparerStats.length > 0
    ? Math.round(preparerStats.reduce((s, p) => s + p.overdueRate, 0) / preparerStats.length)
    : 0;
  const topPerformer = preparerStats.find((p) => p.completionScore === Math.max(...preparerStats.map((x) => x.completionScore)));

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  // Return-type distribution across all records
  const returnTypeDist = useMemo(() => {
    const map: Record<string, number> = {};
    data.rawRecords.forEach((r) => {
      const rt = r.returnType || "Unknown";
      map[rt] = (map[rt] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value, rate: getBillingRate(name) }));
  }, [data]);

  if (preparerStats.length === 0) {
    return (
      <div className="ta-card p-12 text-center">
        <Users size={40} style={{ color: "oklch(0.72 0.04 155)", margin: "0 auto 1rem" }} />
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: "oklch(0.52 0.04 155)" }}>
          No preparer data found. Upload a Canopy report to see scorecard metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-in-up">
      {/* ── Section header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.35 0.08 155))",
            boxShadow: "0 3px 12px oklch(0.28 0.07 155 / 0.35)",
          }}
        >
          <Award size={20} color="oklch(0.75 0.14 75)" />
        </div>
        <div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "1.2rem",
              color: "oklch(0.22 0.07 155)",
              lineHeight: 1.2,
            }}
          >
            Preparer Scorecard
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.76rem", color: "oklch(0.52 0.04 155)" }}>
            Performance metrics by preparer — throughput, overdue rate, return-type mix &amp; revenue potential
          </p>
        </div>
      </div>

      {/* ── Summary KPIs ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryKpi
          icon={<Users size={16} />}
          label="Preparers"
          value={preparerStats.length}
          accent="oklch(0.28 0.07 155)"
          bg="linear-gradient(135deg, oklch(0.95 0.025 155), oklch(0.98 0.012 155))"
        />
        <SummaryKpi
          icon={<DollarSign size={16} />}
          label="Revenue Potential"
          value={`$${(totalRevenuePotential / 1000).toFixed(0)}k`}
          accent="oklch(0.45 0.12 155)"
          bg="linear-gradient(135deg, oklch(0.95 0.025 155), oklch(0.98 0.012 155))"
        />
        <SummaryKpi
          icon={<AlertTriangle size={16} />}
          label="Avg Overdue Rate"
          value={`${avgOverdueRate}%`}
          accent={avgOverdueRate > 25 ? "oklch(0.55 0.18 30)" : "oklch(0.45 0.12 155)"}
          bg={avgOverdueRate > 25
            ? "linear-gradient(135deg, oklch(0.96 0.04 30), oklch(0.98 0.02 30))"
            : "linear-gradient(135deg, oklch(0.95 0.025 155), oklch(0.98 0.012 155))"}
        />
        <SummaryKpi
          icon={<Award size={16} />}
          label="Top Performer"
          value={topPerformer?.name.split(" ")[0] || "—"}
          accent="oklch(0.62 0.14 75)"
          bg="linear-gradient(135deg, oklch(0.96 0.04 75), oklch(0.98 0.02 75))"
        />
      </div>

      {/* ── Preparer Scorecard Table ────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "oklch(1 0 0)",
          border: "1px solid oklch(0.89 0.015 85)",
          boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06)",
        }}
      >
        {/* Table header */}
        <div
          className="px-5 py-3 flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, oklch(0.97 0.010 155), oklch(0.99 0.005 85))",
            borderBottom: "1px solid oklch(0.91 0.012 85)",
          }}
        >
          <BarChart2 size={14} style={{ color: "oklch(0.45 0.06 155)" }} />
          <h3
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: "0.82rem",
              color: "oklch(0.28 0.07 155)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Preparer Performance
          </h3>
          <div className="ml-auto flex items-center gap-2">
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "oklch(0.55 0.04 155)" }}>
              Sort by:
            </span>
            {(["total", "overdueRate", "revenue", "score"] as const).map((field) => (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.72rem",
                  fontWeight: sortBy === field ? 700 : 500,
                  backgroundColor: sortBy === field ? "oklch(0.28 0.07 155)" : "oklch(0.94 0.012 85)",
                  color: sortBy === field ? "white" : "oklch(0.45 0.04 155)",
                  border: "1px solid transparent",
                }}
              >
                {field === "total" ? "Tasks" : field === "overdueRate" ? "Overdue %" : field === "revenue" ? "Revenue" : "Score"}
                {sortBy === field && (
                  sortDir === "desc" ? <ChevronDown size={11} /> : <ChevronUp size={11} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div>
          {preparerStats.map((preparer, idx) => {
            const isExpanded = expandedPreparer === preparer.name;
            const accentColor = SCORE_COLORS[idx % SCORE_COLORS.length];
            const scoreColor = preparer.completionScore >= 70
              ? "oklch(0.35 0.12 155)"
              : preparer.completionScore >= 45
              ? "oklch(0.58 0.14 75)"
              : "oklch(0.55 0.18 30)";

            return (
              <div key={preparer.name}>
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-all group"
                  style={{
                    borderBottom: "1px solid oklch(0.93 0.008 85)",
                    backgroundColor: isExpanded ? "oklch(0.97 0.010 155)" : "transparent",
                  }}
                  onClick={() => setExpandedPreparer(isExpanded ? null : preparer.name)}
                >
                  {/* Rank + avatar */}
                  <div className="flex items-center gap-3 w-48 shrink-0">
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.7rem",
                        color: "oklch(0.65 0.04 155)",
                        width: "20px",
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${accentColor}18`,
                        border: `1.5px solid ${accentColor}40`,
                        color: accentColor,
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                      }}
                    >
                      {preparer.name.charAt(0).toUpperCase()}
                    </div>
                    <span
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: "oklch(0.22 0.07 155)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {preparer.name}
                    </span>
                  </div>

                  {/* Tasks */}
                  <div className="w-20 text-center shrink-0">
                    <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: "1.1rem", color: accentColor }}>
                      {preparer.total}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", color: "oklch(0.58 0.04 155)" }}>tasks</p>
                  </div>

                  {/* Overdue rate */}
                  <div className="w-28 shrink-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {preparer.overdueRate > 30 ? (
                        <TrendingDown size={12} style={{ color: "oklch(0.55 0.18 30)" }} />
                      ) : preparer.overdueRate > 15 ? (
                        <Minus size={12} style={{ color: "oklch(0.62 0.14 75)" }} />
                      ) : (
                        <TrendingUp size={12} style={{ color: "oklch(0.35 0.12 155)" }} />
                      )}
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          color: preparer.overdueRate > 30
                            ? "oklch(0.55 0.18 30)"
                            : preparer.overdueRate > 15
                            ? "oklch(0.58 0.14 75)"
                            : "oklch(0.35 0.12 155)",
                        }}
                      >
                        {preparer.overdueRate}%
                      </span>
                    </div>
                    <div className="ta-progress-track">
                      <div
                        className="ta-progress-fill"
                        style={{
                          width: `${preparer.overdueRate}%`,
                          backgroundColor: preparer.overdueRate > 30
                            ? "oklch(0.55 0.18 30)"
                            : preparer.overdueRate > 15
                            ? "oklch(0.62 0.14 75)"
                            : "oklch(0.35 0.12 155)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Top return type */}
                  <div className="flex-1 min-w-0 hidden sm:block">
                    <span
                      className="px-2 py-0.5 rounded-md"
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        backgroundColor: "oklch(0.93 0.025 155)",
                        color: "oklch(0.28 0.07 155)",
                      }}
                    >
                      {preparer.topReturnType}
                    </span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", color: "oklch(0.58 0.04 155)", marginLeft: "0.4rem" }}>
                      top type
                    </span>
                  </div>

                  {/* Revenue */}
                  <div className="w-28 text-right shrink-0 hidden md:block">
                    <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: "0.9rem", color: "oklch(0.35 0.10 155)" }}>
                      ${preparer.estimatedRevenue.toLocaleString()}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", color: "oklch(0.58 0.04 155)" }}>est. revenue</p>
                  </div>

                  {/* Score badge */}
                  <div className="w-16 text-center shrink-0">
                    <div
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full mx-auto"
                      style={{
                        background: `${scoreColor}18`,
                        border: `2px solid ${scoreColor}40`,
                        color: scoreColor,
                        fontFamily: "'DM Mono', monospace",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                      }}
                    >
                      {preparer.completionScore}
                    </div>
                  </div>

                  {/* Expand chevron */}
                  <div style={{ color: "oklch(0.65 0.04 155)", flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                    style={{
                      backgroundColor: "oklch(0.975 0.008 155)",
                      borderBottom: "1px solid oklch(0.90 0.012 155)",
                    }}
                  >
                    {/* Return type breakdown */}
                    <div>
                      <p
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "oklch(0.45 0.06 155)",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          marginBottom: "0.6rem",
                        }}
                      >
                        Return Type Mix
                      </p>
                      <div className="space-y-2">
                        {Object.entries(preparer.returnTypeMix)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([rt, count]) => {
                            const pct = Math.round((count / preparer.total) * 100);
                            return (
                              <div key={rt}>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "oklch(0.28 0.07 155)", fontWeight: 600 }}>
                                    {rt}
                                  </span>
                                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "oklch(0.45 0.06 155)" }}>
                                    {count} ({pct}%)
                                  </span>
                                </div>
                                <div className="ta-progress-track">
                                  <div
                                    className="ta-progress-fill"
                                    style={{ width: `${pct}%`, backgroundColor: accentColor }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Stage distribution */}
                    <div>
                      <p
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "oklch(0.45 0.06 155)",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          marginBottom: "0.6rem",
                        }}
                      >
                        Pipeline Position
                      </p>
                      <div className="space-y-1.5">
                        <DetailRow label="Avg Stage Index" value={`${preparer.avgStageIdx.toFixed(1)} / ${WORKFLOW_STAGES.length}`} />
                        <DetailRow label="Late Pipeline Tasks" value={`${preparer.latePipelineCount} (${Math.round((preparer.latePipelineCount / preparer.total) * 100)}%)`} />
                        <DetailRow label="Overdue Tasks" value={`${preparer.overdue}`} accent={preparer.overdue > 0 ? "oklch(0.55 0.18 30)" : undefined} />
                        <DetailRow label="On-Time Tasks" value={`${preparer.total - preparer.overdue}`} />
                      </div>
                    </div>

                    {/* Revenue breakdown */}
                    <div>
                      <p
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "oklch(0.45 0.06 155)",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          marginBottom: "0.6rem",
                        }}
                      >
                        Revenue Estimate
                      </p>
                      <div className="space-y-1.5">
                        <DetailRow label="Total Est. Revenue" value={`$${preparer.estimatedRevenue.toLocaleString()}`} accent="oklch(0.35 0.10 155)" />
                        <DetailRow label="Avg per Return" value={`$${Math.round(preparer.estimatedRevenue / preparer.total).toLocaleString()}`} />
                        <DetailRow label="Score" value={`${preparer.completionScore} / 100`} accent={scoreColor} />
                        <DetailRow label="% of Team Revenue" value={`${Math.round((preparer.estimatedRevenue / totalRevenuePotential) * 100)}%`} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Return Type Distribution Chart ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar chart — return type distribution */}
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: "oklch(1 0 0)",
            border: "1px solid oklch(0.89 0.015 85)",
            boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06)",
          }}
        >
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "1rem",
              color: "oklch(0.22 0.07 155)",
              marginBottom: "0.25rem",
            }}
          >
            Return Type Distribution
          </h3>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "oklch(0.52 0.04 155)", marginBottom: "1rem" }}>
            Top 8 return types by volume
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={returnTypeDist} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.008 85)" />
              <XAxis
                dataKey="name"
                tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: "oklch(0.50 0.04 155)" }}
                axisLine={false}
                tickLine={false}
                angle={-25}
                textAnchor="end"
                height={48}
              />
              <YAxis
                tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: "oklch(0.60 0.04 155)" }}
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <RechartsTooltip
                contentStyle={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.78rem",
                  borderRadius: "10px",
                  border: "1px solid oklch(0.89 0.015 85)",
                  boxShadow: "0 4px 16px oklch(0 0 0 / 0.12)",
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {returnTypeDist.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={SCORE_COLORS[index % SCORE_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by return type */}
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: "oklch(1 0 0)",
            border: "1px solid oklch(0.89 0.015 85)",
            boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06)",
          }}
        >
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "1rem",
              color: "oklch(0.22 0.07 155)",
              marginBottom: "0.25rem",
            }}
          >
            Revenue by Return Type
          </h3>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "oklch(0.52 0.04 155)", marginBottom: "1rem" }}>
            Estimated billing potential per return category
          </p>
          <div className="space-y-2.5">
            {returnTypeDist.map((rt, idx) => {
              const revForType = rt.value * rt.rate;
              const pct = Math.round((revForType / totalRevenuePotential) * 100);
              const color = SCORE_COLORS[idx % SCORE_COLORS.length];
              return (
                <div key={rt.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", fontWeight: 600, color: "oklch(0.28 0.07 155)" }}>
                        {rt.name}
                      </span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", color: "oklch(0.58 0.04 155)" }}>
                        {rt.value} × ${rt.rate.toLocaleString()}
                      </span>
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", fontWeight: 700, color }}>
                      ${revForType.toLocaleString()}
                    </span>
                  </div>
                  <div className="ta-progress-track">
                    <div
                      className="ta-progress-fill"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="mt-4 pt-3 flex items-center justify-between"
            style={{ borderTop: "1px solid oklch(0.91 0.010 85)" }}
          >
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "oklch(0.45 0.06 155)" }}>
              Total Revenue Potential
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1rem", fontWeight: 700, color: "oklch(0.28 0.07 155)" }}>
              ${totalRevenuePotential.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Score legend ───────────────────────────────────────────────────── */}
      <div
        className="rounded-xl px-5 py-3 flex flex-wrap items-center gap-4"
        style={{
          backgroundColor: "oklch(0.985 0.006 85)",
          border: "1px solid oklch(0.90 0.010 85)",
        }}
      >
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", fontWeight: 700, color: "oklch(0.45 0.06 155)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Score Guide
        </span>
        {[
          { range: "70–100", label: "High Performer", color: "oklch(0.35 0.12 155)" },
          { range: "45–69", label: "On Track", color: "oklch(0.58 0.14 75)" },
          { range: "0–44", label: "Needs Attention", color: "oklch(0.55 0.18 30)" },
        ].map((g) => (
          <div key={g.range} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: g.color }}
            />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: g.color, fontWeight: 700 }}>
              {g.range}
            </span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "oklch(0.50 0.04 155)" }}>
              {g.label}
            </span>
          </div>
        ))}
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "oklch(0.60 0.04 155)", marginLeft: "auto" }}>
          Score = Throughput (30%) + Low Overdue Rate (40%) + Pipeline Progress (30%)
        </span>
      </div>
    </div>
  );
}

function SummaryKpi({
  icon,
  label,
  value,
  accent,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
  bg: string;
}) {
  return (
    <div
      className="rounded-2xl px-4 py-4 flex items-center gap-3"
      style={{
        background: bg,
        border: "1px solid oklch(0.89 0.015 85)",
        boxShadow: "0 1px 4px oklch(0.28 0.07 155 / 0.04)",
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}28`, color: accent }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: "1.25rem", color: accent, lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "oklch(0.52 0.04 155)", marginTop: "2px" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "oklch(0.55 0.04 155)" }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.78rem",
          fontWeight: 700,
          color: accent || "oklch(0.28 0.07 155)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
