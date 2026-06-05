# Local Generation Input Audit

Generated: 2026-06-05T18:48:50.898Z

Status: **pass**

This audit enforces the current rule: source collection may happen before the
data freeze, but the actual generation run must consume only local files under
`data/detector-stress-test/`. Source URLs inside local files are provenance
metadata, not fetch instructions.

## Counts

| Item | Count |
| --- | ---: |
| Generated sample rows | 240 |
| Generation jobs | 180 |
| Root generation jobs requiring pre-existing local input | 120 |
| Local input manifest rows | 610 |
| Cached OpenReview paper contexts | 10 |
| Missing root job inputs | 0 |
| Blocking local-input issues | 0 |
| C3 short/medium Project Gutenberg fallback rows | 0 |

## Input Status

| Status | Count |
| --- | ---: |
| local_ready | 460 |
| pending_generated_dependency | 150 |

## Input Roles

| Role | Count |
| --- | ---: |
| ai_generation_prompt | 60 |
| ai_transformation_source | 60 |
| generated_dependency_n1 | 30 |
| generated_dependency_n1_draft | 30 |
| generated_dependency_n3_zh | 30 |
| human_collection_prompt | 30 |
| human_edit_prompt | 30 |
| human_seed_source | 30 |
| job_input | 180 |
| matched_task_card | 120 |
| openreview_paper_context | 10 |

## Blocking Issues

- None. All inputs expected before generation are local files.

## Non-Blocking Design Notes

- Dependent inputs such as `N2`, the second `N3` translation step, and `N4`
  human edits are marked `pending_generated_dependency`; these are produced by
  earlier local jobs during the run, not fetched from remote sources.
- `C3` short and medium no longer use Project Gutenberg fallback rows. Current short translation sources are non-English Stack Exchange forum-style posts, and current medium translation sources are Spanish Wikiversity old-revision educational excerpts.

Manifest: `generation-input-local-manifest.csv`
