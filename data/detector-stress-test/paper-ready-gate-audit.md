# Paper-Ready Gate Audit

Generated: 2026-06-05T18:28:45.353Z

Overall status: **not_ready**

## Counts

| Item | Count |
| --- | ---: |
| Generated sample rows | 240 |
| Pilot proxy sample rows | 24 |
| Combined dashboard smoke samples | 5 |
| Combined dashboard detector rows | 10 |
| Synthetic proxy rows | 60 |
| C4 human ready rows | 0 |
| N4 human-edited ready rows | 0 |
| External dashboard covered case/length cells | 5/24 |

## Gates

### Seed library has 10 items per length bucket for English and translation seeds

- Gate id: `seed_library_size`
- Status: **passed**
- Evidence:
  - English seed rows: 30
  - Translation seed rows: 30
- Required next step: Keep source manifests stable and resolve public redistribution policy.

### 8-case matrix has 240 planned rows

- Gate id: `eight_case_matrix`
- Status: **passed**
- Evidence:
  - Generated rows: 240
  - Rows by case: {"C1":30,"C2":30,"C3":30,"C4":30,"N1":30,"N2":30,"N3":30,"N4":30}
- Required next step: Maintain the 8 cases x 3 lengths x 10 rows invariant.

### Generated rows are live/API or approved human outputs rather than synthetic proxy outputs

- Gate id: `live_generation`
- Status: **not_ready**
- Evidence:
  - Rows marked synthetic_proxy_ready: 60
  - Rows with synthetic_proxy metadata: 60
  - Ready rows with synthetic_proxy metadata: 0
- Required next step: Run approved live generation without --synthetic-proxy and rebuild the generated sample manifest.

### C4 has 30 human-written AI-style ready rows

- Gate id: `human_c4`
- Status: **not_ready**
- Evidence:
  - C4 rows: 30
  - C4 human ready rows: 0
  - Policy labels: {"compliant":90,"compliant_proxy":30,"non_compliant":120}
- Required next step: Collect 10 short, 10 medium, and 10 long human-written AI-style C4 samples.

### N4 has 30 human-edited AI-draft ready rows

- Gate id: `human_n4`
- Status: **not_ready**
- Evidence:
  - N4 rows: 30
  - N4 final rows with human_edited_ai_draft metadata: 0
  - N4 rows with live/non-proxy AI draft metadata: 30
  - N4 paper-ready rows: 0
- Required next step: Generate 10 short, 10 medium, and 10 long live AI drafts, then collect matching human light edits.

### External detector coverage reaches the 24-row one-per-case/length pilot

- Gate id: `pilot_detector_coverage`
- Status: **not_ready**
- Evidence:
  - Dashboard smoke sample rows: 5
  - Covered case/length cells: 5/24
  - Detector rows by detector: {"pangram_free_dashboard":4,"copyleaks_free_dashboard":5,"gptzero_free_dashboard":1}
- Required next step: Obtain approved free capacity, institutional credits, or API keys for at least 24 pilot cells.

### External detector coverage reaches the 240-row main batch

- Gate id: `main_detector_coverage`
- Status: **not_ready**
- Evidence:
  - Combined dashboard detector rows: 10
  - Main batch target rows per detector: 240
- Required next step: Run selected detectors over the approved 240-row paper-ready sample set.


## Interpretation

This audit is intentionally stricter than the smoke-test dataset audit. It asks
whether the current detector stress-test artifacts are ready to be reported as
paper evidence. A `not_ready` status is expected while live generation,
human-written C4 samples, human-edited N4 samples, and full external-detector
capacity are still missing.
