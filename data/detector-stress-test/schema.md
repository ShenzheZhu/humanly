# Detector Stress Test Data Schema

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

This schema is for final-text detector outputs. It intentionally separates
final-text detector judgments from Humanly process evidence.

The execution plan is in `experiment-plan.md`.

## File Layout

Use one row per `(sample_id, detector)` pair.

Suggested files:

- `samples.csv`: sample metadata and ground-truth labels.
- `detector_outputs.csv`: detector-level raw outputs.
- `confusion_by_case.csv`: aggregate metrics by case.
- `notes.md`: manual notes about detector APIs, failures, thresholds, and
  licensing.

## `samples.csv`

| Column | Type | Description |
| --- | --- | --- |
| `sample_id` | string | Stable sample id, e.g. `c1_001` |
| `case_id` | string | One of `C1`, `C2`, `C3`, `C4`, `N1`, `N2`, `N3`, `N4` |
| `case_name` | string | Human-readable case name |
| `policy_label` | enum | `compliant` or `non_compliant` under the benchmark policy |
| `origin_label` | enum | `human_origin`, `ai_origin`, or `mixed_ai_origin` |
| `final_text_path` | string | Path to final text file, if stored separately |
| `source_text_path` | string | Path to source draft/text, if applicable |
| `construction_notes` | string | Short construction summary |
| `license_notes` | string | Source/license note for the text |
| `word_count` | integer | Final text word count |

## `detector_outputs.csv`

| Column | Type | Description |
| --- | --- | --- |
| `sample_id` | string | Links to `samples.csv` |
| `detector` | string | `gptzero`, `pangram`, `copyleaks`, `originality_ai`, etc. |
| `detector_version` | string | API/model/version when available |
| `run_timestamp_utc` | datetime | Run timestamp |
| `raw_label` | string | Provider's native label |
| `raw_score_json` | JSON string | Provider-specific score payload |
| `ai_probability` | number/null | Normalized AI probability when available |
| `binary_prediction` | enum | `ai_suspicious` or `human_compliant` |
| `threshold_rule` | string | Rule used to map raw output to binary prediction |
| `request_status` | enum | `success`, `api_error`, `manual_unavailable`, `skipped` |
| `error_notes` | string | Error details or manual caveats |

## Metric Definitions

For the benchmark policy:

- Positive class: `non_compliant` / AI-origin substantive generation.
- Negative class: `compliant` / human-origin or policy-allowed AI assistance.

| Metric | Definition |
| --- | --- |
| `TPR` | Non-compliant samples predicted as `ai_suspicious` |
| `FNR` | Non-compliant samples predicted as `human_compliant` |
| `TNR` | Compliant samples predicted as `human_compliant` |
| `FPR` | Compliant samples predicted as `ai_suspicious` |

The paper should emphasize failure patterns by case, not only aggregate metrics.
