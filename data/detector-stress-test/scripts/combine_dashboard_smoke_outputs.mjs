#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");

const SAMPLE_FILES = [
  "samples-pangram-free-dashboard-smoke.csv",
  "samples-copyleaks-free-dashboard-smoke.csv",
  "samples-gptzero-free-dashboard-smoke.csv",
];
const OUTPUT_FILES = [
  "detector_outputs_pangram_free_dashboard_smoke.csv",
  "detector_outputs_copyleaks_free_dashboard_smoke.csv",
  "detector_outputs_gptzero_free_dashboard_smoke.csv",
];
const COMBINED_SAMPLES_PATH = path.join(DATA_DIR, "samples-dashboard-smoke-combined.csv");
const COMBINED_OUTPUTS_PATH = path.join(DATA_DIR, "detector_outputs_dashboard_smoke_combined.csv");

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

async function readCsvIfPresent(relativePath) {
  try {
    return parseCsv(await readFile(path.join(DATA_DIR, relativePath), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

const sampleRowsById = new Map();
for (const file of SAMPLE_FILES) {
  for (const row of await readCsvIfPresent(file)) {
    if (!sampleRowsById.has(row.sample_id)) sampleRowsById.set(row.sample_id, row);
  }
}

const detectorRows = [];
for (const file of OUTPUT_FILES) {
  detectorRows.push(...await readCsvIfPresent(file));
}

if (!sampleRowsById.size) throw new Error("No dashboard smoke sample rows found");
if (!detectorRows.length) throw new Error("No dashboard smoke detector rows found");

const sampleRows = [...sampleRowsById.values()].sort((left, right) =>
  left.sample_id.localeCompare(right.sample_id),
);
const sampleColumns = Object.keys(sampleRows[0]);
await writeFile(
  COMBINED_SAMPLES_PATH,
  `${[
    sampleColumns.join(","),
    ...sampleRows.map((row) =>
      sampleColumns.map((column) => csvEscape(row[column])).join(","),
    ),
  ].join("\n")}\n`,
);

const outputColumns = Object.keys(detectorRows[0]);
await writeFile(
  COMBINED_OUTPUTS_PATH,
  `${[
    outputColumns.join(","),
    ...detectorRows.map((row) =>
      outputColumns.map((column) => csvEscape(row[column])).join(","),
    ),
  ].join("\n")}\n`,
);

console.log(`combined ${sampleRows.length} dashboard smoke sample(s)`);
console.log(`combined ${detectorRows.length} dashboard smoke detector row(s)`);
console.log(`wrote ${path.relative(process.cwd(), COMBINED_SAMPLES_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), COMBINED_OUTPUTS_PATH)}`);
