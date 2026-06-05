#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tokenEstimate } from "./detector_runner_common.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");

const GENERATED_SAMPLES_PATH = path.join(DATA_DIR, "generated-samples.csv");
const PILOT_SAMPLES_PATH = path.join(DATA_DIR, "samples-generated-pilot-proxy.csv");
const OUTPUT_CSV_PATH = path.join(DATA_DIR, "detector-vendor-cost-estimate.csv");
const OUTPUT_MD_PATH = path.join(DATA_DIR, "detector-vendor-cost-estimate.md");

const CHECKED_DATE = "2026-06-05";
const CLAUDE_OPUS_4_8_INPUT_USD_PER_1M = 5;
const CLAUDE_OPUS_4_8_OUTPUT_USD_PER_1M = 25;
const LLM_OUTPUT_TOKENS_ESTIMATE_PER_DOC = 120;
const LLM_DETECTOR_PROMPT = `You are a final-text-only AI writing detector predictor. Return compact JSON with document_classification, class_probabilities, and confidence_category.`;

const VENDORS = [
  {
    detector: "pangram",
    public_access_mode: "developer_api_credits",
    source_url: "https://www.pangram.com/pricing",
    source_note: "Pricing page lists developer API credits: $25 for 500 credits and $0.05 per 1,000-word credit.",
    unit: "per_1000_words_credit",
    creditWords: 1000,
    marginalCreditCostUsd: 0.05,
    minimumPublicSpendUsd: 25,
    api_pricing_status: "public_credit_price_visible",
  },
  {
    detector: "gptzero",
    public_access_mode: "monthly_api_plan",
    source_url: "https://gptzero.me/pricing",
    source_note:
      "Official GPTZero API Pricing section lists 300k words/month for $45, 1m for $135, 2m for $250, 5m for $550, 10m for $1000, and 20m for $1850; after the base plan allotment, additional usage is $150 per million words.",
    unit: "monthly_words",
    creditWords: 1,
    marginalCreditCostUsd: "",
    minimumPublicSpendUsd: 45,
    monthlyPlans: [
      { words: 300000, costUsd: 45 },
      { words: 1000000, costUsd: 135 },
      { words: 2000000, costUsd: 250 },
      { words: 5000000, costUsd: 550 },
      { words: 10000000, costUsd: 1000 },
      { words: 20000000, costUsd: 1850 },
    ],
    overagePerMillionUsd: 150,
    api_pricing_status: "public_monthly_api_plan_visible",
  },
  {
    detector: "llm_claude_opus_4_8",
    public_access_mode: "anthropic_api_token_baseline",
    source_url: "https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-8",
    source_note:
      "Official Anthropic docs list Claude Opus 4.8 as API model claude-opus-4-8, with standard pricing of $5 per million input tokens and $25 per million output tokens. This is an LLM final-text baseline, not a commercial detector vendor.",
    unit: "estimated_input_plus_output_tokens",
    inputUsdPerMillion: CLAUDE_OPUS_4_8_INPUT_USD_PER_1M,
    outputUsdPerMillion: CLAUDE_OPUS_4_8_OUTPUT_USD_PER_1M,
    outputTokensPerDoc: LLM_OUTPUT_TOKENS_ESTIMATE_PER_DOC,
    api_pricing_status: "official_model_and_pricing_visible",
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

async function writeCsv(filePath, rows, columns) {
  await writeFile(
    filePath,
    `${[columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join(
      "\n",
    )}\n`,
  );
}

function sampleStats(samples) {
  return {
    documents: samples.length,
    words: samples.reduce((sum, sample) => sum + Number(sample.word_count || 0), 0),
  };
}

async function llmTokenStats(samples, vendor) {
  if (vendor.detector !== "llm_claude_opus_4_8") return null;
  let inputTokens = 0;
  let outputTokens = 0;
  for (const sample of samples) {
    const finalText = await readFile(path.join(DATA_DIR, sample.final_text_path), "utf8");
    inputTokens += tokenEstimate(`${LLM_DETECTOR_PROMPT}\n\n${finalText}`);
    outputTokens += vendor.outputTokensPerDoc;
  }
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
}

function creditsFor(samples, vendor, tokenStats = null) {
  if (vendor.detector === "llm_claude_opus_4_8") return tokenStats?.totalTokens || 0;
  if (!vendor.creditWords) return samples.length;
  return samples.reduce((sum, sample) => sum + Math.ceil(Number(sample.word_count || 0) / vendor.creditWords), 0);
}

function estimateCost(samples, vendor, tokenStats = null) {
  const credits = creditsFor(samples, vendor, tokenStats);
  if (vendor.detector === "gptzero") {
    const words = samples.reduce((sum, sample) => sum + Number(sample.word_count || 0), 0);
    const plan = vendor.monthlyPlans.find((candidate) => words <= candidate.words);
    if (plan) return plan.costUsd;
    const largestPlan = vendor.monthlyPlans[vendor.monthlyPlans.length - 1];
    const overageWords = words - largestPlan.words;
    return largestPlan.costUsd + (overageWords / 1000000) * vendor.overagePerMillionUsd;
  }
  if (vendor.detector === "pangram") {
    const marginal = credits * vendor.marginalCreditCostUsd;
    return Math.max(vendor.minimumPublicSpendUsd, marginal);
  }
  if (vendor.detector === "llm_claude_opus_4_8") {
    return (
      (tokenStats.inputTokens / 1_000_000) * vendor.inputUsdPerMillion +
      (tokenStats.outputTokens / 1_000_000) * vendor.outputUsdPerMillion
    );
  }
  return "";
}

function usd(value) {
  if (value === "" || value == null || Number.isNaN(Number(value))) return "";
  return Number(value).toFixed(2);
}

const generatedSamples = parseCsv(await readFile(GENERATED_SAMPLES_PATH, "utf8"));
const pilotSamples = parseCsv(await readFile(PILOT_SAMPLES_PATH, "utf8"));
const cohorts = [
  { cohort: "pilot_24", samples: pilotSamples },
  { cohort: "main_240", samples: generatedSamples },
  { cohort: "pilot_plus_main_264", samples: [...pilotSamples, ...generatedSamples] },
];

const rows = [];
for (const cohort of cohorts) {
  const stats = sampleStats(cohort.samples);
  for (const vendor of VENDORS) {
    const tokenStats = await llmTokenStats(cohort.samples, vendor);
    const credits = creditsFor(cohort.samples, vendor, tokenStats);
    const estimatedCost = estimateCost(cohort.samples, vendor, tokenStats);
    rows.push({
      checked_date: CHECKED_DATE,
      cohort: cohort.cohort,
      detector: vendor.detector,
      documents: stats.documents,
      manifest_words: stats.words,
      public_access_mode: vendor.public_access_mode,
      unit: vendor.unit,
      estimated_credits_or_scans: credits,
      estimated_public_cost_usd: usd(estimatedCost),
      api_pricing_status: vendor.api_pricing_status,
      source_url: vendor.source_url,
      notes:
        vendor.detector === "llm_claude_opus_4_8"
          ? `${vendor.source_note} Token estimate: ${tokenStats.inputTokens} input + ${tokenStats.outputTokens} output tokens.`
          : vendor.source_note,
    });
  }
}

await writeCsv(OUTPUT_CSV_PATH, rows, [
  "checked_date",
  "cohort",
  "detector",
  "documents",
  "manifest_words",
  "public_access_mode",
  "unit",
  "estimated_credits_or_scans",
  "estimated_public_cost_usd",
  "api_pricing_status",
  "source_url",
  "notes",
]);

const markdownRows = rows
  .map(
    (row) =>
      `| ${row.cohort} | ${row.detector} | ${row.documents} | ${row.manifest_words} | ${row.estimated_credits_or_scans} | ${
        row.estimated_public_cost_usd ? `$${row.estimated_public_cost_usd}` : "custom/TBD"
      } | ${row.api_pricing_status} |`,
  )
  .join("\n");

await writeFile(
  OUTPUT_MD_PATH,
  `# Detector Vendor Cost Estimate

Checked: ${CHECKED_DATE}

This is a planning estimate using public pricing pages and the current
\`generated-samples.csv\` word counts. It is not approval to spend money and it
is not a vendor quote. Costs can change if live-generated texts differ from the
current proxy word counts.

## Estimates

| Cohort | Detector | Docs | Manifest words | Credits/scans | Estimated public cost | API status |
| --- | --- | ---: | ---: | ---: | ---: | --- |
${markdownRows}

## Source Notes

${VENDORS.map((vendor) => `- ${vendor.detector}: ${vendor.source_note} Source: ${vendor.source_url}`).join("\n")}

## Interpretation

- Pangram is the cleanest public API-credit estimate because the developer API
  credit price is visible.
- GPTZero now has a public monthly API-plan estimate from the official pricing
  page's API Pricing section. The 24-sample pilot, 240-sample main batch, and
  combined 264-document paid run all fit under the 300k-word base plan.
- Claude Opus 4.8 is included as an LLM final-text baseline. Its estimate is a
  token-budget approximation using the current sample texts plus a fixed compact
  JSON-output allowance; it is not a commercial detector vendor charge.
- Grammarly AI Detection API, Copyleaks, Originality.ai, Sapling, Winston AI,
  ZeroGPT, and other smaller or higher-friction vendors are excluded from v1.
`,
);

console.log(`wrote ${path.relative(process.cwd(), OUTPUT_CSV_PATH)}`);
console.log(`wrote ${path.relative(process.cwd(), OUTPUT_MD_PATH)}`);
