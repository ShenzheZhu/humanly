# Detector Dry-Run Notes

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

Status: technical dry run only. These samples are intended to test the data
pipeline and detector API normalization after approval. They are not
paper-ready evaluation materials.

## Scope

Completed in this dry-run set:

- `C1`: human original, public-domain English literary excerpt.
- `C2`: AI-polished version of the same public-domain English excerpt.
- `C3`: AI-translated version of a public-domain French excerpt.
- `N1`: direct AI-generated response to the shared task prompt.
- `N2`: AI-obfuscated rewrite of `N1`.
- `N3`: AI-generated Chinese response translated into English.

Still pending:

- `C4`: human-written AI-style text. This requires a human writer and should not
  be synthesized.
- `N4`: AI-generated text plus light human edits. This requires actual human
  edits if used as a clean case.

## Source Caveat

`C1`, `C2`, and `C3` use Project Gutenberg literary text for technical testing.
That source is useful for dry-run mechanics, but it is not close enough to
Humanly's target settings for a main evaluation. The pilot/main batch should use
more task-like text, preferably newly collected Humanly writing samples when
consent and storage rules are settled.

## Sources

- `C1`/`C2`: E. M. Forster, _A Room with a View_, Project Gutenberg eBook 2641.
  URL: https://www.gutenberg.org/ebooks/2641
- `C3`: Gustave Flaubert, _Madame Bovary_, Project Gutenberg eBook 14155.
  URL: https://www.gutenberg.org/ebooks/14155
- Project Gutenberg terms: https://www.gutenberg.org/policy/terms_of_use.html

Project Gutenberg warns that copyright status can differ outside the United
States and points users to the Project Gutenberg License for redistribution
rules. This dry run stores only short excerpts with source metadata.
