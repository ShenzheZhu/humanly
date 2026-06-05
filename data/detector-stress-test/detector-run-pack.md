# Detector Run Pack

Generated: 2026-06-05T18:48:50.556Z

This run pack turns the current detector stress-test artifacts into execution
queues. It does not call detector APIs and it does not make proxy samples
paper-ready. Rows marked `synthetic_proxy_ready` are still suitable only for
pipeline smoke testing until live generation or human collection replaces them.

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
| text_ready_rights_pending | 4 |
| ready | 14 |
| not_paper_ready | 6 |

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
3. For paper-ready runs, first replace synthetic proxy samples:
   - C2/C3/N1/N2/N3 need approved live generation outputs.
   - C4 needs human-written AI-style samples.
   - N4 needs approved live AI drafts plus human light-edited final texts.
4. Run detectors only after explicit capacity/spend approval.
5. Store raw detector responses under `outputs/raw/<detector>/` and normalize
   into the detector-output schema before aggregating confusion matrices.

## Current Interpretation

The execution queue is ready, but the evaluation evidence is not yet
paper-ready. The largest blockers are still live generation, C4 human
collection, N4 human edit collection, and approved detector capacity.
