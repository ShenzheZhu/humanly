#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const DEFAULT_SAMPLES = path.join(DATA_DIR, "samples-generated-proxy.csv");
const SAMPLES_PATH = process.env.SAMPLES_PATH
  ? path.resolve(process.cwd(), process.env.SAMPLES_PATH)
  : DEFAULT_SAMPLES;
const OUTPUTS_PATH = path.join(DATA_DIR, "detector_outputs_local_heuristic_proxy.csv");
const CONFUSION_PATH = path.join(DATA_DIR, "confusion_by_case_local_heuristic_proxy.csv");
const RAW_DIR = path.join(DATA_DIR, "outputs", "raw", "local_heuristic_proxy");

const AI_STYLE_TERMS = [
  "important to note",
  "in this context",
  "process evidence",
  "policy compliance",
  "substantive",
  "provenance",
  "auditable",
  "nuanced",
  "pivotal",
  "delve",
  "underscore",
  "foster",
  "elucidate",
  "demonstrate",
  "integrate",
  "leverage",
  "comprehensive",
  "framework",
];

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

function wordCount(text) {
  const latinLikeWords = text.match(/\b[\p{Script=Latin}\p{M}\p{N}’'-]+\b/gu) || [];
  const cjkChars =
    text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) || [];
  return latinLikeWords.length + Math.ceil(cjkChars.length / 2);
}

function sentenceStats(text) {
  const sentences = text.split(/[.!?。！？]+/).map((sentence) => sentence.trim()).filter(Boolean);
  if (!sentences.length) return { sentenceCount: 0, avgSentenceWords: 0 };
  const total = sentences.reduce((sum, sentence) => sum + wordCount(sentence), 0);
  return { sentenceCount: sentences.length, avgSentenceWords: total / sentences.length };
}

function heuristicScore(text) {
  const lower = text.toLowerCase();
  const wc = Math.max(1, wordCount(text));
  const styleHits = AI_STYLE_TERMS.reduce(
    (sum, term) => sum + (lower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length,
    0,
  );
  const { avgSentenceWords } = sentenceStats(text);
  const paragraphCount = text.split(/\n{2,}/).filter((paragraph) => paragraph.trim()).length;
  const styleDensity = Math.min(1, styleHits / Math.max(2, wc / 120));
  const longSentenceSignal = Math.min(1, Math.max(0, avgSentenceWords - 22) / 18);
  const uniformParagraphSignal = paragraphCount >= 3 ? 0.18 : 0;
  const score = Math.max(0, Math.min(1, 0.18 + 0.48 * styleDensity + 0.24 * longSentenceSignal + uniformParagraphSignal));
  return {
    ai_probability: score,
    style_hits: styleHits,
    avg_sentence_words: avgSentenceWords,
    paragraph_count: paragraphCount,
    word_count: wc,
  };
}

function binaryPrediction(score) {
  return score.ai_probability >= 0.5 ? "ai_suspicious" : "human_compliant";
}

function expectedClass(row) {
  return row.policy_label === "non_compliant" ? "positive" : "negative";
}

function confusionCell(row, prediction) {
  const expected = expectedClass(row);
  if (expected === "positive" && prediction === "ai_suspicious") return "TP";
  if (expected === "positive" && prediction === "human_compliant") return "FN";
  if (expected === "negative" && prediction === "human_compliant") return "TN";
  return "FP";
}

await mkdir(RAW_DIR, { recursive: true });
const samples = parseCsv(await readFile(SAMPLES_PATH, "utf8"));
const timestamp = new Date().toISOString();
const outputRows = [];

for (const sample of samples) {
  const text = await readFile(path.join(DATA_DIR, sample.final_text_path), "utf8");
  const score = heuristicScore(text);
  const prediction = binaryPrediction(score);
  const rawPath = path.join(RAW_DIR, `${sample.sample_id}.json`);
  await writeFile(rawPath, `${JSON.stringify(score, null, 2)}\n`);
  outputRows.push({
    sample_id: sample.sample_id,
    detector: "local_heuristic_proxy",
    detector_version: "0.1",
    run_timestamp_utc: timestamp,
    raw_label: prediction,
    raw_score_json: JSON.stringify(score),
    ai_probability: score.ai_probability.toFixed(6),
    binary_prediction: prediction,
    threshold_rule:
      "Smoke-test heuristic only: style term density + sentence length + paragraph uniformity >= 0.5",
    request_status: "success",
    error_notes: sample.sample_status === "synthetic_proxy_ready" ? "synthetic proxy sample; not paper-ready" : "",
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
    ...outputRows.map((row) =>
      outputColumns.map((column) => csvEscape(row[column])).join(","),
    ),
  ].join("\n")}\n`,
);

const byKey = new Map();
for (const sample of samples) {
  const output = outputRows.find((row) => row.sample_id === sample.sample_id);
  const key = `${sample.case_id}::${sample.length_bucket}`;
  if (!byKey.has(key)) {
    byKey.set(key, {
      case_id: sample.case_id,
      length_bucket: sample.length_bucket,
      n: 0,
      TP: 0,
      FP: 0,
      TN: 0,
      FN: 0,
    });
  }
  const row = byKey.get(key);
  row.n += 1;
  row[confusionCell(sample, output.binary_prediction)] += 1;
}

const confusionColumns = [
  "case_id",
  "length_bucket",
  "n",
  "TP",
  "FP",
  "TN",
  "FN",
  "TPR",
  "FPR",
  "TNR",
  "FNR",
  "notes",
];
const confusionRows = [...byKey.values()].map((row) => {
  const positive = row.TP + row.FN;
  const negative = row.TN + row.FP;
  return {
    ...row,
    TPR: positive ? (row.TP / positive).toFixed(4) : "",
    FPR: negative ? (row.FP / negative).toFixed(4) : "",
    TNR: negative ? (row.TN / negative).toFixed(4) : "",
    FNR: positive ? (row.FN / positive).toFixed(4) : "",
    notes: "Local heuristic over proxy dataset; pipeline smoke test only.",
  };
});

await writeFile(
  CONFUSION_PATH,
  `${[
    confusionColumns.join(","),
    ...confusionRows.map((row) =>
      confusionColumns.map((column) => csvEscape(row[column])).join(","),
    ),
  ].join("\n")}\n`,
);

console.log(`processed ${samples.length} sample(s)`);
console.log(`wrote ${path.relative(process.cwd(), OUTPUTS_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), CONFUSION_PATH)}`);
