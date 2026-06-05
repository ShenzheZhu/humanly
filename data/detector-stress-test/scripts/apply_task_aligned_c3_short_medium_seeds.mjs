#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const TRANSLATION_SEEDS_PATH = path.join(DATA_DIR, "translation-seeds.csv");
const SHORT_CANDIDATES_PATH = path.join(DATA_DIR, "c3-short-forum-candidates.csv");
const MEDIUM_CANDIDATES_PATH = path.join(DATA_DIR, "c3-medium-wikiversity-candidates.csv");

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

function normalizeRow(row) {
  return {
    seed_id: row.seed_id,
    length_bucket: row.length_bucket,
    task_type: row.task_type,
    seed_language: row.seed_language,
    source_platform: row.source_platform,
    source_url: row.source_url,
    source_id: row.source_id,
    source_title: row.source_title,
    author_or_signature: row.author_or_signature,
    license_notes: row.license_notes,
    word_count: row.word_count,
    cleaned_text_path: row.cleaned_text_path,
    inclusion_notes: row.inclusion_notes,
  };
}

const existingRows = parseCsv(await readFile(TRANSLATION_SEEDS_PATH, "utf8"));
const shortRows = parseCsv(await readFile(SHORT_CANDIDATES_PATH, "utf8")).slice(0, 10).map(normalizeRow);
const mediumRows = parseCsv(await readFile(MEDIUM_CANDIDATES_PATH, "utf8")).slice(0, 10).map(normalizeRow);
const longRows = existingRows.filter((row) => row.length_bucket === "long").map(normalizeRow);

if (shortRows.length !== 10) throw new Error(`Expected 10 short rows, found ${shortRows.length}`);
if (mediumRows.length !== 10) throw new Error(`Expected 10 medium rows, found ${mediumRows.length}`);
if (longRows.length !== 10) throw new Error(`Expected 10 long rows, found ${longRows.length}`);

const rows = [...shortRows, ...mediumRows, ...longRows];
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
const csv = [
  columns.join(","),
  ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
].join("\n");
await writeFile(TRANSLATION_SEEDS_PATH, `${csv}\n`);

const counts = rows.reduce((acc, row) => {
  acc[row.length_bucket] = (acc[row.length_bucket] || 0) + 1;
  return acc;
}, {});
const platforms = rows.reduce((acc, row) => {
  acc[row.source_platform] = (acc[row.source_platform] || 0) + 1;
  return acc;
}, {});
console.log(`translation seed counts: ${JSON.stringify(counts)}`);
console.log(`translation seed platforms: ${JSON.stringify(platforms)}`);
console.log(`wrote ${path.relative(process.cwd(), TRANSLATION_SEEDS_PATH)}`);
