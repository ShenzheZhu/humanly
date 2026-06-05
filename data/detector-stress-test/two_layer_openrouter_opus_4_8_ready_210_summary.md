# Two-Layer Metric Summary

Generated: 2026-06-05T21:30:19.282Z

Detector: `llm_claude_opus_4_8`

Samples: `data/detector-stress-test/samples-generated-ready.csv`

Outputs: `data/detector-stress-test/detector_outputs_openrouter_opus_4_8_ready_210.csv`

## Input Coverage

| Item | Count |
| --- | ---: |
| Sample rows | 210 |
| Successful detector rows | 210 |
| Missing detector rows | 0 |
| Request errors | 0 |

## Layer 1: Final-Text Document Class

Layer 1 compares the detector's three-class final-text judgment against
`expected_document_class`: `HUMAN_ONLY`, `MIXED`, or `AI_ONLY`.

| Metric | Value |
| --- | ---: |
| Correct | 76 |
| Incorrect | 134 |
| Accuracy | 0.3619 |

## Layer 2: Policy Compliance

Layer 2 maps detector output into policy evidence:
`HUMAN_ONLY -> human_compliant`; `MIXED` or `AI_ONLY -> ai_suspicious`.
It then compares against `policy_label` under the benchmark policy where AI
polish and translation are allowed, but substantive AI generation is not.

| Metric | Value |
| --- | ---: |
| TP | 36 |
| FP | 40 |
| TN | 80 |
| FN | 54 |
| Accuracy | 0.5524 |
| TPR | 0.4000 |
| FNR | 0.6000 |
| TNR | 0.6667 |
| FPR | 0.3333 |

## Output Files

- `data/detector-stress-test/two_layer_openrouter_opus_4_8_ready_210_document_by_case.csv`
- `data/detector-stress-test/two_layer_openrouter_opus_4_8_ready_210_document_confusion.csv`
- `data/detector-stress-test/two_layer_openrouter_opus_4_8_ready_210_policy_by_case.csv`
