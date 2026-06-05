#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const DEFAULT_INPUT = path.join(DATA_DIR, "outputs", "raw", "pangram_free_dashboard", "results.json");
const inputArg = process.argv.find((arg) => arg.startsWith("--input="))?.slice("--input=".length);
const INPUT_PATH = path.resolve(process.cwd(), inputArg || DEFAULT_INPUT);
const SAMPLES_PATH = path.join(DATA_DIR, "samples-generated-proxy.csv");
const RAW_DIR = path.join(DATA_DIR, "outputs", "raw", "pangram_free_dashboard");
const OUTPUTS_PATH = path.join(DATA_DIR, "detector_outputs_pangram_free_dashboard_smoke.csv");
const SAMPLE_SUBSET_PATH = path.join(DATA_DIR, "samples-pangram-free-dashboard-smoke.csv");

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

function aiProbability(result) {
  if (result.ai_percent !== "") return (Number(result.ai_percent) / 100).toFixed(6);
  if (result.human_percent !== "") return (1 - Number(result.human_percent) / 100).toFixed(6);
  return "";
}

function binaryPrediction(result) {
  if (result.raw_label === "ai_suspicious") return "ai_suspicious";
  if (result.raw_label === "human_compliant") return "human_compliant";
  return "unknown";
}

const samples = parseCsv(await readFile(SAMPLES_PATH, "utf8"));
const samplesById = new Map(samples.map((sample) => [sample.sample_id, sample]));
const results = JSON.parse(await readFile(INPUT_PATH, "utf8"));
await mkdir(RAW_DIR, { recursive: true });
await writeFile(path.join(RAW_DIR, "results.json"), `${JSON.stringify(results, null, 2)}\n`);

const detectorRows = [];
const sampleRows = [];
for (const result of results) {
  const sample = samplesById.get(result.sample_id);
  if (!sample) throw new Error(`Unknown sample_id in Pangram dashboard result: ${result.sample_id}`);
  const prediction = binaryPrediction(result);
  if (!["ai_suspicious", "human_compliant"].includes(prediction)) {
    throw new Error(`Unsupported Pangram dashboard label for ${result.sample_id}: ${result.raw_label}`);
  }
  const rawPath = path.join(RAW_DIR, `${result.sample_id}.json`);
  await writeFile(rawPath, `${JSON.stringify(result, null, 2)}\n`);
  sampleRows.push(sample);
  detectorRows.push({
    sample_id: result.sample_id,
    detector: "pangram_free_dashboard",
    detector_version: result.detector_version || "",
    run_timestamp_utc: result.run_timestamp_utc || new Date().toISOString(),
    raw_label: result.raw_label,
    raw_score_json: JSON.stringify({
      human_percent: result.human_percent,
      ai_percent: result.ai_percent,
      raw_file: path.relative(DATA_DIR, rawPath),
    }),
    ai_probability: aiProbability(result),
    binary_prediction: prediction,
    threshold_rule:
      "Free Pangram dashboard smoke result; binary label from visible dashboard classification.",
    request_status: "success",
    error_notes:
      sample.sample_status === "synthetic_proxy_ready"
        ? "free dashboard smoke; synthetic proxy sample; not paper-ready"
        : "free dashboard smoke; not paper-ready",
  });
}

const outputColumns = [
  "sample_id",
  "detector",
  "detector_version",
  "run_timestamp_utc",
  "raw_label",
  "raw_score_json",
  "ai_probability",
  "binary_prediction",
  "threshold_rule",
  "request_status",
  "error_notes",
];
await writeFile(
  OUTPUTS_PATH,
  `${[
    outputColumns.join(","),
    ...detectorRows.map((row) =>
      outputColumns.map((column) => csvEscape(row[column])).join(","),
    ),
  ].join("\n")}\n`,
);

const sampleColumns = Object.keys(sampleRows[0] || {});
await writeFile(
  SAMPLE_SUBSET_PATH,
  `${[
    sampleColumns.join(","),
    ...sampleRows.map((row) =>
      sampleColumns.map((column) => csvEscape(row[column])).join(","),
    ),
  ].join("\n")}\n`,
);

console.log(`imported ${detectorRows.length} Pangram dashboard result(s)`);
console.log(`wrote ${path.relative(process.cwd(), OUTPUTS_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), SAMPLE_SUBSET_PATH)}`);
