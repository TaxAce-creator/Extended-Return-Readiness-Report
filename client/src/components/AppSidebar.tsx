// =============================================================================
// TaxAce — App Sidebar
// Premium left-rail navigation with logo, nav groups, and active state
// Forest green sidebar, amber gold accents, DM Sans typography
// =============================================================================

import { useState } from "react";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  ShieldCheck,
  Search,
  Award,
  LineChart,
  Upload,
  ChevronLeft,
  ChevronRight,
  Zap,
  Settings,
  HelpCircle,
  CalendarDays,
  Crown,
} from "lucide-react";

export type SidebarPage =
  | "ceo"
  | "overview"
  | "pipeline"
  | "assignee"
  | "teams"
  | "clients"
  | "scorecard"
  | "analytics"
  | "wow"
  | "deadlines"
  | "settings"
  | "account"
  | "import";

interface NavItem {
  id: SidebarPage;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "ceo",        label: "CEO View",            icon: <Crown size={18} />,           group: "main", badge: "⭐" },
  { id: "overview",   label: "Overview",           icon: <LayoutDashboard size={18} />, group: "main" },
  { id: "pipeline",   label: "Pipeline",            icon: <GitBranch size={18} />,       group: "main" },
  { id: "assignee",   label: "By Assignee",         icon: <Users size={18} />,           group: "main" },
  { id: "teams",      label: "Team Accountability", icon: <ShieldCheck size={18} />,     group: "main" },
  { id: "clients",    label: "Client Lookup",       icon: <Search size={18} />,          group: "main" },
  { id: "scorecard",  label: "Scorecard",           icon: <Award size={18} />,           group: "insights", badge: "NEW" },
  { id: "analytics",  label: "Analytics",           icon: <LineChart size={18} />,       group: "insights" },
  { id: "wow",        label: "Week-over-Week",      icon: <LineChart size={18} />,       group: "insights" },
  { id: "deadlines",  label: "Deadline Calendar",   icon: <CalendarDays size={18} />,    group: "tools" },
  { id: "import",     label: "Import Data",         icon: <Upload size={18} />,          group: "tools" },
  { id: "settings",   label: "Settings",            icon: <Settings size={18} />,        group: "tools" },
];

const GROUP_LABELS: Record<string, string> = {
  main:     "OPERATIONS",
  insights: "INSIGHTS",
  tools:    "TOOLS",
};

// Pages accessible to the preparer role (Amber)
const PREPARER_ALLOWED: SidebarPage[] = [
  "pipeline", "clients", "analytics", "deadlines", "import",
];

interface AppSidebarProps {
  activePage: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
  hasData: boolean;
  syncSource: "zapier" | "manual" | null;
  lastUpdated?: Date;
  dataAgeHours?: number | null;
  isDataStale?: boolean;
  /** User role from auth — controls which nav items are visible */
  userRole?: string | null;
}

export function AppSidebar({
  activePage,
  onNavigate,
  hasData,
  syncSource,
  lastUpdated,
  dataAgeHours,
  isDataStale,
  userRole,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const isPreparer = userRole === "preparer";

  // Filter nav items based on role
  const visibleNavItems = isPreparer
    ? NAV_ITEMS.filter((i) => PREPARER_ALLOWED.includes(i.id))
    : NAV_ITEMS;

  const groups = ["main", "insights", "tools"];

  // Mobile bottom nav items — filtered by role
  const ALL_MOBILE_NAV: NavItem[] = [
    { id: "ceo",       label: "CEO",      icon: <Crown size={20} />,         group: "main" },
    { id: "pipeline",  label: "Pipeline", icon: <GitBranch size={20} />,     group: "main" },
    { id: "clients",   label: "Clients",  icon: <Search size={20} />,        group: "main" },
    { id: "analytics", label: "Insights", icon: <LineChart size={20} />,     group: "insights" },
    { id: "import",    label: "Import",   icon: <Upload size={20} />,        group: "tools" },
  ];
  const MOBILE_NAV = isPreparer
    ? ALL_MOBILE_NAV.filter((i) => PREPARER_ALLOWED.includes(i.id))
    : ALL_MOBILE_NAV;

  return (
    <>
    <aside
      className="relative flex-col shrink-0 transition-all duration-300 hidden md:flex"
      style={{
        width: collapsed ? "64px" : "220px",
        minHeight: "100vh",
        background: "linear-gradient(180deg, oklch(0.22 0.07 155) 0%, oklch(0.18 0.06 155) 100%)",
        borderRight: "1px solid oklch(0.30 0.07 155)",
        boxShadow: "4px 0 24px oklch(0.18 0.06 155 / 0.35)",
      }}
    >
      {/* ── Logo ──────────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-5 shrink-0"
        style={{ borderBottom: "1px solid oklch(0.30 0.07 155 / 0.8)" }}
      >
        {/* Logo mark */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, oklch(0.75 0.14 75), oklch(0.65 0.12 75))",
            boxShadow: "0 2px 10px oklch(0.75 0.14 75 / 0.45)",
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "oklch(0.18 0.06 155)",
              letterSpacing: "-0.02em",
            }}
          >
            TA
          </span>
        </div>

        {/* Brand text */}
        {!collapsed && (
          <div className="overflow-hidden">
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "oklch(0.97 0.008 85)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              TaxAce Group
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.6rem",
                color: "oklch(0.65 0.05 155)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Tax Prep Operations
            </p>
          </div>
        )}
      </div>

      {/* ── Data status pill ──────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-4 py-2.5">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              backgroundColor: hasData
                ? "oklch(0.35 0.08 155 / 0.5)"
                : "oklch(0.30 0.06 155 / 0.4)",
              border: `1px solid ${hasData ? "oklch(0.45 0.08 155 / 0.6)" : "oklch(0.35 0.06 155 / 0.4)"}`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: hasData ? "oklch(0.75 0.14 75)" : "oklch(0.55 0.04 155)",
                boxShadow: hasData ? "0 0 6px oklch(0.75 0.14 75 / 0.6)" : "none",
              }}
            />
            <div className="overflow-hidden">
              {hasData ? (
                <>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      color: "oklch(0.88 0.04 155)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {syncSource === "zapier" ? (
                      <span className="flex items-center gap-1">
                        <Zap size={9} style={{ color: "oklch(0.75 0.14 75)" }} />
                        Live via Zapier
                      </span>
                    ) : (
                      "Manual upload"
                    )}
                  </p>
                  {lastUpdated && (
                    <p
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.6rem",
                        color: isDataStale ? "oklch(0.60 0.12 75)" : "oklch(0.60 0.04 155)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dataAgeHours !== null && dataAgeHours !== undefined
                        ? dataAgeHours < 1
                          ? "Updated just now"
                          : dataAgeHours < 24
                          ? `${dataAgeHours}h ago${isDataStale ? " ⚠" : ""}`
                          : `${Math.floor(dataAgeHours / 24)}d ago${isDataStale ? " ⚠" : ""}`
                        : lastUpdated.toLocaleDateString()}
                    </p>
                  )}
                </>
              ) : (
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.68rem",
                    color: "oklch(0.60 0.04 155)",
                    whiteSpace: "nowrap",
                  }}
                >
                  No data loaded
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {groups.map((group) => {
          const items = visibleNavItems.filter((i) => i.group === group);
          return (
            <div key={group} className="mb-2">
              {/* Group label */}
              {!collapsed && (
                <p
                  className="px-3 py-1.5"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    color: "oklch(0.50 0.05 155)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {GROUP_LABELS[group]}
                </p>
              )}
              {collapsed && group !== "main" && (
                <div
                  className="mx-3 my-2"
                  style={{ height: "1px", backgroundColor: "oklch(0.30 0.06 155 / 0.6)" }}
                />
              )}

              {items.map((item) => {
                const isActive = activePage === item.id;
                const isDisabled = !hasData && item.id !== "ceo" && item.id !== "overview" && item.id !== "import";

                return (
                  <button
                    key={item.id}
                    onClick={() => !isDisabled && onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className="w-full flex items-center gap-3 rounded-xl transition-all duration-150"
                    style={{
                      padding: collapsed ? "0.6rem" : "0.55rem 0.75rem",
                      justifyContent: collapsed ? "center" : "flex-start",
                      backgroundColor: isActive
                        ? "oklch(0.75 0.14 75 / 0.15)"
                        : "transparent",
                      border: isActive
                        ? "1px solid oklch(0.75 0.14 75 / 0.3)"
                        : "1px solid transparent",
                      color: isActive
                        ? "oklch(0.75 0.14 75)"
                        : isDisabled
                        ? "oklch(0.40 0.04 155)"
                        : "oklch(0.72 0.04 155)",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      opacity: isDisabled ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !isDisabled) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "oklch(0.30 0.07 155 / 0.6)";
                        (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.88 0.04 155)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive && !isDisabled) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                        (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.72 0.04 155)";
                      }
                    }}
                  >
                    {/* Icon */}
                    <span
                      className="shrink-0"
                      style={{
                        color: isActive ? "oklch(0.75 0.14 75)" : "inherit",
                      }}
                    >
                      {item.icon}
                    </span>

                    {/* Label + badge */}
                    {!collapsed && (
                      <>
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "0.845rem",
                            fontWeight: isActive ? 600 : 400,
                            flex: 1,
                            textAlign: "left",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className="shrink-0 px-1.5 py-0.5 rounded-md"
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "0.58rem",
                              fontWeight: 700,
                              backgroundColor: "oklch(0.75 0.14 75 / 0.2)",
                              color: "oklch(0.75 0.14 75)",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ── Footer links ──────────────────────────────────────────────────────── */}
      {!collapsed && (
        <div
          className="px-3 py-3 space-y-1"
          style={{ borderTop: "1px solid oklch(0.30 0.07 155 / 0.8)" }}
        >
          {[
            { icon: <ShieldCheck size={15} />, label: "Account Security", page: "account" as SidebarPage },
            ...(!isPreparer ? [{ icon: <Settings size={15} />, label: "Settings", page: "settings" as SidebarPage }] : []),
            { icon: <HelpCircle size={15} />, label: "Help & Docs", page: null },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.78rem",
                color: activePage === item.page ? "oklch(0.75 0.14 75)" : "oklch(0.50 0.04 155)",
                backgroundColor: activePage === item.page ? "oklch(0.75 0.14 75 / 0.12)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (activePage !== item.page) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "oklch(0.30 0.07 155 / 0.5)";
                  (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.72 0.04 155)";
                }
              }}
              onMouseLeave={(e) => {
                if (activePage !== item.page) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.50 0.04 155)";
                }
              }}
              onClick={() => item.page && onNavigate(item.page)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Collapse toggle ───────────────────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center transition-all z-10"
        style={{
          backgroundColor: "oklch(0.28 0.07 155)",
          border: "2px solid oklch(0.35 0.07 155)",
          color: "oklch(0.75 0.14 75)",
          boxShadow: "0 2px 8px oklch(0.18 0.06 155 / 0.4)",
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>

    {/* ── Mobile bottom navigation bar (visible only on < md) ──────────────── */}
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around"
      style={{
        background: "linear-gradient(180deg, oklch(0.22 0.07 155) 0%, oklch(0.18 0.06 155) 100%)",
        borderTop: "1px solid oklch(0.30 0.07 155)",
        boxShadow: "0 -4px 20px oklch(0.18 0.06 155 / 0.4)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "60px",
      }}
    >
      {MOBILE_NAV.map((item) => {
        const isActive = activePage === item.id;
        const isDisabled = !hasData && item.id !== "ceo" && item.id !== "overview" && item.id !== "import";
        return (
          <button
            key={item.id}
            onClick={() => !isDisabled && onNavigate(item.id)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all"
            style={{
              color: isActive ? "oklch(0.75 0.14 75)" : isDisabled ? "oklch(0.40 0.04 155)" : "oklch(0.65 0.04 155)",
              opacity: isDisabled ? 0.45 : 1,
              cursor: isDisabled ? "not-allowed" : "pointer",
            }}
          >
            <span>{item.icon}</span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.6rem",
                fontWeight: isActive ? 700 : 500,
                letterSpacing: "0.02em",
              }}
            >
              {item.label}
            </span>
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  width: "24px",
                  height: "2px",
                  borderRadius: "2px 2px 0 0",
                  backgroundColor: "oklch(0.75 0.14 75)",
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
    </>
  );
}
