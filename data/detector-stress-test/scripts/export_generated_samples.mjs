#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const INPUT_PATH = path.join(DATA_DIR, "generated-samples.csv");
const includeSyntheticProxy = process.argv.includes("--include-synthetic-proxy");
const outputArg = process.argv.find((arg) => arg.startsWith("--output="))?.split("=")[1];
const limitPerCellArg = process.argv.find((arg) => arg.startsWith("--limit-per-cell="))?.split("=")[1];
const limitPerCell = limitPerCellArg ? Number(limitPerCellArg) : Infinity;
const OUTPUT_PATH = path.join(
  DATA_DIR,
  outputArg || (includeSyntheticProxy ? "samples-generated-proxy.csv" : "samples-generated-ready.csv"),
);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === '"' && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (!quoted && char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...records] = rows.filter((record) => record.length > 1);
  return records.map((record) =>
    Object.fromEntries(header.map((column, index) => [column, record[index] ?? ""])),
  );
}

function csvEscape(value) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

const eligibleRows = parseCsv(await readFile(INPUT_PATH, "utf8")).filter((row) =>
  includeSyntheticProxy
    ? ["ready", "synthetic_proxy_ready"].includes(row.sample_status)
    : row.sample_status === "ready",
);

if ((!Number.isFinite(limitPerCell) && limitPerCell !== Infinity) || limitPerCell <= 0) {
  throw new Error(`Invalid --limit-per-cell value: ${limitPerCellArg}`);
}

const cellCounts = new Map();
const rows = eligibleRows.filter((row) => {
  const key = `${row.case_id}::${row.length_bucket}`;
  const count = cellCounts.get(key) || 0;
  if (count >= limitPerCell) return false;
  cellCounts.set(key, count + 1);
  return true;
});

const columns = [
  "sample_id",
  "case_id",
  "case_name",
  "matched_set_id",
  "prompt_id",
  "task_type",
  "length_bucket",
  "seed_id",
  "seed_type",
  "seed_language",
  "seed_text_path",
  "policy_label",
  "origin_label",
  "expected_document_class",
  "final_text_path",
  "source_text_path",
  "construction_notes",
  "license_notes",
  "word_count",
  "sample_status",
  "generation_job_ids",
  "approval_required",
];

const csv = [
  columns.join(","),
  ...rows.map((row) =>
    columns.map((column) => csvEscape(row[column])).join(","),
  ),
].join("\n");

await writeFile(OUTPUT_PATH, `${csv}\n`);

const statusCounts = rows.reduce((acc, row) => {
  acc[row.sample_status] = (acc[row.sample_status] || 0) + 1;
  return acc;
}, {});
console.log(`exported ${rows.length} sample(s) to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
console.log(`status counts: ${JSON.stringify(statusCounts)}`);
if (limitPerCell !== Infinity) console.log(`limit per case/length cell: ${limitPerCell}`);
