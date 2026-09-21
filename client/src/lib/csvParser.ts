// =============================================================================
// TaxAce Dashboard — CSV Parser Utility
// Parses Canopy-exported CSV files into structured dashboard data
// =============================================================================

export interface TaxRecord {
  status: string;
  task: string;
  client: string;
  taskType: string;
  assignee: string;
  parentTask: string;
  dueDate: string;
  returnType: string;
  taxYear: string;
  isOverdue: boolean;
  dueDateObj: Date | null;
}

export interface StageData {
  stageKey: string;
  stageLabel: string;
  stageShort: string;
  records: TaxRecord[];
  count: number;
  overdueCount: number;
  statusBreakdown: Record<string, number>;
}

export interface DashboardData {
  stages: StageData[];
  totalClients: number;
  totalOverdue: number;
  assignees: string[];
  returnTypes: string[];
  taxYears: string[];
  lastUpdated: Date;
  rawRecords: TaxRecord[];
  validation: CsvValidationResult;
}

export interface CsvValidationResult {
  headerFound: boolean;
  sourceFormat: "subtask" | "legacy" | "unknown";
  missingRequired: string[];
  missingRecommended: string[];
  unrecognizedColumns: string[];
  recognizedColumns: string[];
  usable: boolean;
}

/**
 * Stage type classification for workflow intelligence.
 *
 * - "active"   : Preparer is actively working on the return (firm-controlled)
 * - "waiting"  : Blocked on client response or external action (client-controlled)
 * - "review"   : Return is under internal quality review (manager-controlled)
 * - "billing"  : Post-completion billing and payment stages
 * - "complete" : Return is filed and fully closed
 * - "terminal" : Client on hold / follow-up queue (risk of abandonment)
 */
export type StageType = "active" | "waiting" | "review" | "billing" | "complete" | "terminal";

// The 23 workflow stages in order
export const WORKFLOW_STAGES: Array<{
  key: string;
  label: string;
  short: string;
  color: string;
  stageType: StageType;
}> = [
  {
    key: "TP: Client Tax Return in Process - Inputting",
    label: "Client Tax Return in Process - Inputting",
    short: "Inputting",
    color: "#4A7C59",
    stageType: "active",
  },
  {
    key: "TP: Sent to Tax Manager - Initial Review",
    label: "Sent to Tax Manager - Initial Review",
    short: "Initial Review",
    color: "#2D6A4F",
    stageType: "review",
  },
  {
    key: "TP: Need More Info From Client",
    label: "Need More Info From Client",
    short: "Need More Info",
    color: "#D97706",
    stageType: "waiting",
  },
  {
    key: "TP: Update Return with new docs (after review)",
    label: "Update Return with new docs (after review)",
    short: "Update Docs (Review)",
    color: "#6366F1",
    stageType: "active",
  },
  {
    key: "TP: Perform Video Review & Send to Client",
    label: "Perform Video Review & Send to Client",
    short: "Video Review",
    color: "#0891B2",
    stageType: "review",
  },
  {
    key: "TP: Call Client About Video Review",
    label: "Call Client About Video Review",
    short: "Call Client",
    color: "#7C3AED",
    stageType: "waiting",
  },
  {
    key: "TP: Schedule Appt",
    label: "Schedule Appointment",
    short: "Schedule Appt",
    color: "#DB2777",
    stageType: "waiting",
  },
  {
    key: "TP: Tax Return Final Review",
    label: "Tax Return Final Review",
    short: "Final Review",
    color: "#059669",
    stageType: "review",
  },
  {
    key: "TP: Host Appointment",
    label: "Host Appointment",
    short: "Host Appt",
    color: "#1A3A2A",
    stageType: "active",
  },
  {
    key: "TP Checkpoint: Appointment/Video Review",
    label: "Checkpoint: Appointment/Video Review",
    short: "Appt/Video Check",
    color: "#78350F",
    stageType: "review",
  },
  {
    key: "TP Checkpoint: Are there additional items needed after appointment/video review?",
    label: "Checkpoint: Additional Items Needed?",
    short: "Checkpoint",
    color: "#92400E",
    stageType: "review",
  },
  {
    key: "TP: Additional items needed after appointment",
    label: "Additional Items Needed After Appointment",
    short: "Additional Items",
    color: "#B45309",
    stageType: "waiting",
  },
  {
    key: "TP: Update Return with new docs (after apt)",
    label: "Update Return with new docs (after apt)",
    short: "Update Docs (Appt)",
    color: "#4338CA",
    stageType: "active",
  },
  {
    key: "TP: Billed Client for Tax Return",
    label: "Billed Client for Tax Return",
    short: "Billed Client",
    color: "#065F46",
    stageType: "billing",
  },
  {
    key: "TP: Received Payment from Client",
    label: "Received Payment from Client",
    short: "Payment Received",
    color: "#14532D",
    stageType: "billing",
  },
  {
    key: "TP: Send Electronic Signature Forms through ProSeries",
    label: "Send Electronic Signature Forms (ProSeries)",
    short: "Send E-Sig Forms",
    color: "#1E40AF",
    stageType: "active",
  },
  {
    key: "TP: Electronic Filing Signatures Signed in ProSeries",
    label: "Electronic Filing Signatures Signed (ProSeries)",
    short: "E-Sig Signed (PS)",
    color: "#1D4ED8",
    stageType: "waiting",
  },
  {
    key: "TP: Send Electronic Signature Forms through Adobe",
    label: "Send Electronic Signature Forms (Adobe)",
    short: "Send E-Sig (Adobe)",
    color: "#9A3412",
    stageType: "active",
  },
  {
    key: "TP: Electronic Filing Signatures Signed in Adobe",
    label: "Electronic Filing Signatures Signed (Adobe)",
    short: "E-Sig Signed (Adobe)",
    color: "#7C2D12",
    stageType: "waiting",
  },
  {
    key: "TP: Return E-filed",
    label: "Return E-filed",
    short: "E-filed",
    color: "#166534",
    stageType: "complete",
  },
  {
    key: "TP: CR - 1st Follow Up",
    label: "CR - 1st Follow Up",
    short: "1st Follow Up",
    color: "#0E7490",
    stageType: "terminal",
  },
  {
    key: "TP: CR - 2nd Follow Up",
    label: "CR - 2nd Follow Up",
    short: "2nd Follow Up",
    color: "#0369A1",
    stageType: "terminal",
  },
  {
    key: "TP: CR - 3rd Follow Up \"On Hold\"",
    label: "CR - 3rd Follow Up (On Hold)",
    short: "3rd Follow Up",
    color: "#7E22CE",
    stageType: "terminal",
  },
];

export const STATUS_COLORS: Record<string, string> = {
  "Ready": "#16a34a",
  "In progress": "#2563eb",
  "Needs review": "#d97706",
  "On hold": "#dc2626",
  "Waiting": "#7c3aed",
  "No status": "#6b7280",
  "Draft": "#0891b2",
  // Canopy exports this as "With client" (lowercase c) — distinct teal so it
  // stands out clearly from Needs review (amber) and In progress (blue)
  "With client": "#0d9488",
  "With Client": "#0d9488",  // alias for capitalisation variants
};

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === "") return null;
  const parts = dateStr.trim().split("/");
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCanopyCSV(csvText: string): DashboardData {
  // Normalise line endings: strip UTF-8 BOM and Windows \r\n so that
  // header names like "due date" are never corrupted by a trailing \r.
  // This is the root cause of the Pinned-column overdue bug — when Canopy
  // exports with CRLF and the Pinned column is present, the last header
  // cell retains a \r which breaks indexOf("due date") → returns -1.
  const normalised = csvText
    .replace(/^\uFEFF/, "")   // strip UTF-8 BOM if present
    .replace(/\r\n/g, "\n")   // Windows CRLF → LF
    .replace(/\r/g, "\n");    // old Mac CR → LF

  const allLines = normalised.split("\n").filter((l) => l.trim() !== "");
  if (allLines.length < 2) {
    throw new Error("CSV file appears to be empty or has no data rows.");
  }

  // Canopy exports include metadata lines at the top ("Data extract produced by...",
  // "Filters applied on data:", etc.) before the actual column header row.
  // We detect the real header row as the first line that contains known column names.
  // This makes the parser robust to any number of metadata lines.
  const KNOWN_COLUMNS = [
    "subtask name", "subtask status", "task", "status", "client name", "client",
    "task name", "task status", "custom field value", "assignee",
  ];
  let headerLineIdx = 0;
  for (let i = 0; i < Math.min(allLines.length, 20); i++) {
    const parsed = parseCSVLine(allLines[i]).map((h) => h.toLowerCase().trim());
    if (KNOWN_COLUMNS.some((col) => parsed.includes(col))) {
      headerLineIdx = i;
      break;
    }
  }
  const lines = allLines.slice(headerLineIdx);

  // Parse header — all columns are detected by name so extra Canopy columns
  // like "Pinned", "Workspace", etc. are automatically ignored regardless of position.
  // Supports both legacy column names (task, status, client, assignee) and
  // Canopy subtask export names (Subtask Name, Subtask Status, Client Name,
  // Custom Field Value for assignee, Subtask Due Date, Task Tax Year, Task Return Type).
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

  const COLUMN_LABELS: Record<string, string> = {
    task: "Task / Subtask Name",
    status: "Task / Subtask Status",
    client: "Client Name",
    assignee: "Assignee / Custom Field Value",
    dueDate: "Due Date",
    returnType: "Return Type",
    taxYear: "Tax Year",
  };

  // Task/stage column: "subtask name" (new) or "task" (legacy) or "task name"
  const taskIdx =
    headers.indexOf("subtask name") !== -1
      ? headers.indexOf("subtask name")
      : headers.indexOf("task name") !== -1
      ? headers.indexOf("task name")
      : headers.indexOf("task");

  // Status column: "subtask status" (new) or "status" (legacy) or "task status"
  const statusIdx =
    headers.indexOf("subtask status") !== -1
      ? headers.indexOf("subtask status")
      : headers.indexOf("task status") !== -1
      ? headers.indexOf("task status")
      : headers.indexOf("status");

  // Client column: "client name" (new) or "client" (legacy)
  const clientIdx =
    headers.indexOf("client name") !== -1
      ? headers.indexOf("client name")
      : headers.indexOf("client");

  const taskTypeIdx = headers.indexOf("task type");

  // Assignee column: "custom field value" (new — holds preparer name) or "assignee" (legacy)
  const assigneeIdx =
    headers.indexOf("custom field value") !== -1
      ? headers.indexOf("custom field value")
      : headers.indexOf("assignee");

  const parentTaskIdx = headers.indexOf("parent task");

  // Due date: "subtask due date" (new) or "due date" / "due_date" (legacy)
  const dueDateIdx =
    headers.indexOf("subtask due date") !== -1
      ? headers.indexOf("subtask due date")
      : headers.indexOf("due date") !== -1
      ? headers.indexOf("due date")
      : headers.indexOf("due_date");

  // Return type: "task return type" (new) or "return type" (legacy)
  const returnTypeIdx =
    headers.indexOf("task return type") !== -1
      ? headers.indexOf("task return type")
      : headers.indexOf("return type");

  // Tax year: "task tax year" (new) or "tax year" (legacy)
  const taxYearIdx =
    headers.indexOf("task tax year") !== -1
      ? headers.indexOf("task tax year")
      : headers.indexOf("tax year");

  const headerFound = headers.some((header) => KNOWN_COLUMNS.includes(header));
  const recognizedHeaderNames = new Set([
    "subtask name", "task name", "task", "subtask status", "task status", "status",
    "client name", "client", "task type", "custom field value", "assignee", "parent task",
    "subtask due date", "due date", "due_date", "task return type", "return type",
    "task tax year", "tax year", "pinned", "workspace", "task id", "subtask id",
    "client id", "created date", "updated date", "completed date", "task due date",
  ]);
  const columnIndexes = { task: taskIdx, status: statusIdx, client: clientIdx, assignee: assigneeIdx, dueDate: dueDateIdx, returnType: returnTypeIdx, taxYear: taxYearIdx };
  const missingRequired = ["task", "status", "client"].filter((key) => columnIndexes[key as keyof typeof columnIndexes] < 0).map((key) => COLUMN_LABELS[key]);
  const missingRecommended = ["assignee", "dueDate", "returnType", "taxYear"].filter((key) => columnIndexes[key as keyof typeof columnIndexes] < 0).map((key) => COLUMN_LABELS[key]);
  const validation: CsvValidationResult = {
    headerFound,
    sourceFormat: headers.includes("subtask name") ? "subtask" : headers.includes("task") || headers.includes("task name") ? "legacy" : "unknown",
    missingRequired,
    missingRecommended,
    unrecognizedColumns: headers.filter((header) => header && !recognizedHeaderNames.has(header)),
    recognizedColumns: headers.filter((header) => recognizedHeaderNames.has(header)),
    usable: headerFound && missingRequired.length === 0,
  };
  if (!validation.usable) {
    throw new Error(`This CSV cannot be used for the dashboard. Missing required columns: ${missingRequired.join(", ") || "recognized Canopy headers"}.`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rawRecords: TaxRecord[] = [];
  const assigneeSet = new Set<string>();
  const returnTypeSet = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 3) continue;

    const dueDateStr = dueDateIdx >= 0 ? cols[dueDateIdx] || "" : "";
    const dueDateObj = parseDate(dueDateStr);
    const isOverdue = dueDateObj !== null && dueDateObj < today;

    const assignee = assigneeIdx >= 0 ? cols[assigneeIdx] || "" : "";
    const returnType = returnTypeIdx >= 0 ? cols[returnTypeIdx] || "" : "";

    // Track unique assignees (split by comma for multi-assignee)
    if (assignee) {
      assignee.split(",").forEach((a) => {
        const trimmed = a.trim();
        if (trimmed) assigneeSet.add(trimmed);
      });
    }
    if (returnType) returnTypeSet.add(returnType.trim());

    rawRecords.push({
      status: statusIdx >= 0 ? cols[statusIdx] || "No status" : "No status",
      task: taskIdx >= 0 ? cols[taskIdx] || "" : "",
      client: clientIdx >= 0 ? cols[clientIdx] || "" : "",
      taskType: taskTypeIdx >= 0 ? cols[taskTypeIdx] || "" : "",
      assignee,
      parentTask: parentTaskIdx >= 0 ? cols[parentTaskIdx] || "" : "",
      dueDate: dueDateStr,
      returnType,
      taxYear: taxYearIdx >= 0 ? cols[taxYearIdx] || "" : "",
      isOverdue,
      dueDateObj,
    });
  }

  // Group by stage
  const stageMap = new Map<string, TaxRecord[]>();
  WORKFLOW_STAGES.forEach((s) => stageMap.set(s.key, []));

  rawRecords.forEach((record) => {
    const taskName = record.task.trim();
    // Find matching stage key
    const matchedStage = WORKFLOW_STAGES.find(
      (s) => s.key.toLowerCase() === taskName.toLowerCase()
    );
    if (matchedStage) {
      stageMap.get(matchedStage.key)!.push(record);
    }
  });

  const stages: StageData[] = WORKFLOW_STAGES.map((s) => {
    const records = stageMap.get(s.key) || [];
    const statusBreakdown: Record<string, number> = {};
    let overdueCount = 0;

    records.forEach((r) => {
      const st = r.status || "No status";
      statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;
      if (r.isOverdue) overdueCount++;
    });

    return {
      stageKey: s.key,
      stageLabel: s.label,
      stageShort: s.short,
      records,
      count: records.length,
      overdueCount,
      statusBreakdown,
    };
  });

  const totalClients = rawRecords.length;
  const totalOverdue = rawRecords.filter((r) => r.isOverdue).length;

  // Collect unique tax years, sorted descending (most recent first)
  const taxYearSet = new Set<string>();
  rawRecords.forEach((r) => {
    if (r.taxYear && r.taxYear.trim()) taxYearSet.add(r.taxYear.trim());
  });
  const taxYears = Array.from(taxYearSet).sort((a, b) => b.localeCompare(a));

  return {
    stages,
    totalClients,
    totalOverdue,
    assignees: Array.from(assigneeSet).sort(),
    returnTypes: Array.from(returnTypeSet).sort(),
    taxYears,
    lastUpdated: new Date(),
    rawRecords,
    validation,
  };
}

export function filterRecords(
  records: TaxRecord[],
  assigneeFilter: string,
  returnTypeFilter: string,
  searchQuery: string,
  taxYearFilter: string = "all"
): TaxRecord[] {
  return records.filter((r) => {
    if (assigneeFilter && assigneeFilter !== "all") {
      if (!r.assignee.toLowerCase().includes(assigneeFilter.toLowerCase())) {
        return false;
      }
    }
    if (returnTypeFilter && returnTypeFilter !== "all") {
      if (r.returnType !== returnTypeFilter) return false;
    }
    if (taxYearFilter && taxYearFilter !== "all") {
      if ((r.taxYear || "").trim() !== taxYearFilter) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !r.client.toLowerCase().includes(q) &&
        !r.assignee.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });
}
