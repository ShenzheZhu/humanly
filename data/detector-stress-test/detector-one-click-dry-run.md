# Detector One-Click Dry Run Report

Generated: 2026-06-05T05:23:07.774Z

Mode: **dry-run mock, no network/API spend**

## Inputs and Outputs

| Item | Path / Count |
| --- | --- |
| Sample manifest | `samples-generated-pilot-proxy.csv` |
| Detector outputs | `detector_outputs_one_click_dry_run.csv` |
| Detector output rows | 72 |
| Aggregated confusion | `confusion_by_case_one_click_dry_run.csv` |
| Aggregated rows | 72 |
| Cost-estimate rows | 9 |

## Detector Set

| Detector | Mode |
| --- | --- |
| Pangram | mock dry run |
| GPTZero | mock dry run |
| Claude Opus 4.8 LLM baseline | mock dry run |

## Commands

### node data/detector-stress-test/scripts/estimate_detector_vendor_costs.mjs

```text
wrote data/detector-stress-test/detector-vendor-cost-estimate.csv
wrote data/detector-stress-test/detector-vendor-cost-estimate.md
```

### node data/detector-stress-test/scripts/build_detector_run_pack.mjs

```text
pilot samples: 24
pilot queue rows: 72
main queue rows: 720
pangram: 0/24 pilot rows covered
gptzero: 0/24 pilot rows covered
llm_claude_opus_4_8: 0/24 pilot rows covered
wrote data/detector-stress-test/detector-run-pack-pilot-manifest.csv
wrote data/detector-stress-test/detector-run-pack-pilot-queue.csv
wrote data/detector-stress-test/detector-run-pack-main-queue.csv
wrote data/detector-stress-test/detector-run-pack.md
```

### node data/detector-stress-test/scripts/run_pangram_detector.mjs --samples=/Users/zhu/Desktop/research/Humanly/humanly-code/data/detector-stress-test/samples-generated-pilot-proxy.csv --outputs=/Users/zhu/Desktop/research/Humanly/humanly-code/data/detector-stress-test/detector_outputs_one_click_dry_run.csv --dry-run

```text
pangram: wrote 24 row(s) to data/detector-stress-test/detector_outputs_one_click_dry_run.csv
```

### node data/detector-stress-test/scripts/run_gptzero_detector.mjs --samples=/Users/zhu/Desktop/research/Humanly/humanly-code/data/detector-stress-test/samples-generated-pilot-proxy.csv --outputs=/Users/zhu/Desktop/research/Humanly/humanly-code/data/detector-stress-test/detector_outputs_one_click_dry_run.csv --dry-run

```text
gptzero: wrote 24 row(s) to data/detector-stress-test/detector_outputs_one_click_dry_run.csv
```

### node data/detector-stress-test/scripts/run_llm_detector_baseline.mjs --samples=/Users/zhu/Desktop/research/Humanly/humanly-code/data/detector-stress-test/samples-generated-pilot-proxy.csv --outputs=/Users/zhu/Desktop/research/Humanly/humanly-code/data/detector-stress-test/detector_outputs_one_click_dry_run.csv --dry-run

```text
llm_claude_opus_4_8: wrote 24 row(s) to data/detector-stress-test/detector_outputs_one_click_dry_run.csv
```

### node data/detector-stress-test/scripts/aggregate_detector_outputs.mjs --samples=/Users/zhu/Desktop/research/Humanly/humanly-code/data/detector-stress-test/samples-generated-pilot-proxy.csv --outputs=/Users/zhu/Desktop/research/Humanly/humanly-code/data/detector-stress-test/detector_outputs_one_click_dry_run.csv --output=/Users/zhu/Desktop/research/Humanly/humanly-code/data/detector-stress-test/confusion_by_case_one_click_dry_run.csv

```text
read 24 sample(s)
read 72 detector output row(s)
aggregated 72 detector/case/length row(s)
wrote data/detector-stress-test/confusion_by_case_one_click_dry_run.csv
```

### node data/detector-stress-test/scripts/validate_dataset.mjs

```text
dataset audit status: pass
issues: 0
wrote data/detector-stress-test/dataset-audit.md
wrote data/detector-stress-test/dataset-audit.json
```

## Interpretation

This report verifies script plumbing only when run in dry-run mode. It proves
that the current sample manifest can be read, three detector-normalized output
sets can be written, raw JSON can be stored, confusion rows can be aggregated,
and the dataset validator still passes. Dry-run rows are deterministic mock
scores and must not be reported as detector evidence.

Live mode uses the same runner sequence but requires all three API credentials
and `--confirm-spend=YES`.
