# Paper-Ready Evaluation Gates

Last updated: 2026-06-04

The current repository now has a complete no-credit smoke-test pipeline:

- 30 English human seeds: 10 short, 10 medium, 10 long.
- 30 non-English translation seeds: 10 short, 10 medium, 10 long.
- 240 planned 8-case rows: 8 cases x 3 length buckets x 10 samples.
- 240 offline proxy final texts for pipeline testing.
- 24-row one-per-case/length pilot proxy export.
- Local heuristic detector outputs for all 240 proxy rows.
- No-payment dashboard smoke outputs for Pangram, Copyleaks, and GPTZero.

This is not yet paper-ready evidence. The following gates must be cleared before
the detector results can be reported as evaluation results in the paper.

## Gate 1: Live Generation

Current status: blocked by missing no-payment generation API capacity.

Evidence:

- No `GENERATION_API_KEY`, `GENERATION_MODEL`, `OPENAI_API_KEY`, `AI_API_KEY`,
  or `AI_MODEL` is available in the current environment.
- The current 210 generated rows are `synthetic_proxy_ready`, not live model
  outputs.

Required before paper-ready use:

- Provide an approved OpenAI-compatible generation endpoint/model/key that can
  be used without touching personal wallet funds, or approve another no-payment
  generation route.
- Re-run `run_generation_jobs.mjs` without `--synthetic-proxy`.
- Re-run `build_case_generation_jobs.mjs`, `export_generated_samples.mjs`, and
  `validate_dataset.mjs`.

## Gate 2: Human C4

Current status: blocked by missing real human-written AI-style samples.

Evidence:

- Current `C4` rows use `policy_label=compliant_proxy` and
  `origin_label=synthetic_proxy_origin`.
- The C4 proxy filler explicitly marks outputs as synthetic proxy and not
  human-origin.

Required before paper-ready use:

- Collect or write 10 short, 10 medium, and 10 long human-written AI-style
  samples without AI generation.
- Store consent/provenance notes for whether these samples can live in the repo.
- Replace C4 proxy outputs and re-run the build/export/audit pipeline.

## Gate 3: Detector Capacity

Current status: free dashboard routes are useful for smoke testing but not
enough for the 24-row pilot or 240-row main batch.

Evidence:

- Pangram free dashboard: four checks completed.
- Copyleaks free dashboard: five checks completed, then `0 Credits Left`.
- GPTZero Basic dashboard: one advanced scan completed, then `0 advanced scans
  left`.
- Originality.ai: no scan attempted because signup requires a credit card.

Required before paper-ready use:

- Obtain approved no-payment capacity, institutional credits, or API keys for at
  least the 24-row pilot.
- Avoid any personal wallet, credit-card, trial-renewal, checkout, or paid-credit
  flow unless separately approved by the user.
- Run detector outputs through the shared schema and aggregator.

## Gate 4: Public Dataset Licensing

Current status: source texts are useful internally, but redistribution decisions
remain open.

Evidence:

- Reddit and OpenReview seed texts need a redistribution/licensing decision.
- Project Gutenberg excerpts require care around terms, trademark notices, and
  non-US copyright status.

Required before public release:

- Decide whether public branches store raw seed text or metadata plus fetch
  scripts.
- Preserve source attribution and license notes in the manifest.

## Current Safe Claim

The safe claim today is:

> We built and audited a 240-row, 8-case stress-test pipeline and verified that
> no-payment dashboard outputs from Pangram, Copyleaks, and GPTZero can be
> normalized into the shared detector-output schema.

The unsafe claim today is:

> The detector experiment is complete or paper-ready.

## Next Execution Commands

When approved no-payment generation credentials are available:

```bash
GENERATION_API_KEY=... \
GENERATION_MODEL=... \
node data/detector-stress-test/scripts/run_generation_jobs.mjs
node data/detector-stress-test/scripts/build_case_generation_jobs.mjs
node data/detector-stress-test/scripts/export_generated_samples.mjs
node data/detector-stress-test/scripts/audit_paper_ready_gates.mjs
node data/detector-stress-test/scripts/validate_dataset.mjs
```

When real C4 human-written AI-style samples are available, save them to the
matching `texts/human_c4/c4_*.txt` paths, then run:

```bash
node data/detector-stress-test/scripts/import_c4_human_samples.mjs
node data/detector-stress-test/scripts/build_case_generation_jobs.mjs
node data/detector-stress-test/scripts/export_generated_samples.mjs
node data/detector-stress-test/scripts/audit_paper_ready_gates.mjs
node data/detector-stress-test/scripts/validate_dataset.mjs
```

When approved detector capacity is available for at least the 24-row pilot,
export a ready pilot manifest and run the selected detector importers/runners,
then aggregate:

```bash
node data/detector-stress-test/scripts/export_generated_samples.mjs \
  --limit-per-cell=1 \
  --output=samples-generated-pilot-ready.csv
SAMPLES_PATH=data/detector-stress-test/samples-generated-pilot-ready.csv \
DETECTOR_OUTPUTS_PATH=data/detector-stress-test/<detector-output-file>.csv \
OUTPUT_PATH=data/detector-stress-test/<detector-confusion-file>.csv \
node data/detector-stress-test/scripts/aggregate_detector_outputs.mjs
```
