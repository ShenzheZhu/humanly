# Dashboard Detector Smoke Summary

Run date: 2026-06-04

This summary combines the no-payment dashboard smoke tests for Pangram,
Copyleaks, and GPTZero. These runs verify external-detector plumbing and
normalization, but they are not paper-ready evidence.

## No-Payment Boundary

- Pangram: used free dashboard checks only. The pricing page stated `Free`,
  `4 Credits / day`, and `no payment method needed`.
- Copyleaks: used free dashboard credits only. The dashboard showed `5 Credits
  Left` before the run and `0 Credits Left` after five successful scans. One
  additional scan attempt stopped when the dashboard requested more credits.
- GPTZero: used the free Basic path only. The Premium trial was not accepted
  because it would renew into a paid monthly plan. The free dashboard allowed
  one advanced scan, then showed `0 advanced scans left`.
- Originality.ai: no scan attempted because the login page stated that a credit
  card is required on signup and the app showed `0 credits`.

No upgrade, trial acceptance, checkout, wallet, purchase, credit-card, or paid
credit flow was opened for any service.

## Combined Files

- `samples-dashboard-smoke-combined.csv`
- `detector_outputs_dashboard_smoke_combined.csv`
- `confusion_by_case_dashboard_smoke_combined.csv`

## Results Snapshot

| Detector | Completed rows | Main limitation |
| --- | ---: | --- |
| Pangram free dashboard | 4 | Free daily dashboard quota only; not API |
| Copyleaks free dashboard | 5 | Free credits exhausted; not API |
| GPTZero free dashboard | 1 | Free Basic allowed one advanced scan |

For the overlapping four-sample smoke set, Pangram and Copyleaks agreed:
`c1_short_01` was classified as human, while `c3_short_01`, `n1_short_01`, and
`n2_short_01` were classified as AI. GPTZero was only run on `c1_short_01` and
classified it as human.

Copyleaks also classified `c4_short_01` as AI. The apparent `C3` and `C4` false
positives are not paper-ready evidence because both rows are currently
synthetic proxy samples, not approved human-origin samples.

## Next Requirements For Paper-Ready Results

1. Replace proxy rows where needed with approved live-generation outputs and
   human-collected C4 samples.
2. Obtain approved no-payment capacity, institutional credits, or API access for
   at least the 24-row pilot.
3. Re-run detector outputs through the same schema and aggregator.
4. Only then report detector FPR/FNR patterns in the paper.
