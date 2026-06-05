# AI Generation Live Run Summary

Generated: 2026-06-05

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

## Provider

- Direct OpenAI key check: `gpt-5.5` was available from `/v1/models`.
- Direct OpenAI live smoke attempt: blocked by RPD limit (`Limit 50, Used 50`).
- Successful provider: OpenRouter OpenAI-compatible endpoint.
- Base URL: `https://openrouter.ai/api/v1`
- Requested model: `openai/gpt-5.5`
- Response model observed in smoke: `openai/gpt-5.5-20260423`

## Run Scope

Command shape:

```bash
GENERATION_BASE_URL=https://openrouter.ai/api/v1 \
GENERATION_PROVIDER=openrouter \
GENERATION_MODEL=openai/gpt-5.5 \
GENERATION_MAX_COMPLETION_TOKENS=5000 \
node data/detector-stress-test/scripts/run_generation_jobs.mjs --force-proxy-only
```

The API key was read from local macOS Keychain and was not written to disk.

## Results

| Item | Count |
| --- | ---: |
| Planned generation jobs | 180 |
| Live successful jobs | 180 |
| Missing job metadata | 0 |
| Exported ready sample rows | 180 |
| Remaining synthetic proxy rows | 60 |

The 180 ready rows cover `C1`, `C2`, `C3`, `N1`, `N2`, and `N3`.
The remaining 60 synthetic proxy rows are expected: `C4` requires human writing
and `N4` requires human light edits of matched live `N1` drafts.

## Cost

Actual OpenRouter usage from the current 180 job metadata files:

| Case | Jobs | Tokens | Cost USD |
| --- | ---: | ---: | ---: |
| C2 | 30 | 58,669 | 1.112595 |
| C3 | 30 | 60,582 | 1.102785 |
| N1 | 30 | 132,699 | 1.486470 |
| N2 | 30 | 61,829 | 1.031945 |
| N3 | 60 | 219,074 | 2.863350 |
| Total | 180 | 532,853 | 7.597145 |

## Verification

Commands run after generation:

```bash
node data/detector-stress-test/scripts/build_case_generation_jobs.mjs
node data/detector-stress-test/scripts/build_n4_human_edit_manifest.mjs
node data/detector-stress-test/scripts/build_prolific_n4_study_pack.mjs
node data/detector-stress-test/scripts/export_generated_samples.mjs
node data/detector-stress-test/scripts/audit_paper_ready_gates.mjs
node data/detector-stress-test/scripts/validate_dataset.mjs
node data/detector-stress-test/scripts/audit_generation_inputs_local.mjs
```

Observed results:

- `generated-samples.csv`: `ready=180`, `synthetic_proxy_ready=60`.
- `samples-generated-ready.csv`: 180 rows.
- `dataset-audit.md`: pass, 0 issues.
- `generation-input-local-audit.md`: pass, 0 missing root inputs.
- `n4-human-edit-manifest.csv` and `prolific/n4-editing-items.csv`: rebuilt
  from the matched live `N1` drafts.
- `paper-ready-gate-audit.md`: still `not_ready`, as expected, because `C4`,
  `N4`, and external detector coverage are not complete.

## Next Steps

1. Collect and import 30 C4 human-written AI-style samples.
2. Collect and import 30 N4 human light edits using the matched live `N1`
   drafts listed in `n4-human-edit-manifest.csv`.
3. Rebuild and rerun paper-ready gate audit.
4. Run selected external detectors on the approved ready sample set.
