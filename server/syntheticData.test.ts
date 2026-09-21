import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCanopyCSV } from "../client/src/lib/csvParser";

describe("synthetic Canopy test data", () => {
  it("loads as a complete PII-safe dashboard scenario", () => {
    const csv = fs.readFileSync(path.resolve("sample-data/canopy-synthetic-test-data.csv"), "utf8");
    const data = parseCanopyCSV(csv);
    expect(data.validation.usable).toBe(true);
    expect(data.validation.sourceFormat).toBe("subtask");
    expect(data.rawRecords).toHaveLength(60);
    expect(data.totalOverdue).toBe(15);
    expect(data.assignees).toEqual(["Alex Rivera", "Jordan Lee", "Morgan Santos", "Taylor Cruz"]);
    expect(data.returnTypes).toEqual(["1040", "1041", "1065", "1120", "1120S"]);
    expect(data.taxYears).toEqual(["2026", "2025"]);
    expect(data.stages.filter(stage => stage.count > 0).length).toBeGreaterThanOrEqual(20);
  });
});
