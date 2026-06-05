# GPTZero Free Dashboard Smoke Test

Run date: 2026-06-04

This is a no-payment external-detector smoke test using the GPTZero dashboard
Basic plan. Onboarding selected the free Basic path and explicitly avoided the
Premium free trial because the page stated it would renew into a paid monthly
plan. No upgrade, trial, checkout, wallet, or payment method flow was opened.

## Purpose

The goal was to test whether GPTZero dashboard output can be captured and
normalized into the shared detector-output schema without paid API access. The
Basic dashboard allowed one advanced AI scan, then showed `0 advanced scans
left`; the run stopped there to avoid any paid or trial flow.

## Samples

| Sample | Case | Length | Policy label | Sample status | GPTZero label | GPTZero score |
| --- | --- | --- | --- | --- | --- | --- |
| `c1_short_01` | `C1` | short | compliant | ready | human_compliant | 0% AI, 0% mixed, 100% human |

## Output Files

- `samples-gptzero-free-dashboard-smoke.csv`
- `detector_outputs_gptzero_free_dashboard_smoke.csv`
- `confusion_by_case_gptzero_free_dashboard_smoke.csv`
- `outputs/raw/gptzero_free_dashboard/*.json`

## Interpretation

The smoke test confirms that GPTZero dashboard output can be captured and
normalized, but it is only a one-sample no-payment check. Paper-ready GPTZero
evidence requires API access, approved credits, or another non-payment route
that permits enough scans to cover the selected sample cells.
