#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const DEFAULT_JSON_PATH = "/tmp/humanly-bokelskere/2019_bokelskere.json";
const INPUT_JSON_PATH = process.env.BOKELSKERE_JSON_PATH || DEFAULT_JSON_PATH;
const OUTPUT_MANIFEST_PATH = path.join(DATA_DIR, "bokelskere-long-candidates.csv");
const OUTPUT_DIR = path.join(DATA_DIR, "texts", "non_english_seeds");

const SOURCE_PAGE = "https://www.nb.no/sprakbanken/en/resource-catalogue/oai-nb-no-sbr-53/";
const SOURCE_DOWNLOAD = "https://www.nb.no/sbfil/tekst/2019_bokelskere.tar.gz";
const TARGET_COUNT = 10;
const MIN_WORDS = 1000;
const MAX_WORDS = 1500;
const MAX_DATE = "2019-10-24";

function csvEscape(value) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function normalizeNull(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "NULL" || text === '"NULL"') return "";
  return text.replace(/^"+|"+$/g, "").trim();
}

function cleanReviewText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wordCount(text) {
  return (text.match(/\b[\p{L}\p{M}\p{N}’'-]+\b/gu) || []).length;
}

function isTopLevelBookReview(record) {
  const date = String(record.date || "").slice(0, 10);
  const text = cleanReviewText(record.text);
  const words = wordCount(text);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date <= MAX_DATE &&
    words >= MIN_WORDS &&
    words <= MAX_WORDS &&
    normalizeNull(record.main_title) &&
    normalizeNull(record.author) &&
    !normalizeNull(record.parent_id)
  );
}

function candidateRows(records) {
  const rows = records
    .filter(isTopLevelBookReview)
    .map((record) => {
      const text = cleanReviewText(record.text);
      return {
        post_id: normalizeNull(record.post_id),
        date: String(record.date || "").slice(0, 10),
        words: wordCount(text),
        post_title: normalizeNull(record.post_title),
        book_title: normalizeNull(record.main_title),
        book_author: normalizeNull(record.author),
        score: normalizeNull(record.score),
        text,
      };
    })
    .sort(
      (left, right) =>
        Number(Boolean(right.score)) - Number(Boolean(left.score)) ||
        left.date.localeCompare(right.date) ||
        right.words - left.words,
    );

  const selected = [];
  const seenBooks = new Set();
  for (const row of rows) {
    const bookKey = `${row.book_title}::${row.book_author}`.toLowerCase();
    if (seenBooks.has(bookKey)) continue;
    seenBooks.add(bookKey);
    selected.push(row);
    if (selected.length >= TARGET_COUNT) break;
  }
  return selected;
}

async function main() {
  const records = JSON.parse(await readFile(INPUT_JSON_PATH, "utf8"));
  const selected = candidateRows(records);
  if (selected.length < TARGET_COUNT) {
    throw new Error(`Only found ${selected.length} Bokelskere long candidates`);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const rows = [];
  for (const [index, candidate] of selected.entries()) {
    const ordinal = String(index + 1).padStart(3, "0");
    const seedId = `long_no_bokelskere_${ordinal}`;
    const cleanedTextPath = `texts/non_english_seeds/${seedId}.txt`;
    await writeFile(path.join(DATA_DIR, cleanedTextPath), `${candidate.text}\n`);
    rows.push({
      seed_id: seedId,
      length_bucket: "long",
      task_type: "long_form_review",
      seed_language: "no",
      source_platform: "Bokelskere via National Library of Norway Sprakbanken",
      source_url: SOURCE_PAGE,
      source_download_url: SOURCE_DOWNLOAD,
      source_id: `bokelskere_post_${candidate.post_id}`,
      source_title: candidate.book_title,
      author_or_signature: candidate.book_author,
      created_utc: candidate.date,
      license_notes:
        "Bokelskere corpus distributed by the National Library of Norway Sprakbanken under CC0; source dump is 2019_bokelskere.",
      word_count: candidate.words,
      cleaned_text_path: cleanedTextPath,
      inclusion_notes:
        "Pre-ChatGPT Norwegian human book-review seed for C3 long translation condition; topic is review-related but not conference peer review.",
      post_title: candidate.post_title,
      score: candidate.score,
    });
  }

  const columns = [
    "seed_id",
    "length_bucket",
    "task_type",
    "seed_language",
    "source_platform",
    "source_url",
    "source_download_url",
    "source_id",
    "source_title",
    "author_or_signature",
    "created_utc",
    "license_notes",
    "word_count",
    "cleaned_text_path",
    "inclusion_notes",
    "post_title",
    "score",
  ];
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");
  await writeFile(OUTPUT_MANIFEST_PATH, `${csv}\n`);

  console.log(`selected ${rows.length} Bokelskere long candidate(s)`);
  console.log(`wrote ${path.relative(process.cwd(), OUTPUT_MANIFEST_PATH)}`);
  for (const row of rows) {
    console.log(`${row.seed_id}: ${row.word_count} words, ${row.created_utc}, ${row.source_title}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
