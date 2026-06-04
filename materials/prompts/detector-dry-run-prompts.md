# Detector Dry-Run Prompts

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

Use these prompts to generate or transform dry-run samples. Store the exact
model, date, prompt, and output path for each generated sample.

Draft status: these prompts were used only for the technical API plumbing dry
run. The matched prompt families for the pilot/main detector stress test live in
`detector-stress-test-v1.md`.

## Shared Task Frame

Use one writing task for the first dry run so cases are comparable:

> Write a short reflective essay for a university writing assignment. Topic:
> Should instructors evaluate only the final submitted text, or should they also
> consider how the text was produced? Keep the response between 300 and 600
> words.

## C2: Human + AI Polish

Input: a human-written source draft.

Prompt:

```text
Polish the following human-written draft for grammar, clarity, and flow.
Preserve the author's ideas, claims, examples, and structure. Do not add new
substantive arguments or facts. Return only the polished version.

[DRAFT]
```

## C3: Human + AI Translation

Input: a human-written non-English source draft.

Prompt:

```text
Translate the following human-written text into natural academic English.
Preserve the author's ideas, examples, and level of detail. Do not add new
arguments or facts. Return only the English translation.

[SOURCE TEXT]
```

## C4: Human-Written AI-Style Text

Instruction for the human writer:

```text
Read examples of polished AI-like writing style: formal transitions, balanced
paragraphs, generic framing, and phrases such as "it is important to note" or
"this highlights." Do not use AI to generate content. Write an original
300-600 word response to the shared task frame in a formal, template-like style.
```

## N1: Direct AI-Generated

Prompt:

```text
Write a short reflective essay for a university writing assignment. Topic:
Should instructors evaluate only the final submitted text, or should they also
consider how the text was produced? Keep the response between 300 and 600 words.
Use a polished academic style.
```

## N2: AI-Obfuscated

Step 1: generate `N1`.

Step 2 prompt:

```text
Rewrite the following essay so it sounds more human and less like it was written
by AI. Vary the sentence rhythm, make the wording less generic, and preserve the
meaning. Return only the rewritten essay.

[AI-GENERATED TEXT]
```

## N3: AI Cross-Lingual Transform

Step 1 prompt:

```text
Write a short reflective essay in Chinese for a university writing assignment.
Topic: Should instructors evaluate only the final submitted text, or should they
also consider how the text was produced? Keep the response between 300 and 600
English-equivalent words. Use a polished academic style.
```

Step 2 prompt:

```text
Translate the following AI-generated Chinese essay into natural academic
English. Preserve the ideas and structure. Return only the English translation.

[AI-GENERATED NON-ENGLISH TEXT]
```

## N4: AI-Generated + Light Human Edits

Step 1: generate `N1`.

Human edit instruction:

```text
Make only small local edits to this AI-generated text. You may split or merge a
few sentences, change a few phrases, add or remove minor wording, and introduce
natural imperfections. Do not rewrite the argument from scratch.
```

## Metadata to Save

For each generated or transformed sample, record:

- model/provider;
- timestamp;
- exact prompt;
- source text path;
- final text path;
- whether a human edited the text;
- short notes on the transformation.
