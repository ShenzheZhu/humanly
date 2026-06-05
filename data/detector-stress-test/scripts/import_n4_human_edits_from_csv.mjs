#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(DATA_DIR, "n4-human-edit-manifest.csv");
const OUTPUT_DIR = path.join(DATA_DIR, "texts", "human_n4_edits");
const RESULTS_PATH = path.join(DATA_DIR, "n4-human-edit-csv-import-results.csv");
const inputCsvArg = process.argv.find((arg) => arg.startsWith("--input-csv="))?.slice("--input-csv=".length);
const promote = !process.argv.includes("--no-promote");

if (!inputCsvArg) {
  console.error(
    "Usage: node data/detector-stress-test/scripts/import_n4_human_edits_from_csv.mjs --input-csv=/path/to/n4-edited-texts.csv",
  );
  process.exit(1);
}

const INPUT_CSV = path.resolve(process.cwd(), inputCsvArg);

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
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function findEditedText(row, sampleId) {
  const candidateColumns = [
    "edited_text",
    "final_text",
    "response",
    "text",
    `edited_text_${sampleId}`,
    `response_${sampleId}`,
  ];
  for (const column of candidateColumns) {
    const value = row[column]?.trim();
    if (value) return { column, value };
  }
  for (const [column, value] of Object.entries(row)) {
    if (/edited|response|final|text/i.test(column) && value?.trim()) {
      return { column, value: value.trim() };
    }
  }
  return { column: "", value: "" };
}

const manifestRows = parseCsv(await readFile(MANIFEST_PATH, "utf8"));
const inputRows = parseCsv(await readFile(INPUT_CSV, "utf8"));
const inputBySampleId = new Map(inputRows.map((row) => [row.sample_id, row]));
const resultRows = [];
let imported = 0;
let errors = 0;

await mkdir(OUTPUT_DIR, { recursive: true });

for (const manifestRow of manifestRows) {
  const sampleId = manifestRow.sample_id;
  const inputRow = inputBySampleId.get(sampleId);
  if (!inputRow) {
    resultRows.push({
      sample_id: sampleId,
      input_column: "",
      output_path: manifestRow.editor_input_path,
      status: "missing_row",
      notes: "No row found for sample_id in input CSV.",
    });
    errors += 1;
    continue;
  }
  const { column, value } = findEditedText(inputRow, sampleId);
  if (!value) {
    resultRows.push({
      sample_id: sampleId,
      input_column: column,
      output_path: manifestRow.editor_input_path,
      status: "missing_edited_text",
      notes: "Row exists but no edited text column is populated.",
    });
    errors += 1;
    continue;
  }

  const outputPath = path.join(DATA_DIR, manifestRow.editor_input_path);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, value.endsWith("\n") ? value : `${value}\n`);
  resultRows.push({
    sample_id: sampleId,
    input_column: column,
    output_path: manifestRow.editor_input_path,
    status: "written",
    notes: "",
  });
  imported += 1;
}

const columns = ["sample_id", "input_column", "output_path", "status", "notes"];
await writeFile(
  RESULTS_PATH,
  `${[
    columns.join(","),
    ...resultRows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n")}\n`,
);

console.log(`N4 rows expected: ${manifestRows.length}`);
console.log(`written text files: ${imported}`);
console.log(`blocking rows: ${errors}`);
console.log(`wrote ${path.relative(process.cwd(), RESULTS_PATH)}`);

if (errors > 0) process.exit(1);

if (promote) {
  const result = spawnSync(process.execPath, [path.join(__dirname, "import_n4_human_edits.mjs"), "--force"], {
    cwd: path.resolve(DATA_DIR, "..", ".."),
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 0);
}
