#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const DEFAULT_OUTPUT = path.join(DATA_DIR, "prolific", "n4-atb-edited-texts.csv");

const inputCsvArgs = process.argv
  .filter((arg) => arg.startsWith("--input-csv="))
  .map((arg) => arg.slice("--input-csv=".length));
const outputCsvArg = process.argv.find((arg) => arg.startsWith("--output-csv="))?.slice("--output-csv=".length);
const OUTPUT_CSV = path.resolve(process.cwd(), outputCsvArg || DEFAULT_OUTPUT);

if (!inputCsvArgs.length) {
  console.error(
    "Usage: node data/detector-stress-test/scripts/normalize_n4_prolific_atb_reports.mjs --input-csv=short.csv --input-csv=medium.csv --input-csv=long.csv [--output-csv=out.csv]",
  );
  process.exit(1);
}

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
    if (!quoted && char === "\r") {
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
  const stringValue = value == null ? "" : String(value).replace(/\0/g, "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function sampleIdFromRow(row) {
  return row.sample_id || row.META_sample_id || row.META_SAMPLE_ID || row.Sample_ID || row["Sample ID"] || "";
}

function isEditedTextRow(row) {
  const taskType = row.Task_Type || row.task_type || "";
  const question = row.Question || row.question || "";
  if (taskType && !/free_text/i.test(taskType)) return false;
  if (question && /confirm/i.test(question)) return false;
  return true;
}

function findEditedText(row, sampleId) {
  const candidates = [
    "Annotator1_Response",
    "edited_text",
    "final_text",
    "response",
    "text",
    "Paste your edited final text here.",
    "paste_your_edited_final_text_here",
    "First copy the draft from the left, then make your edits, then submit.",
    "first_copy_the_draft_from_the_left_then_make_your_edits_then_submit",
    `edited_text_${sampleId}`,
    `response_${sampleId}`,
  ];
  for (const column of candidates) {
    const value = row[column]?.trim();
    if (value) return { column, value };
  }
  for (const [column, value] of Object.entries(row)) {
    if (/^META_/i.test(column)) continue;
    if (/prompt|draft|instruction|confirm/i.test(column)) continue;
    if (/edited|response|final|text/i.test(column) && value?.trim()) {
      return { column, value: value.trim() };
    }
  }
  return { column: "", value: "" };
}

const outputRows = [];
const seen = new Set();
let missing = 0;

function sourceReportName(inputPath) {
  const relative = path.relative(process.cwd(), inputPath);
  return relative.startsWith("..") ? path.basename(inputPath) : relative;
}

for (const inputCsvArg of inputCsvArgs) {
  const inputPath = path.resolve(process.cwd(), inputCsvArg);
  const rows = parseCsv(await readFile(inputPath, "utf8"));
  for (const row of rows) {
    if (!isEditedTextRow(row)) continue;
    const sampleId = sampleIdFromRow(row);
    if (!sampleId) continue;
    const { column, value } = findEditedText(row, sampleId);
    if (!value) {
      missing += 1;
      outputRows.push({
        sample_id: sampleId,
        edited_text: "",
        source_report: sourceReportName(inputPath),
        input_column: column,
        status: "missing_edited_text",
      });
      continue;
    }
    if (seen.has(sampleId)) {
      throw new Error(`Duplicate sample_id in reports: ${sampleId}`);
    }
    seen.add(sampleId);
    outputRows.push({
      sample_id: sampleId,
      edited_text: value,
      source_report: sourceReportName(inputPath),
      input_column: column,
      status: "ok",
    });
  }
}

const columns = ["sample_id", "edited_text", "source_report", "input_column", "status"];
await writeFile(
  OUTPUT_CSV,
  `${[
    columns.join(","),
    ...outputRows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n")}\n`,
);

console.log(`read report file(s): ${inputCsvArgs.length}`);
console.log(`normalized rows: ${outputRows.length}`);
console.log(`missing edited text rows: ${missing}`);
console.log(`wrote ${path.relative(process.cwd(), OUTPUT_CSV)}`);

if (missing > 0) process.exit(1);
