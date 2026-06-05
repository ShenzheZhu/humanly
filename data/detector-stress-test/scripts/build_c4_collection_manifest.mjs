#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const GENERATED_SAMPLES_PATH = path.join(DATA_DIR, "generated-samples.csv");
const MANIFEST_PATH = path.join(DATA_DIR, "c4-human-collection-manifest.csv");
const HUMAN_C4_DIR = path.join(DATA_DIR, "texts", "human_c4");
const README_PATH = path.join(HUMAN_C4_DIR, "README.md");

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

function wordBounds(lengthBucket) {
  if (lengthBucket === "long") return { target_min_words: 1000, target_max_words: 1500 };
  if (lengthBucket === "medium") return { target_min_words: 400, target_max_words: 600 };
  return { target_min_words: 120, target_max_words: 180 };
}

async function writeCsv(filePath, rows, columns) {
  await writeFile(
    filePath,
    `${[columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join(
      "\n",
    )}\n`,
  );
}

const generatedSamples = parseCsv(await readFile(GENERATED_SAMPLES_PATH, "utf8"));
const c4Rows = generatedSamples
  .filter((row) => row.case_id === "C4")
  .sort((left, right) => {
    const lengthOrder = { short: 0, medium: 1, long: 2 };
    return (
      lengthOrder[left.length_bucket] - lengthOrder[right.length_bucket] ||
      left.sample_id.localeCompare(right.sample_id)
    );
  })
  .map((row) => ({
    sample_id: row.sample_id,
    case_id: row.case_id,
    case_name: row.case_name,
    length_bucket: row.length_bucket,
    task_type: row.task_type,
    matched_set_id: row.matched_set_id,
    prompt_id: row.prompt_id,
    ...wordBounds(row.length_bucket),
    writer_input_path: `texts/human_c4/${row.sample_id}.txt`,
    source_prompt_path: row.source_text_path,
    final_text_path: row.final_text_path,
    current_sample_status: row.sample_status,
    current_origin_label: row.origin_label,
    collection_status: "not_collected",
  }));

await writeCsv(MANIFEST_PATH, c4Rows, [
  "sample_id",
  "case_id",
  "case_name",
  "length_bucket",
  "task_type",
  "matched_set_id",
  "prompt_id",
  "target_min_words",
  "target_max_words",
  "writer_input_path",
  "source_prompt_path",
  "final_text_path",
  "current_sample_status",
  "current_origin_label",
  "collection_status",
]);

await mkdir(HUMAN_C4_DIR, { recursive: true });
await writeFile(
  README_PATH,
  `# Human C4 Sample Drop Folder

This folder is for collected C4 human-written AI-style samples.

Do not commit personal information, consent notes, payment notes, or raw
participant metadata here. Store that metadata privately outside the public
dataset.

Create exactly these files when samples are collected:

- \`c4_short_01.txt\` through \`c4_short_10.txt\`
- \`c4_medium_01.txt\` through \`c4_medium_10.txt\`
- \`c4_long_01.txt\` through \`c4_long_10.txt\`

Use \`../../c4-human-collection-manifest.csv\` to map each file to its length
bucket, task type, source prompt, and final destination path.

After files are collected, import them with:

\`\`\`bash
node data/detector-stress-test/scripts/import_c4_human_samples.mjs --force
node data/detector-stress-test/scripts/build_detector_run_pack.mjs
node data/detector-stress-test/scripts/audit_paper_ready_gates.mjs
node data/detector-stress-test/scripts/validate_dataset.mjs
\`\`\`
`,
);

console.log(`C4 collection rows: ${c4Rows.length}`);
console.log(`wrote ${path.relative(process.cwd(), MANIFEST_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), README_PATH)}`);
