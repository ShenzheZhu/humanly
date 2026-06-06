# Two-Layer Metric Summary

Generated: 2026-06-06T00:53:20.828Z

Detector: `llm_claude_opus_4_8`

Samples: `data/detector-stress-test/samples-generated-ready-n4.csv`

Outputs: `data/detector-stress-test/detector_outputs_openrouter_opus_4_8_n4.csv`

## Input Coverage

| Item | Count |
| --- | ---: |
| Sample rows | 30 |
| Successful detector rows | 30 |
| Missing detector rows | 0 |
| Request errors | 0 |

## Layer 1: Final-Text Document Class

Layer 1 compares the detector's three-class final-text judgment against
`expected_document_class`: `HUMAN_ONLY`, `MIXED`, or `AI_ONLY`.

| Metric | Value |
| --- | ---: |
| Correct | 6 |
| Incorrect | 24 |
| Accuracy | 0.2000 |

## Layer 2: Policy Compliance

Layer 2 maps detector output into policy evidence:
`HUMAN_ONLY -> human_compliant`; `MIXED` or `AI_ONLY -> ai_suspicious`.
It then compares against `policy_label` under the benchmark policy where AI
polish and translation are allowed, but substantive AI generation is not.

| Metric | Value |
| --- | ---: |
| TP | 11 |
| FP | 0 |
| TN | 0 |
| FN | 19 |
| Accuracy | 0.3667 |
| TPR | 0.3667 |
| FNR | 0.6333 |
| TNR |  |
| FPR |  |

## Output Files

- `data/detector-stress-test/two_layer_openrouter_opus_4_8_n4_document_by_case.csv`
- `data/detector-stress-test/two_layer_openrouter_opus_4_8_n4_document_confusion.csv`
- `data/detector-stress-test/two_layer_openrouter_opus_4_8_n4_policy_by_case.csv`
