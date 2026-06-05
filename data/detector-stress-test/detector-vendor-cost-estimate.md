# Detector Vendor Cost Estimate

Checked: 2026-06-05

This is a planning estimate using public pricing pages and the current
`generated-samples.csv` word counts. It is not approval to spend money and it
is not a vendor quote. Costs can change if live-generated texts differ from the
current proxy word counts.

## Estimates

| Cohort | Detector | Docs | Manifest words | Credits/scans | Estimated public cost | API status |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| pilot_24 | pangram | 24 | 16709 | 33 | $25.00 | public_credit_price_visible |
| pilot_24 | gptzero | 24 | 16709 | 16709 | $45.00 | public_monthly_api_plan_visible |
| pilot_24 | llm_claude_opus_4_8 | 24 | 16709 | 30808 | $0.21 | official_model_and_pricing_visible |
| main_240 | pangram | 240 | 165755 | 323 | $25.00 | public_credit_price_visible |
| main_240 | gptzero | 240 | 165755 | 165755 | $45.00 | public_monthly_api_plan_visible |
| main_240 | llm_claude_opus_4_8 | 240 | 165755 | 305193 | $2.10 | official_model_and_pricing_visible |
| pilot_plus_main_264 | pangram | 264 | 182464 | 356 | $25.00 | public_credit_price_visible |
| pilot_plus_main_264 | gptzero | 264 | 182464 | 182464 | $45.00 | public_monthly_api_plan_visible |
| pilot_plus_main_264 | llm_claude_opus_4_8 | 264 | 182464 | 336001 | $2.31 | official_model_and_pricing_visible |

## Source Notes

- pangram: Pricing page lists developer API credits: $25 for 500 credits and $0.05 per 1,000-word credit. Source: https://www.pangram.com/pricing
- gptzero: Official GPTZero API Pricing section lists 300k words/month for $45, 1m for $135, 2m for $250, 5m for $550, 10m for $1000, and 20m for $1850; after the base plan allotment, additional usage is $150 per million words. Source: https://gptzero.me/pricing
- llm_claude_opus_4_8: Official Anthropic docs list Claude Opus 4.8 as API model claude-opus-4-8, with standard pricing of $5 per million input tokens and $25 per million output tokens. This is an LLM final-text baseline, not a commercial detector vendor. Source: https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-8

## Interpretation

- Pangram is the cleanest public API-credit estimate because the developer API
  credit price is visible.
- GPTZero now has a public monthly API-plan estimate from the official pricing
  page's API Pricing section. The 24-sample pilot, 240-sample main batch, and
  combined 264-document paid run all fit under the 300k-word base plan.
- Claude Opus 4.8 is included as an LLM final-text baseline. Its estimate is a
  token-budget approximation using the current sample texts plus a fixed compact
  JSON-output allowance; it is not a commercial detector vendor charge.
- Grammarly AI Detection API, Copyleaks, Originality.ai, Sapling, Winston AI,
  ZeroGPT, and other smaller or higher-friction vendors are excluded from v1.
