import { describe, expect, it } from "vitest";
import { parseCanopyCSV } from "../client/src/lib/csvParser";

describe("Canopy CSV validation", () => {
  it("loads the current subtask format and surfaces unknown columns as a warning", () => {
    const csv = [
      "Data extract produced by Canopy",
      "Subtask Name,Subtask Status,Client Name,Custom Field Value,Subtask Due Date,Task Tax Year,Task Return Type,Unexpected Field",
      "TP: Client Tax Return in Process - Inputting,In progress,Acme LLC,Alex,04/15/2026,2025,1120S,value",
    ].join("\n");
    const result = parseCanopyCSV(csv);
    expect(result.validation.usable).toBe(true);
    expect(result.validation.sourceFormat).toBe("subtask");
    expect(result.validation.unrecognizedColumns).toContain("unexpected field");
    expect(result.totalClients).toBe(1);
  });

  it("reports missing recommended fields without rejecting an otherwise usable CSV", () => {
    const csv = [
      "Task,Status,Client",
      "TP: Client Tax Return in Process - Inputting,Ready,Acme LLC",
    ].join("\n");
    const result = parseCanopyCSV(csv);
    expect(result.validation.usable).toBe(true);
    expect(result.validation.missingRecommended).toContain("Due Date");
    expect(result.validation.missingRecommended).toContain("Assignee / Custom Field Value");
  });

  it("rejects a CSV that cannot identify the task, status, and client data", () => {
    const csv = ["Name,Amount,Date", "Acme LLC,100,04/15/2026"].join("\n");
    expect(() => parseCanopyCSV(csv)).toThrow(/cannot be used/i);
  });
});
