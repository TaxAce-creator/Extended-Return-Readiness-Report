// =============================================================================
// DashboardContext — Persistent filter state across sidebar navigation
//
// Lifts all filter state out of Home.tsx into a React context so that
// filters (assignee, returnType, taxYear, search, overdueOnly, dateRange)
// survive sidebar navigation without resetting.
// =============================================================================

import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import { type DateRange } from "@/components/DateRangeFilter";
import { type DashboardData } from "@/lib/csvParser";
import { filterByDateRange } from "@/components/DateRangeFilter";

// Re-export for convenience
export { filterByDateRange } from "@/components/DateRangeFilter";

interface DashboardFilters {
  assigneeFilter: string;
  returnTypeFilter: string;
  taxYearFilter: string;
  searchQuery: string;
  overdueOnly: boolean;
  dateRange: DateRange | null;
}

interface DashboardContextValue extends DashboardFilters {
  // Setters
  setAssigneeFilter: (v: string) => void;
  setReturnTypeFilter: (v: string) => void;
  setTaxYearFilter: (v: string) => void;
  setSearchQuery: (v: string) => void;
  setOverdueOnly: (v: boolean) => void;
  setDateRange: (v: DateRange | null) => void;
  resetFilters: () => void;

  // Derived filtered data (taxYear + dateRange applied at data layer)
  filteredDashboardData: DashboardData | null;
  setDashboardData: (data: DashboardData | null) => void;
  rawDashboardData: DashboardData | null;

  // Data age tracking
  lastReportReceivedAt: Date | null;
  setLastReportReceivedAt: (d: Date | null) => void;
  dataAgeHours: number | null;
  isDataStale: boolean; // true when data is older than 48 hours
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [rawDashboardData, setRawDashboardData] = useState<DashboardData | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [returnTypeFilter, setReturnTypeFilter] = useState("all");
  const [taxYearFilter, setTaxYearFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [lastReportReceivedAt, setLastReportReceivedAt] = useState<Date | null>(null);

  const resetFilters = () => {
    setAssigneeFilter("all");
    setReturnTypeFilter("all");
    setTaxYearFilter("all");
    setSearchQuery("");
    setOverdueOnly(false);
    setDateRange(null);
  };

  // Compute data age
  const dataAgeHours = useMemo(() => {
    if (!lastReportReceivedAt) return null;
    const diffMs = Date.now() - lastReportReceivedAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  }, [lastReportReceivedAt]);

  const isDataStale = dataAgeHours !== null && dataAgeHours >= 48;

  // Apply taxYear + dateRange at the data layer so all views see the same filtered data
  const filteredDashboardData = useMemo(() => {
    if (!rawDashboardData) return null;

    const applyFilters = (records: DashboardData["rawRecords"]) => {
      let result = records;
      if (taxYearFilter !== "all") {
        result = result.filter((r) => (r.taxYear || "").trim() === taxYearFilter);
      }
      if (dateRange) {
        result = filterByDateRange(result, dateRange);
      }
      return result;
    };

    const filteredStages = rawDashboardData.stages.map((stage) => {
      const filtered = applyFilters(stage.records);
      const statusBreakdown: Record<string, number> = {};
      let overdueCount = 0;
      filtered.forEach((r) => {
        const st = r.status || "No status";
        statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;
        if (r.isOverdue) overdueCount++;
      });
      return { ...stage, records: filtered, count: filtered.length, overdueCount, statusBreakdown };
    });

    const filteredRaw = applyFilters(rawDashboardData.rawRecords);
    return {
      ...rawDashboardData,
      stages: filteredStages,
      rawRecords: filteredRaw,
      totalClients: filteredRaw.length,
      totalOverdue: filteredRaw.filter((r) => r.isOverdue).length,
    };
  }, [rawDashboardData, taxYearFilter, dateRange]);

  const value: DashboardContextValue = {
    assigneeFilter,
    returnTypeFilter,
    taxYearFilter,
    searchQuery,
    overdueOnly,
    dateRange,
    setAssigneeFilter,
    setReturnTypeFilter,
    setTaxYearFilter,
    setSearchQuery,
    setOverdueOnly,
    setDateRange,
    resetFilters,
    filteredDashboardData,
    setDashboardData: setRawDashboardData,
    rawDashboardData,
    lastReportReceivedAt,
    setLastReportReceivedAt,
    dataAgeHours,
    isDataStale,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider");
  return ctx;
}
