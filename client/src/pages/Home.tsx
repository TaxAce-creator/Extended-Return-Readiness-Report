// =============================================================================
// TaxAce Tax Prep Dashboard — Home Page v4
// Design: "Executive Clarity" — Premium left-sidebar layout
// Uses DashboardContext for persistent filter state across navigation
// =============================================================================

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { parseCanopyCSV } from "@/lib/csvParser";
import { useDashboard } from "@/contexts/DashboardContext";
import { AppSidebar, type SidebarPage } from "@/components/AppSidebar";
import { OverviewPage } from "@/components/OverviewPage";
import { ImportPage } from "@/components/ImportPage";
import { SummaryBar } from "@/components/SummaryBar";
import { PipelineView } from "@/components/PipelineView";
import { PipelineChart } from "@/components/PipelineChart";
import { ClientTable } from "@/components/ClientTable";
import { AssigneeView } from "@/components/AssigneeView";
import { AnalyticsView } from "@/components/AnalyticsView";
import { TeamView } from "@/components/TeamView";
import { ScorecardView } from "@/components/ScorecardView";
import { AtRiskPanel } from "@/components/AtRiskPanel";
import { NoStatusAlert } from "@/components/NoStatusAlert";
import { ClientLookup } from "@/components/ClientLookup";
import { WeekOverWeekView } from "@/components/WeekOverWeekView";
import { SettingsPage } from "@/components/SettingsPage";
import { DeadlineCalendar } from "@/components/DeadlineCalendar";
import { CEOView } from "@/components/CEOView";
import { AccountSecurity } from "@/components/AccountSecurity";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Home() {
  // ── Auth gate ─────────────────────────────────────────────────────────────
  const { loading: authLoading, isAuthenticated, user } = useAuth();

  const userRole = (user as { role?: string } | null)?.role ?? null;
  const isPreparer = userRole === "preparer";

  // Pages a preparer is NOT allowed to visit
  const PREPARER_BLOCKED: SidebarPage[] = [
    "ceo", "overview", "assignee", "teams", "scorecard", "wow", "settings",
  ];

  // ── Context (persistent filter state) ────────────────────────────────────
  const {
    assigneeFilter, setAssigneeFilter,
    returnTypeFilter, setReturnTypeFilter,
    taxYearFilter, setTaxYearFilter,
    searchQuery, setSearchQuery,
    overdueOnly, setOverdueOnly,
    dateRange, setDateRange,
    filteredDashboardData,
    setDashboardData,
    rawDashboardData,
    resetFilters,
    lastReportReceivedAt, setLastReportReceivedAt,
    dataAgeHours, isDataStale,
  } = useDashboard();
  const csvValidation = rawDashboardData?.validation;
  const hasCsvValidationWarning = !!csvValidation && (csvValidation.missingRecommended.length > 0 || csvValidation.unrecognizedColumns.length > 0);

  // ── Data loading ──────────────────────────────────────────────────────────
  const { data: latestReport, refetch } = trpc.canopy.getLatest.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: reportHistory } = trpc.canopy.getHistory.useQuery(
    { limit: 2 },
    { enabled: isAuthenticated }
  );
  const { data: passwordStatus } = trpc.localAuth.getPasswordStatus.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const saveManualUpload = trpc.canopy.saveManualUpload.useMutation();
  const [syncSource, setSyncSource] = useState<"zapier" | "manual" | null>(null);
  const [selectedStageIndex, setSelectedStageIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activePage, setActivePage] = useState<SidebarPage>("ceo");

  // Redirect preparer away from blocked pages
  useEffect(() => {
    if (isPreparer && PREPARER_BLOCKED.includes(activePage)) {
      setActivePage("pipeline");
    }
  }, [isPreparer, activePage]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-load latest report from database on first load
  useEffect(() => {
    if (latestReport && !rawDashboardData) {
      try {
        const data = parseCanopyCSV(latestReport.csvContent);
        setDashboardData(data);
        setSyncSource(latestReport.source as "zapier" | "manual");
        if (latestReport.receivedAt) {
          setLastReportReceivedAt(new Date(latestReport.receivedAt));
        }
      } catch (err) {
        console.error("Failed to parse stored report:", err);
      }
    }
  }, [latestReport]);

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file exported from Canopy.");
      return;
    }
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = parseCanopyCSV(text);
        setDashboardData(data);
        setSyncSource("manual");
        setSelectedStageIndex(null);
        resetFilters();
        const now = new Date();
        setLastReportReceivedAt(now);
        toast.success(`Dashboard updated — ${data.totalClients} tasks loaded from ${file.name}`);
        saveManualUpload.mutate({
          csvContent: text,
          rowCount: data.totalClients,
          filename: file.name,
        });
        setActivePage("overview");
      } catch (err) {
        toast.error("Failed to parse CSV. Please check the file format.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleSelectStage = (index: number | null) => {
    setSelectedStageIndex(index);
    if (index !== null) setActivePage("pipeline");
  };

  const handleAssigneeChange = (v: string) => {
    setAssigneeFilter(v);
    setSelectedStageIndex(null);
  };

  const handleReturnTypeChange = (v: string) => {
    setReturnTypeFilter(v);
    setSelectedStageIndex(null);
  };

  const handleTaxYearChange = (v: string) => {
    setTaxYearFilter(v);
    setSelectedStageIndex(null);
  };

  const handleSearchChange = (v: string) => {
    setSearchQuery(v);
    setSelectedStageIndex(null);
  };

  const handleOverdueOnlyChange = (v: boolean) => {
    setOverdueOnly(v);
    setSelectedStageIndex(null);
  };

  const handleDateRangeChange = (range: typeof dateRange) => {
    setDateRange(range);
    setSelectedStageIndex(null);
  };

  const handleRefresh = () => {
    refetch().then(({ data }) => {
      if (data) {
        try {
          const parsed = parseCanopyCSV(data.csvContent);
          setDashboardData(parsed);
          setSyncSource(data.source as "zapier" | "manual");
          if (data.receivedAt) setLastReportReceivedAt(new Date(data.receivedAt));
          toast.success(`Dashboard refreshed — ${parsed.totalClients} tasks loaded`);
        } catch {
          toast.error("Failed to parse latest report.");
        }
      } else {
        toast.info("No report found in database. Upload a CSV to get started.");
      }
    });
  };

  // ── Page titles ───────────────────────────────────────────────────────────
  const PAGE_TITLES: Record<SidebarPage, string> = {
    ceo:         "CEO View",
    overview:    "Overview",
    pipeline:    "Pipeline View",
    assignee:    "By Assignee",
    teams:       "Team Accountability",
    clients:     "Client Lookup",
    scorecard:   "Preparer Scorecard",
    analytics:   "Analytics",
    wow:         "Week-over-Week",
    deadlines:   "Deadline Calendar",
    settings:    "Settings",
    account:     "Account Security",
    import:      "Import Data",
  };

  // ── Auth loading screen ───────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "100vh", backgroundColor: "oklch(0.975 0.008 85)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.35 0.08 155))",
              boxShadow: "0 4px 16px oklch(0.28 0.07 155 / 0.3)",
            }}
          >
            <svg
              className="animate-spin"
              width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="oklch(0.75 0.14 75)" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: "oklch(0.52 0.04 155)" }}>
            Verifying access…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex" style={{ minHeight: "100vh", backgroundColor: "oklch(0.975 0.008 85)" }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
      <AppSidebar
        activePage={activePage}
        onNavigate={setActivePage}
        hasData={!!rawDashboardData}
        syncSource={syncSource}
        lastUpdated={lastReportReceivedAt ?? undefined}
        dataAgeHours={dataAgeHours}
        isDataStale={isDataStale}
        userRole={userRole}
      />

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-6 py-3 shrink-0"
          style={{
            backgroundColor: "oklch(1 0 0)",
            borderBottom: "1px solid oklch(0.91 0.012 85)",
            boxShadow: "0 1px 4px oklch(0.28 0.07 155 / 0.04)",
          }}
        >
          <div className="flex items-center gap-3">
            <h1
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                color: "oklch(0.22 0.07 155)",
              }}
            >
              {PAGE_TITLES[activePage]}
            </h1>
            {/* Stale data warning banner */}
            {isDataStale && (
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{
                  backgroundColor: "oklch(0.92 0.08 75 / 0.25)",
                  border: "1px solid oklch(0.75 0.14 75 / 0.4)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "oklch(0.55 0.12 75)",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Data is {dataAgeHours}h old — upload a fresh report
              </span>
            )}
            {passwordStatus && passwordStatus.daysRemaining !== null && passwordStatus.daysRemaining <= 14 && (
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{
                  backgroundColor: "oklch(0.92 0.08 75 / 0.25)",
                  border: "1px solid oklch(0.75 0.14 75 / 0.4)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "oklch(0.55 0.12 75)",
                }}
              >
                Password {passwordStatus.isExpired ? "expired — change it now" : `expires in ${passwordStatus.daysRemaining} day${passwordStatus.daysRemaining === 1 ? "" : "s"}`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleUploadClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
              style={{
                background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.22 0.07 155))",
                color: "oklch(0.97 0.008 85)",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "0.82rem",
                boxShadow: "0 2px 8px oklch(0.28 0.07 155 / 0.3)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Report
            </button>
          </div>
        </header>

        {/* ── Page content ────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto" style={{ padding: "1.5rem 1.75rem" }}>
          {hasCsvValidationWarning && csvValidation && (
            <details open className="mb-5 rounded-2xl border" style={{ backgroundColor: "oklch(0.98 0.04 75 / 0.35)", borderColor: "oklch(0.78 0.12 75 / 0.55)" }}>
              <summary className="cursor-pointer list-none px-5 py-4" aria-label="Review CSV data validation warning">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "oklch(0.88 0.11 75)", color: "oklch(0.35 0.09 75)" }}>!</div>
                  <div><p className="text-sm font-semibold text-[#62480b]">CSV data validation warning</p><p className="mt-0.5 text-xs text-[#7a5b18]">The report loaded, but some fields are unavailable or not recognized. Review the details before relying on related metrics.</p></div>
                </div>
              </summary>
              <div className="grid gap-4 border-t px-5 py-4 text-sm md:grid-cols-2" style={{ borderColor: "oklch(0.78 0.12 75 / 0.4)" }}>
                {csvValidation.missingRecommended.length > 0 && <div><p className="font-semibold text-[#62480b]">Missing recommended fields</p><p className="mt-1 text-xs text-[#795e24]">{csvValidation.missingRecommended.join(", ")}. Workload, due-date, return-type, or tax-year insights may be incomplete.</p></div>}
                {csvValidation.unrecognizedColumns.length > 0 && <div><p className="font-semibold text-[#62480b]">Unrecognized columns</p><p className="mt-1 text-xs text-[#795e24]">{csvValidation.unrecognizedColumns.join(", ")}. These were not used by the dashboard. If one should power a metric, update the Canopy export mapping.</p></div>}
              </div>
            </details>
          )}

          {/* CEO VIEW */}
          {activePage === "ceo" && (
            <div className="fade-in-up">
              <CEOView
                data={rawDashboardData ?? null}
                onNavigate={(page) => setActivePage(page as SidebarPage)}
                onUploadClick={handleUploadClick}
              />
            </div>
          )}

          {/* OVERVIEW */}
          {activePage === "overview" && (
            <OverviewPage
              data={filteredDashboardData}
              onNavigate={setActivePage}
              onUploadClick={handleUploadClick}
            />
          )}

          {/* IMPORT */}
          {activePage === "import" && (
            <ImportPage
              onFileUpload={handleFileUpload}
              isLoading={isLoading}
              lastUpdated={lastReportReceivedAt ?? undefined}
              syncSource={syncSource}
              hasData={!!rawDashboardData}
              onRefresh={handleRefresh}
            />
          )}

          {/* SETTINGS */}
          {activePage === "settings" && (
            <SettingsPage />
          )}

          {/* ACCOUNT SECURITY */}
          {activePage === "account" && (
            <AccountSecurity />
          )}

          {/* DEADLINE CALENDAR */}
          {activePage === "deadlines" && (
            <DeadlineCalendar />
          )}

          {/* WEEK-OVER-WEEK */}
          {activePage === "wow" && (
            <WeekOverWeekView reportHistory={reportHistory ?? []} />
          )}

          {/* DATA PAGES — only render if data is loaded */}
          {!rawDashboardData && activePage !== "ceo" && activePage !== "overview" && activePage !== "import" && activePage !== "settings" && activePage !== "account" && activePage !== "wow" && activePage !== "deadlines" && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{
                  background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.35 0.08 155))",
                  boxShadow: "0 4px 16px oklch(0.28 0.07 155 / 0.3)",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="oklch(0.75 0.14 75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.3rem", color: "oklch(0.22 0.07 155)", marginBottom: "0.5rem" }}>
                No data loaded yet
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: "oklch(0.52 0.04 155)", maxWidth: "360px", marginBottom: "1.5rem" }}>
                Upload a Canopy CSV report to unlock this view.
              </p>
              <button
                onClick={handleUploadClick}
                className="flex items-center gap-2 px-6 py-3 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.22 0.07 155))",
                  color: "oklch(0.97 0.008 85)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  boxShadow: "0 3px 12px oklch(0.28 0.07 155 / 0.35)",
                }}
              >
                Upload CSV
              </button>
            </div>
          )}

          {/* PIPELINE */}
          {activePage === "pipeline" && filteredDashboardData && (
            <div className="space-y-5 fade-in-up">
              <SummaryBar
                data={filteredDashboardData}
                assigneeFilter={assigneeFilter}
                returnTypeFilter={returnTypeFilter}
                taxYearFilter={taxYearFilter}
                searchQuery={searchQuery}
                overdueOnly={overdueOnly}
                dateRange={dateRange}
                onAssigneeChange={handleAssigneeChange}
                onReturnTypeChange={handleReturnTypeChange}
                onTaxYearChange={handleTaxYearChange}
                onSearchChange={handleSearchChange}
                onOverdueOnlyChange={handleOverdueOnlyChange}
                onDateRangeChange={handleDateRangeChange}
                onUploadClick={handleUploadClick}
              />
              <PipelineChart
                data={filteredDashboardData}
                assigneeFilter={assigneeFilter}
                returnTypeFilter={returnTypeFilter}
                searchQuery={searchQuery}
                onSelectStage={handleSelectStage}
                selectedIndex={selectedStageIndex}
              />
              <AtRiskPanel
                data={filteredDashboardData}
                onClientSelect={(name) => {
                  setActivePage("clients");
                  setSearchQuery(name);
                }}
              />
              <NoStatusAlert data={filteredDashboardData} />
              <PipelineView
                stages={filteredDashboardData.stages}
                selectedIndex={selectedStageIndex}
                onSelectStage={setSelectedStageIndex}
                assigneeFilter={assigneeFilter}
                returnTypeFilter={returnTypeFilter}
                searchQuery={searchQuery}
                overdueOnly={overdueOnly}
              />
              {selectedStageIndex !== null && (
                <ClientTable
                  stage={filteredDashboardData.stages[selectedStageIndex]}
                  assigneeFilter={assigneeFilter}
                  returnTypeFilter={returnTypeFilter}
                  searchQuery={searchQuery}
                  overdueOnly={overdueOnly}
                  onClose={() => setSelectedStageIndex(null)}
                />
              )}
            </div>
          )}

          {/* ASSIGNEE */}
          {activePage === "assignee" && filteredDashboardData && (
            <div className="fade-in-up">
              <AssigneeView
                data={filteredDashboardData}
                returnTypeFilter={returnTypeFilter}
                searchQuery={searchQuery}
                overdueOnly={overdueOnly}
              />
            </div>
          )}

          {/* TEAMS */}
          {activePage === "teams" && filteredDashboardData && (
            <div className="fade-in-up">
              <TeamView
                data={filteredDashboardData}
                returnTypeFilter={returnTypeFilter}
                searchQuery={searchQuery}
                overdueOnly={overdueOnly}
              />
            </div>
          )}

          {/* CLIENTS */}
          {activePage === "clients" && filteredDashboardData && (
            <div className="fade-in-up">
              <ClientLookup data={filteredDashboardData} />
            </div>
          )}

          {/* SCORECARD */}
          {activePage === "scorecard" && filteredDashboardData && (
            <div className="fade-in-up">
              <ScorecardView data={filteredDashboardData} />
            </div>
          )}

          {/* ANALYTICS */}
          {activePage === "analytics" && filteredDashboardData && (
            <div className="fade-in-up">
              <AnalyticsView
                data={filteredDashboardData}
                assigneeFilter={assigneeFilter}
                returnTypeFilter={returnTypeFilter}
                searchQuery={searchQuery}
                overdueOnly={overdueOnly}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
