# Generation Input Audit

Generated: 2026-06-05

This audit checks the inputs that would be used for the next paper-ready
generation run. No live generation was run.

## Current Execution State

| Item | Count / status |
| --- | ---: |
| Planned sample rows | 240 |
| Generation jobs | 180 |
| Dry-run-ready jobs | 180 |
| Live/API-ready final rows currently accepted | 0 |
| Human seed rows copied directly as ready C1 | 30 |
| Rows marked pending generation | 54 |
| Rows still synthetic proxy only | 156 |
| Local input preflight | pass |

`N4` has no independent AI-generation job. It reuses the matched `N1` AI draft
and then requires human light editing.

Generation execution must not fetch remote source material. All source
collection is a separate pre-freeze step; the run itself consumes local files
under `data/detector-stress-test/`.

## Source Construction

| Length | N1/N3/C4 task source | Current source example |
| --- | --- | --- |
| Short | Seed-derived task card from a pre-2017 Reddit writing self-post. The model/human must write a new first-person social post on the same broad topic. | `texts/generated/task_cards/short_social_process_001_set01.txt` |
| Medium | Seed-derived task card from a Wikiversity motivation/emotion topic. The model/human must write a new assignment-style response about the derived topic. | `texts/generated/task_cards/medium_assignment_process_001_set01.txt` |
| Long | Seed-derived task card from the matched OpenReview ICLR 2017 paper. The card includes title, authors, abstract, OpenReview URL, PDF URL, and up to 6000 words of machine-extracted PDF text. | `texts/generated/task_cards/long_peer_review_process_001_set01.txt` |
| C3 short | Non-English Stack Exchange forum-style post source, translated to English by AI. | `texts/generated/source/c3_short_01_source.txt` |
| C3 medium | Spanish Wikiversity old-revision educational source, translated to English by AI. | `texts/generated/source/c3_medium_01_source.txt` |
| C3 long | Norwegian Bokelskere book-review source, translated to English by AI. | `texts/generated/source/c3_long_01_source.txt` |

The old generic Humanly-process prompt is no longer present in
`texts/generated/source/` or `texts/generated/task_cards/`.

## New Cached Source Material

| File | Purpose |
| --- | --- |
| `openreview-paper-contexts.csv` | Maps each long OpenReview seed to cached paper context. |
| `texts/openreview_paper_contexts/*.txt` | Per-paper context with metadata, abstract, PDF URL, and extracted PDF text. |
| `texts/generated/task_cards/*.txt` | Seed-derived task cards used by `N1`, `N3`, `N4`, and `C4`. |
| `c3-short-forum-candidates.csv` | Candidate non-English forum-style posts used for C3 short translation seeds. |
| `c3-medium-wikiversity-candidates.csv` | Candidate Spanish Wikiversity old revisions used for C3 medium translation seeds. |

All 10 OpenReview long contexts were cached successfully. The PDF text excerpts
range from 4228 to 6389 words and have no extraction-error notes.

## Checks Run

```bash
node --check data/detector-stress-test/scripts/build_case_generation_jobs.mjs
node --check data/detector-stress-test/scripts/run_generation_jobs.mjs
/Users/zhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m py_compile data/detector-stress-test/scripts/collect_openreview_paper_contexts.py
node data/detector-stress-test/scripts/build_case_generation_jobs.mjs
node data/detector-stress-test/scripts/run_generation_jobs.mjs --dry-run
node data/detector-stress-test/scripts/audit_generation_inputs_local.mjs
rg "writing followed an AI-use policy|Process Evidence for Human-AI|synthetic paper brief|Should people judge whether writing" data/detector-stress-test/texts/generated/source data/detector-stress-test/texts/generated/task_cards
```

Results:

- Syntax checks passed.
- `build_case_generation_jobs.mjs` produced 240 rows and 180 jobs.
- `run_generation_jobs.mjs --dry-run` reported `dry_run_ready: 180`.
- `audit_generation_inputs_local.mjs` passed: 120 root generation jobs, 0
  missing root job inputs, 0 blocking local-input issues.
- The old generic prompt search returned no matches.

The detailed local-input manifest is
`generation-input-local-manifest.csv`; the local-input audit is
`generation-input-local-audit.md`.

## Issues / Decisions Before Paid Generation

1. `C3` short and medium have been moved off Project Gutenberg. Current short
   seeds are non-English Stack Exchange forum-style posts, which are
   Reddit-like rather than Reddit proper. Current medium seeds are Spanish
   Wikiversity old-revision educational excerpts, which are closer to
   assignment/learning text than literary prose but still not newly collected
   student answers. These should be described honestly in the paper/materials
   if used as-is.

2. Existing generated final text files from older prompts still exist on disk,
   but they are not accepted as current evidence. The manifest now marks them
   `pending_generation` unless their metadata contains current input/prompt
   hashes. The job runner will regenerate stale outputs instead of silently
   reusing them.

3. Long task cards include machine-extracted PDF text. This is much better than
   title-only or abstract-only input, but it includes normal PDF extraction
   artifacts such as ligature spacing and page headers. This is acceptable for
   generation unless we decide to run a cleaner PDF text normalization step.

4. `C4` and `N4` remain human-in-the-loop conditions. They are not paper-ready
   until C4 human-written samples and N4 human edits are collected/imported.
