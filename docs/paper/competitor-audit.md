# Process and Replay Competitor Audit

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

This document scopes the existing-system comparison to process, replay, and
provenance systems. Final-text detector benchmarking is intentionally excluded
from this file; that evaluation is tracked separately in the detector
stress-test plan.

## Working Claim

Existing replay tools make writing history more visible, usually by exposing
Google Docs or Word revision data. Humanly's narrower contribution is not that
it is the only replay system. The claim is that Humanly combines task policy,
native AI interaction logging, writing-event capture, enrollment, and shareable
verification in one controlled writing workflow.

Paper-safe wording:

> Existing process tools expose parts of the writing history, but they are often
> document-history viewers or detector-adjacent reports. Humanly instead treats
> the writing task, allowed AI modes, AI prompt/response events, typing/paste
> trace, and certificate verification as a single provenance pipeline.

## Comparison Dimensions

| Dimension | Question |
| --- | --- |
| Evidence source | Is the evidence based on final text, host-document revision history, or native event capture? |
| Writing replay | Can a reviewer replay how the document changed over time? |
| Paste/large insertion visibility | Does the system surface sudden text insertion or paste-like activity? |
| Native AI prompt/response logging | Are AI requests and responses captured as first-class events? |
| AI mode/policy distinction | Can the system distinguish allowed modes such as polish, chat, and full generation? |
| Task policy enforcement | Can an owner configure and enforce writing rules before writing begins? |
| Enrollment/task workflow | Does the system support assigned tasks, shared links, or participant enrollment? |
| Certificate/shareable verification | Can the writer or reviewer share a portable verification artifact? |
| Peer-review suitability | Does the workflow support PDF/context-heavy review tasks, not only generic document drafting? |
| Deployment/control | Can an institution self-host or control the full data pipeline? |

## Source-Backed Notes

### Turnitin Clarity / Writing Report

Confirmed from Turnitin guides:

- The Writing Report includes AI writing cards, observations, AI Chat Activity,
  and writing process playback.
- AI Chat Activity can show student requests, assistant responses, themes, and
  a full chat history when the assistant is enabled.
- Writing process playback highlights additions, deletions, and pasted text on a
  timeline.
- Turnitin distinguishes AI writing detection during the writing process from
  the final AI Writing report, because students may edit or replace pasted text
  before submission.

Useful sources:

- https://guides.turnitin.com/hc/en-us/articles/36916426919949-Reviewing-the-Writing-Report
- https://www.turnitin.com.au/products/feedback-studio/clarity

Draft comparison note:

Turnitin Clarity is a strong process-transparency comparator in education. It
appears closest to Humanly on writing playback and in-platform AI chat activity,
but it is embedded in the Turnitin assignment/reporting ecosystem rather than
presented as an open, standalone provenance pipeline for arbitrary writing and
peer-review workflows.

### Grammarly Authorship

Confirmed from Grammarly support:

- Authorship works in Google Docs, Microsoft Word, and Grammarly's own docs
  surface.
- It categorizes text as typed, pasted from browser sources, pasted from unknown
  sources, AI-generated, modified with on-demand AI rephrasing, or edited with
  traditional non-generative Grammarly suggestions.
- Authorship Replay shows full typing and editing history.
- Reports can be generated and shared.
- Some detailed attribution depends on product plan and environment.

Useful sources:

- https://support.grammarly.com/hc/en-us/articles/29548735595405-About-Authorship
- https://www.grammarly.com/authorship

Draft comparison note:

Grammarly Authorship is a strong source-attribution comparator because it
explicitly categorizes typed, pasted, AI-generated, AI-rephrased, and
Grammarly-edited text. Humanly should not claim uniqueness on source labeling.
The sharper contrast is that Humanly is task-policy-first: the writing
environment, AI mode configuration, event stream, and verification certificate
are designed as one workflow.

### GPTZero Origin / Writing Reports

Confirmed from GPTZero FAQ and product pages:

- GPTZero offers Writing Reports / authorship verification and recommends using
  writing-process artifacts as part of holistic assessment.
- GPTZero's detector remains a trinary final-text classifier with
  `HUMAN_ONLY`, `MIXED`, and `AI_ONLY` outputs in the API.
- GPTZero acknowledges classifier edge cases where AI is classified as human and
  human is classified as AI.

Useful sources:

- https://gptzero.me/faq
- https://gptzero.me/technology

Draft comparison note:

GPTZero is important because it bridges AI detection and writing reports. The
paper should not claim that GPTZero lacks process reports. The safer distinction
is that GPTZero's public detector remains a post-hoc classifier, while Humanly's
core evidence is generated from native process events and task policy rather
than from text prediction.

### Draftback

Confirmed from Draftback:

- Draftback replays the revision history of Google Docs that the viewer can
  edit.
- It provides playback controls and document summaries using the fine-grained
  data Google Docs already stores.
- Draftback explicitly does not position itself as an AI detector and presents
  playback/statistics for human judgment.
- Draftback is Google Docs dependent and can be used retroactively on existing
  documents.

Useful source:

- https://draftback.com/

Draft comparison note:

Draftback is the cleanest baseline for replay-only evidence. It is useful for
showing that replay itself is not the novelty. Humanly's difference is native
task enforcement, AI-action logging, and certificate generation rather than
retroactive replay of an existing Google Doc.

### Brisk Inspect Writing

Confirmed from Brisk:

- Inspect Writing works directly in Google Docs through the Brisk Chrome
  extension.
- It provides video-style replay of a student's writing process.
- It shows created text, large copy/paste actions, deletions, timestamps, and
  writing duration.
- Brisk frames the tool as a factual record and conversation starter rather than
  an accuracy-scored AI detector.

Useful sources:

- https://www.briskteaching.com/inspect-writing
- https://help.briskteaching.com/hc/en-us/articles/39310227756436-How-To-Inspect-Writing

Draft comparison note:

Brisk Inspect Writing is a strong classroom replay comparator. The Humanly
contrast is less about replay and more about policy-aware AI controls and a
portable certificate tied to the writing environment.

### Integrito

Confirmed from Integrito:

- Integrito provides Google Docs Activity Reports to track the writing process.
- It surfaces time spent composing, writing stages, suspicious paste-like
  activity, contributor information, and comparison between workflow stages and
  final text.
- It also offers plagiarism and AI detection in the same toolkit, while noting
  that humans should make final decisions.
- It works as a browser extension and requires editing access to the Google Doc.

Useful source:

- https://integrito.ai/

Draft comparison note:

Integrito is relevant because it already combines activity reports with AI and
plagiarism detection. Humanly's distinction should focus on native task policy,
AI-interaction trace granularity, and certificate/review workflows.

### WritingTrace

Confirmed from WritingTrace:

- WritingTrace is a Chrome extension for Google Docs process playback.
- It reconstructs the editing timeline on device from Google Docs revision data.
- It surfaces edit velocity, paste detection with character counts,
  per-session analytics, and exportable forensic reports.
- It explicitly positions itself as evidence over probability rather than an AI
  detector.

Useful source:

- https://writingtrace.com/

Draft comparison note:

WritingTrace is a close philosophical comparator because it also emphasizes
process evidence over detector probability. Humanly should acknowledge this and
focus the contrast on integrated AI-use logging, configurable writing policies,
participant enrollment, and certificate verification.

### PaperTrail Inspect

Confirmed from PaperTrail:

- PaperTrail Inspect reconstructs Google Docs revision history, sessions, paste
  events, revision clusters, and a printable Process View report.
- It processes document history in the browser and supports playback.
- Adjacent paid tools provide style matching and AI-assisted analysis.

Useful source:

- https://papertrailacademic.com/inspect/

Draft comparison note:

PaperTrail Inspect is a useful extended comparator for Google Docs revision
history analysis and process reports. It should be treated as a Google Docs
history tool rather than a native AI-policy writing environment.

## Feature Matrix Draft

Legend:

- Yes: clearly supported by cited product documentation.
- Partial: related support exists, but not in the same scope as Humanly.
- No: not found in cited documentation.
- Unknown: not yet verified from cited documentation.

| System | Evidence Source | Replay | Paste Visibility | Native AI Prompt/Response Log | AI Mode/Policy Distinction | Task Policy Enforcement | Enrollment/Assigned Flow | Certificate/Verification | Peer Review Fit | Deployment Control |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Humanly | Native writing events | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Partial |
| Turnitin Clarity | Turnitin writing workspace/report | Yes | Yes | Yes, for Clarity AI Assistant | Partial | Yes, in Turnitin assignment context | Yes | Partial | Partial | No |
| Grammarly Authorship | Grammarly/Docs/Word attribution | Yes | Yes | Partial, Grammarly AI/source attribution | Partial | Partial | Partial | Yes, Authorship reports | No | No |
| GPTZero Origin/Writing Reports | Writing report plus detector | Yes | Partial | Unknown | Partial | Partial | Partial | Yes, writing report | No | No |
| Draftback | Google Docs revision history | Yes | Partial | No | No | No | No | No | No | No |
| Brisk Inspect Writing | Google Docs revision history | Yes | Yes | No | No | No | Partial, classroom tools | No | No | No |
| Integrito | Google Docs activity report | Yes | Yes | No | No | No | Partial, LMS/toolkit context | Partial | No | No |
| WritingTrace | Google Docs revision history | Yes | Yes | No | No | No | No | Yes, forensic report | No | No |
| PaperTrail Inspect | Google Docs revision history | Yes | Yes | No | No | No | No | Yes, process report | No | No |

## Humanly Differentiation To Preserve

The strongest comparison paragraph should say:

1. Replay is not unique; several tools replay Google Docs or Turnitin writing
   history.
2. Some competitors are increasingly process-aware, especially Turnitin Clarity,
   Grammarly Authorship, GPTZero Writing Reports, and WritingTrace.
3. Humanly's contribution is the unified provenance pipeline: task policy is set
   before writing, AI access modes are enforced in the editor, AI prompt/response
   events are logged, writing events are captured as the text is produced, and a
   certificate/verification artifact can be generated from that same event
   stream.

## Claims To Avoid

- Do not claim Humanly is the only replay or process-evidence tool.
- Do not claim GPTZero lacks writing reports.
- Do not claim Grammarly Authorship lacks AI/source attribution.
- Do not claim Turnitin Clarity lacks AI chat logs.
- Do not claim Google Docs replay tools are useless; instead say they are
  document-history tools rather than full task-policy provenance environments.
- Do not claim Humanly proves authorship automatically. It provides process
  evidence for downstream judgment.

## Open Verification Items

- Hands-on GPTZero Origin/Writing Reports audit: verify exactly what its report
  shows for AI-generated text, AI-assisted writing, copy/paste, and writing
  replay.
- Hands-on Grammarly Authorship audit: verify whether generated AI text can be
  tied to final spans after edits under the current product.
- Hands-on Turnitin Clarity audit if institutional access is available.
- Decide whether PaperTrail Inspect should be included in the main paper table
  or only cited as an extended comparator.
