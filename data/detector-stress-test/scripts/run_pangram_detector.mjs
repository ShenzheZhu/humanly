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
  sleep,
  writeDetectorRowsReplacing,
  writeRaw,
} from "./detector_runner_common.mjs";

const DETECTOR = "pangram";
const DEFAULT_SAMPLES_PATH = path.join(DATA_DIR, "samples-generated-pilot-proxy.csv");
const DEFAULT_OUTPUTS_PATH = path.join(DATA_DIR, "detector_outputs_api_pilot.csv");
const SAMPLES_PATH = path.resolve(process.cwd(), getArg("samples", process.env.SAMPLES_PATH || DEFAULT_SAMPLES_PATH));
const OUTPUTS_PATH = path.resolve(
  process.cwd(),
  getArg("outputs", process.env.DETECTOR_OUTPUTS_PATH || DEFAULT_OUTPUTS_PATH),
);
const LIMIT = Number(getArg("limit", process.env.DETECTOR_LIMIT || "0"));
const DRY_RUN = hasFlag("dry-run") || hasFlag("mock");
const ENDPOINT = getArg("endpoint", process.env.PANGRAM_API_URL || "https://text.api.pangram.com/v3");
const POLL_INTERVAL_MS = Number(process.env.PANGRAM_POLL_INTERVAL_MS || "2000");
const MAX_POLLS = Number(process.env.PANGRAM_MAX_POLLS || "90");
const THRESHOLD_RULE =
  "Pangram prediction_short: Human => human_compliant; AI/AI-Assisted/Mixed => ai_suspicious; fallback fraction_ai + fraction_ai_assisted >= 0.5";

function usage() {
  return `Usage:
  node data/detector-stress-test/scripts/run_pangram_detector.mjs --dry-run
  PANGRAM_API_KEY=... node data/detector-stress-test/scripts/run_pangram_detector.mjs --samples=data/detector-stress-test/samples-generated-pilot-proxy.csv

Options:
  --samples=<path>   sample manifest CSV
  --outputs=<path>   normalized detector output CSV
  --limit=<n>        optional sample limit
  --dry-run          deterministic local mock, no network`;
}

function scorePayload(raw) {
  return {
    headline: raw.headline,
    prediction: raw.prediction,
    prediction_short: raw.prediction_short,
    fraction_ai: raw.fraction_ai,
    fraction_ai_assisted: raw.fraction_ai_assisted,
    fraction_human: raw.fraction_human,
    num_ai_segments: raw.num_ai_segments,
    num_ai_assisted_segments: raw.num_ai_assisted_segments,
    num_human_segments: raw.num_human_segments,
    dashboard_url: raw.dashboard_url,
  };
}

function aiProbability(raw) {
  const ai = Number(raw.fraction_ai ?? raw.fraction_ai_generated ?? 0);
  const assisted = Number(raw.fraction_ai_assisted ?? 0);
  return Math.max(0, Math.min(1, ai + assisted));
}

function canonicalDocumentClass(raw) {
  const short = String(raw.prediction_short ?? raw.prediction ?? "").trim().toLowerCase();
  if (short === "human") return "HUMAN_ONLY";
  if (["mixed", "ai-assisted", "ai assisted"].includes(short)) return "MIXED";
  if (short === "ai") return "AI_ONLY";
  const probability = aiProbability(raw);
  if (probability >= 0.75) return "AI_ONLY";
  if (probability >= 0.35) return "MIXED";
  return "HUMAN_ONLY";
}

function classProbabilities(raw) {
  const probabilities = {
    human: Number(raw.fraction_human ?? 0),
    mixed: Number(raw.fraction_ai_assisted ?? 0),
    ai: Number(raw.fraction_ai ?? raw.fraction_ai_generated ?? 0),
  };
  const total = probabilities.human + probabilities.mixed + probabilities.ai;
  if (total <= 0) {
    const documentClass = canonicalDocumentClass(raw);
    return {
      human: documentClass === "HUMAN_ONLY" ? 1 : 0,
      mixed: documentClass === "MIXED" ? 1 : 0,
      ai: documentClass === "AI_ONLY" ? 1 : 0,
    };
  }
  return {
    human: probabilities.human / total,
    mixed: probabilities.mixed / total,
    ai: probabilities.ai / total,
  };
}

function binaryPrediction(raw) {
  return canonicalDocumentClass(raw) === "HUMAN_ONLY" ? "human_compliant" : "ai_suspicious";
}

function taskStatusUrl(taskId) {
  if (/\/task\/?$/.test(ENDPOINT)) return `${ENDPOINT.replace(/\/$/, "")}/${taskId}`;
  if (/\/v\d+\/?$/.test(ENDPOINT)) return "";
  return `${ENDPOINT.replace(/\/$/, "")}/${taskId}`;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw_response_text: text };
  }
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function callPangram(text, apiKey) {
  const posted = await requestJson(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ text, public_dashboard_link: false }),
  });

  if (posted.prediction_short || posted.prediction || posted.fraction_ai != null) {
    return posted;
  }

  const taskId = posted.task_id || posted.id;
  const pollUrl = taskId ? taskStatusUrl(taskId) : "";
  if (!pollUrl) return posted;

  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);
    const polled = await requestJson(pollUrl, {
      method: "GET",
      headers: { "x-api-key": apiKey },
    });
    const status = String(polled.status || polled.stage || "").toUpperCase();
    if (polled.prediction_short || polled.prediction || polled.fraction_ai != null || status === "STAGE_SUCCESS") {
      return { ...polled, task_id: taskId };
    }
    if (status.includes("FAIL") || status.includes("ERROR")) {
      const error = new Error(`Pangram task failed with status ${status}`);
      error.body = polled;
      throw error;
    }
  }

  const error = new Error(`Pangram task did not complete after ${MAX_POLLS} polls`);
  error.body = posted;
  throw error;
}

if (hasFlag("help") || hasFlag("h")) {
  console.log(usage());
  process.exit(0);
}

const allSamples = await readCsv(SAMPLES_PATH);
const samples = LIMIT > 0 ? allSamples.slice(0, LIMIT) : allSamples;
const timestamp = new Date().toISOString();
const rows = [];
const apiKey = process.env.PANGRAM_API_KEY;

if (!DRY_RUN && !apiKey) {
  throw new Error("PANGRAM_API_KEY is missing; use --dry-run for a no-network plumbing run.");
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
    const raw = await callPangram(text, apiKey);
    const documentClass = canonicalDocumentClass(raw);
    const probabilities = classProbabilities(raw);
    await writeRaw(DETECTOR, sample.sample_id, raw);
    rows.push({
      sample_id: sample.sample_id,
      detector: DETECTOR,
      detector_version: raw.version || raw.model || "",
      run_timestamp_utc: timestamp,
      raw_label: raw.prediction_short || raw.prediction || "",
      canonical_document_class: documentClass,
      class_probabilities_json: JSON.stringify(probabilities),
      confidence_category: raw.confidence || "",
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
      detector_version: "",
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
