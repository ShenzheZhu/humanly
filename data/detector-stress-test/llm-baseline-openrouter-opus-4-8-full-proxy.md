# OpenRouter Claude Opus 4.8 LLM Baseline Full Proxy Run

Generated: 2026-06-05

## Run

| Item | Value |
| --- | ---: |
| Model | `anthropic/claude-opus-4.8` |
| Provider | OpenRouter Chat Completions |
| Sample manifest | `samples-generated-proxy.csv` |
| Samples | 240 |
| Request status | 240 success, 0 errors |
| Detector outputs | `detector_outputs_openrouter_opus_4_8_full_proxy.csv` |
| Aggregated confusion | `confusion_by_case_openrouter_opus_4_8_full_proxy.csv` |

## Result Summary

| Metric | Count |
| --- | ---: |
| `human_compliant` predictions | 89 |
| `ai_suspicious` predictions | 151 |
| TP | 101 |
| FP | 50 |
| TN | 70 |
| FN | 19 |
| Request errors | 0 |
| Skipped | 0 |

Overall rates over successful rows:

| Metric | Rate |
| --- | ---: |
| TPR | 84.17% |
| FNR | 15.83% |
| TNR | 58.33% |
| FPR | 41.67% |

## By Case

| Case | n | TP | FP | TN | FN |
| --- | ---: | ---: | ---: | ---: | ---: |
| C1 | 30 | 0 | 0 | 30 | 0 |
| C2 | 30 | 0 | 0 | 30 | 0 |
| C3 | 30 | 0 | 20 | 10 | 0 |
| C4 | 30 | 0 | 30 | 0 | 0 |
| N1 | 30 | 26 | 0 | 0 | 4 |
| N2 | 30 | 20 | 0 | 0 | 10 |
| N3 | 30 | 28 | 0 | 0 | 2 |
| N4 | 30 | 27 | 0 | 0 | 3 |

## Usage and Cost

OpenRouter returned usage for all 240 requests:

| Item | Value |
| --- | ---: |
| Input tokens | 340,243 |
| Output tokens | 20,458 |
| Total tokens | 360,701 |
| Reported cost | `$2.212665` |

## Caveat

This is a live LLM-baseline systems test over the current 240-row full proxy
manifest. It validates that the OpenRouter runner can process the complete
planned sample table and produce normalized detector outputs. It is not
paper-ready evidence yet because most rows still use synthetic proxy text.
Paper-ready use requires replacing proxy rows with approved live generations,
C4 human-written AI-style samples, and N4 human-edited AI-draft samples.
