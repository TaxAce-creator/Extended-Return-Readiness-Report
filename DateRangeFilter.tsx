// =============================================================================
// TaxAce Dashboard — Date Range Filter Component
// Quick presets (Today, This Week, This Month, Next 7 Days, April Deadline)
// plus custom from/to date picker. Filters all views by due date.
// Design: "Executive Clarity" — warm cream, forest green, Playfair + DM Sans
// =============================================================================

import { useState } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";

export interface DateRange {
  from: Date | null;
  to: Date | null;
  label: string;
}

export const DATE_PRESETS: { label: string; getValue: () => DateRange }[] = [
  {
    label: "Today",
    getValue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { from: today, to: end, label: "Today" };
    },
  },
  {
    label: "Next 7 Days",
    getValue: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end, label: "Next 7 Days" };
    },
  },
  {
    label: "This Week",
    getValue: () => {
      const now = new Date();
      const day = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end, label: "This Week" };
    },
  },
  {
    label: "This Month",
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { from: start, to: end, label: "This Month" };
    },
  },
  {
    label: "April Deadline",
    getValue: () => {
      const year = new Date().getFullYear();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(year, 3, 15, 23, 59, 59, 999); // April 15
      return { from: start, to: end, label: "April Deadline" };
    },
  },
  {
    label: "Past Due",
    getValue: () => {
      const end = new Date();
      end.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { from: new Date(2020, 0, 1), to: end, label: "Past Due" };
    },
  },
];

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toInputValue(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DateRangeFilterProps {
  dateRange: DateRange | null;
  onDateRangeChange: (range: DateRange | null) => void;
}

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const isActive = dateRange !== null;

  const handlePreset = (preset: (typeof DATE_PRESETS)[0]) => {
    onDateRangeChange(preset.getValue());
    setOpen(false);
  };

  const handleCustomApply = () => {
    if (!customFrom || !customTo) return;
    const from = new Date(customFrom + "T00:00:00");
    const to = new Date(customTo + "T23:59:59");
    if (from > to) return;
    const label = `${formatDate(from)} – ${formatDate(to)}`;
    onDateRangeChange({ from, to, label });
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateRangeChange(null);
    setCustomFrom("");
    setCustomTo("");
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.8rem",
          fontWeight: isActive ? 700 : 500,
          backgroundColor: isActive ? "oklch(0.28 0.07 155)" : "oklch(0.96 0.02 155)",
          color: isActive ? "white" : "oklch(0.35 0.07 155)",
          border: isActive
            ? "1px solid oklch(0.22 0.07 155)"
            : "1px solid oklch(0.85 0.03 155)",
          boxShadow: isActive ? "0 2px 8px oklch(0.28 0.07 155 / 0.3)" : "none",
          whiteSpace: "nowrap",
        }}
      >
        <Calendar size={13} />
        {isActive ? dateRange!.label : "Due Date"}
        {isActive ? (
          <span
            onClick={handleClear}
            className="ml-1 flex items-center justify-center rounded-full w-4 h-4 transition-all"
            style={{ backgroundColor: "oklch(0.22 0.07 155 / 0.4)" }}
          >
            <X size={9} />
          </span>
        ) : (
          <ChevronDown size={12} style={{ opacity: 0.6 }} />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute top-full mt-2 left-0 z-50 rounded-xl p-4 min-w-[280px]"
            style={{
              backgroundColor: "oklch(1 0 0)",
              border: "1px solid oklch(0.89 0.015 85)",
              boxShadow: "0 8px 32px oklch(0.22 0.07 155 / 0.15)",
            }}
          >
            {/* Preset buttons */}
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "oklch(0.52 0.04 155)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "0.5rem",
              }}
            >
              Quick Presets
            </p>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {DATE_PRESETS.map((preset) => {
                const isSelected = dateRange?.label === preset.label;
                return (
                  <button
                    key={preset.label}
                    onClick={() => handlePreset(preset)}
                    className="px-3 py-2 rounded-lg text-left transition-all"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.78rem",
                      fontWeight: isSelected ? 700 : 500,
                      backgroundColor: isSelected
                        ? "oklch(0.28 0.07 155)"
                        : "oklch(0.96 0.015 85)",
                      color: isSelected ? "white" : "oklch(0.30 0.07 155)",
                      border: isSelected
                        ? "1px solid oklch(0.22 0.07 155)"
                        : "1px solid oklch(0.89 0.015 85)",
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div
              style={{
                height: "1px",
                backgroundColor: "oklch(0.91 0.01 85)",
                marginBottom: "0.75rem",
              }}
            />

            {/* Custom range */}
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "oklch(0.52 0.04 155)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "0.5rem",
              }}
            >
              Custom Range
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.75rem",
                    color: "oklch(0.45 0.04 155)",
                    width: "32px",
                    flexShrink: 0,
                  }}
                >
                  From
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg outline-none"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.78rem",
                    border: "1px solid oklch(0.89 0.015 85)",
                    backgroundColor: "oklch(0.98 0.008 85)",
                    color: "oklch(0.22 0.07 155)",
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.75rem",
                    color: "oklch(0.45 0.04 155)",
                    width: "32px",
                    flexShrink: 0,
                  }}
                >
                  To
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg outline-none"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.78rem",
                    border: "1px solid oklch(0.89 0.015 85)",
                    backgroundColor: "oklch(0.98 0.008 85)",
                    color: "oklch(0.22 0.07 155)",
                  }}
                />
              </div>
              <button
                onClick={handleCustomApply}
                disabled={!customFrom || !customTo}
                className="w-full py-2 rounded-lg transition-all mt-1"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  backgroundColor:
                    customFrom && customTo
                      ? "oklch(0.28 0.07 155)"
                      : "oklch(0.88 0.01 85)",
                  color: customFrom && customTo ? "white" : "oklch(0.60 0.03 155)",
                  cursor: customFrom && customTo ? "pointer" : "not-allowed",
                }}
              >
                Apply Custom Range
              </button>
            </div>

            {/* Clear */}
            {isActive && (
              <button
                onClick={handleClear}
                className="w-full mt-2 py-1.5 rounded-lg transition-all"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.75rem",
                  color: "oklch(0.55 0.12 30)",
                  backgroundColor: "oklch(0.97 0.02 30)",
                  border: "1px solid oklch(0.88 0.06 30)",
                }}
              >
                Clear Date Filter
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Utility: filter records by date range
 */
export function filterByDateRange<T extends { dueDateObj: Date | null }>(
  records: T[],
  dateRange: DateRange | null
): T[] {
  if (!dateRange || (!dateRange.from && !dateRange.to)) return records;
  return records.filter((r) => {
    if (!r.dueDateObj) return false;
    if (dateRange.from && r.dueDateObj < dateRange.from) return false;
    if (dateRange.to && r.dueDateObj > dateRange.to) return false;
    return true;
  });
}
