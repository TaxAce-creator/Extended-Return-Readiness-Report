// =============================================================================
// TaxAce Dashboard — Pipeline View Component v2
// Shows all 23 workflow stages as clickable cards with client counts
// Tier 2: Premium card design, better progress bars, improved visual hierarchy
// =============================================================================

import { type StageData, WORKFLOW_STAGES, STATUS_COLORS, filterRecords } from "@/lib/csvParser";
import { AlertTriangle, ChevronRight, ArrowRight } from "lucide-react";

// Human-readable label for each status key
const STATUS_LABELS: Record<string, string> = {
  "Ready":        "Ready",
  "In progress":  "In Progress",
  "Needs review": "Needs Review",
  "On hold":      "On Hold",
  "Waiting":      "Waiting",
  "No status":    "No Status",
  "Draft":        "Draft",
  "With client":  "With Client",
};

interface PipelineViewProps {
  stages: StageData[];
  selectedIndex: number | null;
  onSelectStage: (index: number | null) => void;
  assigneeFilter: string;
  returnTypeFilter: string;
  searchQuery: string;
  overdueOnly?: boolean;
}

const STAGE_COLORS = WORKFLOW_STAGES.map((s) => s.color);

export function PipelineView({
  stages,
  selectedIndex,
  onSelectStage,
  assigneeFilter,
  returnTypeFilter,
  searchQuery,
  overdueOnly = false,
}: PipelineViewProps) {
  const handleClick = (index: number) => {
    onSelectStage(selectedIndex === index ? null : index);
  };

  // Calculate filtered counts for each stage
  const filteredCounts = stages.map((s) => {
    let recs = filterRecords(s.records, assigneeFilter, returnTypeFilter, searchQuery);
    if (overdueOnly) recs = recs.filter((r) => r.isOverdue);
    return recs.length;
  });

  const maxCount = Math.max(...filteredCounts, 1);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "1.15rem",
              color: "oklch(0.22 0.07 155)",
              lineHeight: 1.2,
            }}
          >
            Workflow Pipeline
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "oklch(0.55 0.04 155)", marginTop: "2px" }}>
            {stages.filter((_, i) => filteredCounts[i] > 0).length} active stages
          </p>
        </div>
        <p
          className="hidden sm:flex items-center gap-1"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", color: "oklch(0.55 0.04 155)" }}
        >
          <ArrowRight size={13} />
          Click any stage to view clients
        </p>
      </div>

      {/* Pipeline grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5">
        {stages.map((stage, index) => {
          const filteredCount = filteredCounts[index];
          const isSelected = selectedIndex === index;
          const hasOverdue = stage.overdueCount > 0;
          const stageColor = STAGE_COLORS[index];
          const fillPct = maxCount > 0 ? (filteredCount / maxCount) * 100 : 0;
          const isEmpty = filteredCount === 0;

          return (
            <button
              key={stage.stageKey}
              onClick={() => handleClick(index)}
              className="relative text-left rounded-xl p-3 transition-all focus:outline-none group"
              style={{
                backgroundColor: isSelected
                  ? `${stageColor}14`
                  : isEmpty
                  ? "oklch(0.975 0.004 85)"
                  : "oklch(1 0 0)",
                border: isSelected
                  ? `2px solid ${stageColor}`
                  : isEmpty
                  ? "1px solid oklch(0.91 0.010 85)"
                  : "1px solid oklch(0.89 0.015 85)",
                boxShadow: isSelected
                  ? `0 4px 20px ${stageColor}30, 0 1px 4px ${stageColor}20`
                  : isEmpty
                  ? "none"
                  : "0 1px 3px oklch(0.28 0.07 155 / 0.05)",
                transform: isSelected ? "translateY(-2px)" : "translateY(0)",
                borderLeft: `3px solid ${isSelected ? stageColor : isEmpty ? "oklch(0.88 0.010 85)" : stageColor}`,
                opacity: isEmpty ? 0.55 : 1,
              }}
            >
              {/* Stage number */}
              <div className="flex items-start justify-between mb-2">
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.62rem",
                    color: isSelected ? stageColor : "oklch(0.65 0.04 155)",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                {hasOverdue && (
                  <AlertTriangle
                    size={11}
                    style={{ color: "oklch(0.55 0.18 30)", flexShrink: 0 }}
                    className="pulse-glow"
                  />
                )}
              </div>

              {/* Progress bar */}
              <div className="ta-progress-track mb-2.5">
                <div
                  className="ta-progress-fill"
                  style={{
                    width: `${fillPct}%`,
                    backgroundColor: stageColor,
                    minWidth: filteredCount > 0 ? "6px" : "0",
                  }}
                />
              </div>

              {/* Count */}
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 700,
                  fontSize: "1.5rem",
                  color: isEmpty ? "oklch(0.78 0.02 155)" : isSelected ? stageColor : "oklch(0.20 0.07 155)",
                  lineHeight: 1,
                  marginBottom: "0.3rem",
                }}
              >
                {filteredCount}
              </div>

              {/* Stage label */}
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.68rem",
                  fontWeight: 500,
                  color: isSelected ? stageColor : "oklch(0.42 0.04 155)",
                  lineHeight: 1.3,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {stage.stageShort}
              </p>

              {/* Overdue count */}
              {hasOverdue && (
                <p
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.62rem",
                    color: "oklch(0.55 0.18 30)",
                    marginTop: "0.3rem",
                    fontWeight: 600,
                  }}
                >
                  ⚠ {stage.overdueCount} overdue
                </p>
              )}

              {/* Selected chevron */}
              {isSelected && (
                <div
                  className="absolute bottom-2 right-2"
                  style={{ color: stageColor }}
                >
                  <ChevronRight size={12} />
                </div>
              )}

              {/* Hover glow */}
              {!isEmpty && !isSelected && (
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ boxShadow: `inset 0 0 0 1px ${stageColor}30` }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Status Legend */}
      <div
        className="mt-4 rounded-xl px-4 py-3"
        style={{
          backgroundColor: "oklch(0.985 0.004 85)",
          border: "1px solid oklch(0.90 0.010 85)",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "oklch(0.48 0.04 155)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            marginBottom: "0.6rem",
          }}
        >
          Status Legend
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: STATUS_COLORS[key] ?? "#6b7280",
                  flexShrink: 0,
                  boxShadow: `0 0 4px ${STATUS_COLORS[key] ?? "#6b7280"}60`,
                }}
              />
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.72rem",
                  color: "oklch(0.40 0.04 155)",
                  fontWeight: 500,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline flow ribbon */}
      <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
        {stages.map((stage, index) => {
          const filteredCount = filteredCounts[index];
          const stageColor = STAGE_COLORS[index];
          return (
            <div key={index} className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => handleClick(index)}
                className="flex items-center gap-1 px-2 py-1 rounded-full transition-all"
                style={{
                  backgroundColor:
                    selectedIndex === index
                      ? stageColor
                      : filteredCount > 0
                      ? `${stageColor}22`
                      : "oklch(0.93 0.01 85)",
                  color:
                    selectedIndex === index
                      ? "white"
                      : filteredCount > 0
                      ? stageColor
                      : "oklch(0.72 0.02 155)",
                  fontSize: "0.62rem",
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 600,
                  border: selectedIndex === index ? `1px solid ${stageColor}` : "1px solid transparent",
                }}
              >
                <span>{filteredCount}</span>
              </button>
              {index < stages.length - 1 && (
                <div
                  style={{
                    width: "6px",
                    height: "1px",
                    backgroundColor: "oklch(0.85 0.01 155)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
