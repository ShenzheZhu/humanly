# Detector Stress Test Approval Packet

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

This packet is for the next approval discussion. It lists decisions that should
be made by Shenzhe before final sample construction, paid API usage, or
paper-ready detector results.

## Current Goal

Create a final-text detector stress test showing that text-only AI detectors are
not reliable policy-compliance evidence for mixed human-AI writing. Humanly is
not positioned as a competing detector; it provides process evidence.

## Decision Summary

| Decision | Recommended default | Alternatives | Approval needed before |
| --- | --- | --- | --- |
| Detector set | Compare Pangram and GPTZero, plus a Claude Opus 4.8 final-text-only LLM baseline. Exclude other detector vendors from v1. | Add Grammarly, Copyleaks, or Originality.ai later only if we need extra baselines and access is easy | Any paid/quota-consuming detector run |
| Human text source | Use the 30-seed English library: 10 Reddit short social posts, 10 Wikiversity medium student-writing excerpts, and 10 ICLR OpenReview long paper reviews; use the 30-seed Project Gutenberg French/Spanish fallback library for C3; use newly written text for C4; use human light edits for N4 | More task-aligned non-English sources; WikiText/Wikipedia; all-new Humanly writing samples | Pulling actual samples into repo |
| C3 translation source | Use current Project Gutenberg French/Spanish fallback seeds for automation; replace later if better task-aligned non-English sources are found | Newly collect non-English Humanly writing samples | Creating translated samples |
| C4 human-written AI-style | Recruit or ask humans to write after reading AI-style guidance; no AI generation | Delay C4 until human study | Claiming C4 as human-origin |
| N4 human-edited AI draft | Generate an AI draft, then ask humans to make light local edits without using additional AI | Keep scripted edits only as smoke-test proxies | Claiming N4 as a human-edited false-negative-risk case |
| Human seed policy | Collect or write human seeds before constructing C1-C4; N1-N3 remain prompt-matched but not human-seed-derived; N4 uses a prompt-matched AI draft plus human edits | Use public-domain text only for all human cases | Creating pilot/main samples |
| Length/task design | Short social media post; medium student assignment response; long paper review | Use only one length bucket for a cheaper pilot | Creating paper-ready samples |
| Matching design | One-to-one by prompt/task/length matched set, not literal shared-source text across all cases | Fully independent prompts per case; exact source transformations only | Creating paper-ready samples |
| Dry-run size | 1 sample per case where possible; current dry run is technical and not paper-ready | 1 sample per case per length bucket if we want a fuller pipeline test | Creating sample files |
| Pilot size | 1 sample per case per length bucket, 24 final texts | 2 samples per case per length bucket, 48 final texts | Running detector pilot |
| Main batch size | 10 samples per case per length bucket, 240 final texts | 1 sample per cell for pilot only | Paper-ready results |
| API credit cap | Set a hard cap before use; suggested pilot cap: discuss before spending | No paid API use until all keys/prices known | Any real API calls |
| Matched task prompts | Use three prompt families in `materials/prompts/detector-stress-test-v1.md`: short social media post, medium student assignment response, long paper review | Revise topics before sample construction | Generating pilot/main samples |
| Reporting label | Policy-compliance failure rate plus FPR/FNR by case | Traditional AI-vs-human only | Writing results section |

## Recommended v1 Flow

1. Approve the default detector/source/sample-size choices.
2. Build a tiny dry-run set with 1 sample per case.
3. Run the one-click dry-run harness to verify Pangram, GPTZero, and Claude
   baseline plumbing without API spend.
4. After credits are approved, run the same harness in live mode over the
   24-sample pilot.
5. Review pilot outputs before scaling across all three length buckets.

## Detector Evidence

### Pangram

- Official docs: https://docs.pangram.com/api-reference/ai-detection
- Direct `POST /v3` endpoint.
- API key passed through `x-api-key`.
- Response includes document-level prediction fields, fractions for AI,
  AI-assisted, and human text, plus segment windows.
- Recommendation: first real dry-run detector.

### GPTZero

- API support docs: https://support.gptzero.me/articles/7675217351-what-is-an-api-what-is-the-gptzero-api
- Developer docs: https://gptzero.stoplight.io/
- Official support says it accepts files and text and returns probabilities at
  sentence, paragraph, and document levels.
- Recommendation: include in pilot if API key/subscription is available.

### Claude Opus 4.8 LLM Baseline

- Official docs: https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-8
- API model id: `claude-opus-4-8`.
- Standard price captured in the budget script: `$5 / MTok` input and
  `$25 / MTok` output.
- Role: pure final-text-only baseline. It receives no Humanly process metadata,
  so it tests whether a strong LLM-as-judge has the same evidence limitation as
  text-only detectors.
- Recommendation: include in pilot/main if Anthropic API key/billing is already
  available. It adds about `$2.16` for the combined 264-document run under the
  current proxy token estimate.

### Excluded from v1 detector API evaluation

Grammarly AI Detection API, Copyleaks, Originality.ai, Sapling, Winston AI,
ZeroGPT, and other smaller or high-friction vendors are not part of the selected
v1 detector list:

- Grammarly AI Detection API: official Beta API docs exist, but access/pricing
  appears to go through Contact Sales; the user decided to keep v1 to Pangram
  and GPTZero.
- Copyleaks: public API pricing/access remains custom or unconfirmed, and the
  user decided not to expand into smaller or less central vendors for v1.
- Originality.ai: API access is Enterprise-only and the user decided not to use
  it for v1.

## Human Text Source Evidence

### Reddit

- Strength: authentic social-media writing with old timestamps and stable
  permalinks.
- Current seed inventory: 10 pre-2017 `r/writing` self-posts, 129-447 words.
- Risk: public Reddit content is not automatically open-license for public
  redistribution.
- Recommendation: use for short candidate seeds, but keep licensing review as a
  gate before public release.

### Wikiversity Old Revisions

- Strength: open student/course-writing style with CC BY-SA licensing and
  frozen pre-2017 revisions.
- Current seed inventory: 10 old revisions from 2016 Wikiversity course-writing
  pages, 402-529 words.
- Risk: attribution/share-alike requirements must be tracked, and the prose may
  contain wiki-specific cleanup marks if not carefully cleaned.
- Recommendation: use for medium student-writing candidate seeds.

### ICLR OpenReview

- Strength: directly matches the paper-review use case and exposes public
  official-review notes with stable ids, ratings, confidence, and timestamps.
- Current seed inventory: 10 ICLR 2017 official reviews, 1005-1364 words.
- Risk: redistribution/licensing should be confirmed before releasing a public
  benchmark dataset.
- Recommendation: use for long paper-review candidate seeds.

### Project Gutenberg / SPGC

- Terms: https://www.gutenberg.org/policy/terms_of_use.html
- License: https://www.gutenberg.org/policy/license
- SPGC repo: https://github.com/pgcorpus/gutenberg
- Strength: pre-LLM human text with stable metadata.
- Current seed inventory: 30 French/Spanish non-English excerpts for `C3`,
  10 per length bucket, recorded in `translation-seeds.csv`.
- Risk: style is older and not classroom-like; Project Gutenberg has trademark
  and redistribution requirements, plus warnings about non-US copyright status.
- Recommendation: use as a scalable C3 fallback for automation, but describe it
  as length-controlled rather than task-aligned.

### WikiText / Wikipedia

- WikiText dataset: https://huggingface.co/datasets/Salesforce/wikitext
- License: CC BY-SA 3.0 according to the dataset card.
- Strength: formal/informational text and easy programmatic access.
- Risk: attribution/share-alike requirements and less direct writing-task fit.
- Recommendation: possible supplemental source, not first default.

### Newly Collected Humanly Samples

- Strength: closest to actual product use and best for the paper narrative.
- Risk: consent, privacy, and storage constraints.
- Recommendation: use later for pilot/main batch if we can collect consented,
  de-identified text.

## Proposed Approval Choices

### Choice A: Detector list

Recommended:

- Dry run: one-click no-credit mock over Pangram, GPTZero, and Claude Opus 4.8
  baseline.
- Pilot/main detector set: Pangram and GPTZero as commercial detectors, plus
  Claude Opus 4.8 as a pure LLM final-text baseline.
- Do not include Grammarly, Copyleaks, Originality.ai, Sapling, Winston AI,
  ZeroGPT, or other smaller vendors in v1.

Needs approval:

- Maximum spend/credits for live pilot and main run.

### Choice B: Text sources

Recommended:

- C1/C2: choose English human-written seeds from the current 30-seed library:
  10 short Reddit posts, 10 medium Wikiversity old revisions, and 10 long ICLR
  OpenReview reviews.
- C3: use the current 30-seed Project Gutenberg French/Spanish fallback library
  for automated translation jobs, then replace or supplement it if we find
  better task-aligned non-English writing.
- C4: ask a human writer to produce an AI-style seed using the C4 instruction
  and vocabulary list, without AI generation.
- N1-N3: generated from controlled prompts.
- N4: generate an AI draft from the controlled prompt, then collect human light
  edits without additional AI assistance.

Needs approval:

- Whether seed texts should be newly written in Humanly or selected from
  open-license/public-domain sources.
- Whether Humanly-collected samples can be stored in this repo later.
- Whether Reddit, OpenReview, and Project Gutenberg full text can remain in the
  repo, or whether the public branch should store only metadata and fetch
  scripts.

### Choice C: Sample sizes

Recommended:

- Technical dry run: current 6-row API plumbing set.
- Pilot: 1 sample per case per length bucket, 24 final texts.
- Main: 10 samples per case per length bucket, 240 final texts.

Needs approval:

- Whether to run the full 240-text main batch immediately after the 24-text
  pilot, or to pause for qualitative inspection first.

### Choice D: Length and task design

Approved current default:

- Short: social media post.
- Medium: student response to an assignment.
- Long: paper review.

Matching rule:

- Cases should be one-to-one matched by prompt, task type, topic, and length
  bucket.
- They should not all be forced to derive from the exact same source text,
  because that would make some cases invalid or unnatural.

### Choice E: Prompt wording

Recommended:

- Use the three matched prompt families in
  `materials/prompts/detector-stress-test-v1.md`.
- They preserve one core topic about final-text judgment vs writing-process
  evidence while mapping to the three approved task types: social media post,
  student assignment response, and paper review.

Needs approval:

- Whether the exact wording of all three base prompts is acceptable before pilot
  sample construction.

### Choice F: C4 human writer protocol

Recommended:

- Humans read a brief AI-style guide.
- They write without AI generation.
- We record a self-attestation.

Needs approval:

- Who writes these samples and whether compensation is needed.

### Choice G: N4 human editor protocol

Recommended:

- Generate the AI draft first.
- Humans lightly edit the draft for clarity, grammar, repetition, and local flow.
- They do not rewrite from scratch and do not use additional AI tools.
- We record a self-attestation and keep participant/editor metadata outside the
  public dataset.

Needs approval:

- Whether N4 edits are collected through Prolific or a linked survey.
- Whether the long paper-review edit duration and reward are acceptable.

## Suggested Next Meeting Agenda

1. Approve or change detector list.
2. Set API spending cap.
3. Choose human text sources for dry run.
4. Approve shared task prompt.
5. Approve C4 human-written AI-style instruction.
6. Approve N4 human light-edit instruction.
7. Decide whether to run the 10-samples-per-cell main batch immediately after
   the pilot or pause for qualitative inspection first.
8. Decide whether results should be framed as pilot stress test or full
   benchmark in the paper.
