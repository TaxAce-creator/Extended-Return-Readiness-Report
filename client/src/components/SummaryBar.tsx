// =============================================================================
// TaxAce Dashboard — Summary Bar Component v3
// Shows total counts, overdue alerts, filter controls, Overdue Only toggle,
// Date Range filter, and Tax Year filter chip
// Design Tier 2: Premium KPI chips with gradient backgrounds, improved filters
// =============================================================================

import { Search, AlertTriangle, Users, FileText, Filter, X, Calendar, TrendingDown, BookOpen } from "lucide-react";
import { type DashboardData } from "@/lib/csvParser";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";

interface SummaryBarProps {
  data: DashboardData;
  assigneeFilter: string;
  returnTypeFilter: string;
  taxYearFilter: string;
  searchQuery: string;
  overdueOnly: boolean;
  dateRange: DateRange | null;
  onAssigneeChange: (v: string) => void;
  onReturnTypeChange: (v: string) => void;
  onTaxYearChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onOverdueOnlyChange: (v: boolean) => void;
  onDateRangeChange: (range: DateRange | null) => void;
  onUploadClick: () => void;
}

export function SummaryBar({
  data,
  assigneeFilter,
  returnTypeFilter,
  taxYearFilter,
  searchQuery,
  overdueOnly,
  dateRange,
  onAssigneeChange,
  onReturnTypeChange,
  onTaxYearChange,
  onSearchChange,
  onOverdueOnlyChange,
  onDateRangeChange,
}: SummaryBarProps) {
  const activeStages = data.stages.filter((s) => s.count > 0).length;
  const overdueRate = data.totalClients > 0
    ? Math.round((data.totalOverdue / data.totalClients) * 100)
    : 0;

  const hasActiveFilter =
    assigneeFilter !== "all" ||
    returnTypeFilter !== "all" ||
    taxYearFilter !== "all" ||
    searchQuery ||
    overdueOnly ||
    dateRange !== null;

  const handleClearAll = () => {
    onAssigneeChange("all");
    onReturnTypeChange("all");
    onTaxYearChange("all");
    onSearchChange("");
    onOverdueOnlyChange(false);
    onDateRangeChange(null);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "oklch(1 0 0)",
        border: "1px solid oklch(0.89 0.015 85)",
        boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06), 0 1px 2px oklch(0.28 0.07 155 / 0.04)",
      }}
    >
      {/* KPI strip */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0"
        style={{ borderBottom: "1px solid oklch(0.91 0.012 85)" }}
      >
        <KpiCard
          icon={<FileText size={16} />}
          label="Total Tasks"
          value={data.totalClients}
          accent="oklch(0.28 0.07 155)"
          bg="linear-gradient(135deg, oklch(0.96 0.025 155), oklch(0.98 0.012 155))"
        />
        <KpiCard
          icon={<AlertTriangle size={16} />}
          label="Overdue"
          value={data.totalOverdue}
          accent={data.totalOverdue > 0 ? "oklch(0.55 0.18 30)" : "oklch(0.52 0.04 155)"}
          bg={data.totalOverdue > 0
            ? "linear-gradient(135deg, oklch(0.96 0.05 30), oklch(0.98 0.025 30))"
            : "linear-gradient(135deg, oklch(0.97 0.008 85), oklch(0.99 0.004 85))"}
          pulse={data.totalOverdue > 0}
        />
        <KpiCard
          icon={<TrendingDown size={16} />}
          label="Overdue Rate"
          value={`${overdueRate}%`}
          accent={overdueRate > 30 ? "oklch(0.55 0.18 30)" : overdueRate > 15 ? "oklch(0.62 0.14 60)" : "oklch(0.45 0.12 155)"}
          bg={overdueRate > 30
            ? "linear-gradient(135deg, oklch(0.96 0.05 30), oklch(0.98 0.025 30))"
            : "linear-gradient(135deg, oklch(0.97 0.008 85), oklch(0.99 0.004 85))"}
        />
        <KpiCard
          icon={<Users size={16} />}
          label="Active Stages"
          value={activeStages}
          accent="oklch(0.45 0.08 240)"
          bg="linear-gradient(135deg, oklch(0.96 0.03 240), oklch(0.98 0.015 240))"
        />
      </div>

      {/* Filter row */}
      <div className="px-4 py-3 flex flex-wrap gap-2 items-center">
        {/* Overdue Only Toggle */}
        <button
          onClick={() => onOverdueOnlyChange(!overdueOnly)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.8rem",
            fontWeight: overdueOnly ? 700 : 500,
            backgroundColor: overdueOnly ? "oklch(0.55 0.18 30)" : "oklch(0.97 0.03 30)",
            color: overdueOnly ? "white" : "oklch(0.50 0.14 30)",
            border: overdueOnly ? "1px solid oklch(0.48 0.18 30)" : "1px solid oklch(0.85 0.07 30)",
            boxShadow: overdueOnly ? "0 2px 10px oklch(0.55 0.18 30 / 0.35)" : "none",
          }}
        >
          <AlertTriangle size={13} />
          Overdue Only
          {overdueOnly && (
            <span
              className="ml-1 px-1.5 py-0.5 rounded text-xs font-bold"
              style={{ backgroundColor: "oklch(0.45 0.18 30)", color: "white" }}
            >
              {data.totalOverdue}
            </span>
          )}
        </button>

        {/* Date Range Filter */}
        <DateRangeFilter dateRange={dateRange} onDateRangeChange={onDateRangeChange} />

        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "oklch(0.60 0.04 155)" }}
          />
          <input
            type="text"
            placeholder="Search client or assignee..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none transition-all"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.8rem",
              border: "1px solid oklch(0.89 0.015 85)",
              backgroundColor: "oklch(0.98 0.008 85)",
              color: "oklch(0.22 0.07 155)",
              width: "200px",
            }}
          />
        </div>

        {/* Tax Year filter — NEW */}
        {data.taxYears.length > 0 && (
          <div className="relative flex items-center gap-1">
            <BookOpen size={12} style={{ color: "oklch(0.45 0.08 240)" }} />
            <select
              value={taxYearFilter}
              onChange={(e) => onTaxYearChange(e.target.value)}
              className="pl-2 pr-6 py-1.5 rounded-lg text-sm outline-none appearance-none"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.8rem",
                border: taxYearFilter !== "all"
                  ? "1px solid oklch(0.60 0.12 240)"
                  : "1px solid oklch(0.89 0.015 85)",
                backgroundColor: taxYearFilter !== "all"
                  ? "oklch(0.94 0.04 240)"
                  : "oklch(0.98 0.008 85)",
                color: taxYearFilter !== "all"
                  ? "oklch(0.30 0.10 240)"
                  : "oklch(0.22 0.07 155)",
                cursor: "pointer",
                fontWeight: taxYearFilter !== "all" ? 700 : 400,
              }}
            >
              <option value="all">All Tax Years</option>
              {data.taxYears.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
        )}

        {/* Assignee filter */}
        <div className="relative flex items-center gap-1">
          <Filter size={12} style={{ color: "oklch(0.60 0.04 155)" }} />
          <select
            value={assigneeFilter}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="pl-2 pr-6 py-1.5 rounded-lg text-sm outline-none appearance-none"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.8rem",
              border: "1px solid oklch(0.89 0.015 85)",
              backgroundColor: "oklch(0.98 0.008 85)",
              color: "oklch(0.22 0.07 155)",
              cursor: "pointer",
            }}
          >
            <option value="all">All Assignees</option>
            {data.assignees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Return type filter */}
        <select
          value={returnTypeFilter}
          onChange={(e) => onReturnTypeChange(e.target.value)}
          className="pl-2 pr-6 py-1.5 rounded-lg text-sm outline-none appearance-none"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.8rem",
            border: "1px solid oklch(0.89 0.015 85)",
            backgroundColor: "oklch(0.98 0.008 85)",
            color: "oklch(0.22 0.07 155)",
            cursor: "pointer",
          }}
        >
          <option value="all">All Return Types</option>
          {data.returnTypes.map((rt) => (
            <option key={rt} value={rt}>{rt}</option>
          ))}
        </select>

        {/* Clear all filters */}
        {hasActiveFilter && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.75rem",
              color: "oklch(0.55 0.14 30)",
              backgroundColor: "oklch(0.97 0.03 30)",
              border: "1px solid oklch(0.88 0.07 30)",
            }}
          >
            <X size={11} />
            Clear all
          </button>
        )}
      </div>

      {/* Active filter banners */}
      {(overdueOnly || dateRange || taxYearFilter !== "all") && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {overdueOnly && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                backgroundColor: "oklch(0.97 0.04 30)",
                border: "1px solid oklch(0.88 0.08 30)",
              }}
            >
              <AlertTriangle size={13} style={{ color: "oklch(0.55 0.14 30)" }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "oklch(0.45 0.14 30)" }}>
                Showing overdue tasks only — {data.totalOverdue} of {data.totalClients} total tasks
              </span>
            </div>
          )}
          {taxYearFilter !== "all" && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                backgroundColor: "oklch(0.94 0.04 240)",
                border: "1px solid oklch(0.82 0.08 240)",
              }}
            >
              <BookOpen size={13} style={{ color: "oklch(0.35 0.10 240)" }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "oklch(0.30 0.10 240)" }}>
                Tax Year filter: <strong>{taxYearFilter}</strong> — showing only {taxYearFilter} returns
              </span>
              <button
                onClick={() => onTaxYearChange("all")}
                className="ml-auto flex items-center gap-1 text-xs"
                style={{ color: "oklch(0.35 0.10 240)", fontFamily: "'DM Sans', sans-serif" }}
              >
                <X size={11} /> Clear
              </button>
            </div>
          )}
          {dateRange && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                backgroundColor: "oklch(0.95 0.025 155)",
                border: "1px solid oklch(0.85 0.05 155)",
              }}
            >
              <Calendar size={13} style={{ color: "oklch(0.28 0.07 155)" }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "oklch(0.28 0.07 155)" }}>
                Due date filter: <strong>{dateRange.label}</strong>
                {dateRange.from && dateRange.to && dateRange.label !== "Today" && (
                  <span style={{ fontWeight: 400, marginLeft: "0.4rem", opacity: 0.8 }}>
                    ({dateRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" – "}
                    {dateRange.to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
                  </span>
                )}
              </span>
              <button
                onClick={() => onDateRangeChange(null)}
                className="ml-auto flex items-center gap-1 text-xs"
                style={{ color: "oklch(0.40 0.07 155)", fontFamily: "'DM Sans', sans-serif" }}
              >
                <X size={11} /> Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  accent,
  bg,
  pulse = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent: string;
  bg: string;
  pulse?: boolean;
}) {
  return (
    <div
      className="px-5 py-4 flex items-center gap-3"
      style={{ background: bg }}
    >
      <div
        className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${pulse ? "pulse-glow" : ""}`}
        style={{
          backgroundColor: `${accent}18`,
          border: `1px solid ${accent}28`,
          color: accent,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontWeight: 700,
            fontSize: "1.35rem",
            color: accent,
            lineHeight: 1,
          }}
          className="count-animate"
        >
          {value}
        </p>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.72rem",
            color: "oklch(0.52 0.04 155)",
            lineHeight: 1.3,
            marginTop: "2px",
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
