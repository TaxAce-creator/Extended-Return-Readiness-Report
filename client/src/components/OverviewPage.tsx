// =============================================================================
// TaxAce — Overview Page
// The first page users see — a rich executive summary with:
//   • Welcome banner with date and season context
//   • 4 KPI hero cards (total tasks, overdue, completion rate, preparers)
//   • Pipeline stage snapshot (top 5 busiest stages)
//   • At-risk deadline spotlight
//   • Quick-action cards for navigation
// =============================================================================

import { useMemo, useState } from "react";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Users,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  GitBranch,
  Award,
  LineChart,
  Search,
  ShieldCheck,
  Upload,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { type DashboardData, WORKFLOW_STAGES } from "@/lib/csvParser";
import type { SidebarPage } from "./AppSidebar";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface OverviewPageProps {
  data: DashboardData | null;
  onNavigate: (page: SidebarPage) => void;
  onUploadClick: () => void;
}

export function OverviewPage({ data, onNavigate, onUploadClick }: OverviewPageProps) {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const stats = useMemo(() => {
    if (!data) return null;
    const total = data.totalClients;
    const overdue = data.totalOverdue;
    const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0;

    // Count unique preparers
    const preparerSet = new Set<string>();
    data.rawRecords.forEach((r) => {
      r.assignee.split(",").forEach((a) => {
        const trimmed = a.trim();
        if (trimmed) preparerSet.add(trimmed);
      });
    });

    // Completion: records in the last 3 stages
    const lastThreeStageKeys = WORKFLOW_STAGES.slice(-3).map((s) => s.key.toLowerCase());
    const nearComplete = data.rawRecords.filter((r) =>
      lastThreeStageKeys.includes(r.task.toLowerCase())
    ).length;
    const completionRate = total > 0 ? Math.round((nearComplete / total) * 100) : 0;

    // Top 5 busiest stages
      const topStages = [...data.stages]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((s) => ({ ...s, name: s.stageShort }));

    // At-risk clients (overdue and not in last 2 stages)
    const lastTwoKeys = WORKFLOW_STAGES.slice(-2).map((s) => s.key.toLowerCase());
    const atRisk = data.rawRecords
      .filter((r) => r.isOverdue && !lastTwoKeys.includes(r.task.toLowerCase()))
      .slice(0, 4)
      .map((r) => ({ ...r, clientName: r.client }));

    return {
      total,
      overdue,
      overdueRate,
      preparers: preparerSet.size,
      completionRate,
      topStages,
      atRisk,
    };
  }, [data]);

  // ── No data state ────────────────────────────────────────────────────────────
  if (!data || !stats) {
    return (
      <div className="space-y-6 fade-in-up">
        {/* Welcome banner */}
        <WelcomeBanner greeting={greeting} hasData={false} />

        {/* Empty state cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Tasks", icon: <FileText size={20} />, placeholder: "—" },
            { label: "Overdue", icon: <AlertTriangle size={20} />, placeholder: "—" },
            { label: "Near Complete", icon: <CheckCircle2 size={20} />, placeholder: "—" },
            { label: "Preparers", icon: <Users size={20} />, placeholder: "—" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl p-5"
              style={{
                backgroundColor: "oklch(1 0 0)",
                border: "1px solid oklch(0.89 0.015 85)",
                boxShadow: "0 1px 4px oklch(0.28 0.07 155 / 0.04)",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{
                  backgroundColor: "oklch(0.93 0.015 155)",
                  color: "oklch(0.55 0.06 155)",
                }}
              >
                {kpi.icon}
              </div>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: "oklch(0.75 0.03 155)",
                  lineHeight: 1,
                }}
              >
                {kpi.placeholder}
              </p>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.78rem",
                  color: "oklch(0.58 0.04 155)",
                  marginTop: "4px",
                }}
              >
                {kpi.label}
              </p>
            </div>
          ))}
        </div>

        {/* Upload CTA */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "linear-gradient(135deg, oklch(0.96 0.025 155), oklch(0.98 0.012 155))",
            border: "1px solid oklch(0.88 0.025 155)",
            boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.08)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.35 0.08 155))",
              boxShadow: "0 4px 16px oklch(0.28 0.07 155 / 0.35)",
            }}
          >
            <Upload size={24} color="oklch(0.75 0.14 75)" />
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "1.35rem",
              color: "oklch(0.22 0.07 155)",
              marginBottom: "0.5rem",
            }}
          >
            Load Your Canopy Report
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.9rem",
              color: "oklch(0.45 0.05 155)",
              maxWidth: "480px",
              margin: "0 auto 1.5rem",
            }}
          >
            Export your task report from Canopy and upload it here to instantly see where every client stands across all 23 workflow stages.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={onUploadClick}
              className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all"
              style={{
                background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.22 0.07 155))",
                color: "oklch(0.97 0.008 85)",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "0.9rem",
                boxShadow: "0 3px 12px oklch(0.28 0.07 155 / 0.35)",
              }}
            >
              <Upload size={16} />
              Upload CSV
            </button>
            <button
              onClick={() => onNavigate("import")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all"
              style={{
                backgroundColor: "oklch(1 0 0)",
                color: "oklch(0.35 0.07 155)",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                fontSize: "0.9rem",
                border: "1px solid oklch(0.85 0.02 155)",
              }}
            >
              Learn more
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Quick nav cards */}
        <QuickNavCards onNavigate={onNavigate} hasData={false} />
      </div>
    );
  }

  // ── Has data state ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 fade-in-up">
      {/* Welcome banner */}
      <WelcomeBanner greeting={greeting} hasData={true} lastUpdated={data.lastUpdated} />

      {/* ── AI Daily Briefing ────────────────────────────────────────────────── */}
      <AIDailyBriefing data={data} stats={stats} />

      {/* ── KPI Hero Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiHero
          icon={<FileText size={20} />}
          label="Total Tasks"
          value={stats.total}
          accent="oklch(0.28 0.07 155)"
          bg="linear-gradient(135deg, oklch(0.96 0.025 155), oklch(0.98 0.012 155))"
          trend={null}
        />
        <KpiHero
          icon={<AlertTriangle size={20} />}
          label="Overdue"
          value={stats.overdue}
          accent={stats.overdueRate > 20 ? "oklch(0.55 0.18 30)" : "oklch(0.45 0.10 155)"}
          bg={
            stats.overdueRate > 20
              ? "linear-gradient(135deg, oklch(0.97 0.04 30), oklch(0.99 0.02 30))"
              : "linear-gradient(135deg, oklch(0.96 0.025 155), oklch(0.98 0.012 155))"
          }
          trend={stats.overdueRate > 20 ? "down" : stats.overdueRate > 10 ? "neutral" : "up"}
          trendLabel={`${stats.overdueRate}% rate`}
        />
        <KpiHero
          icon={<CheckCircle2 size={20} />}
          label="Near Complete"
          value={`${stats.completionRate}%`}
          accent="oklch(0.38 0.10 155)"
          bg="linear-gradient(135deg, oklch(0.95 0.03 155), oklch(0.98 0.012 155))"
          trend={stats.completionRate > 30 ? "up" : "neutral"}
          trendLabel="last 3 stages"
        />
        <KpiHero
          icon={<Users size={20} />}
          label="Preparers"
          value={stats.preparers}
          accent="oklch(0.45 0.08 240)"
          bg="linear-gradient(135deg, oklch(0.96 0.02 240), oklch(0.98 0.01 240))"
          trend={null}
        />
      </div>

      {/* ── Pipeline Snapshot + At-Risk ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Pipeline snapshot — 3 cols */}
        <div
          className="lg:col-span-3 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "oklch(1 0 0)",
            border: "1px solid oklch(0.89 0.015 85)",
            boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06)",
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{
              background: "linear-gradient(135deg, oklch(0.97 0.010 155), oklch(0.99 0.005 85))",
              borderBottom: "1px solid oklch(0.91 0.012 85)",
            }}
          >
            <div className="flex items-center gap-2">
              <GitBranch size={15} style={{ color: "oklch(0.45 0.06 155)" }} />
              <h3
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: "oklch(0.28 0.07 155)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Pipeline Snapshot
              </h3>
            </div>
            <button
              onClick={() => onNavigate("pipeline")}
              className="flex items-center gap-1 text-xs transition-all"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.75rem",
                color: "oklch(0.45 0.06 155)",
              }}
            >
              View full pipeline
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Top 5 stages */}
          <div className="p-4 space-y-3">
            {stats.topStages.map((stage, idx) => {
              const pct = stats.total > 0 ? Math.round((stage.count / stats.total) * 100) : 0;
              const overdueInStage = stage.overdueCount;
              const barColor =
                idx === 0
                  ? "oklch(0.28 0.07 155)"
                  : idx === 1
                  ? "oklch(0.38 0.08 155)"
                  : idx === 2
                  ? "oklch(0.52 0.06 155)"
                  : "oklch(0.65 0.05 155)";

              return (
                <div key={stage.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${barColor}18`,
                          color: barColor,
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "0.6rem",
                          fontWeight: 700,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "0.82rem",
                          fontWeight: 500,
                          color: "oklch(0.28 0.07 155)",
                        }}
                      >
                        {stage.name}
                      </span>
                      {overdueInStage > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-md"
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            backgroundColor: "oklch(0.96 0.04 30)",
                            color: "oklch(0.55 0.18 30)",
                          }}
                        >
                          {overdueInStage} overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: barColor,
                        }}
                      >
                        {stage.count}
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "0.68rem",
                          color: "oklch(0.60 0.04 155)",
                        }}
                      >
                        ({pct}%)
                      </span>
                    </div>
                  </div>
                  <div className="ta-progress-track" style={{ height: "6px" }}>
                    <div
                      className="ta-progress-fill"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* At-risk spotlight — 2 cols */}
        <div
          className="lg:col-span-2 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "oklch(1 0 0)",
            border: "1px solid oklch(0.89 0.015 85)",
            boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06)",
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{
              background: stats.atRisk.length > 0
                ? "linear-gradient(135deg, oklch(0.97 0.04 30), oklch(0.99 0.02 30))"
                : "linear-gradient(135deg, oklch(0.97 0.010 155), oklch(0.99 0.005 85))",
              borderBottom: "1px solid oklch(0.91 0.012 85)",
            }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                size={15}
                style={{
                  color: stats.atRisk.length > 0 ? "oklch(0.55 0.18 30)" : "oklch(0.45 0.06 155)",
                }}
              />
              <h3
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: stats.atRisk.length > 0 ? "oklch(0.45 0.12 30)" : "oklch(0.28 0.07 155)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                At-Risk Clients
              </h3>
            </div>
            {stats.atRisk.length > 0 && (
              <span
                className="px-2 py-0.5 rounded-full"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  backgroundColor: "oklch(0.55 0.18 30 / 0.12)",
                  color: "oklch(0.55 0.18 30)",
                }}
              >
                {stats.overdue} total
              </span>
            )}
          </div>

          {/* At-risk list */}
          <div className="p-4">
            {stats.atRisk.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 size={28} style={{ color: "oklch(0.55 0.10 155)", margin: "0 auto 0.5rem" }} />
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.82rem",
                    color: "oklch(0.45 0.06 155)",
                  }}
                >
                  No overdue clients — great work!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats.atRisk.map((client) => (
                  <div
                    key={`${client.client}-${client.task}`}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{
                      backgroundColor: "oklch(0.98 0.012 30)",
                      border: "1px solid oklch(0.92 0.025 30)",
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0 pulse-glow"
                      style={{ backgroundColor: "oklch(0.55 0.18 30)" }}
                    />
                    <div className="overflow-hidden">
                      <p
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "oklch(0.28 0.07 155)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {client.client}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "0.68rem",
                            color: "oklch(0.55 0.18 30)",
                          }}
                        >
                          {client.task}
                        </span>
                        {client.dueDate && (
                          <span
                            className="flex items-center gap-1"
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "0.65rem",
                              color: "oklch(0.60 0.08 30)",
                            }}
                          >
                            <Clock size={9} />
                            {new Date(client.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {stats.overdue > 4 && (
                  <button
                    onClick={() => onNavigate("pipeline")}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.78rem",
                      color: "oklch(0.55 0.18 30)",
                      backgroundColor: "oklch(0.97 0.025 30)",
                      border: "1px solid oklch(0.90 0.03 30)",
                    }}
                  >
                    View all {stats.overdue} overdue
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Nav Cards ───────────────────────────────────────────────────── */}
      <QuickNavCards onNavigate={onNavigate} hasData={true} />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function WelcomeBanner({
  greeting,
  hasData,
  lastUpdated,
}: {
  greeting: string;
  hasData: boolean;
  lastUpdated?: Date;
}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="rounded-2xl px-6 py-5 flex items-center justify-between flex-wrap gap-4"
      style={{
        background: "linear-gradient(135deg, oklch(0.22 0.07 155) 0%, oklch(0.28 0.07 155) 60%, oklch(0.32 0.08 155) 100%)",
        boxShadow: "0 4px 20px oklch(0.18 0.06 155 / 0.35)",
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.8rem",
            color: "oklch(0.65 0.05 155)",
            marginBottom: "2px",
          }}
        >
          {dateStr}
        </p>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: "1.5rem",
            color: "oklch(0.97 0.008 85)",
            lineHeight: 1.2,
          }}
        >
          {greeting}, NZ
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.85rem",
            color: "oklch(0.72 0.04 155)",
            marginTop: "4px",
          }}
        >
          {hasData
            ? "Here's your tax prep operations snapshot for today."
            : "Upload a Canopy report to see your team's progress."}
        </p>
      </div>

      {hasData && lastUpdated && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{
            backgroundColor: "oklch(0.30 0.07 155 / 0.6)",
            border: "1px solid oklch(0.38 0.07 155 / 0.5)",
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: "oklch(0.75 0.14 75)",
              boxShadow: "0 0 6px oklch(0.75 0.14 75 / 0.6)",
            }}
          />
          <div>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.68rem",
                color: "oklch(0.72 0.04 155)",
              }}
            >
              Last updated
            </p>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "oklch(0.88 0.04 155)",
              }}
            >
              {lastUpdated.toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiHero({
  icon,
  label,
  value,
  accent,
  bg,
  trend,
  trendLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
  bg: string;
  trend: "up" | "down" | "neutral" | null;
  trendLabel?: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 ta-card"
      style={{ background: bg }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: `${accent}18`,
            border: `1px solid ${accent}28`,
            color: accent,
          }}
        >
          {icon}
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{
              backgroundColor:
                trend === "up"
                  ? "oklch(0.35 0.12 155 / 0.12)"
                  : trend === "down"
                  ? "oklch(0.55 0.18 30 / 0.12)"
                  : "oklch(0.62 0.14 75 / 0.12)",
              color:
                trend === "up"
                  ? "oklch(0.35 0.12 155)"
                  : trend === "down"
                  ? "oklch(0.55 0.18 30)"
                  : "oklch(0.58 0.14 75)",
            }}
          >
            {trend === "up" ? (
              <TrendingUp size={11} />
            ) : trend === "down" ? (
              <TrendingDown size={11} />
            ) : (
              <Minus size={11} />
            )}
            {trendLabel && (
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                }}
              >
                {trendLabel}
              </span>
            )}
          </div>
        )}
      </div>
      <p
        className="count-animate"
        style={{
          fontFamily: "'DM Mono', monospace",
          fontWeight: 700,
          fontSize: "2rem",
          color: accent,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.78rem",
          color: "oklch(0.52 0.04 155)",
          marginTop: "4px",
        }}
      >
        {label}
      </p>
    </div>
  );
}

function QuickNavCards({
  onNavigate,
  hasData,
}: {
  onNavigate: (page: SidebarPage) => void;
  hasData: boolean;
}) {
  const cards = [
    {
      id: "pipeline" as SidebarPage,
      icon: <GitBranch size={22} />,
      title: "Pipeline View",
      desc: "See all 23 workflow stages and client counts at a glance.",
      accent: "oklch(0.28 0.07 155)",
      bg: "linear-gradient(135deg, oklch(0.96 0.025 155), oklch(0.98 0.012 155))",
      disabled: !hasData,
    },
    {
      id: "scorecard" as SidebarPage,
      icon: <Award size={22} />,
      title: "Preparer Scorecard",
      desc: "Throughput, overdue rate, and revenue potential by preparer.",
      accent: "oklch(0.62 0.14 75)",
      bg: "linear-gradient(135deg, oklch(0.97 0.04 75), oklch(0.99 0.02 75))",
      badge: "NEW",
      disabled: !hasData,
    },
    {
      id: "analytics" as SidebarPage,
      icon: <LineChart size={22} />,
      title: "Analytics",
      desc: "Bottleneck analysis, stage velocity, and team radar charts.",
      accent: "oklch(0.45 0.08 240)",
      bg: "linear-gradient(135deg, oklch(0.96 0.02 240), oklch(0.98 0.01 240))",
      disabled: !hasData,
    },
    {
      id: "clients" as SidebarPage,
      icon: <Search size={22} />,
      title: "Client Lookup",
      desc: "Search any client and see their full task timeline.",
      accent: "oklch(0.50 0.10 280)",
      bg: "linear-gradient(135deg, oklch(0.96 0.02 280), oklch(0.98 0.01 280))",
      disabled: !hasData,
    },
    {
      id: "teams" as SidebarPage,
      icon: <ShieldCheck size={22} />,
      title: "Team Accountability",
      desc: "HQ vs Remote comparison with capacity indicators.",
      accent: "oklch(0.45 0.10 155)",
      bg: "linear-gradient(135deg, oklch(0.96 0.025 155), oklch(0.98 0.012 155))",
      disabled: !hasData,
    },
    {
      id: "import" as SidebarPage,
      icon: <Upload size={22} />,
      title: "Import Data",
      desc: "Upload a new Canopy CSV or configure Zapier auto-sync.",
      accent: "oklch(0.55 0.08 155)",
      bg: "linear-gradient(135deg, oklch(0.97 0.012 155), oklch(0.99 0.006 155))",
      disabled: false,
    },
  ];

  return (
    <div>
      <h2
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: "0.75rem",
          color: "oklch(0.52 0.04 155)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: "0.75rem",
        }}
      >
        Quick Navigation
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => !card.disabled && onNavigate(card.id)}
            className="text-left rounded-2xl p-4 transition-all group"
            style={{
              background: card.bg,
              border: "1px solid oklch(0.89 0.015 85)",
              boxShadow: "0 1px 4px oklch(0.28 0.07 155 / 0.04)",
              opacity: card.disabled ? 0.5 : 1,
              cursor: card.disabled ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!card.disabled) {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 4px 16px oklch(0.28 0.07 155 / 0.12)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!card.disabled) {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 1px 4px oklch(0.28 0.07 155 / 0.04)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: `${card.accent}18`,
                  border: `1px solid ${card.accent}28`,
                  color: card.accent,
                }}
              >
                {card.icon}
              </div>
              <div className="flex items-center gap-1">
                {card.badge && (
                  <span
                    className="px-1.5 py-0.5 rounded-md"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      backgroundColor: "oklch(0.75 0.14 75 / 0.2)",
                      color: "oklch(0.62 0.14 75)",
                    }}
                  >
                    {card.badge}
                  </span>
                )}
                <ArrowRight
                  size={14}
                  style={{ color: card.accent, opacity: 0.6 }}
                  className="group-hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "0.875rem",
                color: "oklch(0.22 0.07 155)",
                marginBottom: "2px",
              }}
            >
              {card.title}
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.75rem",
                color: "oklch(0.52 0.04 155)",
                lineHeight: 1.4,
              }}
            >
              {card.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── AI Daily Briefing ──────────────────────────────────────────────────────────

function AIDailyBriefing({
  data,
  stats,
}: {
  data: DashboardData;
  stats: {
    total: number;
    overdue: number;
    overdueRate: number;
    preparers: number;
    completionRate: number;
    topStages: { name: string; count: number; overdueCount: number }[];
    atRisk: { client: string; task: string; dueDate: string }[];
  };
}) {
  const [briefingContent, setBriefingContent] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  // ── Action items (briefing memory) ────────────────────────────────────────
  const utils = trpc.useUtils();
  const { data: actionItems } = trpc.briefing.getActions.useQuery();
  const markDone = trpc.briefing.markDone.useMutation({
    onSuccess: () => utils.briefing.getActions.invalidate(),
  });

  const pendingActions = actionItems?.filter((a) => !a.completedAt) ?? [];

  const generateBriefing = trpc.briefing.generate.useMutation({
    onSuccess: (result) => {
      const content = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
      setBriefingContent(content);
      setGeneratedAt(result.generatedAt);
      // Refresh action items after generating new briefing
      utils.briefing.getActions.invalidate();
    },
  });

  const handleGenerate = () => {
    // Build a rich summary for the LLM
    const topStagesSummary = stats.topStages
      .map((s) => `${s.name}: ${s.count} tasks (${s.overdueCount} overdue)`)
      .join("; ");

    const atRiskSummary = stats.atRisk.length > 0
      ? stats.atRisk.map((c) => `${c.client} (${c.task})`).join(", ")
      : "None";

    const summary = `Pipeline summary: ${stats.total} total tasks, ${stats.overdue} overdue (${stats.overdueRate}% rate), ${stats.completionRate}% near completion, ${stats.preparers} preparers active.
Top 5 busiest stages: ${topStagesSummary}.
At-risk clients (overdue, not near completion): ${atRiskSummary}.
Data last updated: ${data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString() : "unknown"}.`;

    generateBriefing.mutate({ dashboardSummary: summary });
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "oklch(1 0 0)",
        border: "1px solid oklch(0.89 0.015 85)",
        boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, oklch(0.97 0.010 155), oklch(0.99 0.005 85))",
          borderBottom: "1px solid oklch(0.91 0.012 85)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.35 0.08 155))",
              boxShadow: "0 2px 8px oklch(0.28 0.07 155 / 0.3)",
            }}
          >
            <Sparkles size={14} color="oklch(0.85 0.14 75)" />
          </div>
          <div>
            <h3
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: "0.85rem",
                color: "oklch(0.28 0.07 155)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              AI Morning Briefing
            </h3>
            {generatedAt && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", color: "oklch(0.58 0.04 155)", marginTop: "1px" }}>
                Generated {new Date(generatedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generateBriefing.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
          style={{
            background: generateBriefing.isPending
              ? "oklch(0.90 0.015 155)"
              : "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.22 0.07 155))",
            color: generateBriefing.isPending ? "oklch(0.55 0.04 155)" : "oklch(0.97 0.008 85)",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: "0.8rem",
            cursor: generateBriefing.isPending ? "not-allowed" : "pointer",
            boxShadow: generateBriefing.isPending ? "none" : "0 2px 8px oklch(0.28 0.07 155 / 0.3)",
          }}
        >
          <RefreshCw
            size={13}
            className={generateBriefing.isPending ? "animate-spin" : ""}
          />
          {generateBriefing.isPending ? "Generating…" : briefingContent ? "Refresh" : "Generate Briefing"}
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {!briefingContent && !generateBriefing.isPending && (
          <div className="flex items-center gap-3 py-2">
            <Sparkles size={16} style={{ color: "oklch(0.65 0.06 155)", flexShrink: 0 }} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", color: "oklch(0.52 0.04 155)" }}>
              Click <strong>Generate Briefing</strong> to get an AI-powered summary of today's top risks, bottlenecks, and recommended actions for your pipeline.
            </p>
          </div>
        )}
        {generateBriefing.isPending && (
          <div className="flex items-center gap-3 py-3">
            <div
              className="w-5 h-5 rounded-full animate-spin shrink-0"
              style={{ border: "2px solid oklch(0.85 0.04 155)", borderTopColor: "oklch(0.28 0.07 155)" }}
            />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", color: "oklch(0.52 0.04 155)" }}>
              Analyzing your pipeline…
            </p>
          </div>
        )}
        {briefingContent && !generateBriefing.isPending && (
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.875rem",
              color: "oklch(0.28 0.07 155)",
              lineHeight: 1.7,
            }}
          >
            <Streamdown>{briefingContent}</Streamdown>
          </div>
        )}
        {generateBriefing.isError && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.55 0.18 30)" }}>
            Failed to generate briefing. Please try again.
          </p>
        )}

        {/* ── Pending Action Items (Briefing Memory) ──────────────────── */}
        {pendingActions.length > 0 && (
          <div
            className="mt-4 rounded-xl overflow-hidden"
            style={{
              border: "1px solid oklch(0.89 0.015 85)",
              backgroundColor: "oklch(0.98 0.005 85)",
            }}
          >
            <div
              className="px-4 py-2.5 flex items-center gap-2"
              style={{ borderBottom: "1px solid oklch(0.91 0.012 85)" }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: "oklch(0.28 0.07 155 / 0.12)" }}
              >
                <CheckCircle2 size={11} color="oklch(0.28 0.07 155)" />
              </div>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.75rem", color: "oklch(0.28 0.07 155)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Open Action Items ({pendingActions.length})
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: "oklch(0.91 0.012 85)" }}>
              {pendingActions.map((action) => (
                <div key={action.id} className="px-4 py-2.5 flex items-start gap-3">
                  <button
                    onClick={() => markDone.mutate({ id: action.id })}
                    disabled={markDone.isPending}
                    className="shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all hover:border-green-600 hover:bg-green-50"
                    style={{ borderColor: "oklch(0.65 0.06 155)" }}
                    title="Mark as done"
                  />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.28 0.07 155)", lineHeight: 1.5 }}>
                      {action.actionText}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", color: "oklch(0.58 0.04 155)", marginTop: "2px" }}>
                      {new Date(action.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" · "}
                      <span style={{ textTransform: "capitalize" }}>{action.section ?? "action"}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
