#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");

const GENERATED_SAMPLES_PATH = path.join(DATA_DIR, "generated-samples.csv");
const PILOT_SAMPLES_PATH = path.join(DATA_DIR, "samples-generated-pilot-proxy.csv");
const DASHBOARD_OUTPUTS_PATH = path.join(DATA_DIR, "detector_outputs_dashboard_smoke_combined.csv");

const PILOT_MANIFEST_PATH = path.join(DATA_DIR, "detector-run-pack-pilot-manifest.csv");
const PILOT_QUEUE_PATH = path.join(DATA_DIR, "detector-run-pack-pilot-queue.csv");
const MAIN_QUEUE_PATH = path.join(DATA_DIR, "detector-run-pack-main-queue.csv");
const RUN_PACK_MD_PATH = path.join(DATA_DIR, "detector-run-pack.md");
const RUN_PACK_JSON_PATH = path.join(DATA_DIR, "detector-run-pack-summary.json");

const DETECTORS = [
  {
    detector: "pangram",
    display_name: "Pangram API",
    run_mode: "api_after_approval",
  },
  {
    detector: "gptzero",
    display_name: "GPTZero API",
    run_mode: "api_after_approval",
  },
  {
    detector: "llm_claude_opus_4_8",
    display_name: "Claude Opus 4.8 LLM detector baseline",
    run_mode: "anthropic_api_after_approval",
  },
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

async function readCsv(relativeOrAbsolutePath) {
  return parseCsv(await readFile(relativeOrAbsolutePath, "utf8"));
}

async function readCsvIfExists(relativeOrAbsolutePath) {
  try {
    return await readCsv(relativeOrAbsolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
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

function byId(rows) {
  return new Map(rows.map((row) => [row.sample_id, row]));
}

function outputKey(detector, sampleId) {
  return `${detector}::${sampleId}`;
}

function readinessBlockers(sample) {
  const blockers = [];
  if (sample.sample_status === "synthetic_proxy_ready") {
    if (sample.case_id === "C4") {
      blockers.push("human_c4_sample_needed");
    } else if (sample.case_id === "N4") {
      blockers.push("live_ai_draft_and_human_n4_edit_needed");
    } else {
      blockers.push("live_generation_needed");
    }
  }
  if (sample.approval_required === "yes") {
    blockers.push("approval_required");
  }
  if (/review|check|confirm/i.test(sample.license_notes || "")) {
    blockers.push("source_rights_review_needed");
  }
  return [...new Set(blockers)];
}

function sampleReadiness(sample) {
  const blockers = readinessBlockers(sample);
  if (!blockers.length) return "ready";
  if (blockers.every((blocker) => blocker === "source_rights_review_needed")) {
    return "text_ready_rights_pending";
  }
  return "not_paper_ready";
}

function sampleManifestRow(sample) {
  const blockers = readinessBlockers(sample);
  return {
    sample_id: sample.sample_id,
    case_id: sample.case_id,
    case_name: sample.case_name,
    length_bucket: sample.length_bucket,
    task_type: sample.task_type,
    matched_set_id: sample.matched_set_id,
    prompt_id: sample.prompt_id,
    policy_label: sample.policy_label,
    origin_label: sample.origin_label,
    sample_status: sample.sample_status,
    sample_readiness: sampleReadiness(sample),
    paper_blockers: blockers.join(";"),
    word_count: sample.word_count,
    final_text_path: sample.final_text_path,
    source_text_path: sample.source_text_path,
  };
}

function queueRow(sample, detectorConfig, output, stage) {
  const blockers = readinessBlockers(sample);
  let nextAction = "run_after_approval";
  if (output) {
    nextAction = "already_completed_as_no_payment_smoke";
  } else if (blockers.some((blocker) => blocker === "human_c4_sample_needed")) {
    nextAction = "replace_c4_proxy_with_human_sample_before_paper_run";
  } else if (blockers.some((blocker) => blocker === "live_ai_draft_and_human_n4_edit_needed")) {
    nextAction = "replace_n4_proxy_with_live_ai_draft_and_human_edit_before_paper_run";
  } else if (blockers.some((blocker) => blocker === "live_generation_needed")) {
    nextAction = "replace_synthetic_proxy_with_live_generation_before_paper_run";
  } else if (blockers.some((blocker) => blocker === "source_rights_review_needed")) {
    nextAction = "resolve_source_rights_before_public_release_or_paper_archive";
  }

  return {
    run_stage: stage,
    detector: detectorConfig.detector,
    detector_display_name: detectorConfig.display_name,
    run_mode: detectorConfig.run_mode,
    sample_id: sample.sample_id,
    case_id: sample.case_id,
    case_name: sample.case_name,
    length_bucket: sample.length_bucket,
    task_type: sample.task_type,
    policy_label: sample.policy_label,
    origin_label: sample.origin_label,
    sample_status: sample.sample_status,
    sample_readiness: sampleReadiness(sample),
    existing_run_status: output ? output.request_status || "recorded" : "missing",
    existing_binary_prediction: output?.binary_prediction || "",
    existing_ai_probability: output?.ai_probability || "",
    paper_blockers: blockers.join(";"),
    next_action: nextAction,
    final_text_path: sample.final_text_path,
  };
}

function tally(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function detectorCoverageRows(queueRows) {
  return DETECTORS.map((detectorConfig) => {
    const rows = queueRows.filter((row) => row.detector === detectorConfig.detector);
    const covered = rows.filter((row) => row.existing_run_status !== "missing").length;
    return {
      detector: detectorConfig.detector,
      covered,
      missing: rows.length - covered,
      total: rows.length,
    };
  });
}

const generatedSamples = await readCsv(GENERATED_SAMPLES_PATH);
const pilotSamples = await readCsv(PILOT_SAMPLES_PATH);
const outputs = await readCsvIfExists(DASHBOARD_OUTPUTS_PATH);
const generatedBySampleId = byId(generatedSamples);

const outputsByDetectorAndSample = new Map(
  outputs.map((output) => [outputKey(output.detector, output.sample_id), output]),
);

const missingPilotRows = pilotSamples.filter((sample) => !generatedBySampleId.has(sample.sample_id));
if (missingPilotRows.length) {
  throw new Error(`Pilot samples missing from generated sample manifest: ${missingPilotRows.map((row) => row.sample_id).join(", ")}`);
}

const pilotManifest = pilotSamples.map(sampleManifestRow);
const pilotQueue = pilotSamples.flatMap((sample) =>
  DETECTORS.map((detectorConfig) =>
    queueRow(
      sample,
      detectorConfig,
      outputsByDetectorAndSample.get(outputKey(detectorConfig.detector, sample.sample_id)),
      "pilot_24_cell",
    ),
  ),
);
const mainQueue = generatedSamples.flatMap((sample) =>
  DETECTORS.map((detectorConfig) =>
    queueRow(
      sample,
      detectorConfig,
      outputsByDetectorAndSample.get(outputKey(detectorConfig.detector, sample.sample_id)),
      "main_240_sample",
    ),
  ),
);

await writeCsv(PILOT_MANIFEST_PATH, pilotManifest, [
  "sample_id",
  "case_id",
  "case_name",
  "length_bucket",
  "task_type",
  "matched_set_id",
  "prompt_id",
  "policy_label",
  "origin_label",
  "sample_status",
  "sample_readiness",
  "paper_blockers",
  "word_count",
  "final_text_path",
  "source_text_path",
]);

const queueColumns = [
  "run_stage",
  "detector",
  "detector_display_name",
  "run_mode",
  "sample_id",
  "case_id",
  "case_name",
  "length_bucket",
  "task_type",
  "policy_label",
  "origin_label",
  "sample_status",
  "sample_readiness",
  "existing_run_status",
  "existing_binary_prediction",
  "existing_ai_probability",
  "paper_blockers",
  "next_action",
  "final_text_path",
];
await writeCsv(PILOT_QUEUE_PATH, pilotQueue, queueColumns);
await writeCsv(MAIN_QUEUE_PATH, mainQueue, queueColumns);

const summary = {
  generated_at_utc: new Date().toISOString(),
  detectors: DETECTORS.map((detectorConfig) => detectorConfig.detector),
  counts: {
    pilot_samples: pilotManifest.length,
    pilot_queue_rows: pilotQueue.length,
    main_samples: generatedSamples.length,
    main_queue_rows: mainQueue.length,
    pilot_sample_readiness: tally(pilotManifest, "sample_readiness"),
    main_sample_status: tally(generatedSamples, "sample_status"),
    main_policy_labels: tally(generatedSamples, "policy_label"),
  },
  pilot_detector_coverage: detectorCoverageRows(pilotQueue),
  main_detector_coverage: detectorCoverageRows(mainQueue),
  files: {
    pilot_manifest: path.relative(DATA_DIR, PILOT_MANIFEST_PATH),
    pilot_queue: path.relative(DATA_DIR, PILOT_QUEUE_PATH),
    main_queue: path.relative(DATA_DIR, MAIN_QUEUE_PATH),
    markdown: path.relative(DATA_DIR, RUN_PACK_MD_PATH),
    json: path.relative(DATA_DIR, RUN_PACK_JSON_PATH),
  },
};

await writeFile(RUN_PACK_JSON_PATH, `${JSON.stringify(summary, null, 2)}\n`);

const coverageTable = detectorCoverageRows(pilotQueue)
  .map((row) => `| ${row.detector} | ${row.covered}/${row.total} | ${row.missing}/${row.total} |`)
  .join("\n");

const readinessTable = Object.entries(summary.counts.pilot_sample_readiness)
  .map(([status, count]) => `| ${status} | ${count} |`)
  .join("\n");

const runPackMarkdown = `# Detector Run Pack

Generated: ${summary.generated_at_utc}

This run pack turns the current detector stress-test artifacts into execution
queues. It does not call detector APIs and it does not make proxy samples
paper-ready. Rows marked \`synthetic_proxy_ready\` are still suitable only for
pipeline smoke testing until live generation or human collection replaces them.

## Files

- \`detector-run-pack-pilot-manifest.csv\`: the 24 one-per-case/length pilot
  samples.
- \`detector-run-pack-pilot-queue.csv\`: 72 detector/sample rows for the 24-cell
  pilot across Pangram, GPTZero, and the Claude Opus 4.8 LLM baseline.
- \`detector-run-pack-main-queue.csv\`: 720 detector/sample rows for the
  240-sample main batch across the same three detectors.
- \`detector-run-pack-summary.json\`: machine-readable counts and coverage.

## Pilot Sample Readiness

| Readiness | Count |
| --- | ---: |
${readinessTable}

## Current Pilot Detector Coverage

| Detector | Already covered | Missing |
| --- | ---: | ---: |
${coverageTable}

## How To Use

1. Use the pilot manifest to inspect the 24 intended case/length cells.
2. Use the pilot queue to track the selected v1 API detector/sample pairs.
   Historical dashboard smoke tests are documented separately and do not count
   as paper-ready API coverage.
3. For paper-ready runs, first replace synthetic proxy samples:
   - C2/C3/N1/N2/N3 need approved live generation outputs.
   - C4 needs human-written AI-style samples.
   - N4 needs approved live AI drafts plus human light-edited final texts.
4. Run detectors only after explicit capacity/spend approval.
5. Store raw detector responses under \`outputs/raw/<detector>/\` and normalize
   into the detector-output schema before aggregating confusion matrices.

## Current Interpretation

The execution queue is ready, but the evaluation evidence is not yet
paper-ready. The largest blockers are still live generation, C4 human
collection, N4 human edit collection, and approved detector capacity.
`;

await writeFile(RUN_PACK_MD_PATH, runPackMarkdown);

console.log(`pilot samples: ${pilotManifest.length}`);
console.log(`pilot queue rows: ${pilotQueue.length}`);
console.log(`main queue rows: ${mainQueue.length}`);
for (const row of detectorCoverageRows(pilotQueue)) {
  console.log(`${row.detector}: ${row.covered}/${row.total} pilot rows covered`);
}
console.log(`wrote ${path.relative(process.cwd(), PILOT_MANIFEST_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), PILOT_QUEUE_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), MAIN_QUEUE_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), RUN_PACK_MD_PATH)}`);
