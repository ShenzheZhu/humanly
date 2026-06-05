#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const GENERATED_SAMPLES_PATH = path.join(DATA_DIR, "generated-samples.csv");
const RESULTS_PATH = path.join(DATA_DIR, "c4-synthetic-proxy-results.csv");
const force = process.argv.includes("--force");

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
  return (text.match(/\b[\p{L}\p{M}\p{N}’'-]+\b/gu) || []).length;
}

function targetWordCount(lengthBucket) {
  if (lengthBucket === "long") return 1100;
  if (lengthBucket === "medium") return 470;
  return 150;
}

function expandToLength(paragraphs, targetWords) {
  const out = [];
  let index = 0;
  while (wordCount(out.join("\n\n")) < targetWords) {
    out.push(paragraphs[index % paragraphs.length]);
    index += 1;
  }
  return out.join("\n\n");
}

function c4ProxyText(row) {
  const target = targetWordCount(row.length_bucket);
  const topic =
    row.length_bucket === "long"
      ? "the conference review context"
      : row.length_bucket === "medium"
        ? "the classroom writing context"
        : "the public social media context";
  const paragraphs = [
    `It is important to note that judging authorship from final text alone can obscure the intricate process through which a document originates. In ${topic}, a writer may endeavor to articulate an argument with care, use formal transitions, and deliberately convey a polished voice. Such wording can accentuate the appearance of artificial intelligence even when the substantive work is human-origin.`,
    "This highlights a pivotal limitation of text-only detection. A detector can scrutinize vocabulary, sentence rhythm, and recurring phrases, but it cannot ascertain whether a person typed the draft, revised it over time, or used permitted tools only to ameliorate grammar. Process evidence helps reconcile this gap by allowing reviewers to inspect how the text was created rather than relying on stylistic conjecture.",
    "A nuanced policy should therefore distinguish between prohibited generation and allowed support. If a writer uses formal language, words such as delve, underscore, foster, demonstrate, and elucidate may permeate the final answer without proving misconduct. The more defensible approach is to integrate writing traces, paste records, and AI interaction logs into the evaluation, while still preserving clear boundaries for privacy and consent.",
    "For this reason, a provenance-centered system can bolster trust in settings where students, reviewers, or contributors need to demonstrate their process. It does not claim to read intent or manifest an absolute truth about cognition. Instead, it provides a lasting record that can help people deliberate about policy compliance with more evidence and less speculation.",
  ];
  return expandToLength(paragraphs, target);
}

async function writeRelative(relativePath, text) {
  const absolutePath = path.join(DATA_DIR, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, text.endsWith("\n") ? text : `${text}\n`);
}

async function exists(relativePath) {
  try {
    await stat(path.join(DATA_DIR, relativePath));
    return true;
  } catch {
    return false;
  }
}

const rows = parseCsv(await readFile(GENERATED_SAMPLES_PATH, "utf8")).filter(
  (row) => row.case_id === "C4",
);

const resultRows = [];
for (const row of rows) {
  if (!force && await exists(row.final_text_path)) {
    const existingText = await readFile(path.join(DATA_DIR, row.final_text_path), "utf8");
    resultRows.push({
      sample_id: row.sample_id,
      final_text_path: row.final_text_path,
      word_count: wordCount(existingText),
      status: "already_done",
      notes: "existing C4 final text preserved; pass --force to overwrite with proxy",
    });
    continue;
  }
  const text = c4ProxyText(row);
  await writeRelative(row.final_text_path, text);
  await writeRelative(
    `${row.final_text_path}.meta.json`,
    JSON.stringify(
      {
        sample_id: row.sample_id,
        case_id: row.case_id,
        generation_mode: "synthetic_proxy",
        generated_at_utc: new Date().toISOString(),
        notes:
          "Offline synthetic proxy for exercising the C4 pipeline. This is not human-origin and must not be used as paper-ready C4 evidence.",
      },
      null,
      2,
    ),
  );
  resultRows.push({
    sample_id: row.sample_id,
    final_text_path: row.final_text_path,
    word_count: wordCount(text),
    status: "synthetic_proxy_success",
    notes: "not human-origin; proxy only",
  });
}

const columns = ["sample_id", "final_text_path", "word_count", "status", "notes"];
const csv = [
  columns.join(","),
  ...resultRows.map((row) =>
    columns.map((column) => csvEscape(row[column])).join(","),
  ),
].join("\n");
await writeFile(RESULTS_PATH, `${csv}\n`);

const counts = resultRows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});
console.log(`processed ${resultRows.length} C4 synthetic proxy sample(s)`);
console.log(`status counts: ${JSON.stringify(counts)}`);
console.log(`wrote ${path.relative(process.cwd(), RESULTS_PATH)}`);
