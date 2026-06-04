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
| **False-positive risk: human-origin or policy-compliant text flagged as AI** | **Human original**: human writes without AI assistance | **Human + AI polish**: human writes, AI only improves grammar/style | **Human + AI translation**: human writes in another language, AI translates | **Human-written AI-style text**: human studies AI-like style and writes formal/template-like text with AI-associated vocabulary, without AI generation |
| **False-negative risk: AI-origin or policy-violating text missed as human** | **Direct AI-generated**: AI writes final text directly | **AI-obfuscated**: AI text is humanized, paraphrased, or prompted to sound human | **AI cross-lingual transform**: AI writes in another language, then translates or rewrites in English | **AI-generated + light human edits**: AI draft with small human edits |

## Pairing Logic

| Pair | Compliant side | Non-compliant side | Why paired |
| --- | --- | --- | --- |
| 1 | Human original | Direct AI-generated | Clean human-origin text vs clean AI-origin text |
| 2 | Human + AI polish | AI-obfuscated | Surface style is changed after initial drafting |
| 3 | Human + AI translation | AI cross-lingual transform | Translation can obscure the source process |
| 4 | Human-written AI-style text | AI-generated + light human edits | Final style alone becomes unreliable |

## Matched Task Prompt Families

Each prompt family defines one matched set template. Cases should be comparable
within a prompt family because they share the same task type, topic, audience,
and target length. They should not all be forced to transform the same source
text; each case keeps the construction path needed for its ground-truth label.

### Prompt Family A: Short Social Media Post

- `prompt_id`: `short_social_process_001`
- `task_type`: `social_media_post`
- `length_bucket`: `short`
- target length: 120-180 words
- audience: educated public, students, instructors, and writers on a public
  social platform
- matched-set intent: short public-facing argument where detectors may be
  unstable because the text is brief

Base task prompt:

```text
Write a concise social media post for an audience of students, instructors, and
writers. Topic: Should people judge whether writing followed an AI-use policy
from the final text alone, or should they also consider evidence about how the
text was produced? Make one clear argument, include one concrete example, and
end with a practical takeaway. Keep the post between 120 and 180 words.
```

### Prompt Family B: Medium Student Assignment Response

- `prompt_id`: `medium_assignment_process_001`
- `task_type`: `student_assignment_response`
- `length_bucket`: `medium`
- target length: 400-600 words
- audience: university course instructor
- matched-set intent: classroom-style writing where policy-compliant AI polish
  and translation are plausible

Base task prompt:

```text
Write a response for a university writing assignment. Prompt: Instructors are
increasingly asked to decide whether a submitted essay followed a stated AI-use
policy. Should they evaluate only the final submitted text, or should they also
consider evidence about the writing process? Take a clear position, explain the
benefits and risks of your position, and include at least one classroom example.
Keep the response between 400 and 600 words.
```

### Prompt Family C: Long Paper Review

- `prompt_id`: `long_peer_review_process_001`
- `task_type`: `paper_review`
- `length_bucket`: `long`
- target length: 1000-1500 words
- audience: conference area chair and program committee
- matched-set intent: expert review-style writing where longer text gives
  detectors more signal and Humanly's peer-review use case is directly relevant

Synthetic paper brief for the review task:

```text
Title: Process Evidence for Human-AI Collaborative Writing

Abstract: This paper argues that final-text AI detection is not enough for
settings where AI assistance is allowed under explicit policies. The authors
present a writing platform that records keystrokes, paste events, revisions, and
in-platform AI interactions. At submission time, the platform generates a
certificate summarizing the writing process and linking to a replayable activity
log. The paper claims that process evidence can help instructors and reviewers
distinguish policy-compliant AI assistance, such as grammar polishing or
translation, from substantive AI generation of the final content. The system is
evaluated through detector stress tests and workflow studies.
```

Base task prompt:

```text
Write a detailed conference paper review for the synthetic paper brief above.
The review should include a short summary, major strengths, major weaknesses,
specific questions for the authors, and an overall recommendation. Focus on
whether the system's process-evidence approach is useful for academic writing
and peer review. Keep the review between 1000 and 1500 words.
```

## Applying the Prompt Families to the Eight Cases

For each prompt family, construct the eight cases using the same base task
prompt, task type, audience, and target length:

- `C1`: a human writes the response from scratch.
- `C2`: a human writes a draft, then AI only polishes grammar, clarity, and
  local style without changing the substantive claims.
- `C3`: a human writes the response in a non-English language, then AI translates
  it into English.
- `C4`: a human writes the response from scratch after reading the AI-style guide
  below; no AI generates the content.
- `N1`: AI writes the final response directly from the base task prompt.
- `N2`: AI writes the response, then a humanizer/paraphraser or "sound more
  human" rewrite is applied.
- `N3`: AI writes the response in a non-English language, then AI translates or
  rewrites it into English.
- `N4`: AI writes the response, then a human makes only light local edits.

Use `matched_set_id` values that include the prompt family and sample index,
such as `short_social_process_001_set01`,
`medium_assignment_process_001_set01`, and
`long_peer_review_process_001_set01`.

## Prompt-Control Principles

The prompt-control rules below are adapted from patterns in
Leey21/awesome-ai-research-writing, especially its emphasis on plain wording,
conservative editing, meaning preservation, no unnecessary formatting, and
self-checking for needless rewrites:

- Preserve the source text's claims, examples, structure, and level of detail
  unless the case explicitly requires generation.
- Do not add facts, citations, numbers, examples, or arguments that were not in
  the source or base task prompt.
- Prefer plain, precise language over inflated vocabulary unless the case is
  explicitly testing AI-like diction.
- Avoid mechanical transitions, list-like structure, unnecessary headings, and
  decorative emphasis in transformed outputs.
- If a source draft is already natural, make minimal edits rather than changing
  wording for its own sake.
- Return only the final text for each generation/transformation step so the
  stored sample is clean and detector-ready.

Reference: https://github.com/Leey21/awesome-ai-research-writing

## Reusable Transformation Prompts

### C2: AI Polish of Human Draft

```text
You are a conservative writing editor. Polish the following human-written draft
only for grammar, clarity, and local flow.

Preserve the author's ideas, claims, examples, structure, level of detail, and
voice. Do not add new facts, arguments, citations, examples, headings, bullet
points, or stylistic flourishes. Prefer plain, precise wording. If the draft is
already clear, make only minimal edits. Keep the final text within the target
word range for the original task. Return only the polished version.

[HUMAN-WRITTEN DRAFT]
```

### C3: AI Translation of Human Draft

```text
Translate the following human-written text into natural English.

Preserve the author's ideas, examples, structure, uncertainty, and level of
detail. Do not improve the argument, add facts, add examples, remove caveats, or
make the text more polished than the source warrants. Keep the final text within
the target word range for the original task. Return only the English
translation.

[HUMAN-WRITTEN NON-ENGLISH TEXT]
```

### C4: Human-Written AI-Style Instruction

```text
Before writing, read the style guide below. Do not use AI to generate, rewrite,
translate, or polish your response.

Style guide: write in a polished, formal, template-like style. Use explicit
transitions, balanced paragraphs, cautious framing, and generic connective
phrases such as "it is important to note", "this highlights", "a key
consideration", or "in this context." Intentionally use many words from this
AI-associated vocabulary list where they can fit: Accentuate, Ador, Amass,
Ameliorate, Amplify, Alleviate, Ascertain, Advocate, Articulate, Bear, Bolster,
Bustling, Cherish, Conceptualize, Conjecture, Consolidate, Convey, Culminate,
Decipher, Demonstrate, Depict, Devise, Delineate, Delve, Delve Into, Diverge,
Disseminate, Elucidate, Endeavor, Engage, Enumerate, Envision, Enduring,
Exacerbate, Expedite, Foster, Galvanize, Harmonize, Hone, Innovate,
Inscription, Integrate, Interpolate, Intricate, Lasting, Leverage, Manifest,
Mediate, Nurture, Nuance, Nuanced, Obscure, Opt, Originates, Perceive,
Perpetuate, Permeate, Pivotal, Ponder, Prescribe, Prevailing, Profound,
Recapitulate, Reconcile, Rectify, Rekindle, Reimagine, Scrutinize,
Substantiate, Tailor, Testament, Transcend, Traverse, Underscore, Unveil,
Vibrant.

The goal is to write human-origin text that resembles common AI-style prose.

Now write an original response to the assigned task prompt within the target
word range.
```

### N1: Direct AI Generation

```text
[BASE TASK PROMPT]

Use a polished, coherent style. Do not include headings, bullet points,
meta-commentary, citations, or notes about how the response was written. Return
only the final response.
```

### N2: AI Obfuscation

Use the two-step construction for the main N2 condition. First generate an AI
text from the base task prompt. Then apply a humanizer-style rewrite to that AI
text. This keeps the source AI output auditable and better matches the common
workflow where users send AI-generated text through a humanizer or paraphraser.
Directly prompting the model to "write humanized text" can be added later as a
variant, but it is not the primary N2 construction.

```text
You are an experienced editor. Rewrite the text below so it reads like natural
human writing rather than generic AI output.

Use plain, precise wording. Avoid inflated or overused terms unless they are
needed for the specific meaning. Remove mechanical transitions such as "first
and foremost", "it is worth noting that", and other formulaic connective
phrases. Turn list-like structure into coherent paragraphs when possible. Vary
sentence length and rhythm, but do not add new facts, arguments, examples, or
claims. Preserve the author's intended meaning and keep the final text within
the target word range.

If the input already reads naturally, make only minimal edits. Return only the
rewritten English text, with no explanation, translation, headings, bullet
points, formatting notes, or modification log.

[AI-GENERATED TEXT]
```

### N3: AI Cross-Lingual Transform

Step 1:

```text
[BASE TASK PROMPT]

Write the response in Chinese. Preserve the requested task, audience, and target
length in English-equivalent words. Do not include headings, bullet points,
meta-commentary, citations, or notes about how the response was written. Return
only the response.
```

Step 2:

```text
Translate the following AI-generated Chinese text into natural English.

Preserve the ideas, structure, level of detail, and original argument. Do not add
new facts, examples, citations, or claims. Keep the final text within the target
word range for the original task. Return only the English translation.

[AI-GENERATED NON-ENGLISH TEXT]
```

### N4: AI-Generated Text with Light Human Edits

Human edit instruction:

```text
Make only small local edits to this AI-generated text. You may split or merge a
few sentences, change a few phrases, add or remove minor wording, and introduce
natural imperfections. Do not rewrite the argument from scratch, add new
substantive points, add citations, add examples, or change the overall
structure. Return only the lightly edited text.
```

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
  generic framing, template-like prose, and frequent AI-associated vocabulary.
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
- Apply one or more obfuscation steps: humanizer, paraphraser, or the N2
  rewrite prompt above.
- Keep the original AI output and the obfuscated final text.
- Use a two-step rewrite for the main N2 condition; direct "humanized" AI
  generation can be tracked later as a separate variant.
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
