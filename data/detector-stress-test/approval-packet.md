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
| Detector set | Dry run Pangram first; pilot with Pangram, GPTZero, Copyleaks; keep Originality.ai pending endpoint confirmation | Add Originality.ai immediately; drop Copyleaks; use web UI manually for one detector | Any paid/quota-consuming detector run |
| Human text source | Use Project Gutenberg/SPGC-style text for C1/C2 dry run; use newly written text for C4 | WikiText/Wikipedia; all-new Humanly writing samples | Pulling actual samples into repo |
| C3 translation source | Use a short human-written non-English source we can document | Translate a public-domain non-English source | Creating translated samples |
| C4 human-written AI-style | Recruit or ask humans to write after reading AI-style guidance; no AI generation | Delay C4 until human study | Claiming C4 as human-origin |
| Length/task design | Short social media post; medium student assignment response; long paper review | Use only one length bucket for a cheaper pilot | Creating paper-ready samples |
| Matching design | One-to-one by prompt/task/length matched set, not literal shared-source text across all cases | Fully independent prompts per case; exact source transformations only | Creating paper-ready samples |
| Dry-run size | 1 sample per case where possible; current dry run is technical and not paper-ready | 1 sample per case per length bucket if we want a fuller pipeline test | Creating sample files |
| Pilot size | 1 sample per case per length bucket, 24 final texts | 2 samples per case per length bucket, 48 final texts | Running detector pilot |
| Main batch size | 5 samples per case per length bucket, 120 final texts if cost allows | 2-3 samples per cell and frame as stress-test pilot | Paper-ready results |
| API credit cap | Set a hard cap before use; suggested pilot cap: discuss before spending | No paid API use until all keys/prices known | Any real API calls |
| Shared writing task | Keep current topic about final text vs writing process | Add peer-review or classroom-specific task prompts | Generating samples |
| Reporting label | Policy-compliance failure rate plus FPR/FNR by case | Traditional AI-vs-human only | Writing results section |

## Recommended v1 Flow

1. Approve the default detector/source/sample-size choices.
2. Build a tiny dry-run set with 1 sample per case.
3. Run Pangram first because its V3 endpoint and response schema are directly
   documented.
4. If Pangram normalization works, add GPTZero and Copyleaks.
5. Keep Originality.ai in the plan but do not block the first pilot on it unless
   endpoint details and credentials are available.
6. Review dry-run outputs before scaling across all three length buckets.

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

### Copyleaks

- Writer detector endpoint:
  https://docs.copyleaks.com/reference/actions/writer-detector/check/
- Endpoint accepts text between 255 and 25,000 characters.
- Supports sandbox mode for free mock integration testing.
- Sensitivity can be set from 1 to 3.
- Recommendation: include in pilot after deciding sensitivity and confirming
  login token flow.

### Originality.ai

- Help page: https://help.originality.ai/en/article/api-1a1ea3s/
- The API exists for AI detection/plagiarism, but full endpoint docs currently
  need account/browser verification.
- Recommendation: keep as candidate, but do not let it block v1 dry run.

## Human Text Source Evidence

### Project Gutenberg / SPGC

- Terms: https://www.gutenberg.org/policy/terms_of_use.html
- License: https://www.gutenberg.org/policy/license
- SPGC repo: https://github.com/pgcorpus/gutenberg
- Strength: pre-LLM human text with stable metadata.
- Risk: style is older and not classroom-like; Project Gutenberg has trademark
  and redistribution requirements, plus warnings about non-US copyright status.
- Recommendation: good for dry-run C1/C2, but not enough for the full paper
  story by itself.

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

- Dry run: Pangram only.
- Pilot: Pangram, GPTZero, Copyleaks.
- Stretch: Originality.ai if endpoint access is easy.

Needs approval:

- Whether to include Originality.ai in v1 or mark it as unavailable/manual.
- Maximum spend/credits for dry run and pilot.

### Choice B: Text sources

Recommended:

- C1/C2 dry run: Project Gutenberg/SPGC-style source.
- C3 dry run: a short human-written non-English text we can document.
- C4 dry run: one human writer using the AI-style instruction.
- N1-N4: generated from controlled prompts.

Needs approval:

- Whether Project Gutenberg/SPGC is acceptable for dry run despite older style.
- Whether Humanly-collected samples can be stored in this repo later.

### Choice C: Sample sizes

Recommended:

- Technical dry run: current 6-row API plumbing set.
- Pilot: 1 sample per case per length bucket, 24 final texts.
- Main: 5 samples per case per length bucket, 120 final texts if API cost and
  source collection are manageable.

Needs approval:

- Whether to treat a smaller 2-3-samples-per-cell stress test as
  paper-reportable if costs/time block the 120-text main batch.

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

- Keep the current shared task: whether instructors should judge final text
  only or also consider writing process.
- It directly matches Humanly's paper argument and can generate coherent
  comparable texts across cases.

Needs approval:

- Whether to add a peer-review-specific prompt in addition to the generic
  writing-assignment prompt.

### Choice F: C4 human writer protocol

Recommended:

- Humans read a brief AI-style guide.
- They write without AI generation.
- We record a self-attestation and, if possible, a Humanly session.

Needs approval:

- Who writes these samples and whether compensation is needed.
- Whether Humanly logs for C4 can be retained as evidence.

## Suggested Next Meeting Agenda

1. Approve or change detector list.
2. Set API spending cap.
3. Choose human text sources for dry run.
4. Approve shared task prompt.
5. Approve C4 human-written AI-style instruction.
6. Decide whether the first pilot target is 5 or 10 samples per case.
7. Decide whether results should be framed as pilot stress test or full
   benchmark in the paper.
