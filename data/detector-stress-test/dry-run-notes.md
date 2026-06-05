# Detector Dry-Run Notes

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

Status: legacy technical dry run only. These samples were intended to test the
early data pipeline and detector API normalization after approval. They are not
paper-ready evaluation materials, and they are not the current 8-case generation
source package. For the current package, use `generation-pipeline.md`,
`generation-input-audit.md`, and `generation-input-local-audit.md`.

## Scope

Completed in this dry-run set:

- `C1`: human original, public-domain English literary excerpt.
- `C2`: AI-polished version of the same public-domain English excerpt.
- `C3`: AI-translated version of a public-domain French excerpt.
- `N1`: direct AI-generated response to the shared task prompt.
- `N2`: AI-obfuscated rewrite of `N1`.
- `N3`: AI-generated Chinese response translated into English.

Skipped for the technical API pipeline dry run:

- `C4`: human-written AI-style text. This requires a human writer and should not
  be synthesized. It remains required for the full detector stress-test design,
  but it is not needed to test detector API plumbing.
- `N4`: AI-generated text plus light human edits. This requires actual human
  edits if used as a clean case. It remains required for the full detector
  stress-test design, but it is not needed to test detector API plumbing.

## Source Caveat

This legacy dry-run note used Project Gutenberg literary text for technical
testing only. The current 8-case package has moved C3 off the short/medium
Project Gutenberg fallback: C3 short uses non-English forum-style posts, C3
medium uses Spanish Wikiversity old-revision educational excerpts, and C3 long
uses Norwegian Bokelskere book-review text.

## Sources

- `C1`/`C2`: E. M. Forster, _A Room with a View_, Project Gutenberg eBook 2641.
  URL: https://www.gutenberg.org/ebooks/2641
- `C3`: Gustave Flaubert, _Madame Bovary_, Project Gutenberg eBook 14155.
  URL: https://www.gutenberg.org/ebooks/14155
- Project Gutenberg terms: https://www.gutenberg.org/policy/terms_of_use.html

Project Gutenberg warns that copyright status can differ outside the United
States and points users to the Project Gutenberg License for redistribution
rules. This dry run stores only short excerpts with source metadata.
