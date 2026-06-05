#!/usr/bin/env node

import path from "node:path";
import {
  DATA_DIR,
  formatProbability,
  getArg,
  hasFlag,
  makeMockDetectorRow,
  readCsv,
  readSampleText,
  writeDetectorRowsReplacing,
  writeRaw,
} from "./detector_runner_common.mjs";

const DETECTOR = "gptzero";
const DEFAULT_SAMPLES_PATH = path.join(DATA_DIR, "samples-generated-pilot-proxy.csv");
const DEFAULT_OUTPUTS_PATH = path.join(DATA_DIR, "detector_outputs_api_pilot.csv");
const SAMPLES_PATH = path.resolve(process.cwd(), getArg("samples", process.env.SAMPLES_PATH || DEFAULT_SAMPLES_PATH));
const OUTPUTS_PATH = path.resolve(
  process.cwd(),
  getArg("outputs", process.env.DETECTOR_OUTPUTS_PATH || DEFAULT_OUTPUTS_PATH),
);
const LIMIT = Number(getArg("limit", process.env.DETECTOR_LIMIT || "0"));
const DRY_RUN = hasFlag("dry-run") || hasFlag("mock");
const ENDPOINT = getArg("endpoint", process.env.GPTZERO_API_URL || "https://api.gptzero.me/v2/predict/text");
const GPTZERO_VERSION = getArg("gptzero-version", process.env.GPTZERO_API_VERSION || "2024-11-04-base");
const THRESHOLD_RULE =
  "GPTZero document_classification HUMAN_ONLY => human_compliant; MIXED/AI_ONLY => ai_suspicious; fallback AI probability >= 0.5.";

function usage() {
  return `Usage:
  node data/detector-stress-test/scripts/run_gptzero_detector.mjs --dry-run
  GPTZERO_API_KEY=... node data/detector-stress-test/scripts/run_gptzero_detector.mjs

Options:
  --samples=<path>           sample manifest CSV
  --outputs=<path>           normalized detector output CSV
  --limit=<n>                optional sample limit
  --gptzero-version=<value>  default: ${GPTZERO_VERSION}
  --dry-run                  deterministic local mock, no network`;
}

function firstDocument(raw) {
  return raw.documents?.[0] || raw.document || raw;
}

function classProbabilities(doc) {
  return (
    doc.class_probabilities ||
    doc.classProbabilities ||
    doc.probabilities ||
    doc.document_classification_probabilities ||
    {}
  );
}

function normalizedRawLabel(raw) {
  const doc = firstDocument(raw);
  return (
    doc.document_classification ||
    doc.classification ||
    doc.predicted_class ||
    doc.result ||
    doc.label ||
    ""
  );
}

function probabilityFromRaw(raw) {
  const probabilities = normalizedClassProbabilities(raw);
  return probabilities.mixed + probabilities.ai;
}

function normalizedClassProbabilities(raw) {
  const doc = firstDocument(raw);
  const probs = classProbabilities(doc);
  const humanOnly = Number(probs.HUMAN_ONLY ?? probs.human_only ?? probs.human ?? 0);
  const aiOnly = Number(probs.AI_ONLY ?? probs.ai_only ?? probs.ai ?? probs.generated ?? 0);
  const mixed = Number(probs.MIXED ?? probs.mixed ?? probs.ai_mixed ?? 0);
  const averageGenerated = Number(
    doc.average_generated_prob ??
      doc.averageGeneratedProb ??
      doc.ai_probability ??
      doc.ai_generated_probability ??
      raw.average_generated_prob ??
      NaN,
  );
  const total = humanOnly + mixed + aiOnly;
  if (total > 0) {
    return {
      human: humanOnly / total,
      mixed: mixed / total,
      ai: aiOnly / total,
    };
  }
  if (!Number.isNaN(averageGenerated)) {
    const suspicious = averageGenerated > 1 ? averageGenerated / 100 : averageGenerated;
    return { human: Math.max(0, 1 - suspicious), mixed: 0, ai: suspicious };
  }
  const label = String(normalizedRawLabel(raw)).toUpperCase();
  const documentClass = label.includes("AI") ? "AI_ONLY" : label.includes("MIXED") ? "MIXED" : "HUMAN_ONLY";
  return {
    human: documentClass === "HUMAN_ONLY" ? 1 : 0,
    mixed: documentClass === "MIXED" ? 1 : 0,
    ai: documentClass === "AI_ONLY" ? 1 : 0,
  };
}

function canonicalDocumentClass(raw) {
  const label = String(normalizedRawLabel(raw)).toUpperCase();
  if (label === "HUMAN_ONLY" || label.includes("HUMAN_ONLY")) return "HUMAN_ONLY";
  if (label === "MIXED" || label.includes("MIXED")) return "MIXED";
  if (label === "AI_ONLY" || label.includes("AI_ONLY")) return "AI_ONLY";
  const probabilities = normalizedClassProbabilities(raw);
  const entries = Object.entries(probabilities).sort((left, right) => right[1] - left[1]);
  if (entries[0]?.[0] === "ai") return "AI_ONLY";
  if (entries[0]?.[0] === "mixed") return "MIXED";
  return "HUMAN_ONLY";
}

function binaryPrediction(raw) {
  return canonicalDocumentClass(raw) === "HUMAN_ONLY" ? "human_compliant" : "ai_suspicious";
}

function scorePayload(raw) {
  const doc = firstDocument(raw);
  return {
    document_classification: normalizedRawLabel(raw),
    class_probabilities: classProbabilities(doc),
    average_generated_prob: doc.average_generated_prob ?? doc.averageGeneratedProb ?? "",
    version: raw.version || doc.version || GPTZERO_VERSION,
  };
}

async function callGptZero(text, apiKey) {
  const payload = { document: text };
  if (GPTZERO_VERSION && GPTZERO_VERSION !== "omit") payload.version = GPTZERO_VERSION;
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  let raw;
  try {
    raw = responseText ? JSON.parse(responseText) : {};
  } catch {
    raw = { raw_response_text: responseText };
  }
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    error.body = raw;
    throw error;
  }
  return raw;
}

if (hasFlag("help") || hasFlag("h")) {
  console.log(usage());
  process.exit(0);
}

const allSamples = await readCsv(SAMPLES_PATH);
const samples = LIMIT > 0 ? allSamples.slice(0, LIMIT) : allSamples;
const timestamp = new Date().toISOString();
const rows = [];
const apiKey = process.env.GPTZERO_API_KEY;

if (!DRY_RUN && !apiKey) {
  throw new Error("GPTZERO_API_KEY is missing; use --dry-run for a no-network plumbing run.");
}

for (const sample of samples) {
  const text = await readSampleText(sample);
  if (DRY_RUN) {
    const { raw, row } = makeMockDetectorRow({
      detector: DETECTOR,
      detectorVersion: "mock-dry-run",
      sample,
      text,
      timestamp,
      thresholdRule: `Mock dry run only; live rule would be: ${THRESHOLD_RULE}`,
    });
    await writeRaw(DETECTOR, sample.sample_id, raw);
    rows.push(row);
    continue;
  }

  try {
    const raw = await callGptZero(text, apiKey);
    const documentClass = canonicalDocumentClass(raw);
    const probabilities = normalizedClassProbabilities(raw);
    await writeRaw(DETECTOR, sample.sample_id, raw);
    rows.push({
      sample_id: sample.sample_id,
      detector: DETECTOR,
      detector_version: raw.version || firstDocument(raw).version || GPTZERO_VERSION,
      run_timestamp_utc: timestamp,
      raw_label: normalizedRawLabel(raw),
      canonical_document_class: documentClass,
      class_probabilities_json: JSON.stringify(probabilities),
      confidence_category: firstDocument(raw).confidence_category || raw.confidence_category || "",
      raw_score_json: JSON.stringify(scorePayload(raw)),
      ai_probability: formatProbability(probabilities.mixed + probabilities.ai),
      binary_prediction: documentClass === "HUMAN_ONLY" ? "human_compliant" : "ai_suspicious",
      threshold_rule: THRESHOLD_RULE,
      request_status: "success",
      error_notes: "",
    });
  } catch (error) {
    const raw = { error: error.message, http_status: error.status || "", body: error.body || null };
    await writeRaw(DETECTOR, sample.sample_id, raw);
    rows.push({
      sample_id: sample.sample_id,
      detector: DETECTOR,
      detector_version: GPTZERO_VERSION,
      run_timestamp_utc: timestamp,
      raw_label: "",
      canonical_document_class: "",
      class_probabilities_json: "",
      confidence_category: "",
      raw_score_json: JSON.stringify(raw),
      ai_probability: "",
      binary_prediction: "",
      threshold_rule: THRESHOLD_RULE,
      request_status: "api_error",
      error_notes: error.message,
    });
  }
}

await writeDetectorRowsReplacing(OUTPUTS_PATH, DETECTOR, samples, rows);
console.log(`${DETECTOR}: wrote ${rows.length} row(s) to ${path.relative(process.cwd(), OUTPUTS_PATH)}`);
