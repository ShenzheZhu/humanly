# Detector Stress Test Generation Pipeline

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

This directory now separates three stages:

1. Build seed libraries.
2. Build an 8-case sample plan and generation job queue.
3. Run generation jobs, then run detectors only on ready final texts.

Generation execution is local-input-only. Source collection scripts may fetch
public source material before a data freeze, but `build_case_generation_jobs.mjs`
and `run_generation_jobs.mjs` must consume source/task inputs from local files
under `data/detector-stress-test/`. URLs inside task cards are provenance
metadata, not runtime fetch instructions.

For the current no-credit smoke test, the full 8-case pipeline can be rerun with:

```bash
node data/detector-stress-test/scripts/run_offline_8case_pipeline.mjs
```

This command rebuilds the seed manifests and 240-row sample plan, preserves
existing generated text by default, exports both the 240-row proxy set and a
24-row one-per-cell pilot subset, runs the local heuristic detector, aggregates
confusion metrics, validates the dataset, and refreshes the budget estimate.
Pass `--force-proxy` only when intentionally overwriting existing proxy outputs.

## Seed Libraries

English human seeds for `C1` and `C2`:

```bash
node data/detector-stress-test/scripts/collect_human_seeds.mjs
```

Outputs:

- `human-seeds.csv`
- `texts/seeds/*.txt`

Non-English human seeds for `C3`:

```bash
node data/detector-stress-test/scripts/collect_c3_short_forum_seeds.mjs
node data/detector-stress-test/scripts/collect_c3_medium_wikiversity_seeds.mjs
node data/detector-stress-test/scripts/collect_bokelskere_long_candidates.mjs
node data/detector-stress-test/scripts/apply_task_aligned_c3_short_medium_seeds.mjs
```

Outputs:

- `translation-seeds.csv`
- `texts/non_english_seeds/*.txt`
- `c3-short-forum-candidates.csv`
- `c3-medium-wikiversity-candidates.csv`
- `bokelskere-long-candidates.csv`

The current C3 source is local and task-aligned by length bucket: short uses
non-English Stack Exchange forum-style posts, medium uses Spanish Wikiversity
old-revision educational excerpts, and long uses Norwegian Bokelskere book
reviews. The short sources are Reddit-like forum posts rather than Reddit
proper, and the medium sources are educational excerpts rather than newly
collected student answers; keep that caveat in the paper wording.

## 8-Case Plan

Build the full 8-case plan:

```bash
node data/detector-stress-test/scripts/build_case_generation_jobs.mjs
```

Outputs:

- `generated-samples.csv`: 240 sample rows, 30 per case.
- `case-generation-jobs.jsonl`: 180 transformation jobs.
- `texts/generated/source/*.txt`: source prompts, source drafts, C4 collection
  instructions.
- `texts/generated/task_cards/*.txt`: seed-derived task cards for `N1`, `N3`,
  `N4`, and `C4`.
- `texts/generated/final/c1_*.txt`: ready C1 final texts.

Expected status after this stage in a clean tree without prior generated/proxy
outputs:

- `ready`: 30 `C1` samples.
- `pending_generation`: 150 `C2`, `C3`, `N1`, `N2`, and `N3` samples.
- `pending_human_collection`: 30 `C4` samples.
- `pending_human_edit`: 30 `N4` samples. `N4` reuses the matched `N1` AI draft
  and then requires human light editing; it has no independent generation job.

Audit local input readiness before any paid generation run:

```bash
node data/detector-stress-test/scripts/audit_generation_inputs_local.mjs
```

Outputs:

- `generation-input-local-manifest.csv`
- `generation-input-local-audit.md`

The audit must pass with zero missing root-job inputs before any live generation
run. Generated dependencies such as `N2`, the second `N3` translation step, and
the `N4` AI draft are produced by earlier local jobs during the run.

## Generation Jobs

Dry-run the job queue without spending API credits:

```bash
node data/detector-stress-test/scripts/run_generation_jobs.mjs --dry-run
```

Expected dry-run status:

- In a clean tree, 120 root jobs are ready: `C2`, `C3`, `N1`, and the first
  `N3` Chinese-generation step.
- 60 downstream jobs (`N2` and the second `N3` translation step) require
  upstream outputs first.
- In a non-clean tree with existing dependency outputs, dry-run may report all
  180 jobs as `dry_run_ready`; stale live/proxy outputs are still ignored during
  real generation unless their input hashes match the current sources.

Run live generation only after model and budget are approved:

```bash
GENERATION_API_KEY=... \
GENERATION_MODEL=... \
node data/detector-stress-test/scripts/run_generation_jobs.mjs --limit=10
```

Optional environment variables:

- `GENERATION_BASE_URL`: OpenAI-compatible base URL. Defaults to
  `https://api.openai.com/v1`.
- `GENERATION_TEMPERATURE`: omitted by default. Set explicitly only when the
  selected OpenAI-compatible model supports it.

The runner writes raw API responses to `outputs/raw/generation/` and final texts
to `texts/generated/final/`.

If no generation API is available, use synthetic proxy mode for pipeline and
detector smoke tests only:

```bash
node data/detector-stress-test/scripts/run_generation_jobs.mjs --synthetic-proxy
```

This fills `C2`, `C3`, `N1`, `N2`, `N3`, and `N4` outputs with deterministic
offline proxy text and writes `.meta.json` sidecars. Re-running the build step
will mark those rows as `synthetic_proxy_ready`, not paper-ready.

Re-run `build_case_generation_jobs.mjs` after generation to refresh
`generated-samples.csv` word counts and `ready` statuses. It does not delete
existing generated outputs.

## C4 Human Collection

`C4` must remain human-written. The generated source files
`texts/generated/source/c4_*_source.txt` are collection instructions. Do not use
AI to fill `C4`; otherwise the false-positive-risk label is invalid.

Collection instructions live in `c4-human-collection-protocol.md`.

After human writers produce C4 text, save outputs to the corresponding
`texts/human_c4/c4_*.txt` paths, then import and rebuild:

```bash
node data/detector-stress-test/scripts/import_c4_human_samples.mjs
node data/detector-stress-test/scripts/build_case_generation_jobs.mjs
```

For pipeline smoke tests only, C4 proxy text can be filled automatically:

```bash
node data/detector-stress-test/scripts/fill_c4_synthetic_proxy.mjs
node data/detector-stress-test/scripts/build_case_generation_jobs.mjs
```

This writes `policy_label=compliant_proxy`,
`origin_label=synthetic_proxy_origin`, and `sample_status=synthetic_proxy_ready`
for C4 rows. Do not use those rows as real C4 evidence.

## Detector Runs

Do not run detectors on `generated-samples.csv` until rows are `ready`. The
legacy `samples.csv` is still the technical dry-run manifest for the existing
Pangram runner. Export or copy an approved ready subset before live detector
runs.

Export only paper-ready generated rows:

```bash
node data/detector-stress-test/scripts/export_generated_samples.mjs
```

Export the full proxy dataset for smoke testing:

```bash
node data/detector-stress-test/scripts/export_generated_samples.mjs --include-synthetic-proxy
```

Export a 24-row one-per-case/length pilot proxy subset:

```bash
node data/detector-stress-test/scripts/export_generated_samples.mjs \
  --include-synthetic-proxy \
  --limit-per-cell=1 \
  --output=samples-generated-pilot-proxy.csv
```

The Pangram runner accepts a custom manifest:

```bash
SAMPLES_PATH=data/detector-stress-test/samples-generated-proxy.csv \
ruby data/detector-stress-test/scripts/run_pangram_dry_run.rb --dry-run
```

For a no-credit end-to-end smoke test, run the local heuristic detector over the
proxy manifest:

```bash
node data/detector-stress-test/scripts/run_local_heuristic_detector.mjs
```

Outputs:

- `detector_outputs_local_heuristic_proxy.csv`
- `confusion_by_case_local_heuristic_proxy.csv`

This detector is intentionally a local smoke-test heuristic. It proves the
8-case data plumbing and aggregation path, but it is not a substitute for the
selected v1 detector systems: Pangram, GPTZero, and the Claude Opus 4.8
final-text-only LLM baseline.

The current one-click detector harness verifies all selected detector systems in
no-credit mock mode:

```bash
node data/detector-stress-test/scripts/run_detector_one_click.mjs --dry-run
```

After credits/API keys are approved, the same harness can run the live 24-sample
pilot:

```bash
PANGRAM_API_KEY=... \
GPTZERO_API_KEY=... \
ANTHROPIC_API_KEY=... \
node data/detector-stress-test/scripts/run_detector_one_click.mjs \
  --live \
  --confirm-spend=YES
```

To aggregate any detector-output CSV into the shared confusion schema:

```bash
SAMPLES_PATH=data/detector-stress-test/samples-generated-proxy.csv \
DETECTOR_OUTPUTS_PATH=data/detector-stress-test/detector_outputs_local_heuristic_proxy.csv \
node data/detector-stress-test/scripts/aggregate_detector_outputs.mjs
```

Output:

- `confusion_by_case_aggregated.csv`

The aggregator groups by detector, case, and length bucket. It treats
`policy_label=non_compliant` as the positive class and all other policy labels
as negative, including synthetic proxy labels used only for smoke tests.

The current first external-detector smoke test used four free Pangram dashboard
checks. The browser-captured JSON can be imported with:

```bash
node data/detector-stress-test/scripts/import_pangram_dashboard_results.mjs \
  --input=/path/to/pangram_free_dashboard_results.json
```

Outputs:

- `samples-pangram-free-dashboard-smoke.csv`
- `detector_outputs_pangram_free_dashboard_smoke.csv`
- `outputs/raw/pangram_free_dashboard/*.json`

Then aggregate that four-row smoke run:

```bash
SAMPLES_PATH=data/detector-stress-test/samples-pangram-free-dashboard-smoke.csv \
DETECTOR_OUTPUTS_PATH=data/detector-stress-test/detector_outputs_pangram_free_dashboard_smoke.csv \
OUTPUT_PATH=data/detector-stress-test/confusion_by_case_pangram_free_dashboard_smoke.csv \
node data/detector-stress-test/scripts/aggregate_detector_outputs.mjs
```

The smoke-test report is `pangram-free-dashboard-smoke.md`.

The Copyleaks free-dashboard smoke uses the same pattern:

```bash
node data/detector-stress-test/scripts/import_copyleaks_dashboard_results.mjs \
  --input=/path/to/copyleaks_free_dashboard_results.json
```

Outputs:

- `samples-copyleaks-free-dashboard-smoke.csv`
- `detector_outputs_copyleaks_free_dashboard_smoke.csv`
- `outputs/raw/copyleaks_free_dashboard/*.json`

Then aggregate the Copyleaks smoke run:

```bash
SAMPLES_PATH=data/detector-stress-test/samples-copyleaks-free-dashboard-smoke.csv \
DETECTOR_OUTPUTS_PATH=data/detector-stress-test/detector_outputs_copyleaks_free_dashboard_smoke.csv \
OUTPUT_PATH=data/detector-stress-test/confusion_by_case_copyleaks_free_dashboard_smoke.csv \
node data/detector-stress-test/scripts/aggregate_detector_outputs.mjs
```

The smoke-test report is `copyleaks-free-dashboard-smoke.md`.

The GPTZero Basic dashboard smoke uses the same import pattern, but the free
dashboard allowed only one advanced scan before showing `0 advanced scans left`:

```bash
node data/detector-stress-test/scripts/import_gptzero_dashboard_results.mjs \
  --input=/path/to/gptzero_free_dashboard_results.json
```

Outputs:

- `samples-gptzero-free-dashboard-smoke.csv`
- `detector_outputs_gptzero_free_dashboard_smoke.csv`
- `outputs/raw/gptzero_free_dashboard/*.json`

Then aggregate the GPTZero smoke run:

```bash
SAMPLES_PATH=data/detector-stress-test/samples-gptzero-free-dashboard-smoke.csv \
DETECTOR_OUTPUTS_PATH=data/detector-stress-test/detector_outputs_gptzero_free_dashboard_smoke.csv \
OUTPUT_PATH=data/detector-stress-test/confusion_by_case_gptzero_free_dashboard_smoke.csv \
node data/detector-stress-test/scripts/aggregate_detector_outputs.mjs
```

The smoke-test report is `gptzero-free-dashboard-smoke.md`.

Combine all dashboard smoke outputs:

```bash
node data/detector-stress-test/scripts/combine_dashboard_smoke_outputs.mjs
node data/detector-stress-test/scripts/summarize_detector_coverage.mjs
SAMPLES_PATH=data/detector-stress-test/samples-dashboard-smoke-combined.csv \
DETECTOR_OUTPUTS_PATH=data/detector-stress-test/detector_outputs_dashboard_smoke_combined.csv \
OUTPUT_PATH=data/detector-stress-test/confusion_by_case_dashboard_smoke_combined.csv \
node data/detector-stress-test/scripts/aggregate_detector_outputs.mjs
```

The combined summary is `dashboard-smoke-summary.md`.
The coverage summary is `detector-coverage-summary.md`.

## Validation And Budgeting

Run the strict dataset audit:

```bash
node data/detector-stress-test/scripts/validate_dataset.mjs
```

Outputs:

- `dataset-audit.md`
- `dataset-audit.json`

Run the token/request budget estimator:

```bash
node data/detector-stress-test/scripts/estimate_run_budget.mjs
```

Optional cost inputs:

```bash
GENERATION_INPUT_COST_PER_1M=... \
GENERATION_OUTPUT_COST_PER_1M=... \
DETECTOR_COST_PER_DOC=... \
node data/detector-stress-test/scripts/estimate_run_budget.mjs
```

Outputs:

- `run-budget-estimate.md`
- `run-budget-estimate.csv`

Before using any detector result as paper-ready evidence, check
`paper-ready-eval-gates.md` and run:

```bash
node data/detector-stress-test/scripts/audit_paper_ready_gates.mjs
```

Outputs:

- `paper-ready-gate-audit.md`
- `paper-ready-gate-audit.json`
