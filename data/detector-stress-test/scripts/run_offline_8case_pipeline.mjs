#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");
const SCRIPT_DIR = path.join("data", "detector-stress-test", "scripts");
const forceProxy = process.argv.includes("--force-proxy");

function runNode(scriptName, args = [], env = {}) {
  const commandArgs = [path.join(SCRIPT_DIR, scriptName), ...args];
  console.log(`\n$ node ${commandArgs.join(" ")}`);
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Running offline 8-case detector stress-test pipeline.");
console.log("This uses synthetic proxy generation for smoke testing, not paper-ready evidence.");
if (forceProxy) {
  console.log("Force mode enabled: proxy outputs may overwrite existing generated text.");
}

runNode("collect_human_seeds.mjs");
runNode("collect_translation_seeds.mjs");
runNode("build_case_generation_jobs.mjs");
runNode("run_generation_jobs.mjs", ["--synthetic-proxy", ...(forceProxy ? ["--force"] : [])]);
runNode("fill_c4_synthetic_proxy.mjs", forceProxy ? ["--force"] : []);
runNode("build_case_generation_jobs.mjs");
runNode("export_generated_samples.mjs", ["--include-synthetic-proxy"]);
runNode("export_generated_samples.mjs", [
  "--include-synthetic-proxy",
  "--limit-per-cell=1",
  "--output=samples-generated-pilot-proxy.csv",
]);
runNode("run_local_heuristic_detector.mjs");
runNode("aggregate_detector_outputs.mjs");
runNode("validate_dataset.mjs");
runNode("estimate_run_budget.mjs");

console.log("\nOffline 8-case pipeline finished.");
