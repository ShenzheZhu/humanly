# Detector Stress Test Experiment Plan

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

## Objective

Run a final-text detector stress test that shows where detector outputs fail as
policy-compliance evidence. The benchmark compares detector judgments against
known case labels. Humanly is not evaluated as a competing text classifier; it
is the process-evidence system that motivates why final-text-only judgments are
insufficient.

## Benchmark Policy

For v1, use this policy:

> Human writing is allowed. AI polish and AI translation are allowed. Substantive
> AI generation of the final content is not allowed.

Under this policy:

- Negative class: policy-compliant text.
- Positive class: policy-violating or AI-origin substantive generation.

## Case Matrix

|  | Case 1 | Case 2 | Case 3 | Case 4 |
| --- | --- | --- | --- | --- |
| **False-positive risk** | Human original | Human + AI polish | Human + AI translation | Human-written AI-style text |
| **False-negative risk** | Direct AI-generated | AI-obfuscated | AI cross-lingual transform | AI-generated + light human edits |

Detailed construction rules live in
`materials/prompts/detector-stress-test-v1.md`.

## Detector Set

Use detectors that can be tested through official APIs or reliable batch access:

- GPTZero
- Pangram
- Copyleaks
- Originality.ai

Turnitin is out of scope for v1 because it is unlikely to fit an automated
API-first workflow.

## Experimental Phases

## Approval Gates

The files in this directory are scaffolding until the following decisions are
approved by Shenzhe:

- final detector list;
- API spending/credit limits;
- final human text source(s);
- final sample size for dry run, pilot, and main batch;
- final shared writing task prompt;
- final transformation prompts for polish, translation, obfuscation, and
  cross-lingual cases;
- final human-writer instruction for the `C4` human-written AI-style case;
- whether any newly collected Humanly writing samples can be stored in this
  repository.

Do not run the main experiment or present any table as paper-ready until these
gates are approved.

The approval packet for the next discussion is `approval-packet.md`.

### Phase 0: Access and dry-run setup

Goal: confirm that at least one detector can be called and normalized end to end.

Steps:

1. Confirm available API keys, quotas, costs, and minimum text lengths.
2. Create one sample per case where possible.
3. Run one detector against those samples.
4. Store output in the schema from `schema.md`.
5. Verify that labels and scores can be normalized into `ai_suspicious` vs
   `human_compliant`.

Exit criterion: one detector produces usable output for at least six of the
eight cases.

### Phase 1: Pilot batch

Goal: test whether the case matrix behaves as expected before scaling up.

Suggested size:

- 5 samples per case.
- 8 cases.
- 40 final texts total.

Steps:

1. Select or create text samples for each case.
2. Record metadata in `samples.csv`.
3. Run all accessible detectors.
4. Store raw outputs in `detector_outputs.csv`.
5. Compute per-case TPR, FNR, TNR, and FPR.
6. Inspect qualitative examples where detectors disagree.

Exit criterion: all chosen detectors have enough successful outputs to compare
failure patterns by case.

### Phase 2: Main batch

Goal: produce a paper-reportable table.

Suggested size:

- 20 samples per case if cost and time allow.
- 160 final texts total.

If detector costs or text collection constraints are high, reduce to 10 samples
per case and report the experiment as a pilot/stress test rather than a broad
benchmark.

## Text Construction Plan

### Compliant cases

1. **Human original**
   - Use open-license/public-domain human text or newly collected Humanly
     writing samples.
   - No AI generation, polish, translation, or paraphrase.

2. **Human + AI polish**
   - Start from human-origin text.
   - Use AI only to improve grammar, clarity, or local style.
   - Preserve the original content and claims.

3. **Human + AI translation**
   - Start from human-written non-English text.
   - Translate into English with AI or machine translation.
   - Preserve source text and translation metadata.

4. **Human-written AI-style text**
   - Recruit humans to study AI-like writing style.
   - They write the final text themselves without AI generating the content.
   - This is the cleanest false-positive-risk case for formal/AI-like wording.

### Non-compliant cases

1. **Direct AI-generated**
   - Prompt an LLM to produce the final text directly.

2. **AI-obfuscated**
   - Start from AI-generated text.
   - Apply humanizer/paraphrase/"sound human" transformations.

3. **AI cross-lingual transform**
   - Generate text in another language with AI.
   - Translate or rewrite into English.

4. **AI-generated + light human edits**
   - Start from AI-generated text.
   - A human applies small edits, typo changes, local rephrasing, or sentence
     reordering.
   - The human should not rewrite the text from scratch.

## Data Files

Use the schema in `schema.md`.

Planned files:

- `samples.csv`
- `detector_outputs.csv`
- `confusion_by_case.csv`
- `notes.md`

Current setup files:

- `approval-packet.md`
- `api-access.md`
- `source-candidates.md`
- `detectors.csv`
- `dry-run-samples.csv`
- `samples.csv`
- `scripts/run_pangram_dry_run.rb`
- `../../materials/prompts/detector-dry-run-prompts.md`

Optional later files:

- `texts/final/*.txt`
- `texts/source/*.txt`
- `outputs/raw/<detector>/*.json`

## Analysis Plan

Compute metrics by detector and by case:

- `TPR`: non-compliant samples correctly flagged as AI/suspicious.
- `FNR`: non-compliant samples missed as human/compliant.
- `TNR`: compliant samples correctly treated as human/compliant.
- `FPR`: compliant samples flagged as AI/suspicious.

Primary paper table:

- rows: detector services;
- columns: per-case FPR/FNR or failure rate;
- include one aggregate FPR over the four compliant cases and one aggregate FNR
  over the four non-compliant cases.

Secondary analysis:

- rank cases by failure rate;
- identify detectors that are strong on direct AI but weak on polish,
  translation, or obfuscation;
- include short qualitative examples where final-text scores contradict the
  policy label.

## Quality Controls

- Do not use copyrighted private texts.
- Keep source text and transformed text paired.
- Keep exact prompts and transformation steps.
- Store detector raw outputs, not just normalized labels.
- Record detector version/date when available.
- Do not describe synthetic or AI-origin text as human-origin.
- Keep external-AI manual typing attacks out of v1; those belong to the later
  red-teaming/hackability study.

## Immediate Session Checklist

Use this checklist for the next experimental work session:

- [x] Create dry-run sample manifest and prompt templates.
- [x] Document detector API access requirements.
- [x] Document candidate open-license human text sources.
- [ ] Review and approve the approval-gated experiment choices with Shenzhe.
- [ ] Confirm detector API access and required credentials.
- [ ] Choose first open-license human text source for actual sample text.
- [x] Create a technical dry-run sample set for 6/8 cases: `C1`, `C2`, `C3`,
  `N1`, `N2`, and `N3`.
- [x] Skip `C4` for the technical API pipeline dry run; add it later after a
  human writer produces AI-style text without AI generation.
- [x] Skip `N4` for the technical API pipeline dry run; add it later after a
  human lightly edits an AI-generated draft.
- [x] Fill `samples.csv` for the dry run.
- [x] Add Pangram V3 runner for the first live detector dry run.
- [x] Attempt Pangram live run and record current `Insufficient credits` API
  blocker.
- [ ] Run one detector end to end.
- [ ] Inspect whether the detector output fits `detector_outputs.csv`.
- [ ] Decide whether pilot size should be 5 or 10 samples per case.
