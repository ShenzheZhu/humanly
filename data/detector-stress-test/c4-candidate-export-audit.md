# C4 Candidate Export Audit

Generated: 2026-06-05

Source files:

- `/Users/zhu/Desktop/untitled folder/c4-seed-instructions-summary.csv`
- `/Users/zhu/Desktop/untitled folder/c4-seed-instructions-summary.md`

## Status

The export contains all 30 expected C4 samples and passes structural/length QA.
The source CSV used a `generated_text` column and the markdown title says
`Generated Texts`, so the export was initially staged as a candidate set.

C4 requires human-written AI-style text. The project owner confirmed on
2026-06-05 that these files are human-written, so they were promoted to
`texts/human_c4/` and imported as `human_collected` C4 samples.

## Counts

| Length bucket | Rows | Word range |
| --- | ---: | ---: |
| short | 10 | 151-162 |
| medium | 10 | 491-516 |
| long | 10 | 1043-1091 |
| total | 30 | - |

## Staging

The 30 candidate text files were extracted to:

```text
data/detector-stress-test/texts/c4_candidate_export/
```

This staging folder is intentionally separate from:

```text
data/detector-stress-test/texts/human_c4/
```

The provenance question is now resolved by project-owner confirmation. The
canonical imported C4 files live under:

```text
data/detector-stress-test/texts/human_c4/
```
