# N4 Prolific ATB Runbook

Date prepared: 2026-06-05

This runbook prepares the N4 human-edited AI-draft collection. It creates three
separate Prolific AI Task Builder Batch draft studies:

| Arm | Rows | Expected places | Estimated time | Reward |
| --- | ---: | ---: | ---: | ---: |
| short | 10 | 10 | 5 minutes | $2.50 |
| medium | 10 | 10 | 18 minutes | $3.60 |
| long | 10 | 10 | 50 minutes | $10.00 |

The studies use `tasks_per_group=1` and `annotators_per_task=1`, so each
participant edits exactly one AI draft.

## Files

- `n4-atb-short-items.csv`
- `n4-atb-medium-items.csv`
- `n4-atb-long-items.csv`
- `n4-atb-short-payloads.json`
- `n4-atb-medium-payloads.json`
- `n4-atb-long-payloads.json`
- `n4-editing-study-plan.md`
- `n4-editing-budget-estimate.csv`

## Draft Study Creation

Do not add `--publish` unless the project owner explicitly asks to launch paid
collection.

```bash
export PROLIFIC_API_TOKEN="$(security find-generic-password -s prolific_api_token -a zhu -w 2>/dev/null || true)"
export PROLIFIC_WORKSPACE_ID="6908d8f4e12fe1baa26bec1c"
export PROLIFIC_PROJECT_ID="6908d9912e9daef7ce2f6889"
```

```bash
python3 /Users/zhu/.codex/skills/prolific-human-validation/scripts/create_atb_study.py \
  --workspace-id "$PROLIFIC_WORKSPACE_ID" \
  --project-id "$PROLIFIC_PROJECT_ID" \
  --dataset-csv data/detector-stress-test/prolific/n4-atb-short-items.csv \
  --payloads data/detector-stress-test/prolific/n4-atb-short-payloads.json \
  --ids-output data/detector-stress-test/prolific/n4-atb-short-created-ids.json
```

```bash
python3 /Users/zhu/.codex/skills/prolific-human-validation/scripts/create_atb_study.py \
  --workspace-id "$PROLIFIC_WORKSPACE_ID" \
  --project-id "$PROLIFIC_PROJECT_ID" \
  --dataset-csv data/detector-stress-test/prolific/n4-atb-medium-items.csv \
  --payloads data/detector-stress-test/prolific/n4-atb-medium-payloads.json \
  --ids-output data/detector-stress-test/prolific/n4-atb-medium-created-ids.json
```

```bash
python3 /Users/zhu/.codex/skills/prolific-human-validation/scripts/create_atb_study.py \
  --workspace-id "$PROLIFIC_WORKSPACE_ID" \
  --project-id "$PROLIFIC_PROJECT_ID" \
  --dataset-csv data/detector-stress-test/prolific/n4-atb-long-items.csv \
  --payloads data/detector-stress-test/prolific/n4-atb-long-payloads.json \
  --ids-output data/detector-stress-test/prolific/n4-atb-long-created-ids.json
```

After creating drafts, verify in the Prolific UI:

- each study is unpublished
- each dataset has 10 rows
- each batch has 10 tasks and 10 task groups
- each study has 10 total places
- rewards and estimated times match the table above
- a preview task shows only `Draft` on the left, and on the right
  shows the free-text edit box plus the no-additional-AI confirmation

## Pull Results

After studies finish, pull each ATB report:

```bash
python3 /Users/zhu/.codex/skills/prolific-human-validation/scripts/pull_atb_results.py \
  --ids data/detector-stress-test/prolific/n4-atb-short-created-ids.json \
  --status-output data/detector-stress-test/prolific/n4-atb-short-status.json \
  --responses-output data/detector-stress-test/prolific/n4-atb-short-responses.json \
  --report-output data/detector-stress-test/prolific/n4-atb-short-report.csv
```

```bash
python3 /Users/zhu/.codex/skills/prolific-human-validation/scripts/pull_atb_results.py \
  --ids data/detector-stress-test/prolific/n4-atb-medium-created-ids.json \
  --status-output data/detector-stress-test/prolific/n4-atb-medium-status.json \
  --responses-output data/detector-stress-test/prolific/n4-atb-medium-responses.json \
  --report-output data/detector-stress-test/prolific/n4-atb-medium-report.csv
```

```bash
python3 /Users/zhu/.codex/skills/prolific-human-validation/scripts/pull_atb_results.py \
  --ids data/detector-stress-test/prolific/n4-atb-long-created-ids.json \
  --status-output data/detector-stress-test/prolific/n4-atb-long-status.json \
  --responses-output data/detector-stress-test/prolific/n4-atb-long-responses.json \
  --report-output data/detector-stress-test/prolific/n4-atb-long-report.csv
```

## Import Results

Normalize the three ATB reports into the existing N4 import format:

```bash
node data/detector-stress-test/scripts/normalize_n4_prolific_atb_reports.mjs \
  --input-csv=data/detector-stress-test/prolific/n4-atb-short-report.csv \
  --input-csv=data/detector-stress-test/prolific/n4-atb-medium-report.csv \
  --input-csv=data/detector-stress-test/prolific/n4-atb-long-report.csv \
  --output-csv=data/detector-stress-test/prolific/n4-atb-edited-texts.csv
```

Import and promote N4:

```bash
node data/detector-stress-test/scripts/import_n4_human_edits_from_csv.mjs \
  --input-csv=data/detector-stress-test/prolific/n4-atb-edited-texts.csv
```

Then rebuild/evaluate the dataset:

```bash
node data/detector-stress-test/scripts/build_case_generation_jobs.mjs
node data/detector-stress-test/scripts/build_detector_run_pack.mjs
node data/detector-stress-test/scripts/audit_paper_ready_gates.mjs
node data/detector-stress-test/scripts/validate_dataset.mjs
```
