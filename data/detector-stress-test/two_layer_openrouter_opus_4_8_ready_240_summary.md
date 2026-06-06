# Two-Layer Metric Summary

Generated: 2026-06-06T00:54:05.040Z

Detector: `llm_claude_opus_4_8`

Samples: `data/detector-stress-test/generated-samples.csv`

Outputs: `data/detector-stress-test/detector_outputs_openrouter_opus_4_8_ready_240.csv`

## Input Coverage

| Item | Count |
| --- | ---: |
| Sample rows | 240 |
| Successful detector rows | 240 |
| Missing detector rows | 0 |
| Request errors | 0 |

## Layer 1: Final-Text Document Class

Layer 1 compares the detector's three-class final-text judgment against
`expected_document_class`: `HUMAN_ONLY`, `MIXED`, or `AI_ONLY`.

| Metric | Value |
| --- | ---: |
| Correct | 82 |
| Incorrect | 158 |
| Accuracy | 0.3417 |

## Layer 2: Policy Compliance

Layer 2 maps detector output into policy evidence:
`HUMAN_ONLY -> human_compliant`; `MIXED` or `AI_ONLY -> ai_suspicious`.
It then compares against `policy_label` under the benchmark policy where AI
polish and translation are allowed, but substantive AI generation is not.

| Metric | Value |
| --- | ---: |
| TP | 47 |
| FP | 40 |
| TN | 80 |
| FN | 73 |
| Accuracy | 0.5292 |
| TPR | 0.3917 |
| FNR | 0.6083 |
| TNR | 0.6667 |
| FPR | 0.3333 |

## Output Files

- `data/detector-stress-test/two_layer_openrouter_opus_4_8_ready_240_document_by_case.csv`
- `data/detector-stress-test/two_layer_openrouter_opus_4_8_ready_240_document_confusion.csv`
- `data/detector-stress-test/two_layer_openrouter_opus_4_8_ready_240_policy_by_case.csv`
