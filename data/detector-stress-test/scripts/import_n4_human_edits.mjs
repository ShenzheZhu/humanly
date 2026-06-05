#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const GENERATED_SAMPLES_PATH = path.join(DATA_DIR, "generated-samples.csv");
const DEFAULT_INPUT_DIR = path.join(DATA_DIR, "texts", "human_n4_edits");
const inputDirArg = process.argv.find((arg) => arg.startsWith("--input-dir="))?.slice("--input-dir=".length);
const INPUT_DIR = path.resolve(process.cwd(), inputDirArg || DEFAULT_INPUT_DIR);
const RESULTS_PATH = path.join(DATA_DIR, "n4-human-edit-import-results.csv");
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
  const latinLikeWords = text.match(/\b[\p{Script=Latin}\p{M}\p{N}’'-]+\b/gu) || [];
  const cjkChars =
    text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) || [];
  return latinLikeWords.length + Math.ceil(cjkChars.length / 2);
}

function lengthBounds(bucket) {
  if (bucket === "long") return { min: 900, max: 1700 };
  if (bucket === "medium") return { min: 320, max: 750 };
  return { min: 80, max: 260 };
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeRelative(relativePath, text) {
  const absolutePath = path.join(DATA_DIR, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, text.endsWith("\n") ? text : `${text}\n`);
}

const generatedSamples = parseCsv(await readFile(GENERATED_SAMPLES_PATH, "utf8"));
const n4Rows = generatedSamples
  .filter((row) => row.case_id === "N4")
  .sort((left, right) => left.sample_id.localeCompare(right.sample_id));

const resultRows = [];
let imported = 0;
let errors = 0;

for (const row of n4Rows) {
  const inputPath = path.join(INPUT_DIR, `${row.sample_id}.txt`);
  const outputPath = path.join(DATA_DIR, row.final_text_path);
  const aiDraftPath = path.join(DATA_DIR, row.source_text_path);
  if (!(await exists(aiDraftPath))) {
    resultRows.push({
      sample_id: row.sample_id,
      input_path: path.relative(DATA_DIR, inputPath),
      final_text_path: row.final_text_path,
      word_count: "",
      status: "missing_ai_draft",
      notes: "expected N4 AI draft file is missing",
    });
    errors += 1;
    continue;
  }
  if (!(await exists(inputPath))) {
    resultRows.push({
      sample_id: row.sample_id,
      input_path: path.relative(DATA_DIR, inputPath),
      final_text_path: row.final_text_path,
      word_count: "",
      status: "missing_input",
      notes: "expected N4 human-edited text file is missing",
    });
    errors += 1;
    continue;
  }
  if (!force && await exists(outputPath)) {
    const existing = await readFile(outputPath, "utf8");
    resultRows.push({
      sample_id: row.sample_id,
      input_path: path.relative(DATA_DIR, inputPath),
      final_text_path: row.final_text_path,
      word_count: wordCount(existing),
      status: "already_exists",
      notes: "existing final text preserved; pass --force to overwrite",
    });
    errors += 1;
    continue;
  }

  const text = (await readFile(inputPath, "utf8")).trim();
  const wc = wordCount(text);
  const bounds = lengthBounds(row.length_bucket);
  const lengthNote =
    wc < bounds.min || wc > bounds.max
      ? `word count ${wc} is outside recommended ${bounds.min}-${bounds.max} range`
      : "";

  await writeRelative(row.final_text_path, text);
  await writeRelative(
    `${row.final_text_path}.meta.json`,
    JSON.stringify(
      {
        sample_id: row.sample_id,
        case_id: row.case_id,
        generation_mode: "human_edited_ai_draft",
        source_path: path.relative(DATA_DIR, inputPath),
        ai_draft_path: row.source_text_path,
        imported_at_utc: new Date().toISOString(),
        notes:
          "Human light edit of an AI-origin draft imported for detector stress-test use. Consent/editor confirmation metadata must be tracked separately.",
      },
      null,
      2,
    ),
  );
  resultRows.push({
    sample_id: row.sample_id,
    input_path: path.relative(DATA_DIR, inputPath),
    final_text_path: row.final_text_path,
    word_count: wc,
    status: lengthNote ? "imported_with_length_warning" : "imported",
    notes: lengthNote,
  });
  imported += 1;
}

const columns = ["sample_id", "input_path", "final_text_path", "word_count", "status", "notes"];
await writeFile(
  RESULTS_PATH,
  `${[
    columns.join(","),
    ...resultRows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n")}\n`,
);

console.log(`N4 rows expected: ${n4Rows.length}`);
console.log(`imported: ${imported}`);
console.log(`blocking rows: ${errors}`);
console.log(`wrote ${path.relative(process.cwd(), RESULTS_PATH)}`);
if (errors > 0) process.exit(1);
