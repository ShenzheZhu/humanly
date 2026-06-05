#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const GENERATED_SAMPLES_PATH = path.join(DATA_DIR, "generated-samples.csv");
const MANIFEST_PATH = path.join(DATA_DIR, "n4-human-edit-manifest.csv");
const HUMAN_N4_DIR = path.join(DATA_DIR, "texts", "human_n4_edits");
const README_PATH = path.join(HUMAN_N4_DIR, "README.md");

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

async function exists(relativePath) {
  try {
    await stat(path.join(DATA_DIR, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function writeCsv(filePath, rows, columns) {
  await writeFile(
    filePath,
    `${[columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join(
      "\n",
    )}\n`,
  );
}

const lengthOrder = { short: 0, medium: 1, long: 2 };
const generatedSamples = parseCsv(await readFile(GENERATED_SAMPLES_PATH, "utf8"));
const n4Rows = await Promise.all(
  generatedSamples
    .filter((row) => row.case_id === "N4")
    .sort(
      (left, right) =>
        lengthOrder[left.length_bucket] - lengthOrder[right.length_bucket] ||
        left.sample_id.localeCompare(right.sample_id),
    )
    .map(async (row) => {
      const aiPromptPath = `texts/generated/source/${row.sample_id}_source.txt`;
      return {
        sample_id: row.sample_id,
        case_id: row.case_id,
        case_name: row.case_name,
        length_bucket: row.length_bucket,
        task_type: row.task_type,
        matched_set_id: row.matched_set_id,
        prompt_id: row.prompt_id,
        ...wordBounds(row.length_bucket),
        ai_prompt_path: aiPromptPath,
        ai_draft_path: row.source_text_path,
        ai_draft_exists: (await exists(row.source_text_path)) ? "yes" : "no",
        editor_input_path: `texts/human_n4_edits/${row.sample_id}.txt`,
        final_text_path: row.final_text_path,
        current_sample_status: row.sample_status,
        current_origin_label: row.origin_label,
        collection_status: "not_collected",
      };
    }),
);

await writeCsv(MANIFEST_PATH, n4Rows, [
  "sample_id",
  "case_id",
  "case_name",
  "length_bucket",
  "task_type",
  "matched_set_id",
  "prompt_id",
  "target_min_words",
  "target_max_words",
  "ai_prompt_path",
  "ai_draft_path",
  "ai_draft_exists",
  "editor_input_path",
  "final_text_path",
  "current_sample_status",
  "current_origin_label",
  "collection_status",
]);

await mkdir(HUMAN_N4_DIR, { recursive: true });
await writeFile(
  README_PATH,
  `# Human N4 Edit Drop Folder

This folder is for collected N4 human-edited AI-draft samples.

N4 is a non-compliant / mixed-AI-origin condition: the substantive draft comes
from AI, and a human performs light local editing. Do not store personal
information, consent notes, payment notes, or raw participant metadata here.
Keep that metadata privately outside the public dataset.

Create exactly these files when edits are collected:

- \`n4_short_01.txt\` through \`n4_short_10.txt\`
- \`n4_medium_01.txt\` through \`n4_medium_10.txt\`
- \`n4_long_01.txt\` through \`n4_long_10.txt\`

Use \`../../n4-human-edit-manifest.csv\` to map each file to its AI draft,
length bucket, task type, and final destination path.

After files are collected, import them with:

\`\`\`bash
node data/detector-stress-test/scripts/import_n4_human_edits.mjs --force
node data/detector-stress-test/scripts/build_case_generation_jobs.mjs
node data/detector-stress-test/scripts/build_detector_run_pack.mjs
node data/detector-stress-test/scripts/audit_paper_ready_gates.mjs
node data/detector-stress-test/scripts/validate_dataset.mjs
\`\`\`
`,
);

console.log(`N4 human edit rows: ${n4Rows.length}`);
console.log(`wrote ${path.relative(process.cwd(), MANIFEST_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), README_PATH)}`);
