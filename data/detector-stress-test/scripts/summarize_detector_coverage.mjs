#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const SAMPLES_PATH = path.join(DATA_DIR, "samples-dashboard-smoke-combined.csv");
const OUTPUTS_PATH = path.join(DATA_DIR, "detector_outputs_dashboard_smoke_combined.csv");
const SUMMARY_MD_PATH = path.join(DATA_DIR, "detector-coverage-summary.md");
const SUMMARY_CSV_PATH = path.join(DATA_DIR, "detector-coverage-summary.csv");

const CASES = ["C1", "C2", "C3", "C4", "N1", "N2", "N3", "N4"];
const LENGTHS = ["short", "medium", "long"];

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

function sampleKey(sample) {
  return `${sample.case_id}::${sample.length_bucket}`;
}

function labelFor(row) {
  if (!row) return "missing";
  if (row.request_status !== "success") return row.request_status || "not_success";
  return row.binary_prediction || "unknown";
}

const samples = parseCsv(await readFile(SAMPLES_PATH, "utf8"));
const outputs = parseCsv(await readFile(OUTPUTS_PATH, "utf8"));
const sampleById = new Map(samples.map((sample) => [sample.sample_id, sample]));
const detectors = [...new Set(outputs.map((row) => row.detector).filter(Boolean))].sort();
const outputByDetectorAndCell = new Map();

for (const output of outputs) {
  const sample = sampleById.get(output.sample_id);
  if (!sample) continue;
  outputByDetectorAndCell.set(`${output.detector}::${sampleKey(sample)}`, output);
}

const rows = [];
for (const detector of detectors) {
  for (const caseId of CASES) {
    for (const lengthBucket of LENGTHS) {
      const output = outputByDetectorAndCell.get(`${detector}::${caseId}::${lengthBucket}`);
      rows.push({
        detector,
        case_id: caseId,
        length_bucket: lengthBucket,
        coverage_status: output ? "covered" : "missing",
        binary_prediction: labelFor(output),
        sample_id: output?.sample_id || "",
      });
    }
  }
}

const byDetector = detectors.map((detector) => {
  const detectorRows = rows.filter((row) => row.detector === detector);
  const covered = detectorRows.filter((row) => row.coverage_status === "covered").length;
  return {
    detector,
    covered,
    missing: detectorRows.length - covered,
    pilot_cells: detectorRows.length,
  };
});

const columns = ["detector", "case_id", "length_bucket", "coverage_status", "binary_prediction", "sample_id"];
await writeFile(
  SUMMARY_CSV_PATH,
  `${[
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n")}\n`,
);

const markdown = `# Detector Coverage Summary

Generated: ${new Date().toISOString()}

This summarizes the no-payment dashboard smoke coverage against the 24-cell
pilot target: 8 cases x 3 length buckets x 1 sample per cell. It does not
represent paper-ready detector coverage.

## By Detector

| Detector | Covered pilot cells | Missing pilot cells |
| --- | ---: | ---: |
${byDetector
  .map((row) => `| ${row.detector} | ${row.covered}/${row.pilot_cells} | ${row.missing}/${row.pilot_cells} |`)
  .join("\n")}

## Covered Cells

${rows
  .filter((row) => row.coverage_status === "covered")
  .map(
    (row) =>
      `- ${row.detector}: ${row.case_id}/${row.length_bucket} via \`${row.sample_id}\` -> ${row.binary_prediction}`,
  )
  .join("\n")}

## Missing Cells

${rows
  .filter((row) => row.coverage_status === "missing")
  .map((row) => `- ${row.detector}: ${row.case_id}/${row.length_bucket}`)
  .join("\n")}
`;

await writeFile(SUMMARY_MD_PATH, markdown);

console.log(`detectors: ${detectors.join(", ")}`);
for (const row of byDetector) {
  console.log(`${row.detector}: ${row.covered}/${row.pilot_cells} pilot cells covered`);
}
console.log(`wrote ${path.relative(process.cwd(), SUMMARY_MD_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), SUMMARY_CSV_PATH)}`);
