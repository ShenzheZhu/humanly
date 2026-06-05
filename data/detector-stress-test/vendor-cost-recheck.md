# Vendor Cost Recheck

Checked: 2026-06-05

## Result

Status: **updated for selected v1 detector set**

Selected detector vendors:

- Pangram
- GPTZero

Additional baseline:

- Claude Opus 4.8 as a pure final-text LLM baseline, not a commercial detector
  vendor.

Grammarly AI Detection API, Copyleaks, Originality.ai, Sapling, Winston AI,
ZeroGPT, and other smaller or higher-friction vendors are excluded from the v1
detector API comparison.

The current cost estimate uses the manifest word counts from:

- `samples-generated-pilot-proxy.csv`: 24 docs, 14,686 manifest words.
- `generated-samples.csv`: 240 docs, 148,837 manifest words.

If paid pilot and main are both run in the same planning window, the combined
detector workload is:

- 264 docs.
- 163,523 manifest words.
- 1,043,563 total characters.
- Largest single document: 7,922 characters and 1,354 words.

## API-Safe Budget

| Detector | API access status | Combined usage | API-safe public cost |
| --- | --- | ---: | ---: |
| Pangram | Self-serve developer API credits confirmed | 352 credits | $25.00 |
| GPTZero | API subscription flow confirmed; public API price captured from `gptzero.me/pricing` | 163,523 words | $45.00 |
| Claude Opus 4.8 LLM baseline | Official Anthropic API model confirmed | 273,688 input tokens + 31,680 output tokens estimated | $2.16 |

Selected two-vendor detector API-safe budget:

```text
Pangram 25 + GPTZero 45 = $70
```

All-in pilot-plus-main estimate if the Claude LLM baseline is included:

```text
Pangram 25 + GPTZero 45 + Claude Opus 4.8 baseline 2.16 = $72.16
```

## Per-Cohort API-Safe Estimate

| Cohort | Pangram | GPTZero | Claude Opus 4.8 baseline |
| --- | ---: | ---: | ---: |
| Pilot 24 | $25.00 | $45.00 | $0.19 |
| Main 240 | $25.00 | $45.00 | $1.97 |

The per-cohort table is useful only if the pilot and main are billed separately.
For the actual budget request, use the combined workload above so monthly plans
are not double-counted. Claude token costs are usage-based and can be added
linearly.

## Calculation

### Pangram

Public pricing used:

- Developer API credits: $25 for 500 credits.
- One API credit covers 1,000 words.
- Developer API credits can only be used through the API.

Formula:

```text
credits = sum(ceil(sample_word_count / 1000))
cost = max(25, credits * 0.05)
```

Results:

- Pilot: 32 credits, `max(25, 32 * 0.05)` = $25.00.
- Main: 320 credits, `max(25, 320 * 0.05)` = $25.00.
- Combined: 352 credits, `max(25, 352 * 0.05)` = $25.00.

### GPTZero

Official API access evidence:

- GPTZero support says users must sign up for an API subscription plan, then get
  an API key.
- GPTZero support says API keys are used with the `x-api-key` header.
- GPTZero support says overages are $0.00015 per word.
- The `gptzero.me/pricing` API Pricing section was captured as:
  300k words/month for $45, 1m for $135, 2m for $250, 5m for $550, 10m for
  $1000, 20m for $1850, then $150 per million words after the base allotment.

Formula:

```text
words = sum(sample_word_count)
cost = lowest monthly API plan whose included words >= words
if words > 20,000,000:
  cost = 1850 + ((words - 20,000,000) / 1,000,000) * 150
```

Results:

- Pilot: 14,686 words, fits 300k plan = $45.00.
- Main: 148,837 words, fits 300k plan = $45.00.
- Combined: 163,523 words, fits 300k plan = $45.00.

### Claude Opus 4.8 LLM Baseline

Official API pricing used:

- Model id: `claude-opus-4-8`.
- Input: $5 per million tokens.
- Output: $25 per million tokens.

Formula:

```text
input_tokens = token_estimate(detector_prompt + final_text)
output_tokens = 120 * document_count
cost = (input_tokens / 1,000,000) * 5 + (output_tokens / 1,000,000) * 25
```

Results:

- Pilot: 24,582 input + 2,880 output tokens = $0.19.
- Main: 249,106 input + 28,800 output tokens = $1.97.
- Combined: 273,688 input + 31,680 output tokens = $2.16.

This is a planning estimate only. Actual Anthropic billing may differ from the
script's rough token estimator.

## Pangram Process/Replay Status

Pangram should be treated as a final-text detector, not a process/replay system.
Official Pangram materials document AI detection, AI-assistance detection,
segment-level analysis, dashboard links, interpretability features, Chrome or
Google Docs integrations, institutional/LMS integrations, and usage analytics.
I did not find an official Pangram feature that records writing actions over
time or replays the writing process.

## Caveats

- Costs are based on current proxy/sample manifest word counts. Live-generated
  texts may change the word totals.
- GPTZero pricing is monthly-plan based, so the estimate assumes the pilot and
  main batch fit into one billing month and no other GPTZero API usage consumes
  the same monthly word allotment.
