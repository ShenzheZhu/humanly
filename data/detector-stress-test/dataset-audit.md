# Detector Stress Test Dataset Audit

Generated: 2026-06-06T00:59:57.085Z

Status: **pass**

## Counts

| Item | Count |
| --- | ---: |
| English human seeds | 30 |
| Non-English translation seeds | 30 |
| Generated samples | 240 |
| Proxy sample export | 240 |
| Pilot proxy sample export | 24 |
| Generation jobs | 180 |
| Generation job results | 180 |
| Local detector outputs | 240 |
| Confusion rows | 24 |
| Aggregated confusion rows | 24 |
| Pangram dashboard smoke outputs | 4 |
| Copyleaks dashboard smoke outputs | 5 |
| GPTZero dashboard smoke outputs | 1 |
| Combined dashboard smoke samples | 5 |
| Combined dashboard smoke outputs | 10 |
| Combined dashboard smoke confusion rows | 15 |
| Detector coverage summary rows | 72 |
| Paper-ready gate status | not_ready |
| Detector run-pack pilot manifest rows | 24 |
| Detector run-pack pilot queue rows | 72 |
| Detector run-pack main queue rows | 720 |
| C4 human collection manifest rows | 30 |
| N4 human edit manifest rows | 30 |
| Detector vendor cost estimate rows | 9 |
| Prolific C4 writing item rows | 30 |
| Prolific C4 writing budget rows | 3 |
| Prolific N4 editing item rows | 30 |
| Prolific N4 editing budget rows | 3 |

## Generated Samples By Case

- C1: 30
- C2: 30
- C3: 30
- C4: 30
- N1: 30
- N2: 30
- N3: 30
- N4: 30

## Generated Samples By Status

- ready: 240

## Interpretation

- Rows marked `ready` are current paper-ready candidate final texts.
- Rows marked `synthetic_proxy_ready` are useful for pipeline and detector
  smoke tests, but they are not paper-ready evidence.
- In particular, `C4` proxy rows use `policy_label=compliant_proxy` and
  `origin_label=synthetic_proxy_origin` so they cannot be mistaken for true
  human-written AI-style samples.
- `N4` rows are paper-ready only after a human-edited AI draft is imported
  with `generation_mode=human_edited_ai_draft`; synthetic or scripted edits
  remain smoke-test proxies.

## Issues

- None
