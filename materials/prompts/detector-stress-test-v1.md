# Detector Stress Test v1

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

## Goal

This evaluation tests where final-text AI detectors fail as policy-compliance
evidence. It does not evaluate Humanly as another text classifier. Humanly's
claim is that it records process evidence directly, while final-text detectors
must infer process from the finished text alone.

## Policy Assumption

Use one explicit policy for the first benchmark:

> Human writing, AI polish, and AI translation are allowed. Substantive AI
> generation of the final content is not allowed.

Under this policy, the compliant cases should be treated as the negative class
for detector-style binary scoring. The AI-origin cases should be treated as the
positive class.

## Case Matrix

|  | Case 1 | Case 2 | Case 3 | Case 4 |
| --- | --- | --- | --- | --- |
| **False-positive risk: human-origin or policy-compliant text flagged as AI** | **Human original**: human writes without AI assistance | **Human + AI polish**: human writes, AI only improves grammar/style | **Human + AI translation**: human writes in another language, AI translates | **Human-written AI-style text**: human studies AI-like style and writes formal/template-like text without AI generation |
| **False-negative risk: AI-origin or policy-violating text missed as human** | **Direct AI-generated**: AI writes final text directly | **AI-obfuscated**: AI text is humanized, paraphrased, or prompted to sound human | **AI cross-lingual transform**: AI writes in another language, then translates or rewrites in English | **AI-generated + light human edits**: AI draft with small human edits |

## Pairing Logic

| Pair | Compliant side | Non-compliant side | Why paired |
| --- | --- | --- | --- |
| 1 | Human original | Direct AI-generated | Clean human-origin text vs clean AI-origin text |
| 2 | Human + AI polish | AI-obfuscated | Surface style is changed after initial drafting |
| 3 | Human + AI translation | AI cross-lingual transform | Translation can obscure the source process |
| 4 | Human-written AI-style text | AI-generated + light human edits | Final style alone becomes unreliable |

## Case Construction Rules

### C1: Human original

- Source: open-license or public-domain human text, or newly collected Humanly
  writing sessions.
- No AI generation, polish, translation, or paraphrasing.
- Target length: 300-600 words per sample unless the detector has a stricter
  minimum.
- Store source metadata and license notes with each sample.

### C2: Human + AI polish

- Start from a human-written draft.
- Ask AI only to improve grammar, clarity, or style while preserving the
  original content and claims.
- Keep both the original draft and the polished final text.
- Label: policy-compliant under the benchmark policy.

### C3: Human + AI translation

- Start from human-written non-English text.
- Use AI or machine translation to translate it into English.
- Keep the source-language text and the translated final text.
- Label: policy-compliant under the benchmark policy.

### C4: Human-written AI-style text

- Participants study common AI-like writing patterns, such as formal transitions,
  generic framing, and template-like prose.
- Participants then write the final text themselves without AI generating the
  content.
- The final text should be human-origin even if it intentionally resembles
  AI-style writing.
- Label: policy-compliant and human-origin.

### N1: Direct AI-generated

- Use an LLM to generate the final answer directly from the task prompt.
- Do not manually rewrite the output.
- Label: AI-origin and non-compliant under the benchmark policy.

### N2: AI-obfuscated

- Start from direct AI-generated text.
- Apply one or more obfuscation steps: humanizer, paraphraser, or a prompt such
  as "make this sound more human."
- Keep the original AI output and the obfuscated final text.
- Label: AI-origin and non-compliant under the benchmark policy.

### N3: AI cross-lingual transform

- Ask AI to generate the content in a non-English language.
- Translate or rewrite the AI-origin content into English.
- Keep each transformation step.
- Label: AI-origin and non-compliant under the benchmark policy.

### N4: AI-generated + light human edits

- Start from direct AI-generated text.
- A human makes small edits only: local rephrasing, typo insertion/removal,
  sentence splitting, or light reordering.
- The human should not substantially rewrite the argument from scratch.
- Label: primarily AI-origin and non-compliant under the benchmark policy.

## Out of Scope for v1

- External AI output manually typed into Humanly. This belongs in the later
  red-teaming and hackability evaluation.
- Native vs non-native English as a primary variable. This can be added later if
  needed, but v1 keeps the matrix smaller.
- Turnitin. The first automated benchmark should use detector services with
  accessible APIs.
- AI brainstorming followed by human final writing. This policy label is too
  ambiguous for the first final-text detector benchmark.

## Initial Detector Set

- GPTZero
- Pangram
- Copyleaks
- Originality.ai

For each detector, record the raw score, the provider's native label, and the
thresholded binary label used for the confusion matrix.

## Initial Human Text Sources

Candidate sources to verify before use:

- Project Gutenberg or the Standardized Project Gutenberg Corpus for
  public-domain human text.
- WikiText-style pre-LLM Wikipedia snapshots for informational prose.
- Newly collected Humanly writing samples for modern task-like prose.
- Open-access learner or student-writing corpora only if licensing permits use
  in this evaluation.

Avoid private, copyrighted, or participant-identifying text.
