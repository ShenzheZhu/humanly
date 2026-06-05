# Detector Stress Test Data Schema

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

This schema is for final-text detector outputs. It intentionally separates
final-text detector judgments from Humanly process evidence.

The execution plan is in `experiment-plan.md`.

## File Layout

Use one row per `(sample_id, detector)` pair.

Suggested files:

- `samples.csv`: sample metadata and ground-truth labels.
- `generated-samples.csv`: generation-plan metadata for the 8-case sample pool;
  includes readiness columns while outputs are still being constructed.
- `samples-generated-proxy.csv`: 240-row full proxy export for no-credit smoke
  tests.
- `samples-generated-pilot-proxy.csv`: 24-row one-per-case/length proxy subset
  for detector/API pilot tests.
- `case-generation-jobs.jsonl`: one generation/transformation job per pending
  automated step.
- `case-generation-job-results.csv`: status summary from the job runner.
- `detector_outputs.csv`: detector-level raw outputs.
- `confusion_by_case.csv`: aggregate metrics by case.
- `confusion_by_case_aggregated.csv`: generated aggregate metrics by detector,
  case, and length bucket.
- `notes.md`: manual notes about detector APIs, failures, thresholds, and
  licensing.

## `samples.csv`

| Column | Type | Description |
| --- | --- | --- |
| `sample_id` | string | Stable sample id, e.g. `c1_001` |
| `case_id` | string | One of `C1`, `C2`, `C3`, `C4`, `N1`, `N2`, `N3`, `N4` |
| `case_name` | string | Human-readable case name |
| `matched_set_id` | string | Links cases that share the same task prompt, topic, and length bucket |
| `prompt_id` | string | Stable prompt identifier |
| `task_type` | enum | `social_media_post`, `student_assignment_response`, `paper_review`, or `technical_dry_run` |
| `length_bucket` | enum | `short`, `medium`, or `long` |
| `seed_id` | string/null | Human seed identifier when the sample is seed-derived |
| `seed_type` | enum/null | `human_english`, `human_non_english`, `human_ai_style`, `ai_generated`, or `none` |
| `seed_language` | string/null | Source seed language, e.g. `en`, `zh`, `fr`, or blank |
| `seed_text_path` | string/null | Path to the seed text before transformation, when applicable |
| `policy_label` | enum | `compliant` or `non_compliant` under the benchmark policy |
| `origin_label` | enum | `human_origin`, `ai_origin`, or `mixed_ai_origin` |
| `final_text_path` | string | Path to final text file, if stored separately |
| `source_text_path` | string | Path to source draft/text, if applicable |
| `construction_notes` | string | Short construction summary |
| `license_notes` | string | Source/license note for the text |
| `word_count` | integer | Final text word count |

`generated-samples.csv` extends the same schema with:

| Column | Type | Description |
| --- | --- | --- |
| `sample_status` | enum | `ready`, `pending_generation`, `pending_human_collection`, or `synthetic_proxy_ready` |
| `generation_job_ids` | string | Semicolon-separated job ids in `case-generation-jobs.jsonl` |
| `approval_required` | enum | `yes` when the sample needs human collection/approval before use |

Do not feed `pending_generation` or `pending_human_collection` rows to detector
runners. `synthetic_proxy_ready` rows may be used for pipeline smoke tests, but
not as paper-ready evidence. Once all required final-text files exist and
provenance metadata is accepted, export the ready subset into `samples.csv` or
point detector runners at an explicitly approved generated-sample file.

The generated-sample manifest may use `policy_label=compliant_proxy` and
`origin_label=synthetic_proxy_origin` for C4 synthetic proxy rows. These labels
exist only to keep automation honest; they should not be counted as true
human-origin C4 samples in paper results.

## `case-generation-jobs.jsonl`

One JSON object per transformation job. Important fields:

| Field | Type | Description |
| --- | --- | --- |
| `job_id` | string | Stable job id |
| `sample_id` | string | Target sample id in `generated-samples.csv` |
| `case_id` | string | One of `C2`, `C3`, `N1`, `N2`, or `N3`; `C1` is copied directly, `C4` is human-collected, and `N4` reuses the matched `N1` draft before human light editing |
| `job_type` | enum | `chat_completion` or `scripted_light_edit` |
| `requires_api` | boolean | Whether a live OpenAI-compatible API call is required |
| `dependency_job_ids` | string[] | Jobs whose output files must exist before this job can run |
| `input_text_path` | string | Input prompt/source path |
| `output_text_path` | string | Output text path |
| `prompt_template` | string | Prompt template; `{{INPUT_TEXT}}` is replaced by the input text |
| `input_text_sha256` | string | Optional hash of the current input source when the queue was built. The runner writes/compares hash metadata so old outputs are not reused after prompt/source changes |

## `detector_outputs.csv`

| Column | Type | Description |
| --- | --- | --- |
| `sample_id` | string | Links to `samples.csv` |
| `detector` | string | `pangram`, `gptzero`, `llm_claude_opus_4_8`, etc. |
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
Report detector behavior by both case and length bucket because final-text
detector outputs may be sensitive to text length.

## `confusion_by_case_aggregated.csv`

| Column | Type | Description |
| --- | --- | --- |
| `detector` | string | Detector name from `detector_outputs.csv` |
| `case_id` | string | One of `C1`, `C2`, `C3`, `C4`, `N1`, `N2`, `N3`, `N4` |
| `length_bucket` | enum | `short`, `medium`, or `long` |
| `n` | integer | Successful detector outputs included in metric denominators |
| `total_samples` | integer | Expected sample count for that detector/case/length cell |
| `TP` / `FP` / `TN` / `FN` | integer | Confusion counts over successful detector outputs |
| `TPR` / `FPR` / `TNR` / `FNR` | number/null | Rate values computed from the confusion counts |
| `request_errors` | integer | API or normalization failures excluded from metric denominators |
| `skipped` | integer | Missing or explicitly skipped detector outputs |
| `notes` | string | Caveats, including synthetic-proxy status |
