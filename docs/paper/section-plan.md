# Section Plan

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

This plan reflects the current framing decision: comparison with existing
systems should be separated from evaluation. The comparison section should
establish Humanly's product/system position against existing detectors,
process/replay tools, and authorship-report products. The evaluation section
should then report detector stress-test results and human-study/user-study
evidence.

## Proposed Top-Level Structure

1. Introduction
2. System Architecture
3. Workflows and Use Cases
4. Comparison with Existing Systems
5. Evaluation
6. Limitations and Ethical Considerations
7. Conclusion

## 1. Introduction

Goal: define the problem as policy-compliance evidence in mixed human-AI writing,
not as final-text AI detection.

Required moves:

- motivate education, peer review, and personal certification;
- state that final text alone cannot answer how the writing was produced;
- introduce Humanly as a provenance-first writing platform;
- summarize contributions as system, workflows, existing-system comparison, and
  evaluation.

## 2. System Architecture

Goal: explain the deployed Humanly system with enough technical detail for a
demo-track paper.

Content:

- admin portal, user portal, and task enrollment/shared-link flow;
- Lexical editor, tracker, event schema, and storage path;
- AI-use logging and configurable AI modes;
- certificate, verification page, and replay/log surfaces;
- live monitoring/admin review where relevant.

Important: claims in this section must match deployed behavior or features
guaranteed to ship before submission.

## 3. Workflows and Use Cases

Goal: show how the same system supports realistic stakeholder workflows.

Candidate order:

1. Peer review of academic papers
2. Classroom writing assignments
3. Personal writing certification

Rationale: peer review is the most distinctive use case because LLM polishing
and LLM-assisted review policies are hard to enforce with text-only evidence.

## 4. Comparison with Existing Systems

Goal: compare Humanly against existing systems without running the evaluation
inside the same section. This section should not be a detached feature table; it
should show why Humanly is needed.

### 4.1 Final-Text Detectors

Compare final-text detector systems conceptually, but reserve empirical detector
results for Section 5. The key claim is that final-text detectors estimate what
the finished text resembles, while Humanly records how the text was produced.

Use GPTZero, Pangram, Originality.ai, and Copyleaks as detector examples. Do not
include Turnitin in the first automated benchmark.

### 4.2 Process and Replay Systems

Compare process/provenance tools such as Turnitin Clarity, Grammarly
Authorship, GPTZero Origin/Writing Reports, Draftback, Brisk Inspect Writing,
Integrito, WritingTrace, and PaperTrail Inspect.

Feature groups:

- Writing Environment: native workspace, fine-grained event log, process replay.
- AI Provenance: AI interaction log, configurable AI policy.
- Task Governance: flexible writing environment, assigned task workflow.
- Evidence Sharing: certificate analytics.

Humanly's claim should be narrow: not that replay is unique, but that Humanly
combines configurable writing environments, native AI-use logging, assigned task
workflow, fine-grained event capture, and certificate analytics in one deployed
writing workflow.

### 4.3 Synthesis

Expected conclusion:

- final-text detectors answer what the final text resembles;
- replay tools answer part of what happened in a document;
- Humanly is designed around whether the writing process complied with the
  policy set for the task.

## 5. Evaluation

Goal: evaluate whether Humanly's process evidence improves policy-compliance
judgment and whether the writing workflow is usable.

### 5.1 Final-Text Detector Stress Test

Compare against GPTZero, Pangram, Originality.ai, and Copyleaks if accessible.

Situation cases should cover:

- human original writing;
- human writing polished or grammar-checked by AI;
- human writing translated by AI;
- human-written AI-style prose;
- direct AI-generated text;
- AI-generated text paraphrased, humanized, or prompted to sound human;
- AI-generated text transformed across languages;
- AI-generated text with light human edits.

Report:

- confusion matrix by situation, not only aggregate accuracy;
- false positives on human-origin or policy-compliant text;
- false negatives on AI-origin or policy-violating text;
- short analysis explaining why detector output cannot decide policy compliance
  when AI use is allowed under some policies.

The v1 case matrix is tracked in
`materials/prompts/detector-stress-test-v1.md`.

### 5.2 Human Study

Evaluate Humanly itself with people.

Study components:

- writer-side usability: can participants write naturally in Humanly under the
  configured AI policy?
- policy clarity: do participants understand what is allowed?
- certificate interpretation: can readers use Humanly evidence to judge whether
  a session appears policy-compliant?

Candidate conditions:

- writer conditions: AI off, polish-only, agent-chat-only, full access, depending
  on shipped product support;
- reader conditions: final text only, final text plus detector score, final text
  plus Humanly certificate/replay.

Primary measures:

- writer usability and perceived friction;
- perceived fairness and transparency;
- reader accuracy, confidence, and time-to-judgment;
- qualitative comments about what evidence was useful or confusing.

## 6. Limitations and Ethical Considerations

Required points:

- Humanly provides process evidence, not automatic proof of authorship;
- logs and replay create surveillance risk;
- detector/compliance classifier outputs must not be treated as verdicts;
- adversaries can still use voice input, manual transcription, or artificial
  editing behavior;
- deployed-feature claims must be separated from future work.

## 7. Conclusion

Goal: close on the provenance reframing.

Key sentence to preserve in spirit: the important question is not only whether a
text looks AI-generated, but whether the writing process complied with the rules
that governed the task.
