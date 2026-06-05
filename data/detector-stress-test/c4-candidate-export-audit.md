# C4 Candidate Export Audit

Generated: 2026-06-05

Source files:

- `/Users/zhu/Desktop/untitled folder/c4-seed-instructions-summary.csv`
- `/Users/zhu/Desktop/untitled folder/c4-seed-instructions-summary.md`

## Status

The export contains all 30 expected C4 samples and passes structural/length QA,
but it is not yet imported as paper-ready C4 evidence because the source CSV
uses a `generated_text` column and the markdown title says `Generated Texts`.

C4 requires human-written AI-style text. These files should only be imported as
`human_collected` C4 samples if their human authorship is confirmed separately.

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

Do not run `import_c4_human_samples.mjs` against this export until the human
authorship/provenance question is resolved.
