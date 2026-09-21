// =============================================================================
// TaxAce Dashboard — Analytics Tab
// Performance charts, bottleneck analysis, status breakdown, assignee comparison
// Design: "Executive Clarity" — warm cream, forest green, Playfair + DM Sans
// =============================================================================

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, LabelList,
} from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Target, Zap } from "lucide-react";
import {
  type DashboardData,
  type TaxRecord,
  WORKFLOW_STAGES,
  STATUS_COLORS,
  filterRecords,
} from "@/lib/csvParser";

interface AnalyticsViewProps {
  data: DashboardData;
  assigneeFilter: string;
  returnTypeFilter: string;
  searchQuery: string;
  overdueOnly: boolean;
}

// ─── Shared tooltip style ────────────────────────────────────────────────────
const TooltipBox = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: "oklch(0.18 0.06 155)",
        border: "1px solid oklch(0.28 0.07 155)",
        borderRadius: "10px",
        padding: "10px 14px",
        boxShadow: "0 8px 24px oklch(0 0 0 / 0.3)",
        minWidth: "140px",
      }}
    >
      {label && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "oklch(0.75 0.03 85)", marginBottom: "6px" }}>
          {label}
        </p>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: p.color || "oklch(0.80 0.03 85)" }}>
            {p.name}
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85rem", fontWeight: 700, color: p.color || "white" }}>
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1rem", color: "oklch(0.22 0.07 155)" }}>
        {title}
      </h3>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.76rem", color: "oklch(0.52 0.04 155)", marginTop: "2px" }}>
        {subtitle}
      </p>
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{
        backgroundColor: "oklch(1 0 0)",
        border: "1px solid oklch(0.89 0.015 85)",
        boxShadow: "0 1px 8px oklch(0.28 0.07 155 / 0.06)",
      }}
    >
      {children}
    </div>
  );
}

// ─── KPI chip ─────────────────────────────────────────────────────────────────
function KpiChip({
  label, value, sub, color, bg, trend,
}: {
  label: string; value: string | number; sub?: string;
  color: string; bg: string; trend?: "up" | "down" | "neutral";
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ backgroundColor: bg, border: `1px solid ${color}22` }}>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "oklch(0.52 0.04 155)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <div className="flex items-end gap-2">
        <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: "1.6rem", color, lineHeight: 1 }}>
          {value}
        </span>
        {trend && <TrendIcon size={14} style={{ color, marginBottom: "3px" }} />}
      </div>
      {sub && (
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "oklch(0.55 0.04 155)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AnalyticsView({
  data,
  assigneeFilter,
  returnTypeFilter,
  searchQuery,
  overdueOnly,
}: AnalyticsViewProps) {

  // Apply all active filters to raw records
  const filteredRecords = useMemo(() => {
    let records = filterRecords(data.rawRecords, assigneeFilter, returnTypeFilter, searchQuery);
    if (overdueOnly) records = records.filter((r) => r.isOverdue);
    return records;
  }, [data, assigneeFilter, returnTypeFilter, searchQuery, overdueOnly]);

  // ── 1. Stage bottleneck data (filtered) ──────────────────────────────────
  const stageData = useMemo(() => {
    return WORKFLOW_STAGES.map((s, idx) => {
      const stageRecords = filteredRecords.filter(
        (r) => r.task.trim().toLowerCase() === s.key.toLowerCase()
      );
      const overdue = stageRecords.filter((r) => r.isOverdue).length;
      const onTrack = stageRecords.length - overdue;
      const overdueRate = stageRecords.length > 0 ? Math.round((overdue / stageRecords.length) * 100) : 0;
      return {
        idx,
        label: s.short,
        fullLabel: s.label,
        total: stageRecords.length,
        overdue,
        onTrack,
        overdueRate,
        color: s.color,
      };
    }).filter((s) => s.total > 0);
  }, [filteredRecords]);

  // ── 2. Status distribution (pie) ─────────────────────────────────────────
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const s = r.status || "No status";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || "#6b7280" }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // ── 3. Return type breakdown ──────────────────────────────────────────────
  const returnTypeData = useMemo(() => {
    const map: Record<string, { total: number; overdue: number }> = {};
    filteredRecords.forEach((r) => {
      const rt = r.returnType || "Unknown";
      if (!map[rt]) map[rt] = { total: 0, overdue: 0 };
      map[rt].total++;
      if (r.isOverdue) map[rt].overdue++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, onTrack: v.total - v.overdue }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRecords]);

  // ── 4. Assignee performance (radar + bar) ────────────────────────────────
  const assigneeData = useMemo(() => {
    const map = new Map<string, { total: number; overdue: number }>();
    filteredRecords.forEach((r) => {
      const assignees = r.assignee.split(",").map((a) => a.trim()).filter(Boolean);
      if (assignees.length === 0) assignees.push("Unassigned");
      assignees.forEach((a) => {
        if (!map.has(a)) map.set(a, { total: 0, overdue: 0 });
        map.get(a)!.total++;
        if (r.isOverdue) map.get(a)!.overdue++;
      });
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name: name.split(" ")[0], // first name only for chart labels
        fullName: name,
        total: v.total,
        overdue: v.overdue,
        onTrack: v.total - v.overdue,
        overdueRate: v.total > 0 ? Math.round((v.overdue / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // top 10
  }, [filteredRecords]);

  // ── 5. Bottleneck severity scoring ───────────────────────────────────────
  const bottlenecks = useMemo(() => {
    return [...stageData]
      .map((s) => ({
        ...s,
        // Severity = weighted combo of volume + overdue rate
        severity: s.total * 0.4 + s.overdue * 0.6,
      }))
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 5);
  }, [stageData]);

  // ── 6. KPI summary ───────────────────────────────────────────────────────
  const totalFiltered = filteredRecords.length;
  const totalOverdueFiltered = filteredRecords.filter((r) => r.isOverdue).length;
  const overdueRate = totalFiltered > 0 ? Math.round((totalOverdueFiltered / totalFiltered) * 100) : 0;
  const activeStages = stageData.length;
  const avgPerStage = activeStages > 0 ? Math.round(totalFiltered / activeStages) : 0;
  const mostLoadedStage = stageData.reduce((a, b) => (b.total > a.total ? b : a), stageData[0]);
  const highestOverdueStage = stageData.reduce((a, b) => (b.overdueRate > a.overdueRate ? b : a), stageData[0]);

  if (totalFiltered === 0) {
    return (
      <Card>
        <div className="py-12 text-center">
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: "oklch(0.60 0.04 155)", fontSize: "0.9rem" }}>
            No data matches the current filters. Adjust your filters to see analytics.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiChip
          label="Tasks in View"
          value={totalFiltered}
          sub={`of ${data.totalClients} total`}
          color="oklch(0.28 0.07 155)"
          bg="oklch(0.95 0.02 155)"
        />
        <KpiChip
          label="Overdue Rate"
          value={`${overdueRate}%`}
          sub={`${totalOverdueFiltered} tasks overdue`}
          color={overdueRate > 50 ? "oklch(0.55 0.18 30)" : overdueRate > 25 ? "oklch(0.62 0.14 60)" : "oklch(0.45 0.12 155)"}
          bg={overdueRate > 50 ? "oklch(0.96 0.04 30)" : overdueRate > 25 ? "oklch(0.97 0.03 60)" : "oklch(0.95 0.02 155)"}
          trend={overdueRate > 40 ? "up" : "neutral"}
        />
        <KpiChip
          label="Active Stages"
          value={activeStages}
          sub={`avg ${avgPerStage} tasks/stage`}
          color="oklch(0.40 0.10 240)"
          bg="oklch(0.95 0.03 240)"
        />
        <KpiChip
          label="Top Bottleneck"
          value={mostLoadedStage?.label ?? "—"}
          sub={mostLoadedStage ? `${mostLoadedStage.total} tasks` : ""}
          color="oklch(0.50 0.12 30)"
          bg="oklch(0.97 0.03 30)"
          trend="down"
        />
      </div>

      {/* ── Row 1: Bottleneck Analysis + Status Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Bottleneck bar chart — 2/3 width */}
        <Card className="lg:col-span-2">
          <SectionHeader
            title="Bottleneck Analysis"
            subtitle="Stages ranked by volume and overdue severity — the taller the red, the more urgent"
          />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.91 0.01 85)" />
              <XAxis
                dataKey="label"
                tick={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fill: "oklch(0.50 0.04 155)" }}
                axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={52}
              />
              <YAxis
                tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: "oklch(0.60 0.04 155)" }}
                axisLine={false} tickLine={false} width={26} allowDecimals={false}
              />
              <Tooltip content={<TooltipBox />} cursor={{ fill: "oklch(0.95 0.01 85)" }} />
              <Legend
                wrapperStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", paddingTop: "8px" }}
              />
              <Bar dataKey="onTrack" name="On Track" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={40}>
                {stageData.map((entry) => (
                  <Cell key={entry.label} fill={`${entry.color}bb`} />
                ))}
              </Bar>
              <Bar dataKey="overdue" name="Overdue" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={40} fill="oklch(0.62 0.14 30)">
                <LabelList
                  dataKey="total"
                  position="top"
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", fill: "oklch(0.40 0.06 155)", fontWeight: 600 }}
                  formatter={(v: number) => (v > 0 ? v : "")}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status Pie — 1/3 width */}
        <Card>
          <SectionHeader
            title="Status Breakdown"
            subtitle="Distribution of task statuses across all filtered records"
          />
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{
                  backgroundColor: "oklch(0.18 0.06 155)",
                  border: "1px solid oklch(0.28 0.07 155)",
                  borderRadius: "8px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.75rem",
                  color: "white",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="space-y-1 mt-1">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "oklch(0.40 0.05 155)" }}>
                    {s.name}
                  </span>
                </div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", fontWeight: 600, color: "oklch(0.28 0.07 155)" }}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 2: Assignee Comparison + Return Type ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Assignee workload comparison */}
        <Card>
          <SectionHeader
            title="Preparer Workload Comparison"
            subtitle="Tasks per preparer — green = on track, amber = overdue (top 10)"
          />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={assigneeData}
              layout="vertical"
              margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.91 0.01 85)" />
              <XAxis
                type="number"
                tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: "oklch(0.60 0.04 155)" }}
                axisLine={false} tickLine={false} allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fill: "oklch(0.40 0.05 155)" }}
                axisLine={false} tickLine={false} width={60}
              />
              <Tooltip content={<TooltipBox />} cursor={{ fill: "oklch(0.95 0.01 85)" }} />
              <Bar dataKey="onTrack" name="On Track" stackId="a" fill="oklch(0.50 0.10 155)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="overdue" name="Overdue" stackId="a" fill="oklch(0.62 0.14 30)" radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="total"
                  position="right"
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fill: "oklch(0.35 0.06 155)", fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Return type breakdown */}
        <Card>
          <SectionHeader
            title="Return Type Analysis"
            subtitle="Task volume and overdue rate broken down by return type"
          />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={returnTypeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.91 0.01 85)" />
              <XAxis
                dataKey="name"
                tick={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fill: "oklch(0.50 0.04 155)" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: "oklch(0.60 0.04 155)" }}
                axisLine={false} tickLine={false} width={26} allowDecimals={false}
              />
              <Tooltip content={<TooltipBox />} cursor={{ fill: "oklch(0.95 0.01 85)" }} />
              <Bar dataKey="onTrack" name="On Track" stackId="a" fill="oklch(0.50 0.10 155)" radius={[0, 0, 0, 0]} maxBarSize={48} />
              <Bar dataKey="overdue" name="Overdue" stackId="a" fill="oklch(0.62 0.14 30)" radius={[4, 4, 0, 0]} maxBarSize={48}>
                <LabelList
                  dataKey="total"
                  position="top"
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fill: "oklch(0.40 0.06 155)", fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Row 3: Top 5 Bottlenecks Severity Table ── */}
      <Card>
        <SectionHeader
          title="Critical Bottleneck Report"
          subtitle="Top 5 stages ranked by combined volume and overdue severity — these need immediate attention"
        />
        <div className="space-y-3">
          {bottlenecks.map((b, rank) => {
            const severityColor =
              rank === 0 ? "oklch(0.55 0.18 30)" :
              rank === 1 ? "oklch(0.60 0.15 40)" :
              rank === 2 ? "oklch(0.62 0.12 60)" :
              "oklch(0.52 0.08 155)";
            const severityBg =
              rank === 0 ? "oklch(0.96 0.04 30)" :
              rank === 1 ? "oklch(0.97 0.03 40)" :
              rank === 2 ? "oklch(0.97 0.03 60)" :
              "oklch(0.95 0.02 155)";

            return (
              <div
                key={b.label}
                className="flex items-center gap-4 p-3 rounded-xl"
                style={{ backgroundColor: severityBg, border: `1px solid ${severityColor}22` }}
              >
                {/* Rank badge */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: severityColor, color: "white" }}
                >
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", fontWeight: 700 }}>
                    {rank + 1}
                  </span>
                </div>

                {/* Stage info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: "oklch(0.22 0.07 155)",
                      }}
                    >
                      {b.fullLabel}
                    </span>
                    {b.overdueRate >= 50 && (
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "oklch(0.62 0.14 30)",
                          color: "white",
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                        }}
                      >
                        <Zap size={9} />
                        HIGH RISK
                      </span>
                    )}
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div
                      className="flex-1 rounded-full overflow-hidden"
                      style={{ height: "5px", backgroundColor: "oklch(0.88 0.01 85)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${b.overdueRate}%`,
                          backgroundColor: severityColor,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.7rem",
                        color: severityColor,
                        fontWeight: 600,
                        minWidth: "2.5rem",
                      }}
                    >
                      {b.overdueRate}%
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center">
                    <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: "1.1rem", color: "oklch(0.28 0.07 155)", lineHeight: 1 }}>
                      {b.total}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", color: "oklch(0.55 0.04 155)" }}>
                      total
                    </p>
                  </div>
                  <div className="text-center">
                    <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: "1.1rem", color: severityColor, lineHeight: 1 }}>
                      {b.overdue}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", color: "oklch(0.55 0.04 155)" }}>
                      overdue
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Insight callout */}
        {highestOverdueStage && highestOverdueStage.overdueRate > 0 && (
          <div
            className="mt-4 flex items-start gap-2 p-3 rounded-xl"
            style={{
              backgroundColor: "oklch(0.97 0.015 155)",
              border: "1px solid oklch(0.85 0.03 155)",
            }}
          >
            <Target size={14} style={{ color: "oklch(0.35 0.08 155)", marginTop: "2px", flexShrink: 0 }} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", color: "oklch(0.35 0.08 155)", lineHeight: 1.5 }}>
              <strong>Insight:</strong> "{highestOverdueStage.fullLabel}" has the highest overdue rate at{" "}
              <strong>{highestOverdueStage.overdueRate}%</strong> ({highestOverdueStage.overdue} of {highestOverdueStage.total} tasks).
              {highestOverdueStage.overdueRate >= 75
                ? " This stage is critically blocked and requires immediate intervention."
                : highestOverdueStage.overdueRate >= 50
                ? " This stage needs urgent attention to prevent further delays."
                : " Consider reviewing this stage in your next team meeting."}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
