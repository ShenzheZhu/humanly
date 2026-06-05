# OpenRouter Claude Opus 4.8 LLM Baseline Pilot

Generated: 2026-06-05

## Run

| Item | Value |
| --- | ---: |
| Model | `anthropic/claude-opus-4.8` |
| Provider | OpenRouter Chat Completions |
| Sample manifest | `samples-generated-pilot-proxy.csv` |
| Samples | 24 |
| Request status | 24 success, 0 errors |
| Detector outputs | `detector_outputs_openrouter_opus_4_8_pilot.csv` |
| Aggregated confusion | `confusion_by_case_openrouter_opus_4_8_pilot.csv` |

## Result Summary

| Metric | Count |
| --- | ---: |
| `human_compliant` predictions | 9 |
| `ai_suspicious` predictions | 15 |
| TP | 10 |
| FP | 5 |
| TN | 7 |
| FN | 2 |
| Request errors | 0 |
| Skipped | 0 |

## Usage and Cost

OpenRouter returned usage for all 24 requests:

| Item | Value |
| --- | ---: |
| Input tokens | 33,910 |
| Output tokens | 2,017 |
| Total tokens | 35,927 |
| Reported cost | `$0.219975` |

## Caveat

This is a live LLM-baseline systems test over the current 24-row pilot proxy
manifest. It is useful for validating the OpenRouter runner and observing
baseline behavior, but it is not paper-ready evidence yet because most pilot
rows still use synthetic proxy text. Paper-ready use requires replacing proxy
rows with approved live generations, C4 human-written AI-style samples, and N4
human-edited AI-draft samples.
