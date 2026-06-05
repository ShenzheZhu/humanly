# Pangram Free Dashboard Smoke Test

Run date: 2026-06-04

This is a no-payment external-detector smoke test using the Pangram dashboard
free plan. The dashboard showed `Currently on Free`, `Available 4/4`, and the
pricing page stated `4 Credits / day`, `Free`, and `no payment method needed`
before the run. No plan upgrade, trial, purchase, checkout, wallet, or payment
method flow was opened.

## Purpose

The goal was to confirm that at least one external final-text detector can be
run end to end and normalized into the shared detector-output schema. This is
not paper-ready evidence because it uses only four free dashboard checks and
includes synthetic proxy samples.

## Samples

| Sample | Case | Length | Policy label | Sample status | Pangram label | Pangram score |
| --- | --- | --- | --- | --- | --- | --- |
| `c1_short_01` | `C1` | short | compliant | ready | human_compliant | 100% human |
| `c3_short_01` | `C3` | short | compliant | synthetic_proxy_ready | ai_suspicious | 100% AI |
| `n1_short_01` | `N1` | short | non_compliant | synthetic_proxy_ready | ai_suspicious | 100% AI |
| `n2_short_01` | `N2` | short | non_compliant | synthetic_proxy_ready | ai_suspicious | 100% AI |

## Output Files

- `samples-pangram-free-dashboard-smoke.csv`
- `detector_outputs_pangram_free_dashboard_smoke.csv`
- `confusion_by_case_pangram_free_dashboard_smoke.csv`
- `outputs/raw/pangram_free_dashboard/*.json`

## Interpretation

The smoke test confirms that a dashboard-based external detector result can be
captured, normalized, and aggregated by the same scripts used for API outputs.
The `C3` row behaves like a false positive under the benchmark policy, but this
cannot be reported as a paper-ready false positive because the current `C3`
final text is a synthetic proxy translation rather than a verified
human-origin translation sample.

Paper-ready Pangram evidence still requires either API credits or enough
approved free/manual checks to cover the selected sample cells, plus replacement
of proxy rows with approved generated/human-collected samples where needed.
