# Detector API Access Notes

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

This file tracks which detector services are practical for automated v1
experiments. It should be updated when credentials, pricing, quotas, or response
schemas are confirmed.

## Summary

| Detector | v1 status | Official source | Credential variable | Notes |
| --- | --- | --- | --- | --- |
| GPTZero | API candidate; self-serve API subscription flow confirmed | https://support.gptzero.me/articles/5840144813-how-can-i-get-the-api-and-request-code-samples | `GPTZERO_API_KEY` | Support docs say to sign up for an API subscription plan, get an API key, and use the API docs. Public pricing captured from `gptzero.me/pricing` starts at $45/month for 300k API words. One free dashboard smoke completed separately. |
| Pangram | Recommended first dry-run detector | https://docs.pangram.com/api-reference/ai-detection | `PANGRAM_API_KEY` | V3 API uses `POST https://text.api.pangram.com/v3` with `x-api-key`; response includes prediction fields, AI/human fractions, and segment windows. |
| Claude Opus 4.8 LLM baseline | v1 final-text-only baseline; not a commercial detector vendor | https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-8 | `ANTHROPIC_API_KEY` | Official model id is `claude-opus-4-8`. Runner uses the Messages API, returns strict JSON, and intentionally omits temperature/top-p/top-k. |

## Approval Status

Draft only. The final detector list and API spending limit require Shenzhe's
approval before any paid or quota-consuming run.

## Environment Check

Before running the dry run, check whether credentials are available without
printing secret values:

```bash
for key in GPTZERO_API_KEY PANGRAM_API_KEY ANTHROPIC_API_KEY; do
  if [ -n "${!key:-}" ]; then
    echo "$key=set"
  else
    echo "$key=missing"
  fi
done
```

## Normalization Target

Each detector's raw response should be stored unchanged under
`outputs/raw/<detector>/`. The normalized CSV should map provider-specific
outputs to:

- `ai_suspicious`
- `human_compliant`

When a detector exposes mixed/AI-assisted labels, record the raw label and the
threshold rule explicitly instead of silently forcing the class.

## Pangram Dry Run

The first approved live detector dry run uses Pangram V3 against the 6-row
technical sample set in `samples.csv`:

```bash
PANGRAM_API_KEY=... ruby data/detector-stress-test/scripts/run_pangram_dry_run.rb
```

The runner stores raw responses in `outputs/raw/pangram/<sample_id>.json` and
normalizes rows into `detector_outputs.csv`. It uses `public_dashboard_link:
false` and the threshold rule recorded in each output row.

## One-Click Detector Harness

The current no-credit end-to-end harness runs Pangram, GPTZero, and Claude Opus
4.8 in deterministic mock mode, writes raw JSON and normalized detector rows,
aggregates confusion metrics, and validates the dataset:

```bash
node data/detector-stress-test/scripts/run_detector_one_click.mjs --dry-run
```

After credits/API keys are approved, use the same harness in live mode:

```bash
PANGRAM_API_KEY=... \
GPTZERO_API_KEY=... \
ANTHROPIC_API_KEY=... \
node data/detector-stress-test/scripts/run_detector_one_click.mjs \
  --live \
  --confirm-spend=YES
```

Live mode refuses to run unless all three API keys are present and spend is
explicitly confirmed.

### Current Pangram Status

The first API attempt reached the Pangram API, but all six sample requests
returned HTTP 401 with `{"error":"Insufficient credits"}`. The run is recorded
as `api_error` rows in `detector_outputs.csv`; no successful API detector labels
are available yet.

On 2026-06-04, the Pangram web dashboard free plan was used for a no-payment
external-detector smoke test. The dashboard showed `Currently on Free`, `4/4`
available checks, and the pricing page stated `no payment method needed`. Four
short samples were checked through the dashboard and normalized into
`detector_outputs_pangram_free_dashboard_smoke.csv`; see
`pangram-free-dashboard-smoke.md`. This confirms the external-detector
normalization path, but it is not paper-ready evidence because it is a
four-sample dashboard smoke test and includes synthetic proxy rows.

## Copyleaks Dashboard Smoke

On 2026-06-04, a Copyleaks account was created through Google sign-in using
basic profile/email access only. The dashboard showed `5 Credits Left` before
the run and `0 Credits Left` after five successful dashboard checks. A sixth
attempt stopped when the dashboard requested more credits. No upgrade, pricing
checkout, purchase, wallet, or payment method flow was opened.

The five checked samples were normalized into
`detector_outputs_copyleaks_free_dashboard_smoke.csv`; see
`copyleaks-free-dashboard-smoke.md`. This is an end-to-end external-detector
normalization smoke test, not paper-ready evidence.

### Current Copyleaks API Pricing Status

Copyleaks is no longer in the v1 detector-vendor set. The dashboard smoke
remains as historical plumbing evidence, but the paper-facing commercial
detector comparison is restricted to Pangram and GPTZero.

## GPTZero Dashboard Smoke

On 2026-06-04, GPTZero onboarding was completed on the free Basic path. The
Premium free trial was explicitly avoided because the page stated it would renew
into a paid monthly plan. The Basic dashboard allowed one advanced AI scan, then
showed `0 advanced scans left`, so the run stopped after `c1_short_01`.

The single checked sample was normalized into
`detector_outputs_gptzero_free_dashboard_smoke.csv`; see
`gptzero-free-dashboard-smoke.md`. This confirms the import/normalization path,
but GPTZero still needs API access, approved credits, or another non-payment
route before it can cover the pilot or main batch.

## Claude Opus 4.8 LLM Baseline Status

Claude Opus 4.8 is included as a pure final-text LLM detector baseline. It is
not a process/replay baseline and it is not a commercial detector vendor. The
baseline receives only the final text, no Humanly process metadata, and returns
`ai_suspicious` or `human_compliant` with an estimated AI probability.

Current budget estimate from `detector-vendor-cost-estimate.csv`:

- Pilot 24: about `$0.19`.
- Main 240: about `$1.97`.
- Pilot plus main 264: about `$2.16`.

This estimate uses the current proxy texts, the official Claude Opus 4.8 prices
of `$5 / MTok` input and `$25 / MTok` output, and a compact JSON-output budget.

## Originality.ai Status

On 2026-06-04, the Originality.ai app login page was checked in Chrome. The page
showed `Balance 0 credits` and stated `A Credit Card is Required on Sign Up`.
Because this violates the no-wallet/no-payment boundary, no signup, login,
trial, purchase, or scan was attempted.

Current pricing correction: Originality.ai pay-as-you-go is `$30` for 3,000
credits, but API access is listed as an Enterprise feature. The API-safe budget
should use the monthly Enterprise plan (`$179/month`, 15,000 credits/month) or a
separate Enterprise/research grant, not pay-as-you-go credits.

Originality.ai is no longer in the v1 detector set.

## Grammarly AI Detection API Status

The Grammarly AI Detection API is no longer in the v1 detector set. It remains a
documented future option because Grammarly appears in the process-system
comparison table and the company exposes a programmatic Beta detector API, but
the user decided to restrict v1 commercial detector runs to Pangram and GPTZero.

Current facts from the official docs:

- Base URL: `https://api.grammarly.com/ecosystem/api/v1/ai-detection`.
- Authentication: OAuth Bearer access token.
- Required scopes: `ai-detection-api:read` and `ai-detection-api:write`.
- Flow: create a score request, upload a file to the returned pre-signed URL,
  then poll the score request for status/result.
- Output fields include `score.average_confidence` and
  `score.ai_generated_percentage`.
- Supported formats include `.txt`, `.doc`, `.docx`, `.odt`, and `.rtf`.
- Limits: 4 MB file size, 100,000 characters max, 30-word minimum for expected
  scoring behavior.
- Pricing/access: custom/TBD because Grammarly's API page advertises custom APIs
  through Contact Sales.

## Pangram Process/Replay Status

Pangram is in the v1 detector set as a final-text detector, not as a
process/replay baseline. Official pages document AI detection, AI-assistance
detection, interpretability features, segment-level analysis, dashboard links,
Chrome/Google Docs integrations, and institutional/LMS integrations. I did not
find an official Pangram feature that records writing actions over time or
replays the writing process like Humanly, Draftback, Brisk, Grammarly
Authorship, or GPTZero Origin/Writing Report.

## Current Access Questions

- Which detector accounts/API keys are already available?
- Are we allowed to spend credits for a 24-sample pilot?
- What is the maximum acceptable cost for a 240-sample main batch?
- Should the paper report the Claude Opus 4.8 final-text-only baseline alongside
  Pangram and GPTZero, or keep it as appendix/diagnostic evidence?
