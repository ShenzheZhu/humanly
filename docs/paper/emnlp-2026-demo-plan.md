# EMNLP 2026 Demo Paper Plan

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

This branch stores paper-facing planning notes, study materials, prompt pools,
detector outputs, and analysis tables for the Humanly EMNLP 2026 System
Demonstrations submission.

## Submission Constraints

- Deadline: Friday, July 10, 2026, 11:59pm UTC-12.
- Main paper: 6 pages maximum.
- Appendix: 2 pages maximum.
- References and optional ethics/broader impact do not count toward the main
  page limit.
- A reported evaluation is required; submissions with no evaluation may be desk
  rejected.
- A demo video is required and must be at most 2.5 minutes.
- A live demo website or installable package link is required.
- Reviewing is single-blind, so the paper should include real author names and
  affiliations.
- References must be verifiable under the EMNLP 2026 paper-integrity policy.

## Working Framing

Humanly should be framed as a provenance-first writing system for policy
compliance in mixed human-AI writing, not as a final-text AI detector. The paper
should emphasize:

- admin-configured writing tasks and enrollment;
- tracked writing in the user portal;
- typed, paste, focus, selection, and AI-use logs;
- configurable AI access modes;
- certificate, verification, and replay surfaces;
- evaluation of whether process evidence improves compliance judgments.

## Materials Layout

Use this branch for paper-side materials that should be version-controlled in
the GitHub repo:

- `latex/` Overleaf-compatible ACL paper sources;
- `materials/prompts/` writing prompts for classroom and peer-review scenarios;
- `materials/study-instruments/` consent text, participant instructions, and
  survey items;
- `data/detector-stress-test/` detector inputs, outputs, and confusion
  matrices;
- `data/certificate-interpretation/` reader-study stimuli and analysis tables;
- `figures/` source notes for screenshots and demo-video shot lists.

Do not store participant-identifying data, private API keys, or unreleased paper
PDFs here.

## Source Links

- EMNLP 2026 System Demonstrations CFP:
  https://2026.emnlp.org/calls/demos/
- EMNLP 2026 Paper Integrity Policy:
  https://2026.emnlp.org/paper-integrity-policy/

## Overleaf Sync

GitHub `paper` branch is the source of truth for LaTeX sources. Overleaf sync is
documented in `docs/paper/overleaf-sync.md`.
