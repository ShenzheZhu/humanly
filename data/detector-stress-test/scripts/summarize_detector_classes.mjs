#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { csvEscape, parseCsv } from "./detector_runner_common.mjs";

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
  getArg("outputs", process.env.DETECTOR_OUTPUTS_PATH || path.join(DATA_DIR, "detector_outputs_api_pilot.csv")),
);
const OUTPUT_PATH = path.resolve(
  process.cwd(),
  getArg("output", process.env.OUTPUT_PATH || path.join(DATA_DIR, "class_distribution_aggregated.csv")),
);

function canonicalClass(output) {
  const value = String(output.canonical_document_class || output.raw_label || "").toUpperCase();
  if (value === "HUMAN_ONLY" || value === "HUMAN") return "HUMAN_ONLY";
  if (value === "MIXED" || value === "AI-ASSISTED" || value === "AI_ASSISTED") return "MIXED";
  if (value === "AI_ONLY" || value === "AI") return "AI_ONLY";
  if (output.binary_prediction === "human_compliant") return "HUMAN_ONLY";
  if (output.binary_prediction === "ai_suspicious") return "AI_ONLY";
  return "";
}

function makeGroup(detector, sample) {
  return {
    detector,
    case_id: sample.case_id,
    length_bucket: sample.length_bucket,
    expected_document_class: sample.expected_document_class || "",
    n: 0,
    total_samples: 0,
    HUMAN_ONLY: 0,
    MIXED: 0,
    AI_ONLY: 0,
    exact_matches: 0,
    exact_errors: 0,
    exact_accuracy: "",
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
  if (!output.sample_id || !output.detector || !samplesById.has(output.sample_id)) continue;
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
    if (!groups.has(groupKey)) groups.set(groupKey, makeGroup(detector, sample));
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
    const documentClass = canonicalClass(output);
    if (!["HUMAN_ONLY", "MIXED", "AI_ONLY"].includes(documentClass)) {
      group.request_errors += 1;
      continue;
    }
    group.n += 1;
    group[documentClass] += 1;
    const expectedClass = sample.expected_document_class || "";
    if (expectedClass) {
      if (documentClass === expectedClass) group.exact_matches += 1;
      else group.exact_errors += 1;
    }
  }
}

for (const group of groups.values()) {
  const denominator = group.exact_matches + group.exact_errors;
  group.exact_accuracy = denominator ? (group.exact_matches / denominator).toFixed(6) : "";
}

const outputColumns = [
  "detector",
  "case_id",
  "length_bucket",
  "expected_document_class",
  "n",
  "total_samples",
  "HUMAN_ONLY",
  "MIXED",
  "AI_ONLY",
  "exact_matches",
  "exact_errors",
  "exact_accuracy",
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
    const notes = [];
    if (group.proxy_rows) notes.push("Includes synthetic proxy rows; smoke-test only.");
    if (duplicateOutputs.size) notes.push("Duplicate detector outputs existed; last row per sample was used.");
    return { ...group, notes: notes.join(" ") };
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
console.log(`aggregated ${rows.length} detector/case/length class row(s)`);
console.log(`wrote ${path.relative(process.cwd(), OUTPUT_PATH)}`);
