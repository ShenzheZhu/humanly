# N4 Human Edit Quality Audit

Checked date: 2026-06-05

Raw Prolific status/responses/report files are stored outside the repo at `/Users/zhu/Desktop/research/Humanly/.local/prolific-n4-raw-20260605/` because they may include participant identifiers. This audit and the normalized edited-text CSV are de-identified by sample id.

## Summary

- Samples reviewed: 30
- Confirmation checkbox present: 30/30
- Empty/off-task/nonsense submissions found: 0
- Usable without note: 21
- Usable with note: 9
- Blocking samples: 0

## Programmatic Checks

- Similarity ratio range: 0.0761 to 0.9984; median 0.9281.
- Word delta range: -21.8% to 9.5%; median -0.2%.
- Flags used: `near_copy` for very small edits, `major_rewrite` for large surface changes, `suspicious_terms` for AI-disclaimer-like strings, plus empty/length checks.

## Per-Sample Review

| Sample | Length | Confirmed no extra AI | Draft words | Edited words | Similarity | Flags | Decision | Note |
| --- | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `n4_long_01` | long | true | 1567 | 1546 | 0.9264 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_long_02` | long | true | 1691 | 1680 | 0.9952 | near_copy | usable_with_note | Very light edit; coherent and on topic, but close to original draft. |
| `n4_long_03` | long | true | 1593 | 1590 | 0.9959 | near_copy | usable_with_note | Very light edit; coherent and on topic, but close to original draft. |
| `n4_long_04` | long | true | 1753 | 1771 | 0.9699 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_long_05` | long | true | 1636 | 1637 | 0.9982 | near_copy | usable_with_note | Very light edit; coherent and on topic, but close to original draft. |
| `n4_long_06` | long | true | 1574 | 1585 | 0.9736 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_long_07` | long | true | 1560 | 1558 | 0.9984 | near_copy | usable_with_note | Very light edit; coherent and on topic, but close to original draft. |
| `n4_long_08` | long | true | 1691 | 1690 | 0.9297 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_long_09` | long | true | 1448 | 1440 | 0.8149 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_long_10` | long | true | 1541 | 1498 | 0.9812 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_medium_01` | medium | true | 597 | 593 | 0.9044 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_medium_02` | medium | true | 587 | 583 | 0.9749 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_medium_03` | medium | true | 622 | 614 | 0.8287 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_medium_04` | medium | true | 590 | 589 | 0.9896 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_medium_05` | medium | true | 624 | 534 | 0.6610 | major_rewrite | usable_with_note | Substantive line-level rewrite, still preserves the public speaking anxiety topic and structure. |
| `n4_medium_06` | medium | true | 586 | 554 | 0.5703 | major_rewrite | usable_with_note | Substantive line-level rewrite, still preserves the grit topic and structure. |
| `n4_medium_07` | medium | true | 601 | 612 | 0.9818 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_medium_08` | medium | true | 562 | 569 | 0.8146 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_medium_09` | medium | true | 560 | 562 | 0.8596 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_medium_10` | medium | true | 572 | 561 | 0.9733 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_short_01` | short | true | 165 | 129 | 0.6167 | major_rewrite | usable_with_note | Coherent edit, but introduced a minor typo: "thislast". |
| `n4_short_02` | short | true | 158 | 173 | 0.7480 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_short_03` | short | true | 154 | 155 | 0.9454 | suspicious_terms:i cannot | usable | The "I cannot" hit is natural wording in context, not an AI disclaimer. Programmatic flag reviewed and cleared. |
| `n4_short_04` | short | true | 159 | 159 | 0.9702 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_short_05` | short | true | 167 | 162 | 0.8751 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_short_06` | short | true | 162 | 162 | 0.1278 | major_rewrite | usable_with_note | Substantive rewrite, but still preserves the finished-novel post and meaning. |
| `n4_short_07` | short | true | 162 | 166 | 0.0761 | major_rewrite | usable_with_note | Substantive rewrite, but still preserves the book-offer post and meaning. |
| `n4_short_08` | short | true | 170 | 169 | 0.9020 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_short_09` | short | true | 173 | 175 | 0.9711 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
| `n4_short_10` | short | true | 171 | 163 | 0.8025 | none | usable | Coherent edit; no obvious off-task or nonsense content. |
