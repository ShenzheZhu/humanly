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
- GPTZero's Google Docs Writing Report includes document-lifespan statistics,
  a writing activity timeline, largest copy/paste events, typing-pattern
  analysis, replay video, and PDF export.
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
- Draftback is used by teachers to inspect plagiarism or possible AI use, but
  the cited product page documents replay and summary features rather than
  native AI prompt logging or policy enforcement.
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
- The cited Inspect Writing documentation is Google Docs-specific and does not
  document native AI prompt/response logging or task-policy enforcement inside
  the writing environment.

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
- The cited source documents Google Docs activity reporting and detection
  add-ons, not assignment policy enforcement or native AI prompt/response
  capture.

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

| System | Evidence Source | Replay | Paste Visibility | Native AI Prompt/Response Log | AI Mode/Policy Distinction | Task Policy Enforcement | Enrollment/Assigned Flow | Report/Verification Artifact | Peer Review Fit | Deployment Control |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Humanly | Native writing events | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Partial |
| Turnitin Clarity | Turnitin writing workspace/report | Yes | Yes | Yes, for Clarity AI Assistant | Partial, assignment-level AI tools | Yes, in Turnitin assignment context | Yes | In-platform Writing Report | Partial | No |
| Grammarly Authorship | Grammarly/Docs/Word attribution | Yes | Yes | Partial, collects prompts/source attribution; no verified full prompt-response transcript | Partial, source categories and admin feature controls | Partial, feature/admin controls but not per-task writing policy | No assigned-flow found | Shareable Authorship report | No | No |
| GPTZero Origin/Writing Reports | Google Docs writing report plus detector | Yes | Yes | No verified prompt-response log | No verified AI-mode policy | No verified task-policy enforcement | No assigned-flow found | PDF/exportable Writing Report | No | No |
| Draftback | Google Docs revision history | Yes | Partial, revision playback can reveal insertions but paste classification is not verified | No | No | No | No | No dedicated report found | No | No |
| Brisk Inspect Writing | Google Docs revision history | Yes | Yes | No | No | No | No assigned-flow found for Inspect Writing itself | No dedicated certificate/report found | No | No |
| Integrito | Google Docs activity report | Yes | Yes | No | No | No | No assigned-flow found | Activity Report | No | No |
| WritingTrace | Google Docs revision history | Yes | Yes | No | No | No | No | Exportable forensic report | No | No |
| PaperTrail Inspect | Google Docs revision history | Yes | Yes | No | No | No | No | Printable Process View report | No | No |

## Compact Paper Table Candidate

This is the paper-facing version of the matrix above. Use this table only after
source verification, and keep the legend in the caption or footnote.

Legend:

- Y: supported by cited product documentation.
- P: partially supported, narrower than Humanly, or limited to a specific
  product context.
- N: not found in cited public documentation; this does not prove the feature is
  absent in private or enterprise configurations.

| System | Type | Replay | Paste Trace | AI Interaction Log | Task Policy | Shareable Evidence | Peer-Review Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Humanly | Native provenance platform | Y | Y | Y | Y | Y | Y |
| Turnitin Clarity | Assignment writing workspace | Y | Y | Y | P | P | P |
| Grammarly Authorship | Cross-surface source attribution | Y | Y | P | P | Y | N |
| GPTZero Writing Reports | Detector + Google Docs report | Y | Y | N | N | Y | N |
| Draftback | Google Docs revision replay | Y | P | N | N | N | N |
| Brisk Inspect Writing | Google Docs classroom replay | Y | Y | N | N | N | N |
| Integrito | Google Docs activity report | P | Y | N | N | P | N |
| WritingTrace | Google Docs forensic replay | Y | Y | N | N | Y | N |
| PaperTrail Inspect | Google Docs process report | Y | Y | N | N | Y | N |

Column definitions:

- Replay: reviewer can inspect how the document changed over time.
- Paste Trace: large paste or sudden insertion activity is surfaced.
- AI Interaction Log: AI prompt/response or equivalent AI-use event is surfaced
  as part of the process evidence, not only inferred from final text.
- Task Policy: task owner can configure rules before writing begins and the
  writing surface enforces or records them.
- Shareable Evidence: the system can produce a report, certificate, PDF, or
  shareable artifact for review.
- Peer-Review Fit: the workflow naturally supports PDF/context-heavy peer
  review rather than only generic essay drafting.

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
