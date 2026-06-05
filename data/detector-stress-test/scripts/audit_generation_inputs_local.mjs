#!/usr/bin/env node

import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");

const GENERATED_SAMPLES_PATH = path.join(DATA_DIR, "generated-samples.csv");
const JOBS_PATH = path.join(DATA_DIR, "case-generation-jobs.jsonl");
const OPENREVIEW_CONTEXTS_PATH = path.join(DATA_DIR, "openreview-paper-contexts.csv");
const MANIFEST_PATH = path.join(DATA_DIR, "generation-input-local-manifest.csv");
const REPORT_PATH = path.join(DATA_DIR, "generation-input-local-audit.md");

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

async function exists(relativePath) {
  if (!relativePath || /^https?:\/\//i.test(relativePath)) return false;
  try {
    await stat(path.join(DATA_DIR, relativePath));
    return true;
  } catch {
    return false;
  }
}

function isRemotePath(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

async function readCsvIfExists(relativePath) {
  if (!(await exists(relativePath))) return [];
  return parseCsv(await readFile(path.join(DATA_DIR, relativePath), "utf8"));
}

function tally(rows, column) {
  return rows.reduce((acc, row) => {
    const key = row[column] || "";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function taskCardPathFor(sample) {
  return `texts/generated/task_cards/${sample.matched_set_id}.txt`;
}

function sourcePromptPathFor(sample) {
  return `texts/generated/source/${sample.sample_id}_source.txt`;
}

function addInput(rows, input) {
  rows.push({
    input_id: `${input.input_role}:${input.sample_id || input.matched_set_id || input.seed_id || input.job_id}`,
    sample_id: input.sample_id || "",
    case_id: input.case_id || "",
    length_bucket: input.length_bucket || "",
    matched_set_id: input.matched_set_id || "",
    input_role: input.input_role,
    path: input.path,
    expected_before_generation: input.expected_before_generation,
    availability_status: input.availability_status,
    notes: input.notes || "",
  });
}

const generatedSamples = parseCsv(await readFile(GENERATED_SAMPLES_PATH, "utf8"));
const jobs = (await readFile(JOBS_PATH, "utf8"))
  .split(/\n+/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const openReviewContexts = await readCsvIfExists("openreview-paper-contexts.csv");

const inputs = [];
const jobById = new Map(jobs.map((job) => [job.job_id, job]));
const jobIdsBySample = new Map();
for (const job of jobs) {
  const list = jobIdsBySample.get(job.sample_id) || [];
  list.push(job);
  jobIdsBySample.set(job.sample_id, list);
}

for (const sample of generatedSamples) {
  const taskCardPath = taskCardPathFor(sample);
  if (["N1", "N3", "C4", "N4"].includes(sample.case_id)) {
    addInput(inputs, {
      ...sample,
      input_role: "matched_task_card",
      path: taskCardPath,
      expected_before_generation: "yes",
      availability_status: (await exists(taskCardPath)) ? "local_ready" : "missing",
      notes: "Seed-derived task card stored locally; may include source URLs only as metadata.",
    });
  }

  if (sample.case_id === "C1") {
    addInput(inputs, {
      ...sample,
      input_role: "human_seed_source",
      path: sample.seed_text_path,
      expected_before_generation: "yes",
      availability_status: (await exists(sample.seed_text_path)) ? "local_ready" : "missing",
      notes: "C1 copies the local human seed directly.",
    });
  } else if (["C2", "C3", "N1", "C4"].includes(sample.case_id)) {
    addInput(inputs, {
      ...sample,
      input_role:
        sample.case_id === "C4"
          ? "human_collection_prompt"
          : sample.case_id === "N1"
            ? "ai_generation_prompt"
            : "ai_transformation_source",
      path: sample.source_text_path,
      expected_before_generation: "yes",
      availability_status: (await exists(sample.source_text_path)) ? "local_ready" : "missing",
      notes:
        sample.case_id === "C3"
          ? "Local non-English source text for AI translation."
          : "Local source/prompt file consumed by the generation or human collection step.",
    });
  } else if (sample.case_id === "N2") {
    addInput(inputs, {
      ...sample,
      input_role: "generated_dependency_n1",
      path: sample.source_text_path,
      expected_before_generation: "no",
      availability_status: "pending_generated_dependency",
      notes: "Produced by the matched N1 job during the generation run; stale local files are ignored unless input hashes match.",
    });
  } else if (sample.case_id === "N3") {
    const sourcePath = sourcePromptPathFor(sample);
    addInput(inputs, {
      ...sample,
      input_role: "ai_generation_prompt",
      path: sourcePath,
      expected_before_generation: "yes",
      availability_status: (await exists(sourcePath)) ? "local_ready" : "missing",
      notes: "Local prompt for Chinese generation before the generated translation dependency.",
    });
    addInput(inputs, {
      ...sample,
      input_role: "generated_dependency_n3_zh",
      path: sample.source_text_path,
      expected_before_generation: "no",
      availability_status: "pending_generated_dependency",
      notes: "Produced by the first N3 job during the generation run.",
    });
  } else if (sample.case_id === "N4") {
    const promptPath = sourcePromptPathFor(sample);
    addInput(inputs, {
      ...sample,
      input_role: "human_edit_prompt",
      path: promptPath,
      expected_before_generation: "yes",
      availability_status: (await exists(promptPath)) ? "local_ready" : "missing",
      notes: "Local prompt/task card for the human editor.",
    });
    addInput(inputs, {
      ...sample,
      input_role: "generated_dependency_n1_draft",
      path: sample.source_text_path,
      expected_before_generation: "no",
      availability_status: "pending_generated_dependency",
      notes: "Matched N1 AI draft to be created during generation, then edited by a human.",
    });
  }
}

for (const context of openReviewContexts) {
  addInput(inputs, {
    seed_id: context.seed_id,
    input_role: "openreview_paper_context",
    path: context.paper_context_text_path,
    expected_before_generation: "yes",
    availability_status: (await exists(context.paper_context_text_path)) ? "local_ready" : "missing",
    notes: "Cached OpenReview paper context; no OpenReview fetch is needed during generation.",
  });
}

for (const job of jobs) {
  const inputPath = job.input_text_path || "";
  const hasGeneratedDependency = (job.dependency_job_ids || []).length > 0;
  const local = await exists(inputPath);
  addInput(inputs, {
    job_id: job.job_id,
    sample_id: job.sample_id,
    case_id: job.case_id,
    input_role: "job_input",
    path: inputPath,
    expected_before_generation: hasGeneratedDependency ? "no" : "yes",
    availability_status: hasGeneratedDependency
      ? "pending_generated_dependency"
      : local
        ? "local_ready"
        : "missing",
    notes: hasGeneratedDependency
      ? `Depends on local job output(s): ${(job.dependency_job_ids || []).join(";")}`
      : "Root generation job input is a local file.",
  });
}

const columns = [
  "input_id",
  "sample_id",
  "case_id",
  "length_bucket",
  "matched_set_id",
  "input_role",
  "path",
  "expected_before_generation",
  "availability_status",
  "notes",
];
const csv = [
  columns.join(","),
  ...inputs.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
].join("\n");
await writeFile(MANIFEST_PATH, `${csv}\n`);

const blockingIssues = [];
for (const input of inputs) {
  if (input.expected_before_generation === "yes" && input.availability_status !== "local_ready") {
    blockingIssues.push(`${input.input_id}: expected local file missing at ${input.path}`);
  }
  if (isRemotePath(input.path)) {
    blockingIssues.push(`${input.input_id}: path is remote, not local: ${input.path}`);
  }
}

const rootJobs = jobs.filter((job) => !(job.dependency_job_ids || []).length);
const missingRootJobInputs = [];
for (const job of rootJobs) {
  if (!(await exists(job.input_text_path))) missingRootJobInputs.push(job.job_id);
}

const c3ShortMedium = generatedSamples.filter(
  (sample) =>
    sample.case_id === "C3" &&
    ["short", "medium"].includes(sample.length_bucket) &&
    /Project Gutenberg/i.test(sample.license_notes || ""),
);

const c3ShortMediumSourceNote = c3ShortMedium.length
  ? `- \`C3\` short and medium still include ${c3ShortMedium.length} Project Gutenberg fallback row(s). They are local and runnable, but should be replaced before a paper-ready paid run if strict task alignment is required.`
  : "- `C3` short and medium no longer use Project Gutenberg fallback rows. Current short translation sources are non-English Stack Exchange forum-style posts, and current medium translation sources are Spanish Wikiversity old-revision educational excerpts.";

const counts = {
  generated_samples: generatedSamples.length,
  generation_jobs: jobs.length,
  root_generation_jobs: rootJobs.length,
  local_input_manifest_rows: inputs.length,
  openreview_contexts: openReviewContexts.length,
  inputs_by_role: tally(inputs, "input_role"),
  inputs_by_status: tally(inputs, "availability_status"),
  blocking_issues: blockingIssues.length,
  missing_root_job_inputs: missingRootJobInputs.length,
  c3_short_medium_gutenberg_rows: c3ShortMedium.length,
};

const report = `# Local Generation Input Audit

Generated: ${new Date().toISOString()}

Status: **${blockingIssues.length ? "fail" : "pass"}**

This audit enforces the current rule: source collection may happen before the
data freeze, but the actual generation run must consume only local files under
\`data/detector-stress-test/\`. Source URLs inside local files are provenance
metadata, not fetch instructions.

## Counts

| Item | Count |
| --- | ---: |
| Generated sample rows | ${counts.generated_samples} |
| Generation jobs | ${counts.generation_jobs} |
| Root generation jobs requiring pre-existing local input | ${counts.root_generation_jobs} |
| Local input manifest rows | ${counts.local_input_manifest_rows} |
| Cached OpenReview paper contexts | ${counts.openreview_contexts} |
| Missing root job inputs | ${counts.missing_root_job_inputs} |
| Blocking local-input issues | ${counts.blocking_issues} |
| C3 short/medium Project Gutenberg fallback rows | ${counts.c3_short_medium_gutenberg_rows} |

## Input Status

| Status | Count |
| --- | ---: |
${Object.entries(counts.inputs_by_status)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([status, count]) => `| ${status} | ${count} |`)
  .join("\n")}

## Input Roles

| Role | Count |
| --- | ---: |
${Object.entries(counts.inputs_by_role)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([role, count]) => `| ${role} | ${count} |`)
  .join("\n")}

## Blocking Issues

${
  blockingIssues.length
    ? blockingIssues.map((issue) => `- ${issue}`).join("\n")
    : "- None. All inputs expected before generation are local files."
}

## Non-Blocking Design Notes

- Dependent inputs such as \`N2\`, the second \`N3\` translation step, and \`N4\`
  human edits are marked \`pending_generated_dependency\`; these are produced by
  earlier local jobs during the run, not fetched from remote sources.
${c3ShortMediumSourceNote}

Manifest: \`${path.relative(DATA_DIR, MANIFEST_PATH)}\`
`;
await writeFile(REPORT_PATH, report.endsWith("\n") ? report : `${report}\n`);

console.log(`status: ${blockingIssues.length ? "fail" : "pass"}`);
console.log(`local input manifest rows: ${inputs.length}`);
console.log(`root generation jobs: ${rootJobs.length}`);
console.log(`missing root job inputs: ${missingRootJobInputs.length}`);
console.log(`blocking issues: ${blockingIssues.length}`);
console.log(`wrote ${path.relative(process.cwd(), MANIFEST_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), REPORT_PATH)}`);

if (blockingIssues.length) {
  process.exitCode = 1;
}
