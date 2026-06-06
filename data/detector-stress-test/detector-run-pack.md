# Detector Run Pack

Generated: 2026-06-06T00:56:05.971Z

This run pack turns the current detector stress-test artifacts into execution
queues. It does not call detector APIs. The current generated sample manifest
contains ready final texts for all 240 samples; source-rights/public-release
review and paid detector coverage are tracked separately.

## Files

- `detector-run-pack-pilot-manifest.csv`: the 24 one-per-case/length pilot
  samples.
- `detector-run-pack-pilot-queue.csv`: 72 detector/sample rows for the 24-cell
  pilot across Pangram, GPTZero, and the Claude Opus 4.8 LLM baseline.
- `detector-run-pack-main-queue.csv`: 720 detector/sample rows for the
  240-sample main batch across the same three detectors.
- `detector-run-pack-summary.json`: machine-readable counts and coverage.

## Pilot Sample Readiness

| Readiness | Count |
| --- | ---: |
| text_ready_rights_pending | 7 |
| ready | 14 |
| not_paper_ready | 3 |

## Current Pilot Detector Coverage

| Detector | Already covered | Missing |
| --- | ---: | ---: |
| pangram | 0/24 | 24/24 |
| gptzero | 0/24 | 24/24 |
| llm_claude_opus_4_8 | 0/24 | 24/24 |

## How To Use

1. Use the pilot manifest to inspect the 24 intended case/length cells.
2. Use the pilot queue to track the selected v1 API detector/sample pairs.
   Historical dashboard smoke tests are documented separately and do not count
   as paper-ready API coverage.
3. For paper-ready runs, use the current ready final texts and preserve the
   private provenance records for human-collected C4 and N4 rows outside the
   public dataset.
4. Run detectors only after explicit capacity/spend approval.
5. Store raw detector responses under `outputs/raw/<detector>/` and normalize
   into the detector-output schema before aggregating confusion matrices.

## Current Interpretation

The execution queue and final texts are ready. Remaining blockers for external
detector reporting are approved detector capacity and source-rights/public
release review for rows whose source notes require it.
