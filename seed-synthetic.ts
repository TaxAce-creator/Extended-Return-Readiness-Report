import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { hashCsvContent, insertCanopyReport, isCanopyReportDuplicate } from "../server/db";

const file = path.resolve("sample-data/canopy-synthetic-test-data.csv");
const csvContent = await fs.readFile(file, "utf8");
const contentHash = hashCsvContent(csvContent);

if (await isCanopyReportDuplicate(contentHash)) {
  console.log("Synthetic report already exists; no duplicate was inserted.");
  process.exit(0);
}

const rowCount = csvContent.trim().split(/\r?\n/).length - 1;
const id = await insertCanopyReport({
  csvContent,
  contentHash,
  rowCount,
  source: "synthetic",
  filename: "canopy-synthetic-test-data.csv",
});

console.log(`Synthetic Canopy report inserted with ID ${id}.`);
