# Detector API Access Notes

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

This file tracks which detector services are practical for automated v1
experiments. It should be updated when credentials, pricing, quotas, or response
schemas are confirmed.

## Summary

| Detector | v1 status | Official source | Credential variable | Notes |
| --- | --- | --- | --- | --- |
| GPTZero | Candidate | https://support.gptzero.me/articles/7675217351-what-is-an-api-what-is-the-gptzero-api | `GPTZERO_API_KEY` | Support docs say the API accepts files and text input and returns sentence-, paragraph-, and document-level probabilities. Full docs are linked from GPTZero's Stoplight docs. |
| Pangram | Candidate | https://docs.pangram.com/api-reference/ai-detection | `PANGRAM_API_KEY` | V3 API uses `POST https://text.api.pangram.com/v3` with `x-api-key`; response includes prediction fields, AI/human fractions, and segment windows. |
| Copyleaks | Candidate | https://docs.copyleaks.com/reference/actions/writer-detector/check/ | `COPYLEAKS_EMAIL`, `COPYLEAKS_API_KEY` | Writer detector endpoint accepts 255-25,000 characters and supports sandbox mode for free mock testing. Real runs require login token. |
| Originality.ai | Candidate, details pending | https://help.originality.ai/en/article/api-1a1ea3s/ | `ORIGINALITY_API_KEY` | Help docs confirm a REST API for AI detection and plagiarism. Full endpoint docs require browser/JS verification, so endpoint details need confirmation after account access. |

## Approval Status

Draft only. The final detector list and API spending limit require Shenzhe's
approval before any paid or quota-consuming run.

## Environment Check

Before running the dry run, check whether credentials are available without
printing secret values:

```bash
for key in GPTZERO_API_KEY PANGRAM_API_KEY COPYLEAKS_EMAIL COPYLEAKS_API_KEY ORIGINALITY_API_KEY; do
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

## Current Access Questions

- Which detector accounts/API keys are already available?
- Are we allowed to spend credits for a 40-sample pilot?
- What is the maximum acceptable cost for a 160-sample main batch?
- Should Originality.ai stay in v1 if its API endpoint details remain hard to
  automate?
