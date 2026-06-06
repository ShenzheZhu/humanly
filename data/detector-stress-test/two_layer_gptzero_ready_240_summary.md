# Two-Layer Metric Summary

Generated: 2026-06-06T16:54:01.631Z

Detector: `gptzero`

Samples: `data/detector-stress-test/generated-samples.csv`

Outputs: `data/detector-stress-test/detector_outputs_gptzero_ready_240.csv`

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
| Correct | 114 |
| Incorrect | 126 |
| Accuracy | 0.4750 |

## Layer 2: Policy Compliance

Layer 2 maps detector output into policy evidence:
`HUMAN_ONLY -> human_compliant`; `MIXED` or `AI_ONLY -> ai_suspicious`.
It then compares against `policy_label` under the benchmark policy where AI
polish and translation are allowed, but substantive AI generation is not.

| Metric | Value |
| --- | ---: |
| TP | 117 |
| FP | 32 |
| TN | 88 |
| FN | 3 |
| Accuracy | 0.8542 |
| TPR | 0.9750 |
| FNR | 0.0250 |
| TNR | 0.7333 |
| FPR | 0.2667 |

## Output Files

- `data/detector-stress-test/two_layer_gptzero_ready_240_document_by_case.csv`
- `data/detector-stress-test/two_layer_gptzero_ready_240_document_confusion.csv`
- `data/detector-stress-test/two_layer_gptzero_ready_240_policy_by_case.csv`
