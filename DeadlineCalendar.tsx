// =============================================================================
// DeadlineCalendar — Tax Deadline Calendar
// Shows all major IRS/state tax deadlines with countdown timers.
// Highlights upcoming deadlines within 30 days.
// Design: "Executive Clarity" — warm cream, forest green, amber accents
// =============================================================================

import { useMemo } from "react";
import { Calendar, Clock, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";

interface TaxDeadline {
  id: string;
  label: string;
  description: string;
  date: string; // MM/DD/YYYY
  category: "individual" | "business" | "extension" | "estimated" | "payroll";
  forms: string[];
  isExtension?: boolean;
}

// All major 2025 tax deadlines
const TAX_DEADLINES_2025: TaxDeadline[] = [
  // Q1
  { id: "jan15-est", label: "Q4 Estimated Tax", description: "4th quarter 2024 estimated tax payment due", date: "01/15/2025", category: "estimated", forms: ["1040-ES"] },
  { id: "jan31-w2", label: "W-2 / 1099 Deadline", description: "Employers must furnish W-2s and 1099s to employees/contractors", date: "01/31/2025", category: "payroll", forms: ["W-2", "1099-NEC", "1099-MISC"] },
  { id: "feb18-1099", label: "1099-B / 1099-S", description: "Brokers must furnish 1099-B and 1099-S to recipients", date: "02/18/2025", category: "individual", forms: ["1099-B", "1099-S"] },
  { id: "feb28-paper", label: "Paper 1099 Filing", description: "Paper filing deadline for 1099s with IRS", date: "02/28/2025", category: "payroll", forms: ["1099-NEC", "1099-MISC"] },
  { id: "mar17-s-corp", label: "S-Corp / Partnership Returns", description: "S-Corp and Partnership tax returns due", date: "03/17/2025", category: "business", forms: ["1120-S", "1065"] },
  { id: "mar17-s-corp-ext", label: "S-Corp / Partnership Extension", description: "Extension request for S-Corp and Partnership returns", date: "03/17/2025", category: "extension", forms: ["7004"], isExtension: true },
  { id: "apr15-individual", label: "Individual Tax Returns", description: "Individual income tax returns due", date: "04/15/2025", category: "individual", forms: ["1040", "1040-SR"] },
  { id: "apr15-c-corp", label: "C-Corp Returns (Dec year-end)", description: "C-Corp returns due for December 31 year-end", date: "04/15/2025", category: "business", forms: ["1120"] },
  { id: "apr15-ext", label: "Individual Extension Request", description: "Automatic 6-month extension request for individuals", date: "04/15/2025", category: "extension", forms: ["4868"], isExtension: true },
  { id: "apr15-est-q1", label: "Q1 2025 Estimated Tax", description: "1st quarter 2025 estimated tax payment due", date: "04/15/2025", category: "estimated", forms: ["1040-ES"] },
  { id: "apr15-trust", label: "Trust / Estate Returns", description: "Trust and estate income tax returns due", date: "04/15/2025", category: "business", forms: ["1041"] },
  // Q2
  { id: "jun16-est-q2", label: "Q2 2025 Estimated Tax", description: "2nd quarter 2025 estimated tax payment due", date: "06/16/2025", category: "estimated", forms: ["1040-ES"] },
  { id: "jun16-expat", label: "Expat Individual Returns", description: "Automatic 2-month extension for US citizens abroad", date: "06/16/2025", category: "individual", forms: ["1040"] },
  // Q3
  { id: "sep15-est-q3", label: "Q3 2025 Estimated Tax", description: "3rd quarter 2025 estimated tax payment due", date: "09/15/2025", category: "estimated", forms: ["1040-ES"] },
  { id: "sep15-s-corp-ext", label: "S-Corp / Partnership Extended", description: "Extended S-Corp and Partnership returns due", date: "09/15/2025", category: "extension", forms: ["1120-S", "1065"] },
  // Q4
  { id: "oct15-individual-ext", label: "Individual Extended Returns", description: "Extended individual income tax returns due", date: "10/15/2025", category: "extension", forms: ["1040"] },
  { id: "oct15-c-corp-ext", label: "C-Corp Extended Returns", description: "Extended C-Corp returns due", date: "10/15/2025", category: "extension", forms: ["1120"] },
  { id: "oct15-trust-ext", label: "Trust / Estate Extended", description: "Extended trust and estate returns due", date: "10/15/2025", category: "extension", forms: ["1041"] },
  { id: "dec15-c-corp-est", label: "C-Corp Q4 Estimated", description: "C-Corp 4th quarter estimated tax payment", date: "12/15/2025", category: "estimated", forms: ["1120-W"] },
  { id: "jan15-2026-est", label: "Q4 2025 Estimated Tax", description: "4th quarter 2025 estimated tax payment due", date: "01/15/2026", category: "estimated", forms: ["1040-ES"] },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  individual: { bg: "oklch(0.93 0.025 220 / 0.3)", text: "oklch(0.35 0.10 220)", border: "oklch(0.80 0.06 220)", label: "Individual" },
  business:   { bg: "oklch(0.93 0.025 155 / 0.3)", text: "oklch(0.35 0.10 155)", border: "oklch(0.80 0.06 155)", label: "Business" },
  extension:  { bg: "oklch(0.93 0.025 75 / 0.3)",  text: "oklch(0.40 0.10 75)",  border: "oklch(0.82 0.08 75)",  label: "Extension" },
  estimated:  { bg: "oklch(0.93 0.025 280 / 0.3)", text: "oklch(0.38 0.10 280)", border: "oklch(0.80 0.06 280)", label: "Estimated" },
  payroll:    { bg: "oklch(0.93 0.025 30 / 0.3)",  text: "oklch(0.40 0.12 30)",  border: "oklch(0.82 0.08 30)",  label: "Payroll" },
};

function parseDeadlineDate(dateStr: string): Date {
  const [m, d, y] = dateStr.split("/").map(Number);
  return new Date(y, m - 1, d);
}

function getDaysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDeadlineDate(dateStr: string): string {
  const d = parseDeadlineDate(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function CountdownBadge({ daysUntil }: { daysUntil: number }) {
  if (daysUntil < 0) {
    return (
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.7rem",
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: "999px",
          backgroundColor: "oklch(0.55 0.18 30 / 0.15)",
          color: "oklch(0.45 0.18 30)",
          border: "1px solid oklch(0.75 0.12 30)",
        }}
      >
        Passed
      </span>
    );
  }
  if (daysUntil === 0) {
    return (
      <span
        className="pulse-glow"
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.7rem",
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: "999px",
          backgroundColor: "oklch(0.55 0.18 30)",
          color: "white",
        }}
      >
        TODAY
      </span>
    );
  }
  if (daysUntil <= 7) {
    return (
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.7rem",
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: "999px",
          backgroundColor: "oklch(0.55 0.18 30 / 0.15)",
          color: "oklch(0.45 0.18 30)",
          border: "1px solid oklch(0.75 0.12 30)",
        }}
      >
        {daysUntil}d
      </span>
    );
  }
  if (daysUntil <= 30) {
    return (
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.7rem",
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: "999px",
          backgroundColor: "oklch(0.58 0.16 60 / 0.15)",
          color: "oklch(0.45 0.14 60)",
          border: "1px solid oklch(0.78 0.10 60)",
        }}
      >
        {daysUntil}d
      </span>
    );
  }
  return (
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "0.7rem",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: "999px",
        backgroundColor: "oklch(0.93 0.01 85)",
        color: "oklch(0.55 0.03 85)",
      }}
    >
      {daysUntil}d
    </span>
  );
}

interface DeadlineCalendarProps {
  compact?: boolean; // Used in Overview widget
}

export function DeadlineCalendar({ compact = false }: DeadlineCalendarProps) {
  const deadlinesWithCountdown = useMemo(() => {
    return TAX_DEADLINES_2025.map((d) => ({
      ...d,
      dateObj: parseDeadlineDate(d.date),
      daysUntil: getDaysUntil(parseDeadlineDate(d.date)),
    })).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, []);

  const upcoming = deadlinesWithCountdown.filter((d) => d.daysUntil >= 0);
  const past = deadlinesWithCountdown.filter((d) => d.daysUntil < 0);
  const next30 = upcoming.filter((d) => d.daysUntil <= 30);

  if (compact) {
    // Compact widget for Overview page
    const nextThree = upcoming.slice(0, 3);
    return (
      <div className="space-y-2">
        {nextThree.length === 0 ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.55 0.04 155)", textAlign: "center", padding: "0.5rem 0" }}>
            No upcoming deadlines
          </p>
        ) : (
          nextThree.map((d) => {
            const cat = CATEGORY_COLORS[d.category];
            return (
              <div
                key={d.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{
                  backgroundColor: d.daysUntil <= 7 ? "oklch(0.97 0.04 30 / 0.4)" : "oklch(0.975 0.008 85)",
                  border: `1px solid ${d.daysUntil <= 7 ? "oklch(0.85 0.08 30 / 0.5)" : "oklch(0.91 0.012 85)"}`,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.text }}
                  />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", fontWeight: 600, color: "oklch(0.22 0.07 155)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "oklch(0.55 0.04 155)" }}>
                    {d.date.slice(0, 5)}
                  </span>
                  <CountdownBadge daysUntil={d.daysUntil} />
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-in-up">
      {/* Header */}
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
              Tax Deadline Calendar
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.72 0.04 155)", marginTop: "0.25rem" }}>
              All major IRS deadlines for 2025 tax year — {upcoming.length} upcoming, {past.length} passed
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: "oklch(0.30 0.07 155 / 0.6)", border: "1px solid oklch(0.40 0.07 155 / 0.5)" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "oklch(0.60 0.04 155)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Due ≤ 30 days</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: next30.length > 0 ? "oklch(0.75 0.14 75)" : "oklch(0.65 0.12 145)" }}>
                {next30.length}
              </p>
            </div>
            <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: "oklch(0.30 0.07 155 / 0.6)", border: "1px solid oklch(0.40 0.07 155 / 0.5)" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "oklch(0.60 0.04 155)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Upcoming</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "oklch(0.97 0.008 85)" }}>
                {upcoming.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORY_COLORS).map(([key, val]) => (
          <span
            key={key}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: val.bg, border: `1px solid ${val.border}`, fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", fontWeight: 600, color: val.text }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: val.text }} />
            {val.label}
          </span>
        ))}
      </div>

      {/* Upcoming deadlines */}
      {upcoming.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "oklch(1 0 0)",
            border: "1px solid oklch(0.91 0.012 85)",
            boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06)",
          }}
        >
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid oklch(0.91 0.012 85)", backgroundColor: "oklch(0.975 0.008 85)" }}>
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "oklch(0.22 0.07 155)" }}>
              Upcoming Deadlines
            </h3>
          </div>
          <div>
            {upcoming.map((d, idx) => {
              const cat = CATEGORY_COLORS[d.category];
              const isUrgent = d.daysUntil <= 7;
              const isWarning = d.daysUntil <= 30 && d.daysUntil > 7;
              return (
                <div
                  key={d.id}
                  className="flex items-start gap-4 px-5 py-4 transition-colors"
                  style={{
                    borderBottom: idx < upcoming.length - 1 ? "1px solid oklch(0.94 0.008 85)" : "none",
                    backgroundColor: isUrgent ? "oklch(0.99 0.02 30 / 0.3)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!isUrgent) (e.currentTarget as HTMLDivElement).style.backgroundColor = "oklch(0.975 0.008 85)"; }}
                  onMouseLeave={(e) => { if (!isUrgent) (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; }}
                >
                  {/* Date column */}
                  <div className="shrink-0 text-center" style={{ minWidth: 52 }}>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1rem", fontWeight: 700, color: "oklch(0.22 0.07 155)", lineHeight: 1 }}>
                      {d.date.slice(3, 5)}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", fontWeight: 600, color: "oklch(0.55 0.04 155)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {new Date(d.dateObj).toLocaleDateString("en-US", { month: "short" })}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="w-px self-stretch" style={{ backgroundColor: "oklch(0.91 0.012 85)" }} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "oklch(0.22 0.07 155)" }}>
                        {d.label}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: cat.bg, color: cat.text, border: `1px solid ${cat.border}`, fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", fontWeight: 700 }}
                      >
                        {cat.label}
                      </span>
                      {d.isExtension && (
                        <span
                          className="px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: "oklch(0.93 0.025 75 / 0.3)", color: "oklch(0.40 0.10 75)", border: "1px solid oklch(0.82 0.08 75)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", fontWeight: 700 }}
                        >
                          Extension
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", color: "oklch(0.50 0.04 155)", marginTop: "0.2rem" }}>
                      {d.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {d.forms.map((f) => (
                        <span
                          key={f}
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: "5px",
                            backgroundColor: "oklch(0.93 0.025 155)",
                            color: "oklch(0.28 0.07 155)",
                          }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Countdown */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isUrgent && <AlertTriangle size={14} style={{ color: "oklch(0.50 0.18 30)" }} />}
                    <CountdownBadge daysUntil={d.daysUntil} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past deadlines (collapsed) */}
      {past.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "oklch(1 0 0)",
            border: "1px solid oklch(0.91 0.012 85)",
            opacity: 0.7,
          }}
        >
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ backgroundColor: "oklch(0.975 0.008 85)" }}>
            <CheckCircle2 size={15} style={{ color: "oklch(0.55 0.12 145)" }} />
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "oklch(0.45 0.04 155)" }}>
              Passed Deadlines ({past.length})
            </h3>
          </div>
          <div>
            {past.slice(-5).reverse().map((d, idx) => {
              const cat = CATEGORY_COLORS[d.category];
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-4 px-5 py-3"
                  style={{ borderBottom: idx < Math.min(5, past.length) - 1 ? "1px solid oklch(0.94 0.008 85)" : "none" }}
                >
                  <div className="shrink-0 text-center" style={{ minWidth: 52 }}>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9rem", fontWeight: 700, color: "oklch(0.60 0.03 85)", lineHeight: 1 }}>
                      {d.date.slice(3, 5)}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.62rem", fontWeight: 600, color: "oklch(0.65 0.03 85)", textTransform: "uppercase" }}>
                      {new Date(d.dateObj).toLocaleDateString("en-US", { month: "short" })}
                    </p>
                  </div>
                  <div className="w-px self-stretch" style={{ backgroundColor: "oklch(0.91 0.012 85)" }} />
                  <div className="flex-1 min-w-0">
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.85rem", color: "oklch(0.55 0.03 85)" }}>
                      {d.label}
                    </span>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-md shrink-0"
                    style={{ backgroundColor: cat.bg, color: cat.text, fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", fontWeight: 600 }}
                  >
                    {cat.label}
                  </span>
                  <CountdownBadge daysUntil={d.daysUntil} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
