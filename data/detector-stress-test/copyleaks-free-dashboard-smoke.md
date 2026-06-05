# Copyleaks Free Dashboard Smoke Test

Run date: 2026-06-04

This is a no-payment external-detector smoke test using the Copyleaks web
dashboard. Account creation used Google sign-in with basic profile/email access
only. The dashboard showed `5 Credits Left` before the run and `0 Credits Left`
after the successful sample checks. No upgrade, pricing checkout, purchase, wallet, or
payment method flow was opened.

## Purpose

The goal was to confirm a second external detector can be run end to end and
normalized into the shared detector-output schema. This is not paper-ready
evidence because it uses only five dashboard checks and includes synthetic proxy
samples.

## Samples

| Sample | Case | Length | Policy label | Sample status | Copyleaks label | Copyleaks score |
| --- | --- | --- | --- | --- | --- | --- |
| `c1_short_01` | `C1` | short | compliant | ready | human_compliant | 0% AI content |
| `c3_short_01` | `C3` | short | compliant | synthetic_proxy_ready | ai_suspicious | 100% AI content |
| `n1_short_01` | `N1` | short | non_compliant | synthetic_proxy_ready | ai_suspicious | 100% AI content |
| `n2_short_01` | `N2` | short | non_compliant | synthetic_proxy_ready | ai_suspicious | 100% AI content |
| `c4_short_01` | `C4` | short | compliant_proxy | synthetic_proxy_ready | ai_suspicious | 100% AI content |

An additional attempt to scan `n3_short_01` was not completed. After the free
credits were exhausted, Copyleaks showed `You have 0 credits, please purchase
more to complete the scan`; no purchase was attempted.

## Output Files

- `samples-copyleaks-free-dashboard-smoke.csv`
- `detector_outputs_copyleaks_free_dashboard_smoke.csv`
- `confusion_by_case_copyleaks_free_dashboard_smoke.csv`
- `outputs/raw/copyleaks_free_dashboard/*.json`

## Interpretation

The smoke test confirms that Copyleaks dashboard output can be captured,
normalized, and aggregated by the same scripts used for API outputs. Like the
Pangram smoke test, the `C3` row behaves like a false positive under the
benchmark policy, and the `C4` row behaves like a false positive under the proxy
policy label. Neither is paper-ready evidence because the current `C3` and `C4`
final texts are synthetic proxy samples.

Paper-ready Copyleaks evidence still requires an approved paid/quota plan or a
larger no-payment route, plus replacement of synthetic proxy rows with approved
generated or human-collected samples where needed.
