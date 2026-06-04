# Latest Product Source Audit

Observed date: 2026-06-03

Tracking issue: https://github.com/ShenzheZhu/humanly/issues/476

This audit treats the current website, product docs, and `origin/main` code as
the source of truth for the paper rewrite. The existing Overleaf/LaTeX draft is
out of date and should not drive framing decisions.

## Public Website Message

Source: https://writehumanly.net/

The website currently frames Humanly around process evidence, not authorship
prediction.

Core copy to preserve in the paper's language:

- "Write with AI. Prove your process."
- "A writing workspace that quietly records how a draft came together, then
  signs it with a certificate any reader can verify."
- "Did you write this, or did AI? The answer should not be a defense. It should
  be a receipt."
- "Process beats prediction."
- "Detectors judge the finished text. Humanly records the work as it happens,
  then lets a reader verify the process later."
- "The goal is not to infer authorship from style, but to show how the work
  happened."

Website problem framing:

- AI detectors guess after the fact.
- Readers cannot see the writing process.
- Writers defend the work instead of doing it.

Website trust model:

- Record while writing: captures typing, paste, focus, and AI-assist events.
- Verify after writing: the certificate connects the final text to the process
  record.
- Avoid guessing: show how the work happened instead of inferring authorship
  from style.

Website workflow:

1. Configure: choose AI access, paste rules, character limits, and time limits.
2. Write: type, paste, revise, and use AI inside one tracked workspace.
3. Record: capture the writing timeline without interrupting drafting.
4. Certify: create a verifiable PDF and JSON record.

Website audience/use cases:

- Writers draft with AI in a tracked workspace and share a certificate.
- Instructors create assigned tasks with AI, paste, character, and time rules.
- Reviewers inspect process and AI-assistance trails instead of detector scores
  alone.

## Code-Backed Product Facts

Source: `origin/main` in `ShenzheZhu/humanly`.

### Architecture

The public README describes Humanly as a traceable, AI-native writing platform
that records writing provenance, supports configurable in-document AI
assistance, and generates verifiable certificates.

Production surfaces:

- user portal: `https://app.writehumanly.net/`
- admin dashboard: `https://admin.writehumanly.net/`
- API/tracker host: `https://api.writehumanly.net/`

Monorepo components:

- backend: Express API, Socket.IO, PostgreSQL/TimescaleDB, Redis;
- frontend: Next.js admin dashboard;
- frontend-user: Next.js user writing portal;
- editor: Lexical editor with provenance capture;
- tracker: external-form tracking library;
- shared: shared types and validators.

### AI Access Modes

Source files:

- `packages/shared/src/types/environment.types.ts`
- `packages/shared/src/utils/validators.ts`

Current AI access enum:

- `off`
- `polish`
- `chat`
- `full`

Current labels:

- `Off`
- `Only polish`
- `Only agent chat`
- `Full`

Semantics from helper functions:

- polish actions are enabled in `polish` and `full`;
- agent chat is enabled in `chat` and `full`;
- AI is disabled in `off`.

Legacy values normalize as follows:

- `readonly` -> `chat`
- `on` -> `full`

### Environment Rules

Source files:

- `packages/shared/src/types/environment.types.ts`
- `packages/frontend/src/app/tasks/new/page.tsx`
- `packages/frontend-user/src/app/documents/new/page.tsx`

Environment configuration includes:

- task type: personal or admin-assigned;
- instruction PDF flag;
- AI provider/base URL and allowed models when AI is enabled;
- AI usage limit mode and request/token/time limits;
- start/end window and optional writing timer;
- submission mode and optional min/max character limits;
- traceability flags for AI usage, typing, copy/paste, and focus/blur;
- copy/paste policy: allowed or blocked.

Current provider UI supports:

- Together AI
- OpenRouter
- OpenAI
- Anthropic

Custom AI providers and custom models are temporarily disabled by validation.

### Task Enrollment And Shared Links

Source files:

- `packages/backend/src/routes/tasks.routes.ts`
- `packages/backend/src/controllers/task.controller.ts`
- `packages/backend/src/services/task.service.ts`

Supported task participation paths:

- authenticated invite-code enrollment;
- public task share-link preview;
- public share-link start endpoint with optional auth;
- signed-in public mode;
- guest public mode when `allowGuestSubmissions` is enabled.

Important behavior:

- direct public submissions are disabled;
- public writers must start a Humanly document first;
- signed-in public writers are enrolled into the normal task/certificate flow;
- guest sessions map to synthetic guest users and receive normal auth tokens so
  the existing editor can run unchanged;
- guest mode is rejected when the task disallows guest submissions.

### Certificate And Verification

Source files:

- `packages/backend/src/controllers/certificate.controller.ts`
- `packages/backend/src/services/certificate.service.ts`
- `packages/frontend-user/src/app/verify/[token]/page.tsx`

Certificates include or derive:

- certificate ID and verification token;
- title, generated time, and optional signer name;
- document snapshot/plain-text snapshot depending on options;
- total events, typing events, paste events;
- total, typed, and pasted characters;
- editing time;
- AI selection-action stats and AI question stats;
- access-code protection when configured;
- JSON certificate download;
- PDF certificate download;
- public verify URL.

The verification page can show:

- certificate status;
- typed/pasted percentages;
- certificate metadata;
- access-code gate for protected certificates;
- replay/log surfaces when included.

## Paper Implications

### Main Framing

The paper should be rewritten around:

> Humanly is a provenance-first writing platform for policy-compliant
> human-AI writing. It records how the draft was produced and issues verifiable
> process evidence, rather than trying to infer authorship from final text alone.

Avoid making "AI detection" the main contribution. Detection should appear as a
comparison/evaluation axis or exploratory extension.

### Recommended Section Commitments

- Use the website language "process beats prediction" as the conceptual hinge.
- Treat Section 4 as `Comparison with Existing Systems`, separated from the
  evaluation results.
- In Section 4, compare two existing-system classes:
  - final-text AI detectors as a conceptual baseline;
  - process/replay/provenance tools through a feature comparison.
- Treat Section 5 as `Evaluation`, covering detector stress tests and human
  study/user-study evidence.

### Claims That Are Safe To Make

- Humanly records writing provenance while users draft.
- Humanly logs typing, paste, focus/blur, selection, and AI-assist events.
- Humanly supports admin-assigned tasks and personal writing.
- Humanly supports configurable AI access with four modes.
- Humanly supports paste, time, and character rules in task environments.
- Humanly supports guest and signed-in public share-link participation, subject
  to task policy.
- Humanly generates verifiable certificate records with typed/pasted/editing and
  AI-use statistics.
- Humanly supports PDF/JSON certificate outputs and public verification links.

### Claims To Avoid Unless Re-Verified Before Submission

- "Humanly proves authorship" as an automatic verdict.
- "Humanly detects all external AI use."
- "Humanly prevents all off-platform AI use."
- "Non-downloadable PDFs" or watermarking, unless implemented and verified.
- Any exact product behavior that only exists in mock/demo code.
- Any claim that a future feature is deployed before it is actually merged and
  live on production.

## Rewrite Priority

1. Rewrite introduction and contributions from website/code source of truth.
2. Rewrite architecture around the deployed app surfaces and environment config.
3. Rewrite the standalone comparison section around final-text detector limits
   and process/replay tool gaps.
4. Rewrite the standalone evaluation section around detector stress tests and
   human-study/user-study evidence.
5. Then update Overleaf/LaTeX.
