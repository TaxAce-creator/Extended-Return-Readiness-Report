// =============================================================================
// TaxAce Dashboard — Pipeline Distribution Chart v2
// Horizontal bar chart showing client counts across all 23 workflow stages
// Tier 2: Premium card styling, improved bottleneck callouts
// =============================================================================

import { type DashboardData, WORKFLOW_STAGES, filterRecords } from "@/lib/csvParser";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface PipelineChartProps {
  data: DashboardData;
  assigneeFilter: string;
  returnTypeFilter: string;
  searchQuery: string;
  onSelectStage: (index: number | null) => void;
  selectedIndex: number | null;
}

const STAGE_COLORS = WORKFLOW_STAGES.map((s) => s.color);

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div
        className="rounded-xl px-4 py-3"
        style={{
          background: "linear-gradient(135deg, oklch(0.17 0.07 155), oklch(0.22 0.07 155))",
          border: "1px solid oklch(0.32 0.07 155)",
          boxShadow: "0 12px 32px oklch(0 0 0 / 0.35)",
          minWidth: "190px",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: "0.8rem",
            color: "oklch(0.92 0.03 85)",
            marginBottom: "0.5rem",
            lineHeight: 1.3,
          }}
        >
          {d.fullLabel}
        </p>
        <div className="flex items-center justify-between gap-4">
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "1.2rem",
              fontWeight: 700,
              color: d.color,
            }}
          >
            {d.count}
          </span>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.72rem",
              color: "oklch(0.68 0.03 155)",
            }}
          >
            tasks
          </span>
        </div>
        {d.overdue > 0 && (
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.7rem",
              color: "oklch(0.75 0.16 30)",
              marginTop: "0.3rem",
            }}
          >
            ⚠ {d.overdue} overdue
          </p>
        )}
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.65rem",
            color: "oklch(0.58 0.04 155)",
            marginTop: "0.5rem",
          }}
        >
          Click to view clients →
        </p>
      </div>
    );
  }
  return null;
};

export function PipelineChart({
  data,
  assigneeFilter,
  returnTypeFilter,
  searchQuery,
  onSelectStage,
  selectedIndex,
}: PipelineChartProps) {
  const chartData = data.stages.map((stage, index) => {
    const filtered = filterRecords(
      stage.records,
      assigneeFilter,
      returnTypeFilter,
      searchQuery
    );
    const overdueFiltered = filtered.filter((r) => r.isOverdue).length;
    return {
      index,
      label: stage.stageShort,
      fullLabel: stage.stageLabel,
      count: filtered.length,
      overdue: overdueFiltered,
      color: STAGE_COLORS[index],
      isSelected: selectedIndex === index,
    };
  });

  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  const handleBarClick = (entry: any) => {
    if (entry && entry.activePayload && entry.activePayload.length > 0) {
      const idx = entry.activePayload[0].payload.index;
      onSelectStage(selectedIndex === idx ? null : idx);
    }
  };

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "oklch(1 0 0)",
        border: "1px solid oklch(0.89 0.015 85)",
        boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06), 0 1px 2px oklch(0.28 0.07 155 / 0.04)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "oklch(0.22 0.07 155)",
              lineHeight: 1.1,
            }}
          >
            Pipeline Distribution
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.76rem",
              color: "oklch(0.52 0.04 155)",
              marginTop: "3px",
            }}
          >
            Client count across all 23 workflow stages — click any bar to drill in
          </p>
        </div>
        <div
          className="flex items-center gap-3"
          style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem" }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: "#4A7C59" }}
            />
            <span style={{ color: "oklch(0.48 0.04 155)" }}>Active</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: "oklch(0.62 0.14 30)" }}
            />
            <span style={{ color: "oklch(0.48 0.04 155)" }}>Overdue</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          onClick={handleBarClick}
          style={{ cursor: "pointer" }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="oklch(0.92 0.008 85)"
          />
          <XAxis
            dataKey="label"
            tick={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 10,
              fill: "oklch(0.50 0.04 155)",
            }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              fill: "oklch(0.60 0.04 155)",
            }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(0.96 0.008 85)" }} />
          <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={48}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isSelected ? entry.color : `${entry.color}cc`}
                stroke={entry.isSelected ? entry.color : "transparent"}
                strokeWidth={entry.isSelected ? 2 : 0}
                style={{
                  filter: entry.isSelected
                    ? `drop-shadow(0 3px 8px ${entry.color}66)`
                    : "none",
                  transition: "all 0.2s ease",
                }}
              />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fill: "oklch(0.40 0.06 155)",
                fontWeight: 600,
              }}
              formatter={(v: number) => (v > 0 ? v : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Bottleneck callout */}
      {(() => {
        const top = [...chartData].sort((a, b) => b.count - a.count).slice(0, 3).filter(d => d.count > 0);
        if (top.length === 0) return null;
        return (
          <div
            className="mt-3 flex flex-wrap items-center gap-2"
            style={{ borderTop: "1px solid oklch(0.92 0.010 85)", paddingTop: "0.75rem" }}
          >
            <span
              className="flex items-center gap-1"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.72rem",
                color: "oklch(0.52 0.04 155)",
              }}
            >
              <TrendingUp size={12} />
              Top bottlenecks:
            </span>
            {top.map((d) => (
              <button
                key={d.index}
                onClick={() => onSelectStage(selectedIndex === d.index ? null : d.index)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all hover:opacity-80"
                style={{
                  backgroundColor: `${d.color}14`,
                  border: `1px solid ${d.color}40`,
                  boxShadow: `0 1px 4px ${d.color}20`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.72rem",
                    color: d.color,
                    fontWeight: 600,
                  }}
                >
                  {d.label}
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.7rem",
                    color: d.color,
                    fontWeight: 700,
                  }}
                >
                  {d.count}
                </span>
                {d.overdue > 0 && (
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "0.65rem",
                      color: "oklch(0.55 0.18 30)",
                    }}
                  >
                    ⚠{d.overdue}
                  </span>
                )}
              </button>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
