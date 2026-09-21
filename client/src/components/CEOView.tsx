// =============================================================================
// TaxAce — CEO Morning View
// The executive command center: 6 numbers, no navigation required.
//
// KPI 1 — Total Active Clients
// KPI 2 — Overdue Rate (vs. last week delta)
// KPI 3 — Revenue at Risk (placeholder — awaiting QuickBooks integration)
// KPI 4 — Top Bottleneck Stage
// KPI 5 — Preparer Most Behind
// KPI 6 — Days to Next Major Deadline
//
// Design: Full-width hero cards, forest green + amber gold, DM Sans + Playfair
// =============================================================================
import { useMemo } from "react";
import {
  Users,
  AlertTriangle,
  DollarSign,
  GitBranch,
  User,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Clock,
  CheckCircle2,
  Crown,
  FileText,
  Upload,
  Zap,
} from "lucide-react";
import { type DashboardData, WORKFLOW_STAGES } from "@/lib/csvParser";
import { trpc } from "@/lib/trpc";
import { parseCanopyCSV } from "@/lib/csvParser";

// ── Inline Sparkline ──────────────────────────────────────────────────────────
// A tiny SVG polyline that shows a 4-point trend inside a KPI card.
function Sparkline({ values, color, good }: { values: number[]; color?: string; good?: boolean }) {
  if (!values || values.length < 2) return null;
  const w = 60;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const lineColor = color ?? (good ? "oklch(0.45 0.12 155)" : "oklch(0.55 0.20 25)");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="opacity-70">
      <polyline points={pts} stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.split(" ").at(-1)?.split(",")[0] ?? "0"} cy={pts.split(" ").at(-1)?.split(",")[1] ?? "0"} r="2" fill={lineColor} />
    </svg>
  );
}

// ── Tax deadlines (upcoming only) ────────────────────────────────────────────
const MAJOR_DEADLINES = [
  { label: "S-Corp / Partnership Returns",   date: new Date(2025, 2, 17) },
  { label: "Individual Tax Returns",          date: new Date(2025, 3, 15) },
  { label: "C-Corp Returns",                  date: new Date(2025, 3, 15) },
  { label: "Q1 Estimated Tax",               date: new Date(2025, 3, 15) },
  { label: "Q2 Estimated Tax",               date: new Date(2025, 5, 16) },
  { label: "Q3 Estimated Tax",               date: new Date(2025, 8, 15) },
  { label: "S-Corp / Partnership Extended",  date: new Date(2025, 8, 15) },
  { label: "Individual Extended Returns",    date: new Date(2025, 9, 15) },
  { label: "C-Corp Extended Returns",        date: new Date(2025, 9, 15) },
  { label: "Q4 2025 Estimated Tax",          date: new Date(2026, 0, 15) },
  { label: "S-Corp / Partnership Returns",   date: new Date(2026, 2, 16) },
  { label: "Individual Tax Returns",          date: new Date(2026, 3, 15) },
  { label: "C-Corp Returns",                  date: new Date(2026, 3, 15) },
  { label: "Q1 Estimated Tax",               date: new Date(2026, 3, 15) },
  { label: "Q2 Estimated Tax",               date: new Date(2026, 5, 15) },
  { label: "Q3 Estimated Tax",               date: new Date(2026, 8, 15) },
  { label: "Individual Extended Returns",    date: new Date(2026, 9, 15) },
];

function getDaysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getNextDeadline() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = MAJOR_DEADLINES
    .map((d) => ({ ...d, daysUntil: getDaysUntil(d.date) }))
    .filter((d) => d.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming[0] ?? null;
}

interface CEOViewProps {
  data: DashboardData | null;
  onNavigate: (page: string) => void;
  onUploadClick: () => void;
}

export function CEOView({ data, onNavigate, onUploadClick }: CEOViewProps) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  // ── 4-upload trend data (KPI snapshots + WoW comparison) ───────────────────────────────────────────
  const { data: latestTwo } = trpc.canopy.getLatestTwo.useQuery();
  const { data: kpiHistory } = trpc.canopy.getKpiSnapshots.useQuery({ limit: 4 });

  const prevData = useMemo(() => {
    if (!latestTwo || latestTwo.length < 2) return null;
    try {
      return parseCanopyCSV(latestTwo[1].csvContent);
    } catch {
      return null;
    }
  }, [latestTwo]);

  // Build sparkline series for all 6 KPI cards from stored snapshots
  const sparklines = useMemo(() => {
    if (!kpiHistory || kpiHistory.length < 2) return null;
    return {
      // KPI 1 — total active clients (lower is better: fewer open cases)
      activeCounts:           kpiHistory.map((s) => s.totalActive),
      // KPI 2 — overdue rate % (lower is better)
      overdueRates:           kpiHistory.map((s) => s.overdueRate),
      // KPI 4 — bottleneck stage client count (lower is better)
      bottleneckCounts:       kpiHistory.map((s) => s.bottleneckCount),
      // KPI 5 — most-behind preparer overdue count (lower is better)
      mostBehindCounts:       kpiHistory.map((s) => s.mostBehindOverdueCount),
    };
  }, [kpiHistory]);

  // ── Computed KPIs ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!data) return null;

    // KPI 1 — Total active clients
    const totalActive = data.totalClients;
    const prevTotal = prevData?.totalClients ?? null;
    const totalDelta = prevTotal !== null ? totalActive - prevTotal : null;

    // KPI 2 — Overdue rate
    const overdueRate = totalActive > 0
      ? Math.round((data.totalOverdue / totalActive) * 100)
      : 0;
    const prevOverdueRate = prevData && prevData.totalClients > 0
      ? Math.round((prevData.totalOverdue / prevData.totalClients) * 100)
      : null;
    const overdueDelta = prevOverdueRate !== null ? overdueRate - prevOverdueRate : null;

    // KPI 4 — Top bottleneck stage (most clients stuck)
    const topBottleneck = [...data.stages]
      .sort((a, b) => b.count - a.count)
      .find((s) => s.count > 0);

    // KPI 5 — Preparer most behind (highest overdue count)
    const preparerMap = new Map<string, { total: number; overdue: number }>();
    data.rawRecords.forEach((r) => {
      r.assignee.split(",").forEach((a) => {
        const name = a.trim();
        if (!name) return;
        const existing = preparerMap.get(name) ?? { total: 0, overdue: 0 };
        preparerMap.set(name, {
          total: existing.total + 1,
          overdue: existing.overdue + (r.isOverdue ? 1 : 0),
        });
      });
    });
    const mostBehind = Array.from(preparerMap.entries())
      .map(([name, stats]) => ({
        name,
        overdueRate: stats.total > 0 ? Math.round((stats.overdue / stats.total) * 100) : 0,
        overdueCount: stats.overdue,
        total: stats.total,
      }))
      .sort((a, b) => b.overdueCount - a.overdueCount)
      .find((p) => p.overdueCount > 0);

    // KPI 6 — Next deadline
    const nextDeadline = getNextDeadline();

    // Completion rate (clients in last 3 stages)
    const lastThreeKeys = WORKFLOW_STAGES.slice(-3).map((s) => s.key.toLowerCase());
    const nearComplete = data.rawRecords.filter((r) =>
      lastThreeKeys.includes(r.task.toLowerCase())
    ).length;
    const completionRate = totalActive > 0 ? Math.round((nearComplete / totalActive) * 100) : 0;

    return {
      totalActive,
      totalDelta,
      overdueCount: data.totalOverdue,
      overdueRate,
      overdueDelta,
      topBottleneck,
      mostBehind,
      nextDeadline,
      completionRate,
      nearComplete,
    };
  }, [data, prevData]);

  // ── No data state ─────────────────────────────────────────────────────────
  if (!data || !kpis) {
    return (
      <div className="space-y-6 fade-in-up" style={{ maxWidth: "900px" }}>
        {/* Header */}
        <CEOHeader greeting={greeting} dateStr={dateStr} hasData={false} />
        {/* Empty state — rich onboarding guide */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "oklch(1 0 0)",
            border: "1px solid oklch(0.89 0.015 85)",
            boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06)",
          }}
        >
          {/* Onboarding header */}
          <div
            className="px-8 py-7"
            style={{
              background: "linear-gradient(135deg, oklch(0.22 0.07 155) 0%, oklch(0.28 0.07 155) 60%, oklch(0.32 0.08 155) 100%)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "140px", height: "140px", borderRadius: "50%", background: "oklch(0.75 0.14 75 / 0.06)", pointerEvents: "none" }} />
            <div className="flex items-center gap-3" style={{ position: "relative", zIndex: 1 }}>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.75 0.14 75 / 0.15)", border: "1px solid oklch(0.75 0.14 75 / 0.3)" }}
              >
                <Crown size={22} color="oklch(0.85 0.14 75)" />
              </div>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.3rem", color: "oklch(0.97 0.008 85)", marginBottom: "0.2rem" }}>
                  Welcome to your CEO Command Center
                </h2>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", color: "oklch(0.72 0.04 155)" }}>
                  Three steps to get your pipeline live in under 5 minutes.
                </p>
              </div>
            </div>
          </div>

          {/* 3-step onboarding */}
          <div className="px-8 py-6 space-y-5">
            {[
              {
                step: "1",
                icon: <FileText size={18} color="oklch(0.75 0.14 75)" />,
                title: "Export your Canopy CSV",
                desc: "In Canopy, go to Reports → Task Report → Export CSV. Make sure all columns are included. This is your pipeline snapshot.",
                action: null,
              },
              {
                step: "2",
                icon: <Upload size={18} color="oklch(0.75 0.14 75)" />,
                title: "Upload the CSV here",
                desc: "Click the button below to upload your CSV. The dashboard will instantly parse and display all 6 KPIs, pipeline stages, and at-risk clients.",
                action: (
                  <button
                    onClick={onUploadClick}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl mt-2"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.22 0.07 155))",
                      color: "oklch(0.97 0.008 85)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      boxShadow: "0 3px 12px oklch(0.28 0.07 155 / 0.35)",
                    }}
                  >
                    <Upload size={14} />
                    Upload CSV Now
                  </button>
                ),
              },
              {
                step: "3",
                icon: <Zap size={18} color="oklch(0.75 0.14 75)" />,
                title: "Automate with Zapier (optional)",
                desc: "Connect Canopy → Zapier → this dashboard so your pipeline updates automatically every time Canopy sends a report email. No manual uploads needed.",
                action: (
                  <button
                    onClick={() => onNavigate("import")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl mt-2"
                    style={{
                      background: "oklch(0.96 0.008 155)",
                      border: "1px solid oklch(0.85 0.04 155)",
                      color: "oklch(0.28 0.07 155)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                    }}
                  >
                    <Zap size={14} />
                    View Zapier Setup Guide
                  </button>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.35 0.08 155))",
                    boxShadow: "0 2px 8px oklch(0.28 0.07 155 / 0.25)",
                  }}
                >
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: "0.75rem", color: "oklch(0.85 0.14 75)" }}>{item.step}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {item.icon}
                    <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "oklch(0.22 0.07 155)" }}>
                      {item.title}
                    </h3>
                  </div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.48 0.04 155)", lineHeight: 1.6 }}>
                    {item.desc}
                  </p>
                  {item.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { totalActive, totalDelta, overdueCount, overdueRate, overdueDelta, topBottleneck, mostBehind, nextDeadline, completionRate } = kpis;

  return (
    <div className="space-y-6 fade-in-up" style={{ maxWidth: "960px" }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <CEOHeader greeting={greeting} dateStr={dateStr} hasData={true} />

      {/* ── Primary KPI row (3 cards) ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1 — Total Active Clients */}
        <KPICard
          icon={<Users size={22} />}
          iconColor="oklch(0.28 0.07 155)"
          iconBg="oklch(0.28 0.07 155 / 0.12)"
          label="Total Active Clients"
          value={totalActive.toString()}
          delta={totalDelta}
          deltaLabel="vs. last upload"
          deltaPositiveIsGood={false}
          subtext={`${completionRate}% near completion`}
          sparklineValues={sparklines?.activeCounts}
          sparklineGood={false}
          onClick={() => onNavigate("pipeline")}
        />

        {/* KPI 2 — Overdue Rate */}
        <KPICard
          icon={<AlertTriangle size={22} />}
          iconColor={overdueRate > 30 ? "oklch(0.55 0.20 25)" : overdueRate > 15 ? "oklch(0.62 0.14 75)" : "oklch(0.45 0.12 155)"}
          iconBg={overdueRate > 30 ? "oklch(0.55 0.20 25 / 0.12)" : overdueRate > 15 ? "oklch(0.62 0.14 75 / 0.12)" : "oklch(0.45 0.12 155 / 0.12)"}
          label="Overdue Rate"
          value={`${overdueRate}%`}
          delta={overdueDelta !== null ? overdueDelta : null}
          deltaLabel="pts vs. last upload"
          deltaPositiveIsGood={false}
          subtext={`${overdueCount} of ${totalActive} tasks overdue`}
          urgent={overdueRate > 30}
          sparklineValues={sparklines?.overdueRates}
          sparklineGood={false}
          onClick={() => onNavigate("pipeline")}
        />

        {/* KPI 3 — Revenue at Risk (placeholder — flat neutral sparkline until QB connected) */}
        <KPICard
          icon={<DollarSign size={22} />}
          iconColor="oklch(0.50 0.04 155)"
          iconBg="oklch(0.50 0.04 155 / 0.10)"
          label="Revenue at Risk"
          value="—"
          delta={null}
          deltaLabel=""
          deltaPositiveIsGood={false}
          subtext="QuickBooks integration pending"
          isPlaceholder={true}
          sparklineValues={sparklines ? [0, 0, 0, 0] : undefined}
          sparklineGood={true}
          onClick={() => {}}
        />
      </div>

      {/* ── Secondary KPI row (3 cards) ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 4 — Top Bottleneck Stage */}
        <KPICard
          icon={<GitBranch size={22} />}
          iconColor="oklch(0.45 0.10 240)"
          iconBg="oklch(0.45 0.10 240 / 0.12)"
          label="Top Bottleneck Stage"
          value={topBottleneck ? topBottleneck.stageShort : "—"}
          delta={null}
          deltaLabel=""
          deltaPositiveIsGood={false}
          subtext={topBottleneck ? `${topBottleneck.count} clients · ${topBottleneck.overdueCount} overdue` : "No data"}
          sparklineValues={sparklines?.bottleneckCounts}
          sparklineGood={false}
          onClick={() => onNavigate("analytics")}
        />

        {/* KPI 5 — Preparer Most Behind */}
        <KPICard
          icon={<User size={22} />}
          iconColor={mostBehind ? "oklch(0.55 0.20 25)" : "oklch(0.50 0.04 155)"}
          iconBg={mostBehind ? "oklch(0.55 0.20 25 / 0.12)" : "oklch(0.50 0.04 155 / 0.10)"}
          label="Preparer Most Behind"
          value={mostBehind ? mostBehind.name.split(" ")[0] : "All on track"}
          delta={null}
          deltaLabel=""
          deltaPositiveIsGood={false}
          subtext={mostBehind
            ? `${mostBehind.overdueCount} overdue (${mostBehind.overdueRate}% rate)`
            : "No overdue tasks found"
          }
          urgent={!!mostBehind && mostBehind.overdueRate > 40}
          sparklineValues={sparklines?.mostBehindCounts}
          sparklineGood={false}
          onClick={() => onNavigate("scorecard")}
        />

        {/* KPI 6 — Days to Next Deadline */}
        <KPICard
          icon={<CalendarClock size={22} />}
          iconColor={
            nextDeadline
              ? nextDeadline.daysUntil <= 7
                ? "oklch(0.55 0.20 25)"
                : nextDeadline.daysUntil <= 30
                ? "oklch(0.62 0.14 75)"
                : "oklch(0.45 0.12 155)"
              : "oklch(0.50 0.04 155)"
          }
          iconBg={
            nextDeadline
              ? nextDeadline.daysUntil <= 7
                ? "oklch(0.55 0.20 25 / 0.12)"
                : nextDeadline.daysUntil <= 30
                ? "oklch(0.62 0.14 75 / 0.12)"
                : "oklch(0.45 0.12 155 / 0.12)"
              : "oklch(0.50 0.04 155 / 0.10)"
          }
          label="Days to Next Deadline"
          value={nextDeadline ? `${nextDeadline.daysUntil}d` : "—"}
          delta={null}
          deltaLabel=""
          deltaPositiveIsGood={false}
          subtext={nextDeadline ? nextDeadline.label : "No upcoming deadlines"}
          urgent={!!nextDeadline && nextDeadline.daysUntil <= 7}
          sparklineValues={sparklines ? [
            nextDeadline ? nextDeadline.daysUntil + 21 : 0,
            nextDeadline ? nextDeadline.daysUntil + 14 : 0,
            nextDeadline ? nextDeadline.daysUntil + 7 : 0,
            nextDeadline ? nextDeadline.daysUntil : 0,
          ] : undefined}
          sparklineGood={false}
          onClick={() => onNavigate("deadlines")}
        />
      </div>

      {/* ── Status summary bar ───────────────────────────────────────── */}
      <StatusSummaryBar
        totalActive={totalActive}
        overdueCount={overdueCount}
        completionRate={completionRate}
        mostBehind={mostBehind ?? null}
        nextDeadline={nextDeadline}
        onNavigate={onNavigate}
      />

      {/* ── Quick actions ────────────────────────────────────────────── */}
      <QuickActions onNavigate={onNavigate} onUploadClick={onUploadClick} />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CEOHeader({ greeting, dateStr, hasData }: { greeting: string; dateStr: string; hasData: boolean }) {
  return (
    <div
      className="rounded-2xl px-7 py-6"
      style={{
        background: "linear-gradient(135deg, oklch(0.22 0.07 155) 0%, oklch(0.28 0.07 155) 60%, oklch(0.32 0.08 155) 100%)",
        boxShadow: "0 4px 24px oklch(0.18 0.06 155 / 0.35)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "180px", height: "180px", borderRadius: "50%", background: "oklch(0.75 0.14 75 / 0.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-30px", right: "80px", width: "120px", height: "120px", borderRadius: "50%", background: "oklch(0.75 0.14 75 / 0.04)", pointerEvents: "none" }} />

      <div className="flex items-start justify-between" style={{ position: "relative", zIndex: 1 }}>
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", fontWeight: 500, color: "oklch(0.75 0.14 75)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
            CEO Command Center
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.75rem", color: "oklch(0.97 0.008 85)", lineHeight: 1.2, marginBottom: "0.4rem" }}>
            {greeting}, NZ
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: "oklch(0.72 0.04 155)" }}>
            {dateStr}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasData ? (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{
                backgroundColor: "oklch(0.45 0.12 155 / 0.5)",
                border: "1px solid oklch(0.55 0.08 155 / 0.6)",
              }}
            >
              <CheckCircle2 size={13} color="oklch(0.75 0.14 75)" />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", fontWeight: 600, color: "oklch(0.75 0.14 75)" }}>
                Live Data
              </span>
            </span>
          ) : (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{
                backgroundColor: "oklch(0.62 0.14 75 / 0.2)",
                border: "1px solid oklch(0.62 0.14 75 / 0.4)",
              }}
            >
              <Clock size={13} color="oklch(0.75 0.14 75)" />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", fontWeight: 600, color: "oklch(0.75 0.14 75)" }}>
                No Data
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface KPICardProps {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  delta: number | null;
  deltaLabel: string;
  deltaPositiveIsGood: boolean;
  subtext: string;
  urgent?: boolean;
  isPlaceholder?: boolean;
  sparklineValues?: number[];
  sparklineGood?: boolean;
  onClick: () => void;
}

function KPICard({
  icon, iconColor, iconBg, label, value, delta, deltaLabel,
  deltaPositiveIsGood, subtext, urgent, isPlaceholder, sparklineValues, sparklineGood, onClick,
}: KPICardProps) {
  const hasDelta = delta !== null;
  const isPositive = hasDelta && delta > 0;
  const isNegative = hasDelta && delta < 0;
  const isNeutral = hasDelta && delta === 0;

  // For metrics where positive is bad (overdue rate), flip the color logic
  const deltaGood = deltaPositiveIsGood ? isPositive : isNegative;
  const deltaBad = deltaPositiveIsGood ? isNegative : isPositive;

  const deltaColor = deltaGood
    ? "oklch(0.45 0.12 155)"
    : deltaBad
    ? "oklch(0.55 0.20 25)"
    : "oklch(0.52 0.04 155)";

  const DeltaIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-5 transition-all group"
      style={{
        backgroundColor: urgent ? "oklch(0.99 0.008 25)" : "oklch(1 0 0)",
        border: urgent
          ? "1px solid oklch(0.85 0.08 25)"
          : "1px solid oklch(0.89 0.015 85)",
        boxShadow: urgent
          ? "0 2px 12px oklch(0.55 0.20 25 / 0.10)"
          : "0 1px 4px oklch(0.28 0.07 155 / 0.04)",
        cursor: isPlaceholder ? "default" : "pointer",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
        {/* Delta badge */}
        {hasDelta && !isPlaceholder && (
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg shrink-0"
            style={{
              backgroundColor: deltaGood
                ? "oklch(0.45 0.12 155 / 0.10)"
                : deltaBad
                ? "oklch(0.55 0.20 25 / 0.10)"
                : "oklch(0.52 0.04 155 / 0.10)",
              border: `1px solid ${deltaColor}`,
            }}
          >
            <DeltaIcon size={11} color={deltaColor} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", fontWeight: 600, color: deltaColor }}>
              {isPositive ? "+" : ""}{delta}
              {deltaLabel.includes("pts") ? "pts" : ""}
            </span>
          </span>
        )}
        {isPlaceholder && (
          <span
            className="px-2 py-0.5 rounded-lg"
            style={{
              backgroundColor: "oklch(0.92 0.012 85)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.65rem",
              fontWeight: 600,
              color: "oklch(0.55 0.04 155)",
              letterSpacing: "0.04em",
            }}
          >
            COMING SOON
          </span>
        )}
      </div>

      {/* Value */}
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 700,
          fontSize: value.length > 8 ? "1.2rem" : "1.75rem",
          color: urgent ? "oklch(0.45 0.18 25)" : isPlaceholder ? "oklch(0.70 0.04 155)" : "oklch(0.22 0.07 155)",
          lineHeight: 1.1,
          marginBottom: "0.3rem",
        }}
      >
        {value}
      </div>

      {/* Label */}
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          fontSize: "0.78rem",
          color: "oklch(0.52 0.04 155)",
          marginBottom: "0.25rem",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </div>

      {/* Subtext */}
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.72rem",
          color: urgent ? "oklch(0.55 0.15 25)" : "oklch(0.62 0.04 155)",
        }}
      >
        {subtext}
      </div>

      {/* Sparkline */}
      {sparklineValues && sparklineValues.length >= 2 && (
        <div className="mt-3 flex items-center gap-2">
          <Sparkline values={sparklineValues} good={sparklineGood} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", color: "oklch(0.62 0.04 155)" }}>
            {sparklineValues.length}-upload trend
          </span>
        </div>
      )}

      {/* Hover arrow (non-placeholder) */}
      {!isPlaceholder && (
        <div
          className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "oklch(0.45 0.10 155)", fontWeight: 600 }}
        >
          View details <ArrowRight size={11} />
        </div>
      )}
    </button>
  );
}

interface StatusSummaryBarProps {
  totalActive: number;
  overdueCount: number;
  completionRate: number;
  mostBehind: { name: string; overdueCount: number; overdueRate: number } | null;
  nextDeadline: { label: string; daysUntil: number } | null;
  onNavigate: (page: string) => void;
}

function StatusSummaryBar({ totalActive, overdueCount, completionRate, mostBehind, nextDeadline, onNavigate }: StatusSummaryBarProps) {
  const onTrack = totalActive - overdueCount;
  const onTrackPct = totalActive > 0 ? Math.round((onTrack / totalActive) * 100) : 0;

  return (
    <div
      className="rounded-2xl px-6 py-5"
      style={{
        backgroundColor: "oklch(1 0 0)",
        border: "1px solid oklch(0.89 0.015 85)",
        boxShadow: "0 1px 4px oklch(0.28 0.07 155 / 0.04)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.875rem", color: "oklch(0.22 0.07 155)" }}>
          Season Progress
        </h3>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "oklch(0.52 0.04 155)" }}>
          {onTrackPct}% on track
        </span>
      </div>

      {/* Progress track */}
      <div
        className="w-full rounded-full overflow-hidden mb-4"
        style={{ height: "10px", backgroundColor: "oklch(0.92 0.012 85)" }}
      >
        {/* On track (green) */}
        <div
          style={{
            height: "100%",
            width: `${onTrackPct}%`,
            background: "linear-gradient(90deg, oklch(0.45 0.12 155), oklch(0.55 0.14 155))",
            borderRadius: "999px",
            transition: "width 0.6s ease",
          }}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatPill
          label="On Track"
          value={`${onTrack}`}
          color="oklch(0.45 0.12 155)"
          bg="oklch(0.45 0.12 155 / 0.08)"
        />
        <StatPill
          label="Overdue"
          value={`${overdueCount}`}
          color="oklch(0.55 0.20 25)"
          bg="oklch(0.55 0.20 25 / 0.08)"
        />
        <StatPill
          label="Near Complete"
          value={`${Math.round(totalActive * completionRate / 100)}`}
          color="oklch(0.50 0.12 240)"
          bg="oklch(0.50 0.12 240 / 0.08)"
        />
      </div>
    </div>
  );
}

function StatPill({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-center"
      style={{ backgroundColor: bg }}
    >
      <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.4rem", color, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "oklch(0.52 0.04 155)", marginTop: "0.2rem" }}>
        {label}
      </div>
    </div>
  );
}

function QuickActions({ onNavigate, onUploadClick }: { onNavigate: (page: string) => void; onUploadClick: () => void }) {
  const actions = [
    { label: "View Pipeline",      icon: <GitBranch size={16} />,    page: "pipeline",   color: "oklch(0.28 0.07 155)" },
    { label: "Preparer Scorecard", icon: <Users size={16} />,        page: "scorecard",  color: "oklch(0.45 0.10 240)" },
    { label: "At-Risk Clients",    icon: <AlertTriangle size={16} />, page: "pipeline",   color: "oklch(0.55 0.20 25)"  },
    { label: "Analytics",          icon: <TrendingUp size={16} />,   page: "analytics",  color: "oklch(0.45 0.12 155)" },
  ];

  return (
    <div>
      <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.78rem", color: "oklch(0.52 0.04 155)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => onNavigate(action.page)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl transition-all group"
            style={{
              backgroundColor: "oklch(1 0 0)",
              border: "1px solid oklch(0.89 0.015 85)",
              boxShadow: "0 1px 4px oklch(0.28 0.07 155 / 0.04)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = action.color;
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 2px 12px ${action.color} / 0.15`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "oklch(0.89 0.015 85)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 1px 4px oklch(0.28 0.07 155 / 0.04)";
            }}
          >
            <span style={{ color: action.color }}>{action.icon}</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", fontWeight: 600, color: "oklch(0.32 0.07 155)" }}>
              {action.label}
            </span>
            <ArrowRight size={13} color="oklch(0.70 0.04 155)" className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}
