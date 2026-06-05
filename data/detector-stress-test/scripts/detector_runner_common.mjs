#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATA_DIR = path.resolve(__dirname, "..");
export const DETECTOR_OUTPUT_COLUMNS = [
  "sample_id",
  "detector",
  "detector_version",
  "run_timestamp_utc",
  "raw_label",
  "canonical_document_class",
  "class_probabilities_json",
  "confidence_category",
  "raw_score_json",
  "ai_probability",
  "binary_prediction",
  "threshold_rule",
  "request_status",
  "error_notes",
];

export function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

export function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

export function parseCsv(text) {
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

export function csvEscape(value) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readCsv(filePath) {
  return parseCsv(await readFile(filePath, "utf8"));
}

export async function writeCsv(filePath, rows, columns) {
  await writeFile(
    filePath,
    `${[columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join(
      "\n",
    )}\n`,
  );
}

export async function writeDetectorRowsReplacing(outputPath, detector, samples, newRows) {
  const sampleIds = new Set(samples.map((sample) => sample.sample_id));
  const existingRows = (await exists(outputPath)) ? await readCsv(outputPath) : [];
  const keptRows = existingRows.filter((row) => row.detector !== detector || !sampleIds.has(row.sample_id));
  await writeCsv(outputPath, [...keptRows, ...newRows], DETECTOR_OUTPUT_COLUMNS);
}

export async function readSampleText(sample) {
  return readFile(path.join(DATA_DIR, sample.final_text_path), "utf8");
}

export async function writeRaw(detector, sampleId, payload) {
  const rawDir = path.join(DATA_DIR, "outputs", "raw", detector);
  await mkdir(rawDir, { recursive: true });
  await writeFile(path.join(rawDir, `${sampleId}.json`), `${JSON.stringify(payload, null, 2)}\n`);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value)));
}

export function formatProbability(value) {
  if (value === "" || value == null || Number.isNaN(Number(value))) return "";
  return clamp01(value).toFixed(6);
}

export function tokenEstimate(text) {
  const cjkChars =
    text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) || [];
  const nonCjkText = text.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, "");
  return Math.ceil(nonCjkText.length / 4) + Math.ceil(cjkChars.length * 0.8);
}

function hashString(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function makeMockDetectorRow({ detector, detectorVersion, sample, text, timestamp, thresholdRule }) {
  const baseByCase = {
    C1: 0.12,
    C2: 0.34,
    C3: 0.48,
    C4: 0.72,
    N1: 0.93,
    N2: 0.36,
    N3: 0.66,
    N4: 0.44,
  };
  const detectorOffset = {
    pangram: 0.03,
    gptzero: -0.02,
    llm_claude_opus_4_8: 0.01,
  }[detector] ?? 0;
  const jitter = ((hashString(`${detector}:${sample.sample_id}:${text.slice(0, 200)}`) % 17) - 8) / 100;
  const aiProbability = clamp01((baseByCase[sample.case_id] ?? 0.5) + detectorOffset + jitter);
  const canonicalDocumentClass =
    aiProbability >= 0.75 ? "AI_ONLY" : aiProbability >= 0.35 ? "MIXED" : "HUMAN_ONLY";
  const binaryPrediction = canonicalDocumentClass === "HUMAN_ONLY" ? "human_compliant" : "ai_suspicious";
  const classProbabilities = {
    human: canonicalDocumentClass === "HUMAN_ONLY" ? 0.72 : canonicalDocumentClass === "MIXED" ? 0.18 : 0.05,
    mixed: canonicalDocumentClass === "MIXED" ? 0.64 : canonicalDocumentClass === "HUMAN_ONLY" ? 0.2 : 0.18,
    ai: canonicalDocumentClass === "AI_ONLY" ? 0.77 : canonicalDocumentClass === "MIXED" ? 0.18 : 0.08,
  };
  const raw = {
    mode: "mock_dry_run",
    detector,
    sample_id: sample.sample_id,
    case_id: sample.case_id,
    canonical_document_class: canonicalDocumentClass,
    class_probabilities: classProbabilities,
    ai_probability: aiProbability,
    binary_prediction: binaryPrediction,
    note: "Deterministic mock score for plumbing only; not paper-ready evidence.",
  };
  return {
    raw,
    row: {
      sample_id: sample.sample_id,
      detector,
      detector_version: detectorVersion,
      run_timestamp_utc: timestamp,
      raw_label: canonicalDocumentClass,
      canonical_document_class: canonicalDocumentClass,
      class_probabilities_json: JSON.stringify(classProbabilities),
      confidence_category: "mock",
      raw_score_json: JSON.stringify(raw),
      ai_probability: formatProbability(aiProbability),
      binary_prediction: binaryPrediction,
      threshold_rule: thresholdRule,
      request_status: "success",
      error_notes:
        sample.sample_status === "synthetic_proxy_ready"
          ? "mock dry run on synthetic proxy sample; not paper-ready"
          : "mock dry run; not paper-ready",
    },
  };
}

export function extractJsonObject(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in model response");
    return JSON.parse(match[0]);
  }
}
