#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const JOBS_PATH = path.join(DATA_DIR, "case-generation-jobs.jsonl");
const SAMPLES_PATH = path.join(DATA_DIR, "samples-generated-proxy.csv");
const ESTIMATE_MD_PATH = path.join(DATA_DIR, "run-budget-estimate.md");
const ESTIMATE_CSV_PATH = path.join(DATA_DIR, "run-budget-estimate.csv");

const inputCostPerMillion = Number(process.env.GENERATION_INPUT_COST_PER_1M || "0");
const outputCostPerMillion = Number(process.env.GENERATION_OUTPUT_COST_PER_1M || "0");
const detectorCostPerDocument = Number(process.env.DETECTOR_COST_PER_DOC || "0");

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

function tokenEstimate(text) {
  // Conservative approximation for English plus CJK text. This is for budgeting,
  // not provider billing.
  const cjkChars =
    text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) || [];
  const nonCjkText = text.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, "");
  return Math.ceil(nonCjkText.length / 4) + Math.ceil(cjkChars.length * 0.8);
}

function csvEscape(value) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function renderPrompt(template, inputText) {
  return (template || "").replaceAll("{{INPUT_TEXT}}", inputText.trim());
}

const jobs = (await readFile(JOBS_PATH, "utf8"))
  .split(/\n+/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const samples = parseCsv(await readFile(SAMPLES_PATH, "utf8"));

const rows = [];
for (const job of jobs) {
  const inputText = job.input_text_path
    ? await readFile(path.join(DATA_DIR, job.input_text_path), "utf8").catch(() => "")
    : "";
  const prompt = renderPrompt(job.prompt_template, inputText);
  const sample = samples.find((row) => row.sample_id === job.sample_id);
  const outputText = job.output_text_path
    ? await readFile(path.join(DATA_DIR, job.output_text_path), "utf8").catch(() => "")
    : "";
  rows.push({
    job_id: job.job_id,
    sample_id: job.sample_id,
    case_id: job.case_id,
    job_type: job.job_type,
    requires_api: String(job.requires_api),
    length_bucket: sample?.length_bucket || "",
    prompt_tokens_est: tokenEstimate(prompt),
    output_tokens_est: tokenEstimate(outputText),
  });
}

const totals = rows.reduce(
  (acc, row) => {
    acc.jobs += 1;
    if (row.requires_api === "true") acc.apiJobs += 1;
    acc.promptTokens += row.prompt_tokens_est;
    acc.outputTokens += row.output_tokens_est;
    return acc;
  },
  { jobs: 0, apiJobs: 0, promptTokens: 0, outputTokens: 0 },
);

const detectorDocuments = samples.length;
const generationCost =
  (totals.promptTokens / 1_000_000) * inputCostPerMillion +
  (totals.outputTokens / 1_000_000) * outputCostPerMillion;
const detectorCost = detectorDocuments * detectorCostPerDocument;
const totalCost = generationCost + detectorCost;

const columns = [
  "job_id",
  "sample_id",
  "case_id",
  "job_type",
  "requires_api",
  "length_bucket",
  "prompt_tokens_est",
  "output_tokens_est",
];
await writeFile(
  ESTIMATE_CSV_PATH,
  `${[
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n")}\n`,
);

const markdown = `# Detector Stress Test Run Budget Estimate

Generated: ${new Date().toISOString()}

This is a token/request estimate for planning. It is not provider billing.
Set the following environment variables to compute a dollar estimate:

- \`GENERATION_INPUT_COST_PER_1M\`
- \`GENERATION_OUTPUT_COST_PER_1M\`
- \`DETECTOR_COST_PER_DOC\`

## Generation Jobs

| Item | Estimate |
| --- | ---: |
| Total generation jobs | ${totals.jobs} |
| API generation jobs | ${totals.apiJobs} |
| Prompt/input tokens | ${totals.promptTokens} |
| Output tokens | ${totals.outputTokens} |
| Input cost per 1M | ${inputCostPerMillion} |
| Output cost per 1M | ${outputCostPerMillion} |
| Estimated generation cost | ${generationCost.toFixed(4)} |

## Detector Runs

| Item | Estimate |
| --- | ---: |
| Detector documents per detector | ${detectorDocuments} |
| Detector cost per document | ${detectorCostPerDocument} |
| Estimated detector cost per detector | ${detectorCost.toFixed(4)} |

## Total

Estimated total with the supplied unit costs: **${totalCost.toFixed(4)}**

For multiple detector vendors, multiply the detector cost line by the number of
paid detectors actually run.
`;

await writeFile(ESTIMATE_MD_PATH, markdown);

console.log(`generation jobs: ${totals.jobs}, api jobs: ${totals.apiJobs}`);
console.log(`prompt tokens est: ${totals.promptTokens}`);
console.log(`output tokens est: ${totals.outputTokens}`);
console.log(`detector documents per detector: ${detectorDocuments}`);
console.log(`estimated total with supplied unit costs: ${totalCost.toFixed(4)}`);
console.log(`wrote ${path.relative(process.cwd(), ESTIMATE_MD_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), ESTIMATE_CSV_PATH)}`);
