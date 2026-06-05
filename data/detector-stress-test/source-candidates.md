# Human Text Source Candidates

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

This file lists candidate sources for human-origin text in the detector stress
test. The first experiment should prefer sources with clear licenses and stable
metadata.

## Recommended v1 Sources

Draft only. Final source selection requires Shenzhe's approval before samples
are collected, transformed, or reported.

### Reddit

- Use for: `short` social-media-style human seeds.
- Candidate seed pack file: `human-seeds.csv`.
- Current candidate pack: 10 pre-2017 `r/writing` self-posts, 129-447 words.

Pros:

- Real public social-media post rather than a formal essay, article, or
  comment. We intentionally use complete self-posts, not comment snippets.
- Pre-LLM timestamp can be verified through the Reddit permalink.
- Naturally fits the short-text detector condition, where final-text detectors
  may be especially unstable.
- Covers several writing-related social-post situations: finishing drafts,
  restarting a writing habit, receiving an offer, self-publishing, and writing
  process reflection.

Cautions:

- Reddit user content is public but not automatically open-license for broad
  redistribution. Before making the dataset public, either confirm permitted use
  or store only permalink/metadata plus a reproducible fetch script.
- Deleted or edited posts can make future fetching less stable, so keep exact
  permalinks, IDs, and timestamps.

### ICLR OpenReview

- Use for: `long` paper-review human seeds.
- API: `https://api.openreview.net/notes?forum=<forum_id>`
- Current candidate pack: 10 ICLR 2017 official reviews, 1005-1364 words.

Pros:

- Directly matches Humanly's peer-review use case.
- Official reviews are public on OpenReview with stable note IDs, forum IDs,
  timestamps, rating fields, confidence fields, and anonymous reviewer
  signatures.
- 2017 ICLR reviews are pre-ChatGPT and close to the intended expert-review
  writing domain.

Cautions:

- OpenReview review text is publicly readable, but redistribution/licensing
  should be checked before releasing a public benchmark dataset.
- Some reviews are short; filter by word count for the long bucket.

### Wikiversity Old Revisions

- Use for: `medium` student-assignment-style human seeds.
- Current candidate pack: 10 pre-2017 old revisions from the 2016 Motivation
  and emotion book project, 402-529 words.

Pros:

- Open student/course-writing style rather than polished professional prose.
- Old revision IDs freeze the text before modern LLMs.
- CC BY-SA licensing is explicit, provided attribution and share-alike
  requirements are tracked.

Cautions:

- Wiki markup, quizzes, templates, references, and navigation material must be
  cleaned carefully.
- Some pages contain instructor copyedits, so the source should be described as
  course-writing style rather than raw student submissions.

### Project Gutenberg / Standardized Project Gutenberg Corpus

- Use for: fallback non-English human seeds for `C3 Human + AI translation`,
  and possible generic prose fallback for `C1`/`C2`.
- Official terms: https://www.gutenberg.org/policy/terms_of_use.html
- License page: https://www.gutenberg.org/policy/license
- Standardized corpus repo: https://github.com/pgcorpus/gutenberg
- Current translation seed pack: 30 French/Spanish excerpts from Project
  Gutenberg texts, 10 per length bucket, recorded in `translation-seeds.csv`.

Pros:

- Pre-LLM human text.
- Large public-domain-oriented collection.
- Easy to cite and reproduce through stable book metadata.

Cautions:

- Project Gutenberg warns that copyright status can differ outside the United
  States.
- Do not bulk scrape the main website. For larger downloads, use mirrors or the
  standardized corpus tooling.
- If redistributing excerpts that retain Project Gutenberg markers, preserve
  license/trademark requirements. For the benchmark, keep precise source
  metadata and avoid unnecessary large redistribution.
- Current C3 seeds are scalable and human-origin, but not task-aligned to
  Humanly's social media, classroom, and peer-review use cases.

### Wikipedia / WikiText-style snapshots

- Use for: informational/formal prose, possible source drafts for `C2` or `C3`.
- Creative Commons license overview: https://creativecommons.org/share-your-work/use-remix/cc-licenses/
- WikiText dataset page: https://huggingface.co/datasets/Salesforce/wikitext

Pros:

- Openly licensed text, useful for formal/informational writing.
- Helpful for AI-like formal prose controls if license attribution is kept.

Cautions:

- Wikipedia text uses CC BY-SA style licensing, so attribution and share-alike
  obligations must be tracked.
- Some articles may have post-LLM edits if pulled live; use older snapshots or
  WikiText-style datasets when possible.

### Newly Collected Humanly Writing Samples

- Use for: modern classroom/peer-review-like prose.
- Source: participants write directly in Humanly.

Pros:

- Strongest match to the product's setting.
- Provides process evidence and modern task style.

Cautions:

- Requires participant consent and privacy handling.
- Should not be mixed into public repo data unless de-identified and permitted.

## Human-Written AI-Style Text

The `C4` case should be generated by humans, not by AI. Participants should
study examples of AI-like style and then write original text themselves.

Suggested instruction:

> Read the style guide describing common AI-like writing patterns. Without using
> AI to generate content, write a 300-600 word response in a formal,
> template-like, highly polished style.

This keeps the ground-truth label clean: human-origin and policy-compliant.

## Source Decision for Dry Run

For the first dry run:

- Use the 10 Reddit self-post seeds for short social-media candidates.
- Use the 10 pre-2017 Wikiversity old revisions for medium student-writing
  candidates.
- Use the 10 ICLR 2017 OpenReview official reviews for long paper-review
  candidates.
- Use the 30 Project Gutenberg French/Spanish excerpts as fallback C3
  translation seeds.
- Leave `C4` as `needs_human_writer` until a person writes the sample.
- Generate `N1`, `N2`, and `N3` from controlled prompts.
- Generate an `N4` AI draft from a controlled prompt, then collect human light
  edits before treating the row as paper-ready.

The current seed candidate pack is generated by
`scripts/collect_human_seeds.mjs` and recorded in `human-seeds.csv`. It contains
30 English human seeds total, 10 per length bucket.
The current C3 translation seed pack is generated by
`scripts/collect_translation_seeds.mjs` and recorded in `translation-seeds.csv`.
