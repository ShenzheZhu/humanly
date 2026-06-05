# Seed Library Recheck

Checked: 2026-06-05

## Result

Status: **pass after manifest correction**

The seed library currently has 60 seed rows:

| Seed group | Count | Breakdown |
| --- | ---: | --- |
| English human seeds | 30 | 10 Reddit short posts, 10 Wikiversity medium old revisions, 10 OpenReview long reviews |
| Non-English translation seeds | 30 | 9 Spanish, 21 French Project Gutenberg excerpts |

## Integrity Checks

The recheck verified:

- all 60 `seed_id` values are unique;
- all 60 cleaned seed text files exist;
- all 60 cleaned seed texts are non-empty;
- all 60 cleaned seed texts have unique SHA-256 hashes;
- all 60 manifest `word_count` values now match the cleaned text files;
- `generated-samples.csv` has 240 rows, 30 rows per case;
- every `C1` and `C2` row maps to an English human seed;
- every `C3` row maps to a non-English translation seed;
- every English human seed is referenced exactly twice, once by `C1` and once by `C2`;
- every translation seed is referenced exactly once by `C3`;
- `C4`, `N1`, `N2`, `N3`, and `N4` do not incorrectly reference seed rows.

The seed library itself does not satisfy the human-collection needs for `C4`
or `N4`: `C4` requires newly written human AI-style text, and `N4` requires
human light edits of AI-origin drafts.

## Correction Made

Four OpenReview long seed rows had stale `word_count` values in
`human-seeds.csv`. Their text files and `generated-samples.csv` rows were
already using the current counts, so the correction was limited to the seed
manifest:

| Seed id | Old count | Correct count |
| --- | ---: | ---: |
| `long_openreview_iclr2017_video_sequences_review_001` | 1209 | 1194 |
| `long_openreview_iclr2017_translation_refinement_review_005` | 1071 | 1069 |
| `long_openreview_iclr2017_video_attention_review_007` | 1364 | 1354 |
| `long_openreview_iclr2017_expressive_power_review_008` | 1024 | 1022 |

After this correction, the seed-library integrity script reported `issuesCount:
0`, and `scripts/validate_dataset.mjs` reported `dataset audit status: pass`.

## Source URL Check

The recheck fetched all 34 unique source URLs referenced by the 60 seed rows:

| Source | Unique URLs | Seed rows covered | Fetch result |
| --- | ---: | ---: | --- |
| Reddit old.reddit.com posts | 10 | 10 | 10/10 HTTP 200 |
| Wikiversity old revision pages | 10 | 10 | 10/10 HTTP 200 |
| OpenReview forum/review pages | 10 | 10 | 10/10 HTTP 200 |
| Project Gutenberg text files | 4 | 30 | 4/4 HTTP 200 |

## Authenticity Assessment

The seed library is internally consistent and source-linked. The human-origin
claim is strongest for:

- Reddit: public pre-2017 self-posts with visible old Reddit pages and
  timestamps in the manifest.
- Wikiversity: 2016 old-revision pages with stable `oldid` URLs.
- OpenReview: ICLR 2017 public review pages with December 2016 review
  timestamps.
- Project Gutenberg: public-domain-oriented French/Spanish literary texts from
  canonical pre-LLM works.

Remaining caveats:

- Reddit and OpenReview redistribution/licensing still need review before public
  dataset release.
- Project Gutenberg terms and jurisdiction-specific copyright status still need
  review before public redistribution.
- Translation seeds are human-origin and length-controlled, but not task-aligned
  to Humanly's social/assignment/review use cases.
