#!/usr/bin/env node

import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const AUDIT_MD_PATH = path.join(DATA_DIR, "dataset-audit.md");
const AUDIT_JSON_PATH = path.join(DATA_DIR, "dataset-audit.json");

const FILES = {
  humanSeeds: "human-seeds.csv",
  translationSeeds: "translation-seeds.csv",
  generatedSamples: "generated-samples.csv",
  proxySamples: "samples-generated-proxy.csv",
  pilotProxySamples: "samples-generated-pilot-proxy.csv",
  generationJobs: "case-generation-jobs.jsonl",
  generationResults: "case-generation-job-results.csv",
  detectorOutputs: "detector_outputs_local_heuristic_proxy.csv",
  confusion: "confusion_by_case_local_heuristic_proxy.csv",
  aggregatedConfusion: "confusion_by_case_aggregated.csv",
};
const OPTIONAL_FILES = {
  pangramDashboardOutputs: "detector_outputs_pangram_free_dashboard_smoke.csv",
  copyleaksDashboardOutputs: "detector_outputs_copyleaks_free_dashboard_smoke.csv",
  gptzeroDashboardOutputs: "detector_outputs_gptzero_free_dashboard_smoke.csv",
  combinedDashboardSamples: "samples-dashboard-smoke-combined.csv",
  combinedDashboardOutputs: "detector_outputs_dashboard_smoke_combined.csv",
  combinedDashboardConfusion: "confusion_by_case_dashboard_smoke_combined.csv",
  detectorCoverageSummary: "detector-coverage-summary.csv",
  paperReadyGateAudit: "paper-ready-gate-audit.json",
  detectorRunPackPilotManifest: "detector-run-pack-pilot-manifest.csv",
  detectorRunPackPilotQueue: "detector-run-pack-pilot-queue.csv",
  detectorRunPackMainQueue: "detector-run-pack-main-queue.csv",
  detectorRunPackSummary: "detector-run-pack-summary.json",
  c4HumanCollectionManifest: "c4-human-collection-manifest.csv",
  n4HumanEditManifest: "n4-human-edit-manifest.csv",
  detectorVendorCostEstimate: "detector-vendor-cost-estimate.csv",
  prolificC4WritingItems: "prolific/c4-writing-items.csv",
  prolificC4WritingBudget: "prolific/c4-writing-budget-estimate.csv",
  prolificN4EditingItems: "prolific/n4-editing-items.csv",
  prolificN4EditingBudget: "prolific/n4-editing-budget-estimate.csv",
};

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

async function readCsv(relativePath) {
  return parseCsv(await readFile(path.join(DATA_DIR, relativePath), "utf8"));
}

async function readCsvIfExists(relativePath) {
  if (!(await exists(relativePath))) return [];
  return readCsv(relativePath);
}

async function exists(relativePath) {
  try {
    await stat(path.join(DATA_DIR, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(relativePath) {
  if (!(await exists(relativePath))) return null;
  return JSON.parse(await readFile(path.join(DATA_DIR, relativePath), "utf8"));
}

function wordCount(text) {
  const latinLikeWords = text.match(/\b[\p{Script=Latin}\p{M}\p{N}’'-]+\b/gu) || [];
  const cjkChars =
    text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) || [];
  return latinLikeWords.length + Math.ceil(cjkChars.length / 2);
}

function tally(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function addIssue(issues, severity, message, detail = "") {
  issues.push({ severity, message, detail });
}

function expectEqual(issues, actual, expected, message) {
  if (actual !== expected) {
    addIssue(issues, "error", message, `expected ${expected}, got ${actual}`);
  }
}

const issues = [];
const audit = {
  generated_at_utc: new Date().toISOString(),
  files: {},
  counts: {},
  issues,
};

for (const [name, relativePath] of Object.entries(FILES)) {
  audit.files[name] = {
    path: relativePath,
    exists: await exists(relativePath),
  };
  if (!audit.files[name].exists) addIssue(issues, "error", `Missing required file ${relativePath}`);
}
for (const [name, relativePath] of Object.entries(OPTIONAL_FILES)) {
  audit.files[name] = {
    path: relativePath,
    exists: await exists(relativePath),
    optional: true,
  };
}

const humanSeeds = await readCsv(FILES.humanSeeds);
const translationSeeds = await readCsv(FILES.translationSeeds);
const generatedSamples = await readCsv(FILES.generatedSamples);
const proxySamples = await readCsv(FILES.proxySamples);
const pilotProxySamples = await readCsv(FILES.pilotProxySamples);
const generationJobs = (await readFile(path.join(DATA_DIR, FILES.generationJobs), "utf8"))
  .split(/\n+/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const generationResults = await readCsv(FILES.generationResults);
const detectorOutputs = await readCsv(FILES.detectorOutputs);
const confusionRows = await readCsv(FILES.confusion);
const aggregatedConfusionRows = await readCsv(FILES.aggregatedConfusion);
const pangramDashboardOutputs = await readCsvIfExists(OPTIONAL_FILES.pangramDashboardOutputs);
const copyleaksDashboardOutputs = await readCsvIfExists(OPTIONAL_FILES.copyleaksDashboardOutputs);
const gptzeroDashboardOutputs = await readCsvIfExists(OPTIONAL_FILES.gptzeroDashboardOutputs);
const combinedDashboardSamples = await readCsvIfExists(OPTIONAL_FILES.combinedDashboardSamples);
const combinedDashboardOutputs = await readCsvIfExists(OPTIONAL_FILES.combinedDashboardOutputs);
const combinedDashboardConfusion = await readCsvIfExists(OPTIONAL_FILES.combinedDashboardConfusion);
const detectorCoverageSummary = await readCsvIfExists(OPTIONAL_FILES.detectorCoverageSummary);
const paperReadyGateAudit = await readJsonIfExists(OPTIONAL_FILES.paperReadyGateAudit);
const detectorRunPackPilotManifest = await readCsvIfExists(OPTIONAL_FILES.detectorRunPackPilotManifest);
const detectorRunPackPilotQueue = await readCsvIfExists(OPTIONAL_FILES.detectorRunPackPilotQueue);
const detectorRunPackMainQueue = await readCsvIfExists(OPTIONAL_FILES.detectorRunPackMainQueue);
const detectorRunPackSummary = await readJsonIfExists(OPTIONAL_FILES.detectorRunPackSummary);
const c4HumanCollectionManifest = await readCsvIfExists(OPTIONAL_FILES.c4HumanCollectionManifest);
const n4HumanEditManifest = await readCsvIfExists(OPTIONAL_FILES.n4HumanEditManifest);
const detectorVendorCostEstimate = await readCsvIfExists(OPTIONAL_FILES.detectorVendorCostEstimate);
const prolificC4WritingItems = await readCsvIfExists(OPTIONAL_FILES.prolificC4WritingItems);
const prolificC4WritingBudget = await readCsvIfExists(OPTIONAL_FILES.prolificC4WritingBudget);
const prolificN4EditingItems = await readCsvIfExists(OPTIONAL_FILES.prolificN4EditingItems);
const prolificN4EditingBudget = await readCsvIfExists(OPTIONAL_FILES.prolificN4EditingBudget);

audit.counts = {
  humanSeeds: humanSeeds.length,
  translationSeeds: translationSeeds.length,
  generatedSamples: generatedSamples.length,
  proxySamples: proxySamples.length,
  pilotProxySamples: pilotProxySamples.length,
  generationJobs: generationJobs.length,
  generationResults: generationResults.length,
  detectorOutputs: detectorOutputs.length,
  confusionRows: confusionRows.length,
  aggregatedConfusionRows: aggregatedConfusionRows.length,
  pangramDashboardOutputs: pangramDashboardOutputs.length,
  copyleaksDashboardOutputs: copyleaksDashboardOutputs.length,
  gptzeroDashboardOutputs: gptzeroDashboardOutputs.length,
  combinedDashboardSamples: combinedDashboardSamples.length,
  combinedDashboardOutputs: combinedDashboardOutputs.length,
  combinedDashboardConfusionRows: combinedDashboardConfusion.length,
  detectorCoverageSummaryRows: detectorCoverageSummary.length,
  paperReadyGateStatus: paperReadyGateAudit?.overall_status || "",
  detectorRunPackPilotManifestRows: detectorRunPackPilotManifest.length,
  detectorRunPackPilotQueueRows: detectorRunPackPilotQueue.length,
  detectorRunPackMainQueueRows: detectorRunPackMainQueue.length,
  detectorRunPackSummaryGeneratedAt: detectorRunPackSummary?.generated_at_utc || "",
  c4HumanCollectionManifestRows: c4HumanCollectionManifest.length,
  n4HumanEditManifestRows: n4HumanEditManifest.length,
  detectorVendorCostEstimateRows: detectorVendorCostEstimate.length,
  prolificC4WritingItemRows: prolificC4WritingItems.length,
  prolificC4WritingBudgetRows: prolificC4WritingBudget.length,
  prolificN4EditingItemRows: prolificN4EditingItems.length,
  prolificN4EditingBudgetRows: prolificN4EditingBudget.length,
  generatedByCase: tally(generatedSamples, "case_id"),
  generatedByLength: tally(generatedSamples, "length_bucket"),
  generatedByStatus: tally(generatedSamples, "sample_status"),
  generatedByPolicy: tally(generatedSamples, "policy_label"),
  generatedByOrigin: tally(generatedSamples, "origin_label"),
};

expectEqual(issues, humanSeeds.length, 30, "English human seed count should be 30");
expectEqual(issues, translationSeeds.length, 30, "Non-English translation seed count should be 30");
expectEqual(issues, generatedSamples.length, 240, "Generated sample manifest should have 240 rows");
expectEqual(issues, proxySamples.length, 240, "Proxy sample export should have 240 rows");
expectEqual(issues, pilotProxySamples.length, 24, "Pilot proxy sample export should have 24 rows");
expectEqual(issues, generationJobs.length, 180, "Generation job queue should have 180 rows");
expectEqual(issues, generationResults.length, 180, "Generation job result file should have 180 rows");
expectEqual(issues, detectorOutputs.length, 240, "Local detector output should have 240 rows");
expectEqual(issues, confusionRows.length, 24, "Confusion table should have 24 case-by-length rows");
expectEqual(
  issues,
  aggregatedConfusionRows.length,
  24,
  "Aggregated confusion table should have 24 detector/case/length rows for one detector",
);
if (combinedDashboardOutputs.length || combinedDashboardSamples.length || combinedDashboardConfusion.length) {
  expectEqual(issues, pangramDashboardOutputs.length, 4, "Pangram dashboard smoke should have 4 output rows");
  expectEqual(issues, copyleaksDashboardOutputs.length, 5, "Copyleaks dashboard smoke should have 5 output rows");
  expectEqual(issues, gptzeroDashboardOutputs.length, 1, "GPTZero dashboard smoke should have 1 output row");
  expectEqual(issues, combinedDashboardSamples.length, 5, "Combined dashboard smoke should have 5 sample rows");
  expectEqual(issues, combinedDashboardOutputs.length, 10, "Combined dashboard smoke should have 10 detector rows");
  expectEqual(
    issues,
    combinedDashboardConfusion.length,
    15,
    "Combined dashboard smoke confusion should have 15 detector/case/length rows",
  );
  expectEqual(
    issues,
    detectorCoverageSummary.length,
    72,
    "Detector coverage summary should have 72 detector/case/length rows for 3 detectors",
  );
  if (paperReadyGateAudit?.overall_status !== "not_ready") {
    addIssue(
      issues,
      "error",
      "Paper-ready gate audit should currently be not_ready",
      `got ${paperReadyGateAudit?.overall_status || "missing"}`,
    );
  }
}
if (detectorRunPackPilotManifest.length || detectorRunPackPilotQueue.length || detectorRunPackMainQueue.length) {
  expectEqual(
    issues,
    detectorRunPackPilotManifest.length,
    24,
    "Detector run-pack pilot manifest should have 24 sample rows",
  );
  expectEqual(
    issues,
    detectorRunPackPilotQueue.length,
    72,
    "Detector run-pack pilot queue should have 72 detector/sample rows",
  );
  expectEqual(
    issues,
    detectorRunPackMainQueue.length,
    720,
    "Detector run-pack main queue should have 720 detector/sample rows",
  );
}
if (c4HumanCollectionManifest.length) {
  expectEqual(
    issues,
    c4HumanCollectionManifest.length,
    30,
    "C4 human collection manifest should have 30 target sample rows",
  );
}
if (n4HumanEditManifest.length) {
  expectEqual(
    issues,
    n4HumanEditManifest.length,
    30,
    "N4 human edit manifest should have 30 target sample rows",
  );
}
if (detectorVendorCostEstimate.length) {
  expectEqual(
    issues,
    detectorVendorCostEstimate.length,
    9,
    "Detector vendor cost estimate should have 9 rows: 3 cohorts x 3 detector systems",
  );
}
if (prolificC4WritingItems.length || prolificC4WritingBudget.length) {
  expectEqual(issues, prolificC4WritingItems.length, 30, "Prolific C4 writing items should have 30 rows");
  expectEqual(issues, prolificC4WritingBudget.length, 3, "Prolific C4 writing budget should have 3 length rows");
}
if (prolificN4EditingItems.length || prolificN4EditingBudget.length) {
  expectEqual(issues, prolificN4EditingItems.length, 30, "Prolific N4 editing items should have 30 rows");
  expectEqual(issues, prolificN4EditingBudget.length, 3, "Prolific N4 editing budget should have 3 length rows");
}

for (const caseId of ["C1", "C2", "C3", "C4", "N1", "N2", "N3", "N4"]) {
  expectEqual(issues, audit.counts.generatedByCase[caseId] || 0, 30, `${caseId} should have 30 samples`);
}

for (const lengthBucket of ["short", "medium", "long"]) {
  expectEqual(
    issues,
    audit.counts.generatedByLength[lengthBucket] || 0,
    80,
    `${lengthBucket} should have 80 generated samples`,
  );
}

const pilotCells = new Map();
for (const sample of pilotProxySamples) {
  const key = `${sample.case_id}::${sample.length_bucket}`;
  pilotCells.set(key, (pilotCells.get(key) || 0) + 1);
}
for (const caseId of ["C1", "C2", "C3", "C4", "N1", "N2", "N3", "N4"]) {
  for (const lengthBucket of ["short", "medium", "long"]) {
    expectEqual(
      issues,
      pilotCells.get(`${caseId}::${lengthBucket}`) || 0,
      1,
      `Pilot proxy subset should have one ${caseId}/${lengthBucket} sample`,
    );
  }
}

const sampleIds = new Set();
for (const sample of generatedSamples) {
  if (sampleIds.has(sample.sample_id)) {
    addIssue(issues, "error", "Duplicate sample_id", sample.sample_id);
  }
  sampleIds.add(sample.sample_id);

  if (!(await exists(sample.final_text_path))) {
    addIssue(issues, "error", "Missing final text", sample.final_text_path);
    continue;
  }

  const finalText = await readFile(path.join(DATA_DIR, sample.final_text_path), "utf8");
  const actualWordCount = wordCount(finalText);
  const manifestWordCount = Number(sample.word_count || 0);
  if (actualWordCount !== manifestWordCount) {
    addIssue(
      issues,
      "error",
      "Manifest word_count does not match final text",
      `${sample.sample_id}: manifest ${manifestWordCount}, actual ${actualWordCount}`,
    );
  }

  const meta = await readJsonIfExists(`${sample.final_text_path}.meta.json`);
  if (sample.sample_status === "synthetic_proxy_ready" && meta?.generation_mode !== "synthetic_proxy") {
    addIssue(issues, "error", "Synthetic proxy sample missing synthetic_proxy metadata", sample.sample_id);
  }
  if (sample.sample_status === "ready" && meta?.generation_mode === "synthetic_proxy") {
    addIssue(issues, "error", "Paper-ready sample should not have synthetic proxy metadata", sample.sample_id);
  }
  if (sample.case_id === "C4" && sample.origin_label === "human_origin" && sample.sample_status !== "ready") {
    addIssue(issues, "error", "C4 human_origin row is not ready", sample.sample_id);
  }
  if (sample.case_id === "C4" && sample.sample_status === "synthetic_proxy_ready") {
    if (sample.policy_label !== "compliant_proxy" || sample.origin_label !== "synthetic_proxy_origin") {
      addIssue(issues, "error", "C4 proxy row must use proxy labels", sample.sample_id);
    }
  }
  if (sample.case_id === "N4" && sample.sample_status === "ready") {
    if (meta?.generation_mode !== "human_edited_ai_draft") {
      addIssue(issues, "error", "N4 ready row must have human_edited_ai_draft metadata", sample.sample_id);
    }
    const draftMeta = await readJsonIfExists(`${sample.source_text_path}.meta.json`);
    if (!draftMeta || draftMeta.generation_mode === "synthetic_proxy") {
      addIssue(issues, "error", "N4 ready row must have live/non-proxy AI draft metadata", sample.sample_id);
    }
    if (sample.policy_label !== "non_compliant" || sample.origin_label !== "mixed_ai_origin") {
      addIssue(issues, "error", "N4 human-edited row must stay non_compliant mixed_ai_origin", sample.sample_id);
    }
  }
}

const outputSampleIds = new Set(detectorOutputs.map((row) => row.sample_id));
for (const sample of proxySamples) {
  if (!outputSampleIds.has(sample.sample_id)) {
    addIssue(issues, "error", "Missing detector output for proxy sample", sample.sample_id);
  }
}

const jobIds = new Set(generationJobs.map((job) => job.job_id));
for (const job of generationJobs) {
  for (const dependency of job.dependency_job_ids || []) {
    if (!jobIds.has(dependency)) {
      addIssue(issues, "error", "Generation job references missing dependency", `${job.job_id} -> ${dependency}`);
    }
  }
  if (!(await exists(job.output_text_path))) {
    addIssue(issues, "error", "Generation job output path missing", `${job.job_id}: ${job.output_text_path}`);
  }
}

const fatalCount = issues.filter((issue) => issue.severity === "error").length;
audit.status = fatalCount === 0 ? "pass" : "fail";

const markdown = `# Detector Stress Test Dataset Audit

Generated: ${audit.generated_at_utc}

Status: **${audit.status}**

## Counts

| Item | Count |
| --- | ---: |
| English human seeds | ${audit.counts.humanSeeds} |
| Non-English translation seeds | ${audit.counts.translationSeeds} |
| Generated samples | ${audit.counts.generatedSamples} |
| Proxy sample export | ${audit.counts.proxySamples} |
| Pilot proxy sample export | ${audit.counts.pilotProxySamples} |
| Generation jobs | ${audit.counts.generationJobs} |
| Generation job results | ${audit.counts.generationResults} |
| Local detector outputs | ${audit.counts.detectorOutputs} |
| Confusion rows | ${audit.counts.confusionRows} |
| Aggregated confusion rows | ${audit.counts.aggregatedConfusionRows} |
| Pangram dashboard smoke outputs | ${audit.counts.pangramDashboardOutputs} |
| Copyleaks dashboard smoke outputs | ${audit.counts.copyleaksDashboardOutputs} |
| GPTZero dashboard smoke outputs | ${audit.counts.gptzeroDashboardOutputs} |
| Combined dashboard smoke samples | ${audit.counts.combinedDashboardSamples} |
| Combined dashboard smoke outputs | ${audit.counts.combinedDashboardOutputs} |
| Combined dashboard smoke confusion rows | ${audit.counts.combinedDashboardConfusionRows} |
| Detector coverage summary rows | ${audit.counts.detectorCoverageSummaryRows} |
| Paper-ready gate status | ${audit.counts.paperReadyGateStatus || "not generated"} |
| Detector run-pack pilot manifest rows | ${audit.counts.detectorRunPackPilotManifestRows} |
| Detector run-pack pilot queue rows | ${audit.counts.detectorRunPackPilotQueueRows} |
| Detector run-pack main queue rows | ${audit.counts.detectorRunPackMainQueueRows} |
| C4 human collection manifest rows | ${audit.counts.c4HumanCollectionManifestRows} |
| N4 human edit manifest rows | ${audit.counts.n4HumanEditManifestRows} |
| Detector vendor cost estimate rows | ${audit.counts.detectorVendorCostEstimateRows} |
| Prolific C4 writing item rows | ${audit.counts.prolificC4WritingItemRows} |
| Prolific C4 writing budget rows | ${audit.counts.prolificC4WritingBudgetRows} |
| Prolific N4 editing item rows | ${audit.counts.prolificN4EditingItemRows} |
| Prolific N4 editing budget rows | ${audit.counts.prolificN4EditingBudgetRows} |

## Generated Samples By Case

${Object.entries(audit.counts.generatedByCase)
  .sort()
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

## Generated Samples By Status

${Object.entries(audit.counts.generatedByStatus)
  .sort()
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

## Interpretation

- Rows marked \`ready\` are current paper-ready candidate final texts.
- Rows marked \`synthetic_proxy_ready\` are useful for pipeline and detector
  smoke tests, but they are not paper-ready evidence.
- In particular, \`C4\` proxy rows use \`policy_label=compliant_proxy\` and
  \`origin_label=synthetic_proxy_origin\` so they cannot be mistaken for true
  human-written AI-style samples.
- \`N4\` rows are paper-ready only after a human-edited AI draft is imported
  with \`generation_mode=human_edited_ai_draft\`; synthetic or scripted edits
  remain smoke-test proxies.

## Issues

${
  issues.length
    ? issues.map((issue) => `- [${issue.severity}] ${issue.message}${issue.detail ? `: ${issue.detail}` : ""}`).join("\n")
    : "- None"
}
`;

await writeFile(AUDIT_JSON_PATH, `${JSON.stringify(audit, null, 2)}\n`);
await writeFile(AUDIT_MD_PATH, markdown);

console.log(`dataset audit status: ${audit.status}`);
console.log(`issues: ${issues.length}`);
console.log(`wrote ${path.relative(process.cwd(), AUDIT_MD_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), AUDIT_JSON_PATH)}`);
if (fatalCount > 0) process.exit(1);
