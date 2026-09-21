// =============================================================================
// TaxAce Dashboard — Team Accountability View
// Separates HQ Team vs Remote Team with overdue counts and individual metrics
// Design: "Executive Clarity" — warm cream, forest green, Playfair + DM Sans
// HQ: Amber, Nataly, Valjoseph, Ivy, Cassandra, Yesenia, Silver, Annalyn, Vena
// Remote: All others (Jessel, Danielle, Fayne, Lyndon, Joyce, Leah, Ravena, Joseph, Grace)
// =============================================================================

import { useMemo, useState } from "react";
import {
  type DashboardData,
  type TaxRecord,
  WORKFLOW_STAGES,
  filterRecords,
} from "@/lib/csvParser";
import {
  Building2,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  User,
  TrendingUp,
} from "lucide-react";

// ─── Team definitions ─────────────────────────────────────────────────────────
// Match by first name (case-insensitive) to handle full name variations
const HQ_FIRST_NAMES = [
  "amber",
  "nataly",
  "valjoseph",
  "ivy",
  "cassandra",
  "yesenia",
  "silver",
  "annalyn",
  "vena",
  "ravena", // "Vena" matches Ravena Maderazo
];

function getTeam(assigneeName: string): "hq" | "remote" {
  const first = assigneeName.trim().split(" ")[0].toLowerCase();
  // Also check if full name contains any HQ identifier
  const full = assigneeName.trim().toLowerCase();
  if (
    HQ_FIRST_NAMES.some(
      (n) => first === n || full.startsWith(n) || full.includes(n)
    )
  ) {
    return "hq";
  }
  return "remote";
}

interface MemberStats {
  name: string;
  team: "hq" | "remote";
  total: number;
  overdue: number;
  onTrack: number;
  overdueRate: number;
  stageBreakdown: {
    stageShort: string;
    stageLabel: string;
    count: number;
    overdue: number;
    color: string;
  }[];
  records: TaxRecord[];
}

interface TeamStats {
  name: string;
  type: "hq" | "remote";
  members: MemberStats[];
  total: number;
  overdue: number;
  onTrack: number;
  overdueRate: number;
}

interface TeamViewProps {
  data: DashboardData;
  returnTypeFilter: string;
  searchQuery: string;
  overdueOnly?: boolean;
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{
        backgroundColor: "oklch(1 0 0)",
        border: "1px solid oklch(0.89 0.015 85)",
        boxShadow: "0 1px 8px oklch(0.28 0.07 155 / 0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Team header banner ───────────────────────────────────────────────────────
function TeamBanner({
  stats,
  avgTotal,
}: {
  stats: TeamStats;
  avgTotal: number;
}) {
  const isHQ = stats.type === "hq";
  const primaryColor = isHQ ? "oklch(0.28 0.07 155)" : "oklch(0.35 0.12 240)";
  const bgColor = isHQ ? "oklch(0.95 0.025 155)" : "oklch(0.95 0.025 240)";
  const borderColor = isHQ ? "oklch(0.80 0.05 155)" : "oklch(0.80 0.05 240)";
  const Icon = isHQ ? Building2 : Wifi;

  const overdueRateColor =
    stats.overdueRate > 60
      ? "oklch(0.55 0.18 30)"
      : stats.overdueRate > 35
      ? "oklch(0.62 0.14 60)"
      : "oklch(0.45 0.12 155)";

  return (
    <div
      className="rounded-xl p-5 mb-4"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Team identity */}
        <div className="flex items-center gap-3">
          <div
            className="rounded-xl p-2.5"
            style={{ backgroundColor: primaryColor }}
          >
            <Icon size={20} color="white" />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: "1.15rem",
                color: primaryColor,
              }}
            >
              {stats.name}
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.76rem",
                color: "oklch(0.52 0.04 155)",
                marginTop: "2px",
              }}
            >
              {stats.members.length} team member
              {stats.members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* KPI chips */}
        <div className="flex items-center gap-3 flex-wrap">
          <KpiChip
            label="Total Tasks"
            value={stats.total}
            color={primaryColor}
            bg="oklch(1 0 0)"
          />
          <KpiChip
            label="Overdue"
            value={stats.overdue}
            color={overdueRateColor}
            bg="oklch(1 0 0)"
            icon={<AlertTriangle size={11} />}
          />
          <KpiChip
            label="On Track"
            value={stats.onTrack}
            color="oklch(0.45 0.12 155)"
            bg="oklch(1 0 0)"
            icon={<CheckCircle2 size={11} />}
          />
          <KpiChip
            label="Overdue Rate"
            value={`${stats.overdueRate}%`}
            color={overdueRateColor}
            bg="oklch(1 0 0)"
          />
        </div>
      </div>

      {/* Team overdue progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.72rem",
              color: "oklch(0.52 0.04 155)",
            }}
          >
            Team Overdue Exposure
          </span>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.72rem",
              color: overdueRateColor,
              fontWeight: 600,
            }}
          >
            {stats.overdue} of {stats.total} tasks overdue
          </span>
        </div>
        <div
          className="rounded-full overflow-hidden"
          style={{ height: "8px", backgroundColor: "oklch(0.88 0.015 85)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(stats.overdueRate, 100)}%`,
              backgroundColor: overdueRateColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── KPI chip ─────────────────────────────────────────────────────────────────
function KpiChip({
  label,
  value,
  color,
  bg,
  icon,
}: {
  label: string;
  value: string | number;
  color: string;
  bg: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg px-3 py-2 flex flex-col gap-0.5"
      style={{
        backgroundColor: bg,
        border: `1px solid oklch(0.89 0.015 85)`,
        minWidth: "72px",
      }}
    >
      <span
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.65rem",
          color: "oklch(0.55 0.04 155)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
      <div className="flex items-center gap-1">
        {icon && <span style={{ color }}>{icon}</span>}
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontWeight: 700,
            fontSize: "1.1rem",
            color,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

// ─── Individual member row ────────────────────────────────────────────────────
function MemberRow({
  member,
  rank,
  teamAvg,
  teamMax,
  isHQ,
}: {
  member: MemberStats;
  rank: number;
  teamAvg: number;
  teamMax: number;
  isHQ: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const primaryColor = isHQ ? "oklch(0.28 0.07 155)" : "oklch(0.35 0.12 240)";
  const overdueRateColor =
    member.overdueRate > 60
      ? "oklch(0.55 0.18 30)"
      : member.overdueRate > 35
      ? "oklch(0.62 0.14 60)"
      : "oklch(0.45 0.12 155)";

  const isOverloaded = member.total > teamAvg * 1.5;
  const barWidth = teamMax > 0 ? (member.total / teamMax) * 100 : 0;
  const overdueBarWidth = member.total > 0 ? (member.overdue / member.total) * 100 : 0;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        border: `1px solid ${isOverloaded ? "oklch(0.75 0.10 60)" : "oklch(0.89 0.015 85)"}`,
        backgroundColor: isOverloaded ? "oklch(0.99 0.015 60)" : "oklch(1 0 0)",
      }}
    >
      {/* Main row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4"
      >
        <div className="flex items-center gap-3">
          {/* Rank */}
          <span
            className="rounded-lg flex items-center justify-center shrink-0"
            style={{
              width: "28px",
              height: "28px",
              backgroundColor: primaryColor,
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "white",
            }}
          >
            {rank}
          </span>

          {/* Avatar + name */}
          <div
            className="rounded-full flex items-center justify-center shrink-0"
            style={{
              width: "34px",
              height: "34px",
              backgroundColor: isHQ ? "oklch(0.92 0.03 155)" : "oklch(0.92 0.03 240)",
            }}
          >
            <User size={16} color={primaryColor} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  color: "oklch(0.22 0.07 155)",
                }}
              >
                {member.name}
              </span>
              {isOverloaded && (
                <span
                  className="rounded-full px-2 py-0.5 flex items-center gap-1"
                  style={{
                    backgroundColor: "oklch(0.95 0.06 60)",
                    border: "1px solid oklch(0.80 0.10 60)",
                    fontSize: "0.65rem",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    color: "oklch(0.50 0.14 60)",
                  }}
                >
                  <TrendingUp size={9} />
                  Overloaded
                </span>
              )}
            </div>

            {/* Progress bar: total tasks with overdue overlay */}
            <div className="mt-2 relative" style={{ height: "6px" }}>
              <div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: "oklch(0.91 0.015 85)" }}
              />
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: isHQ ? "oklch(0.65 0.08 155)" : "oklch(0.65 0.08 240)",
                }}
              />
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all"
                style={{
                  width: `${(overdueBarWidth / 100) * barWidth}%`,
                  backgroundColor: overdueRateColor,
                  opacity: 0.85,
                }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: primaryColor,
                  lineHeight: 1,
                }}
              >
                {member.total}
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.65rem",
                  color: "oklch(0.55 0.04 155)",
                }}
              >
                tasks
              </div>
            </div>
            <div className="text-right">
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: overdueRateColor,
                  lineHeight: 1,
                }}
              >
                {member.overdue}
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.65rem",
                  color: "oklch(0.55 0.04 155)",
                }}
              >
                overdue
              </div>
            </div>
            <div className="text-right">
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: overdueRateColor,
                  lineHeight: 1,
                }}
              >
                {member.overdueRate}%
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.65rem",
                  color: "oklch(0.55 0.04 155)",
                }}
              >
                rate
              </div>
            </div>
            <div style={{ color: "oklch(0.55 0.04 155)" }}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </div>
      </button>

      {/* Expanded stage breakdown */}
      {expanded && (
        <div
          className="px-4 pb-4 pt-0"
          style={{ borderTop: "1px solid oklch(0.91 0.015 85)" }}
        >
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.72rem",
              color: "oklch(0.52 0.04 155)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "10px",
              marginTop: "12px",
            }}
          >
            Stage Breakdown
          </p>
          <div className="flex flex-wrap gap-2">
            {member.stageBreakdown.map((s) => (
              <div
                key={s.stageLabel}
                className="rounded-lg px-3 py-2"
                style={{
                  backgroundColor: `${s.color}14`,
                  border: `1px solid ${s.color}30`,
                  minWidth: "120px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.68rem",
                    color: "oklch(0.45 0.04 155)",
                    marginBottom: "3px",
                  }}
                >
                  {s.stageShort}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: s.color,
                    }}
                  >
                    {s.count}
                  </span>
                  {s.overdue > 0 && (
                    <span
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "0.65rem",
                        color: "oklch(0.55 0.18 30)",
                        fontWeight: 600,
                      }}
                    >
                      {s.overdue} overdue
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Team column ──────────────────────────────────────────────────────────────
function TeamColumn({
  stats,
  allTeamsAvg,
}: {
  stats: TeamStats;
  allTeamsAvg: number;
}) {
  const [sortBy, setSortBy] = useState<"total" | "overdue" | "rate">("overdue");
  const isHQ = stats.type === "hq";

  const sorted = useMemo(() => {
    return [...stats.members].sort((a, b) => {
      if (sortBy === "total") return b.total - a.total;
      if (sortBy === "overdue") return b.overdue - a.overdue;
      return b.overdueRate - a.overdueRate;
    });
  }, [stats.members, sortBy]);

  const teamMax = Math.max(...stats.members.map((m) => m.total), 1);
  const teamAvg =
    stats.members.length > 0
      ? stats.total / stats.members.length
      : 0;

  const primaryColor = isHQ ? "oklch(0.28 0.07 155)" : "oklch(0.35 0.12 240)";

  return (
    <div className="flex-1 min-w-0">
      <TeamBanner stats={stats} avgTotal={allTeamsAvg} />

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-3">
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.72rem",
            color: "oklch(0.55 0.04 155)",
          }}
        >
          Sort by:
        </span>
        {(["overdue", "total", "rate"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className="rounded-lg px-2.5 py-1 transition-all"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.72rem",
              fontWeight: sortBy === s ? 600 : 400,
              backgroundColor:
                sortBy === s ? primaryColor : "oklch(0.93 0.015 85)",
              color: sortBy === s ? "white" : "oklch(0.45 0.04 155)",
              border: "none",
            }}
          >
            {s === "overdue" ? "Overdue" : s === "total" ? "Total Tasks" : "Rate"}
          </button>
        ))}
      </div>

      {/* Member rows */}
      <div className="space-y-2">
        {sorted.map((member, idx) => (
          <MemberRow
            key={member.name}
            member={member}
            rank={idx + 1}
            teamAvg={teamAvg}
            teamMax={teamMax}
            isHQ={isHQ}
          />
        ))}
        {sorted.length === 0 && (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              backgroundColor: "oklch(0.97 0.005 85)",
              border: "1px dashed oklch(0.85 0.015 85)",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.85rem",
                color: "oklch(0.60 0.04 155)",
              }}
            >
              No tasks match the current filters for this team.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Head-to-head comparison bar ─────────────────────────────────────────────
function HeadToHead({ hq, remote }: { hq: TeamStats; remote: TeamStats }) {
  const total = hq.total + remote.total;
  const hqPct = total > 0 ? Math.round((hq.total / (hq.total + remote.total)) * 100) : 50;
  const remotePct = 100 - hqPct;

  return (
    <Card className="mb-5">
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 700,
          fontSize: "0.95rem",
          color: "oklch(0.22 0.07 155)",
          marginBottom: "14px",
        }}
      >
        Team Head-to-Head Comparison
      </h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {(
          [
            { label: "Total Tasks", hqVal: hq.total, remVal: remote.total },
            { label: "Overdue Tasks", hqVal: hq.overdue, remVal: remote.overdue },
            { label: "Overdue Rate", hqVal: `${hq.overdueRate}%`, remVal: `${remote.overdueRate}%` },
            { label: "Team Members", hqVal: hq.members.length, remVal: remote.members.length },
            {
              label: "Avg Tasks/Person",
              hqVal:
                hq.members.length > 0
                  ? Math.round(hq.total / hq.members.length)
                  : 0,
              remVal:
                remote.members.length > 0
                  ? Math.round(remote.total / remote.members.length)
                  : 0,
            },
            {
              label: "On Track",
              hqVal: hq.onTrack,
              remVal: remote.onTrack,
            },
          ] as { label: string; hqVal: string | number; remVal: string | number }[]
        ).map((row) => (
          <div
            key={row.label}
            className="rounded-xl p-3"
            style={{
              backgroundColor: "oklch(0.97 0.008 85)",
              border: "1px solid oklch(0.91 0.015 85)",
            }}
          >
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.68rem",
                color: "oklch(0.55 0.04 155)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "6px",
              }}
            >
              {row.label}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "oklch(0.28 0.07 155)",
                }}
              >
                {row.hqVal}
              </span>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.65rem",
                  color: "oklch(0.65 0.04 155)",
                }}
              >
                vs
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "oklch(0.35 0.12 240)",
                }}
              >
                {row.remVal}
              </span>
            </div>
            <div
              className="flex items-center justify-between mt-1"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.60rem",
                color: "oklch(0.65 0.04 155)",
              }}
            >
              <span>HQ</span>
              <span>Remote</span>
            </div>
          </div>
        ))}
      </div>

      {/* Workload split bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.72rem",
              color: "oklch(0.52 0.04 155)",
            }}
          >
            Workload Distribution
          </span>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.72rem",
              color: "oklch(0.52 0.04 155)",
            }}
          >
            HQ {hqPct}% · Remote {remotePct}%
          </span>
        </div>
        <div
          className="rounded-full overflow-hidden flex"
          style={{ height: "10px" }}
        >
          <div
            style={{
              width: `${hqPct}%`,
              backgroundColor: "oklch(0.28 0.07 155)",
              transition: "width 0.5s ease",
            }}
          />
          <div
            style={{
              width: `${remotePct}%`,
              backgroundColor: "oklch(0.35 0.12 240)",
              transition: "width 0.5s ease",
            }}
          />
        </div>
        <div
          className="flex items-center gap-4 mt-2"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.68rem",
            color: "oklch(0.52 0.04 155)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="rounded-full"
              style={{
                width: "8px",
                height: "8px",
                backgroundColor: "oklch(0.28 0.07 155)",
              }}
            />
            HQ Team
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="rounded-full"
              style={{
                width: "8px",
                height: "8px",
                backgroundColor: "oklch(0.35 0.12 240)",
              }}
            />
            Remote Team
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TeamView({
  data,
  returnTypeFilter,
  searchQuery,
  overdueOnly = false,
}: TeamViewProps) {
  // Build per-member stats
  const { hqStats, remoteStats } = useMemo(() => {
    const memberMap = new Map<string, TaxRecord[]>();

    data.rawRecords.forEach((record) => {
      const passes =
        filterRecords([record], "all", returnTypeFilter, searchQuery).length > 0;
      if (!passes) return;
      if (overdueOnly && !record.isOverdue) return;

      const assignees = record.assignee
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      if (assignees.length === 0) {
        const key = "Unassigned";
        if (!memberMap.has(key)) memberMap.set(key, []);
        memberMap.get(key)!.push(record);
      } else {
        assignees.forEach((a) => {
          if (!memberMap.has(a)) memberMap.set(a, []);
          memberMap.get(a)!.push(record);
        });
      }
    });

    const buildMember = (name: string, records: TaxRecord[]): MemberStats => {
      const overdue = records.filter((r) => r.isOverdue).length;
      const stageBreakdown = WORKFLOW_STAGES.map((s) => {
        const sr = records.filter(
          (r) => r.task.trim().toLowerCase() === s.key.toLowerCase()
        );
        return {
          stageShort: s.short,
          stageLabel: s.label,
          count: sr.length,
          overdue: sr.filter((r) => r.isOverdue).length,
          color: s.color,
        };
      }).filter((s) => s.count > 0);

      return {
        name,
        team: getTeam(name),
        total: records.length,
        overdue,
        onTrack: records.length - overdue,
        overdueRate:
          records.length > 0
            ? Math.round((overdue / records.length) * 100)
            : 0,
        stageBreakdown,
        records,
      };
    };

    const hqMembers: MemberStats[] = [];
    const remoteMembers: MemberStats[] = [];

    memberMap.forEach((records, name) => {
      const member = buildMember(name, records);
      if (member.team === "hq") {
        hqMembers.push(member);
      } else {
        remoteMembers.push(member);
      }
    });

    const buildTeamStats = (
      name: string,
      type: "hq" | "remote",
      members: MemberStats[]
    ): TeamStats => {
      const total = members.reduce((s, m) => s + m.total, 0);
      const overdue = members.reduce((s, m) => s + m.overdue, 0);
      return {
        name,
        type,
        members,
        total,
        overdue,
        onTrack: total - overdue,
        overdueRate: total > 0 ? Math.round((overdue / total) * 100) : 0,
      };
    };

    return {
      hqStats: buildTeamStats("HQ Team", "hq", hqMembers),
      remoteStats: buildTeamStats("Remote Team", "remote", remoteMembers),
    };
  }, [data, returnTypeFilter, searchQuery, overdueOnly]);

  const allTeamsAvg =
    hqStats.members.length + remoteStats.members.length > 0
      ? (hqStats.total + remoteStats.total) /
        (hqStats.members.length + remoteStats.members.length)
      : 0;

  if (hqStats.total === 0 && remoteStats.total === 0) {
    return (
      <Card>
        <div className="py-12 text-center">
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: "oklch(0.60 0.04 155)",
              fontSize: "0.9rem",
            }}
          >
            No data matches the current filters. Adjust your filters to see team
            accountability.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {/* Head-to-head comparison */}
      <HeadToHead hq={hqStats} remote={remoteStats} />

      {/* Two-column team view */}
      <div className="flex gap-5 items-start flex-wrap lg:flex-nowrap">
        <TeamColumn stats={hqStats} allTeamsAvg={allTeamsAvg} />
        <TeamColumn stats={remoteStats} allTeamsAvg={allTeamsAvg} />
      </div>
    </div>
  );
}
