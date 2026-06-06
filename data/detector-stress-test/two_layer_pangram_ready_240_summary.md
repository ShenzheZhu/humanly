# Two-Layer Metric Summary

Generated: 2026-06-06T16:50:31.651Z

Detector: `pangram`

Samples: `data/detector-stress-test/generated-samples.csv`

Outputs: `data/detector-stress-test/detector_outputs_pangram_ready_240.csv`

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
| Correct | 109 |
| Incorrect | 131 |
| Accuracy | 0.4542 |

## Layer 2: Policy Compliance

Layer 2 maps detector output into policy evidence:
`HUMAN_ONLY -> human_compliant`; `MIXED` or `AI_ONLY -> ai_suspicious`.
It then compares against `policy_label` under the benchmark policy where AI
polish and translation are allowed, but substantive AI generation is not.

| Metric | Value |
| --- | ---: |
| TP | 118 |
| FP | 30 |
| TN | 90 |
| FN | 2 |
| Accuracy | 0.8667 |
| TPR | 0.9833 |
| FNR | 0.0167 |
| TNR | 0.7500 |
| FPR | 0.2500 |

## Output Files

- `data/detector-stress-test/two_layer_pangram_ready_240_document_by_case.csv`
- `data/detector-stress-test/two_layer_pangram_ready_240_document_confusion.csv`
- `data/detector-stress-test/two_layer_pangram_ready_240_policy_by_case.csv`
