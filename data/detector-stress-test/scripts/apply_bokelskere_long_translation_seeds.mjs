#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const TRANSLATION_SEEDS_PATH = path.join(DATA_DIR, "translation-seeds.csv");
const BOKELSKERE_CANDIDATES_PATH = path.join(DATA_DIR, "bokelskere-long-candidates.csv");

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
    if (!quoted && char === "\r") continue;
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

const existingSeeds = parseCsv(await readFile(TRANSLATION_SEEDS_PATH, "utf8"));
const bokelskereCandidates = parseCsv(await readFile(BOKELSKERE_CANDIDATES_PATH, "utf8"));

if (bokelskereCandidates.length < 10) {
  throw new Error(`Expected at least 10 Bokelskere candidates, found ${bokelskereCandidates.length}`);
}

const keptSeeds = existingSeeds.filter((seed) => seed.length_bucket !== "long");
const bokelskereLongSeeds = bokelskereCandidates.slice(0, 10).map((candidate) => ({
  seed_id: candidate.seed_id,
  length_bucket: "long",
  task_type: "long_form_review",
  seed_language: candidate.seed_language,
  source_platform: candidate.source_platform,
  source_url: candidate.source_url,
  source_id: candidate.source_id,
  source_title: candidate.source_title,
  author_or_signature: candidate.author_or_signature,
  license_notes: candidate.license_notes,
  word_count: candidate.word_count,
  cleaned_text_path: candidate.cleaned_text_path,
  inclusion_notes:
    `${candidate.inclusion_notes} Posted ${candidate.created_utc}; source download ${candidate.source_download_url}; score ${candidate.score || "NA"}.`,
}));

const columns = [
  "seed_id",
  "length_bucket",
  "task_type",
  "seed_language",
  "source_platform",
  "source_url",
  "source_id",
  "source_title",
  "author_or_signature",
  "license_notes",
  "word_count",
  "cleaned_text_path",
  "inclusion_notes",
];

const rows = [...keptSeeds, ...bokelskereLongSeeds];
const csv = [
  columns.join(","),
  ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
].join("\n");
await writeFile(TRANSLATION_SEEDS_PATH, `${csv}\n`);

const counts = rows.reduce((acc, row) => {
  acc[row.length_bucket] = (acc[row.length_bucket] || 0) + 1;
  return acc;
}, {});
console.log(`translation seed counts: ${JSON.stringify(counts)}`);
console.log(`replaced long translation seeds with ${bokelskereLongSeeds.length} Bokelskere rows`);
console.log(`wrote ${path.relative(process.cwd(), TRANSLATION_SEEDS_PATH)}`);
