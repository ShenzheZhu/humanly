#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  DATA_DIR,
  getArg,
  hasFlag,
  readCsv,
} from "./detector_runner_common.mjs";

const execFileAsync = promisify(execFile);
const SCRIPTS_DIR = path.join(DATA_DIR, "scripts");
const DRY_RUN = hasFlag("dry-run") || !hasFlag("live");
const LIVE = hasFlag("live");
const CONFIRM_SPEND = getArg("confirm-spend", process.env.CONFIRM_SPEND || "");
const SAMPLES_PATH = path.resolve(
  process.cwd(),
  getArg("samples", process.env.SAMPLES_PATH || path.join(DATA_DIR, "samples-generated-pilot-proxy.csv")),
);
const OUTPUTS_PATH = path.resolve(
  process.cwd(),
  getArg(
    "outputs",
    process.env.DETECTOR_OUTPUTS_PATH ||
      path.join(DATA_DIR, DRY_RUN ? "detector_outputs_one_click_dry_run.csv" : "detector_outputs_api_pilot.csv"),
  ),
);
const AGGREGATE_PATH = path.resolve(
  process.cwd(),
  getArg(
    "aggregate-output",
    process.env.AGGREGATE_OUTPUT_PATH ||
      path.join(DATA_DIR, DRY_RUN ? "confusion_by_case_one_click_dry_run.csv" : "confusion_by_case_api_pilot.csv"),
  ),
);
const REPORT_PATH = path.join(DATA_DIR, DRY_RUN ? "detector-one-click-dry-run.md" : "detector-one-click-live-pilot.md");

const DETECTOR_RUNNERS = [
  { detector: "pangram", script: "run_pangram_detector.mjs", requiredEnv: "PANGRAM_API_KEY" },
  { detector: "gptzero", script: "run_gptzero_detector.mjs", requiredEnv: "GPTZERO_API_KEY" },
  { detector: "llm_claude_opus_4_8", script: "run_llm_detector_baseline.mjs", requiredEnv: "ANTHROPIC_API_KEY" },
];

function usage() {
  return `Usage:
  node data/detector-stress-test/scripts/run_detector_one_click.mjs --dry-run
  PANGRAM_API_KEY=... GPTZERO_API_KEY=... ANTHROPIC_API_KEY=... \\
    node data/detector-stress-test/scripts/run_detector_one_click.mjs --live --confirm-spend=YES

Options:
  --samples=<path>           sample manifest CSV; defaults to pilot proxy manifest
  --outputs=<path>           normalized detector output CSV
  --aggregate-output=<path>  aggregate confusion CSV
  --live                     call real APIs
  --dry-run                  deterministic local mocks; default
  --confirm-spend=YES        required for --live`;
}

async function runNode(script, args = [], env = {}) {
  const commandArgs = [path.join(SCRIPTS_DIR, script), ...args];
  const { stdout, stderr } = await execFileAsync(process.execPath, commandArgs, {
    cwd: path.resolve(DATA_DIR, "..", ".."),
    env: { ...process.env, ...env },
    maxBuffer: 20 * 1024 * 1024,
  });
  return { command: `node ${path.relative(process.cwd(), commandArgs[0])} ${args.join(" ")}`.trim(), stdout, stderr };
}

function commandBlock(commandResults) {
  return commandResults
    .map(
      (result) => `### ${result.command}

\`\`\`text
${`${result.stdout}${result.stderr ? `\nSTDERR:\n${result.stderr}` : ""}`.trim()}
\`\`\``,
    )
    .join("\n\n");
}

if (hasFlag("help") || hasFlag("h")) {
  console.log(usage());
  process.exit(0);
}

if (LIVE && CONFIRM_SPEND !== "YES") {
  throw new Error("Live detector run requires --confirm-spend=YES.");
}

if (LIVE) {
  const missing = DETECTOR_RUNNERS.map((runner) => runner.requiredEnv).filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required live API credential(s): ${missing.join(", ")}`);
  }
}

const startedAt = new Date().toISOString();
const commandResults = [];
commandResults.push(await runNode("estimate_detector_vendor_costs.mjs"));
commandResults.push(await runNode("build_detector_run_pack.mjs"));

for (const runner of DETECTOR_RUNNERS) {
  const args = [`--samples=${SAMPLES_PATH}`, `--outputs=${OUTPUTS_PATH}`];
  if (DRY_RUN) args.push("--dry-run");
  commandResults.push(await runNode(runner.script, args));
}

commandResults.push(
  await runNode("aggregate_detector_outputs.mjs", [
    `--samples=${SAMPLES_PATH}`,
    `--outputs=${OUTPUTS_PATH}`,
    `--output=${AGGREGATE_PATH}`,
  ]),
);
commandResults.push(await runNode("validate_dataset.mjs"));

const outputRows = await readCsv(OUTPUTS_PATH);
const aggregateRows = await readCsv(AGGREGATE_PATH);
const costCsv = await readFile(path.join(DATA_DIR, "detector-vendor-cost-estimate.csv"), "utf8");
const costRows = costCsv
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => line.split(","));

const report = `# Detector One-Click ${DRY_RUN ? "Dry Run" : "Live Pilot"} Report

Generated: ${new Date().toISOString()}

Mode: **${DRY_RUN ? "dry-run mock, no network/API spend" : "live API run"}**

## Inputs and Outputs

| Item | Path / Count |
| --- | --- |
| Sample manifest | \`${path.relative(DATA_DIR, SAMPLES_PATH)}\` |
| Detector outputs | \`${path.relative(DATA_DIR, OUTPUTS_PATH)}\` |
| Detector output rows | ${outputRows.length} |
| Aggregated confusion | \`${path.relative(DATA_DIR, AGGREGATE_PATH)}\` |
| Aggregated rows | ${aggregateRows.length} |
| Cost-estimate rows | ${costRows.length} |

## Detector Set

| Detector | Mode |
| --- | --- |
| Pangram | ${DRY_RUN ? "mock dry run" : "live API"} |
| GPTZero | ${DRY_RUN ? "mock dry run" : "live API"} |
| Claude Opus 4.8 LLM baseline | ${DRY_RUN ? "mock dry run" : "live Anthropic API"} |

## Commands

${commandBlock(commandResults)}

## Interpretation

This report verifies script plumbing only when run in dry-run mode. It proves
that the current sample manifest can be read, three detector-normalized output
sets can be written, raw JSON can be stored, confusion rows can be aggregated,
and the dataset validator still passes. Dry-run rows are deterministic mock
scores and must not be reported as detector evidence.

Live mode uses the same runner sequence but requires all three API credentials
and \`--confirm-spend=YES\`.
`;

await writeFile(REPORT_PATH, report);

console.log(`started: ${startedAt}`);
console.log(`mode: ${DRY_RUN ? "dry-run" : "live"}`);
console.log(`detector rows: ${outputRows.length}`);
console.log(`aggregate rows: ${aggregateRows.length}`);
console.log(`wrote ${path.relative(process.cwd(), REPORT_PATH)}`);
