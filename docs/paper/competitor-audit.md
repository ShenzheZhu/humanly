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
| Native writing workspace | Does the system provide its own controlled editor, rather than only inspecting Google Docs, Word, or another host editor? |
| Fine-grained event log | Does the system expose detailed process events beyond coarse replay, such as input, selection, copy/paste, focus/blur, formatting, and AI events? |
| Writing replay | Can a reviewer replay how the document changed over time? |
| Native AI prompt/response logging | Are AI requests and responses captured as first-class events? |
| AI mode/policy distinction | Can the system distinguish allowed modes such as polish, chat, and full generation? |
| Flexible task settings | Can an owner configure writing rules such as AI access, assistance modes, paste/copy rules, timing, character limits, or access/submission rules? |
| Assigned task workflow | Does the product support an owner/instructor/admin assigning or sharing a writing task with participants/students/writers? |
| Integrated evidence package | Does the output combine replay, analysis/reporting, certificate-style evidence, or verification into a reviewable artifact? |
| Deployment/control | Can an institution self-host or control the full data pipeline? |

## Source-Backed Notes

### Turnitin Clarity / Writing Report

Confirmed from Turnitin guides:

- The Writing Report includes AI writing cards, observations, AI Chat Activity,
  and writing process playback.
- AI Chat Activity can show student requests, assistant responses, themes, and
  a full chat history when the assistant is enabled.
- In the student workflow, Turnitin states that all interactions with the AI
  Assistant are logged and shared with the instructor after submission.
- In the instructor Writing Report, the AI Chat Activity section includes a
  holistic summary, chat themes, a Full Chat History button, and slide-outs that
  show the student request and assistant response at a specific time.
- Writing process playback highlights additions, deletions, and pasted text on a
  timeline.
- Instructors can enable Turnitin Clarity AI tools at assignment creation,
  including AI chat, spelling and grammar check, and citation check.
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

## Humanly Source Check For Fine-Grained Logs

Humanly's fine-grained event log claim is backed by the current product code,
not only by website copy.

Relevant source-backed facts from `origin/main`:

- `EventType` includes keydown, keyup, paste, copy, cut, focus, blur, input,
  delete, select, formatting changes, list/alignment changes, find/replace
  events, AI panel events, AI query/response events, AI selection actions, and
  AI chat insertion events.
- `DocumentEvent` stores event type, timestamp, key fields, text before/after,
  cursor position, selection start/end, full Lexical editor state before/after,
  and metadata.
- The Lexical editor tracker registers handlers for keydown, paste, copy, cut,
  selection change, focus, blur, text formatting, heading, font, color, list,
  and alignment actions.
- AI selection actions store action type, original text, suggested text,
  accepted/rejected decision, final text, response time, and model version.
- AI chat and interaction logs store chat sessions/messages and detailed
  interaction logs with context snapshots, suggestions, and applied
  modifications.

Source files:

- `packages/shared/src/types/event.types.ts`
- `packages/shared/src/types/document.types.ts`
- `packages/editor/src/tracking/editor-tracker.ts`
- `packages/backend/src/models/ai-selection-action.model.ts`
- `packages/backend/src/db/migrations/005_ai_assistant.sql`

## Feature Matrix Draft

Legend:

- Yes: clearly supported by cited product documentation.
- Partial: related support exists, but not in the same scope as Humanly.
- No: not found in cited documentation.
- Unknown: not yet verified from cited documentation.

| System | Evidence Source | Native Writing Workspace | Fine-Grained Event Log | Replay | Native AI Prompt/Response Log | AI Mode/Policy Distinction | Flexible Task Settings | Assigned Task Workflow | Integrated Evidence Package |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Humanly | Native writing events | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Certificate, verification link, replay, logs, PDF/JSON analysis |
| Turnitin Clarity | Turnitin writing workspace/report | Yes | Partial, writing activity and AI-assistant logs | Yes | Yes, AI Chat Activity with full chat history | Partial, assignment-level AI tools | Partial, assignment settings and AI tool toggles | Yes, instructor/student assignment context | In-platform Writing Report |
| Grammarly Authorship | Grammarly/Docs/Word attribution | Partial, Grammarly docs plus Docs/Word tracking | Partial, source attribution and replay | Yes | Partial, collects prompts/source attribution; no verified full prompt-response transcript | Partial, source categories and admin feature controls | Partial, admin feature controls but not task-specific writing policy | No assigned-flow found | Authorship replay/report |
| GPTZero Origin/Writing Reports | Google Docs writing report plus detector | Partial, Google Docs extension/editor context | Partial, timeline, paste, typing-pattern report | Yes | No verified prompt-response log | No verified AI-mode policy | No verified task-policy enforcement | No assigned-flow found | PDF/exportable Writing Report |
| Draftback | Google Docs revision history | No, Google Docs extension | Partial, revision-level events | Yes | No | No | No | No | Replay summary only |
| Brisk Inspect Writing | Google Docs revision history | No, Google Docs extension | Partial, created text, paste, deletion, duration | Yes | No | No | No | Partial, classroom tools but no Inspect-specific assigned flow found | No dedicated certificate/report found |
| Integrito | Google Docs activity report | No, Google Docs extension | Partial, activity report and suspicious paste-like events | Yes | No | No | No | Partial, teacher/student positioning but no assigned-flow found | Activity Report |
| WritingTrace | Google Docs revision history | No, Google Docs extension | Partial, edit velocity, paste analytics, sessions | Yes | No | No | No | No | Exportable forensic report |
| PaperTrail Inspect | Google Docs revision history | No, Google Docs extension | Partial, sessions, paste events, revision clusters | Yes | No | No | No | No | Printable Process View report |

## Feature Groups For Paper Table

Jiaxin/Pedro suggestion to preserve: group the feature comparison into broad
capability families instead of presenting a flat list of unrelated features.

Recommended grouping:

| Category | Feature columns |
| --- | --- |
| Writing Environment | Native Workspace, Fine-Grained Event Log, Process Replay |
| AI Provenance | AI Interaction Log, AI Mode/Policy Distinction |
| Task Governance | Flexible Settings, Assigned Task Workflow |
| Evidence Sharing | Integrated Evidence Package |

## Compact Paper Table Candidate

This is the paper-facing version of the matrix above. Use this table only after
source verification, and keep the legend in the caption or footnote.

Legend:

- Y: supported by cited product documentation.
- P: partially supported, narrower than Humanly, or limited to a specific
  product context.
- N: not found in cited public documentation; this does not prove the feature is
  absent in private or enterprise configurations.

| System | Type | Native Workspace | Event Log | Replay | AI Log | AI Policy | Flexible Settings | Assigned Workflow | Evidence Package |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Humanly | Native provenance platform | Y | Y | Y | Y | Y | Y | Y | Y |
| Turnitin Clarity | Assignment writing workspace | Y | P | Y | Y | P | P | Y | P |
| Grammarly Authorship | Cross-surface source attribution | P | P | Y | P | P | P | N | Y |
| GPTZero Writing Reports | Detector + Google Docs report | P | P | Y | N | N | N | N | P |
| Draftback | Google Docs revision replay | N | P | Y | N | N | N | N | P |
| Brisk Inspect Writing | Google Docs classroom replay | N | P | Y | N | N | N | P | N |
| Integrito | Google Docs activity report | N | P | P | N | N | N | P | P |
| WritingTrace | Google Docs forensic replay | N | P | Y | N | N | N | N | Y |
| PaperTrail Inspect | Google Docs process report | N | P | Y | N | N | N | N | Y |

Column definitions:

- Replay: reviewer can inspect how the document changed over time.
- Native Workspace: the system provides its own writing environment rather than
  only inspecting Google Docs, Word, or another host editor.
- Event Log: detailed process events are exposed beyond a coarse playback,
  including fine-grained writing, selection, formatting, timing, or AI events.
- AI Log: AI prompt/response or equivalent AI-use event is surfaced
  as part of the process evidence, not only inferred from final text.
- AI Policy: the system distinguishes or configures AI assistance modes, such as
  disabled AI, polish-only, chat-only, or full AI assistance.
- Flexible Settings: task owner can configure writing rules before writing
  begins, such as AI access, allowed assistance modes, copy/paste policy, timing
  constraints, character limits, or submission/access rules.
- Assigned Workflow: the product supports assigning or sharing a writing task
  from an owner/instructor/admin to participants/students/writers.
- Evidence Package: the system combines replay, analysis/reporting, certificate
  evidence, PDF/JSON output, or public verification into a reviewable artifact.

## Humanly Differentiation To Preserve

The strongest comparison paragraph should say:

1. Replay is not unique; several tools replay Google Docs or Turnitin writing
   history.
2. Some competitors are increasingly process-aware, especially Turnitin Clarity,
   Grammarly Authorship, GPTZero Writing Reports, and WritingTrace.
3. Humanly's contribution is the unified provenance pipeline: task policy is set
   before writing, AI access modes are enforced in the editor, AI prompt/response
   events are logged, fine-grained writing events are captured as the text is
   produced, and a certificate/verification artifact can be generated from that same event
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
