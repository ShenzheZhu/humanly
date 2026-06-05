#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const SAMPLES_PATH = path.resolve(
  process.cwd(),
  getArg("samples", process.env.SAMPLES_PATH || path.join(DATA_DIR, "samples-generated-proxy.csv")),
);
const DETECTOR_OUTPUTS_PATH = path.resolve(
  process.cwd(),
  getArg(
    "outputs",
    process.env.DETECTOR_OUTPUTS_PATH || path.join(DATA_DIR, "detector_outputs_local_heuristic_proxy.csv"),
  ),
);
const OUTPUT_PATH = path.resolve(
  process.cwd(),
  getArg("output", process.env.OUTPUT_PATH || path.join(DATA_DIR, "confusion_by_case_aggregated.csv")),
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

function expectedClass(sample) {
  return sample.policy_label === "non_compliant" ? "positive" : "negative";
}

function confusionCell(sample, prediction) {
  const expected = expectedClass(sample);
  if (expected === "positive" && prediction === "ai_suspicious") return "TP";
  if (expected === "positive" && prediction === "human_compliant") return "FN";
  if (expected === "negative" && prediction === "human_compliant") return "TN";
  return "FP";
}

function rate(numerator, denominator) {
  return denominator ? (numerator / denominator).toFixed(4) : "";
}

function makeGroup(detector, sample) {
  return {
    detector,
    case_id: sample.case_id,
    length_bucket: sample.length_bucket,
    n: 0,
    total_samples: 0,
    TP: 0,
    FP: 0,
    TN: 0,
    FN: 0,
    request_errors: 0,
    skipped: 0,
    proxy_rows: 0,
    notes: "",
  };
}

const samples = parseCsv(await readFile(SAMPLES_PATH, "utf8"));
const detectorOutputs = parseCsv(await readFile(DETECTOR_OUTPUTS_PATH, "utf8"));
const samplesById = new Map(samples.map((sample) => [sample.sample_id, sample]));
const detectors = [...new Set(detectorOutputs.map((row) => row.detector).filter(Boolean))].sort();
const outputsByDetectorAndSample = new Map();
const duplicateOutputs = new Set();

for (const output of detectorOutputs) {
  if (!output.sample_id || !output.detector) continue;
  if (!samplesById.has(output.sample_id)) continue;
  const key = `${output.detector}::${output.sample_id}`;
  if (outputsByDetectorAndSample.has(key)) duplicateOutputs.add(key);
  outputsByDetectorAndSample.set(key, output);
}

if (!detectors.length) {
  throw new Error(`No detector rows found in ${DETECTOR_OUTPUTS_PATH}`);
}

const groups = new Map();
for (const detector of detectors) {
  for (const sample of samples) {
    const groupKey = `${detector}::${sample.case_id}::${sample.length_bucket}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, makeGroup(detector, sample));
    }
    const group = groups.get(groupKey);
    const output = outputsByDetectorAndSample.get(`${detector}::${sample.sample_id}`);
    group.total_samples += 1;
    if (sample.sample_status === "synthetic_proxy_ready" || sample.policy_label === "compliant_proxy") {
      group.proxy_rows += 1;
    }
    if (!output) {
      group.skipped += 1;
      continue;
    }
    if (output.request_status !== "success") {
      if (output.request_status === "skipped") group.skipped += 1;
      else group.request_errors += 1;
      continue;
    }
    if (!["ai_suspicious", "human_compliant"].includes(output.binary_prediction)) {
      group.request_errors += 1;
      continue;
    }
    group.n += 1;
    group[confusionCell(sample, output.binary_prediction)] += 1;
  }
}

const outputColumns = [
  "detector",
  "case_id",
  "length_bucket",
  "n",
  "total_samples",
  "TP",
  "FP",
  "TN",
  "FN",
  "TPR",
  "FPR",
  "TNR",
  "FNR",
  "request_errors",
  "skipped",
  "notes",
];

const rows = [...groups.values()]
  .sort(
    (left, right) =>
      left.detector.localeCompare(right.detector) ||
      left.case_id.localeCompare(right.case_id) ||
      left.length_bucket.localeCompare(right.length_bucket),
  )
  .map((group) => {
    const positive = group.TP + group.FN;
    const negative = group.TN + group.FP;
    const notes = [];
    if (group.proxy_rows) notes.push("Includes synthetic proxy rows; smoke-test only.");
    if (duplicateOutputs.size) notes.push("Duplicate detector outputs existed; last row per sample was used.");
    return {
      ...group,
      TPR: rate(group.TP, positive),
      FPR: rate(group.FP, negative),
      TNR: rate(group.TN, negative),
      FNR: rate(group.FN, positive),
      notes: notes.join(" "),
    };
  });

await writeFile(
  OUTPUT_PATH,
  `${[
    outputColumns.join(","),
    ...rows.map((row) => outputColumns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n")}\n`,
);

console.log(`read ${samples.length} sample(s)`);
console.log(`read ${detectorOutputs.length} detector output row(s)`);
console.log(`aggregated ${rows.length} detector/case/length row(s)`);
console.log(`wrote ${path.relative(process.cwd(), OUTPUT_PATH)}`);
