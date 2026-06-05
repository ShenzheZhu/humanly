#!/usr/bin/env node

import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const REPORT_MD_PATH = path.join(DATA_DIR, "paper-ready-gate-audit.md");
const REPORT_JSON_PATH = path.join(DATA_DIR, "paper-ready-gate-audit.json");
const requireReady = process.argv.includes("--require-ready");

const FILES = {
  generatedSamples: "generated-samples.csv",
  pilotProxySamples: "samples-generated-pilot-proxy.csv",
  combinedDashboardSamples: "samples-dashboard-smoke-combined.csv",
  combinedDashboardOutputs: "detector_outputs_dashboard_smoke_combined.csv",
  humanSeeds: "human-seeds.csv",
  translationSeeds: "translation-seeds.csv",
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

async function exists(relativePath) {
  try {
    await stat(path.join(DATA_DIR, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readCsv(relativePath) {
  return parseCsv(await readFile(path.join(DATA_DIR, relativePath), "utf8"));
}

async function readJsonIfExists(relativePath) {
  if (!(await exists(relativePath))) return null;
  return JSON.parse(await readFile(path.join(DATA_DIR, relativePath), "utf8"));
}

function countBy(rows, column) {
  return rows.reduce((acc, row) => {
    const value = row[column] || "";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function gate(id, title, passed, evidence, requiredNextStep) {
  return {
    id,
    title,
    status: passed ? "passed" : "not_ready",
    evidence,
    required_next_step: requiredNextStep,
  };
}

const generatedSamples = await readCsv(FILES.generatedSamples);
const pilotProxySamples = await readCsv(FILES.pilotProxySamples);
const combinedDashboardSamples = await readCsv(FILES.combinedDashboardSamples);
const combinedDashboardOutputs = await readCsv(FILES.combinedDashboardOutputs);
const humanSeeds = await readCsv(FILES.humanSeeds);
const translationSeeds = await readCsv(FILES.translationSeeds);

const generatedByStatus = countBy(generatedSamples, "sample_status");
const generatedByCase = countBy(generatedSamples, "case_id");
const generatedByPolicy = countBy(generatedSamples, "policy_label");
const dashboardByDetector = countBy(combinedDashboardOutputs, "detector");
const dashboardCaseLength = new Set();
for (const sample of combinedDashboardSamples) {
  dashboardCaseLength.add(`${sample.case_id}::${sample.length_bucket}`);
}

let syntheticMetaRows = 0;
let readySyntheticMetaRows = 0;
for (const sample of generatedSamples) {
  const meta = await readJsonIfExists(`${sample.final_text_path}.meta.json`);
  if (meta?.generation_mode === "synthetic_proxy") {
    syntheticMetaRows += 1;
    if (sample.sample_status === "ready") readySyntheticMetaRows += 1;
  }
}

const c4Rows = generatedSamples.filter((row) => row.case_id === "C4");
const c4HumanReady = c4Rows.filter(
  (row) =>
    row.sample_status === "ready" &&
    row.policy_label === "compliant" &&
    row.origin_label === "human_origin",
);
const n4Rows = generatedSamples.filter((row) => row.case_id === "N4");
const n4HumanReady = [];
let n4HumanEditedFinalRows = 0;
let n4LiveAiDraftRows = 0;
for (const row of n4Rows) {
  const finalMeta = await readJsonIfExists(`${row.final_text_path}.meta.json`);
  const draftMeta = await readJsonIfExists(`${row.source_text_path}.meta.json`);
  const hasHumanEditedFinal = finalMeta?.generation_mode === "human_edited_ai_draft";
  const hasLiveAiDraft = draftMeta && draftMeta.generation_mode !== "synthetic_proxy";
  if (hasHumanEditedFinal) n4HumanEditedFinalRows += 1;
  if (hasLiveAiDraft) n4LiveAiDraftRows += 1;
  if (
    row.sample_status === "ready" &&
    row.policy_label === "non_compliant" &&
    row.origin_label === "mixed_ai_origin" &&
    hasHumanEditedFinal &&
    hasLiveAiDraft
  ) {
    n4HumanReady.push(row);
  }
}

const requiredCases = ["C1", "C2", "C3", "C4", "N1", "N2", "N3", "N4"];
const requiredLengths = ["short", "medium", "long"];
const fullCaseLengthCells = requiredCases.length * requiredLengths.length;
const dashboardCoveredCells = dashboardCaseLength.size;

const gates = [
  gate(
    "seed_library_size",
    "Seed library has 10 items per length bucket for English and translation seeds",
    humanSeeds.length === 30 && translationSeeds.length === 30,
    [
      `English seed rows: ${humanSeeds.length}`,
      `Translation seed rows: ${translationSeeds.length}`,
    ],
    "Keep source manifests stable and resolve public redistribution policy.",
  ),
  gate(
    "eight_case_matrix",
    "8-case matrix has 240 planned rows",
    generatedSamples.length === 240 && requiredCases.every((caseId) => generatedByCase[caseId] === 30),
    [
      `Generated rows: ${generatedSamples.length}`,
      `Rows by case: ${JSON.stringify(generatedByCase)}`,
    ],
    "Maintain the 8 cases x 3 lengths x 10 rows invariant.",
  ),
  gate(
    "live_generation",
    "Generated rows are live/API or approved human outputs rather than synthetic proxy outputs",
    (generatedByStatus.synthetic_proxy_ready || 0) === 0 && syntheticMetaRows === 0,
    [
      `Rows marked synthetic_proxy_ready: ${generatedByStatus.synthetic_proxy_ready || 0}`,
      `Rows with synthetic_proxy metadata: ${syntheticMetaRows}`,
      `Ready rows with synthetic_proxy metadata: ${readySyntheticMetaRows}`,
    ],
    "Run approved live generation without --synthetic-proxy and rebuild the generated sample manifest.",
  ),
  gate(
    "human_c4",
    "C4 has 30 human-written AI-style ready rows",
    c4HumanReady.length === 30,
    [
      `C4 rows: ${c4Rows.length}`,
      `C4 human ready rows: ${c4HumanReady.length}`,
      `Policy labels: ${JSON.stringify(generatedByPolicy)}`,
    ],
    "Collect 10 short, 10 medium, and 10 long human-written AI-style C4 samples.",
  ),
  gate(
    "human_n4",
    "N4 has 30 human-edited AI-draft ready rows",
    n4HumanReady.length === 30,
    [
      `N4 rows: ${n4Rows.length}`,
      `N4 final rows with human_edited_ai_draft metadata: ${n4HumanEditedFinalRows}`,
      `N4 rows with live/non-proxy AI draft metadata: ${n4LiveAiDraftRows}`,
      `N4 paper-ready rows: ${n4HumanReady.length}`,
    ],
    "Generate 10 short, 10 medium, and 10 long live AI drafts, then collect matching human light edits.",
  ),
  gate(
    "pilot_detector_coverage",
    "External detector coverage reaches the 24-row one-per-case/length pilot",
    dashboardCoveredCells >= fullCaseLengthCells,
    [
      `Dashboard smoke sample rows: ${combinedDashboardSamples.length}`,
      `Covered case/length cells: ${dashboardCoveredCells}/${fullCaseLengthCells}`,
      `Detector rows by detector: ${JSON.stringify(dashboardByDetector)}`,
    ],
    "Obtain approved free capacity, institutional credits, or API keys for at least 24 pilot cells.",
  ),
  gate(
    "main_detector_coverage",
    "External detector coverage reaches the 240-row main batch",
    combinedDashboardOutputs.length >= 240,
    [
      `Combined dashboard detector rows: ${combinedDashboardOutputs.length}`,
      `Main batch target rows per detector: 240`,
    ],
    "Run selected detectors over the approved 240-row paper-ready sample set.",
  ),
];

const audit = {
  generated_at_utc: new Date().toISOString(),
  overall_status: gates.every((item) => item.status === "passed") ? "paper_ready" : "not_ready",
  counts: {
    generatedSamples: generatedSamples.length,
    pilotProxySamples: pilotProxySamples.length,
    combinedDashboardSamples: combinedDashboardSamples.length,
    combinedDashboardOutputs: combinedDashboardOutputs.length,
    syntheticProxyRows: generatedByStatus.synthetic_proxy_ready || 0,
    c4HumanReady: c4HumanReady.length,
    n4HumanReady: n4HumanReady.length,
    dashboardCoveredCells,
  },
  gates,
};

const markdown = `# Paper-Ready Gate Audit

Generated: ${audit.generated_at_utc}

Overall status: **${audit.overall_status}**

## Counts

| Item | Count |
| --- | ---: |
| Generated sample rows | ${audit.counts.generatedSamples} |
| Pilot proxy sample rows | ${audit.counts.pilotProxySamples} |
| Combined dashboard smoke samples | ${audit.counts.combinedDashboardSamples} |
| Combined dashboard detector rows | ${audit.counts.combinedDashboardOutputs} |
| Synthetic proxy rows | ${audit.counts.syntheticProxyRows} |
| C4 human ready rows | ${audit.counts.c4HumanReady} |
| N4 human-edited ready rows | ${audit.counts.n4HumanReady} |
| External dashboard covered case/length cells | ${audit.counts.dashboardCoveredCells}/${fullCaseLengthCells} |

## Gates

${gates
  .map(
    (item) => `### ${item.title}

- Gate id: \`${item.id}\`
- Status: **${item.status}**
- Evidence:
${item.evidence.map((line) => `  - ${line}`).join("\n")}
- Required next step: ${item.required_next_step}
`,
  )
  .join("\n")}

## Interpretation

This audit is intentionally stricter than the smoke-test dataset audit. It asks
whether the current detector stress-test artifacts are ready to be reported as
paper evidence. A \`not_ready\` status is expected while live generation,
human-written C4 samples, human-edited N4 samples, and full external-detector
capacity are still missing.
`;

await writeFile(REPORT_JSON_PATH, `${JSON.stringify(audit, null, 2)}\n`);
await writeFile(REPORT_MD_PATH, markdown);

console.log(`paper-ready gate status: ${audit.overall_status}`);
for (const item of gates) {
  console.log(`${item.id}: ${item.status}`);
}
console.log(`wrote ${path.relative(process.cwd(), REPORT_MD_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), REPORT_JSON_PATH)}`);
if (requireReady && audit.overall_status !== "paper_ready") process.exit(1);
