# Humanly: Human-AI Writing Environments with Process Tracing and Certificates

<p align="center">
  <img alt="Humanly" src="./assets/humanly-readme-banner.gif" width="680">
</p>

<p align="center">
  <a href="#product">Product</a> ·
  <a href="#features">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#development">Development</a>
</p>

<p align="center">
  <a href="https://app.writehumanly.net/"><img alt="User portal" src="https://img.shields.io/badge/writehumanly.net-app-7fa184?style=for-the-badge"></a>
  <a href="https://github.com/ShenzheZhu/humanly/releases/tag/v0.4.0"><img alt="Release" src="https://img.shields.io/badge/release-v0.4.0-c49a6c?style=for-the-badge"></a>
  <img alt="Frontend stack" src="https://img.shields.io/badge/TypeScript%20%2F%20Next.js-frontend-7b9fb8?style=for-the-badge">
  <img alt="Backend stack" src="https://img.shields.io/badge/Express%20%2F%20PostgreSQL-backend-b79a8b?style=for-the-badge">
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-9aa77d?style=for-the-badge"></a>
</p>

**The writing provenance platform for human-AI work.** One controlled workspace per document: writing rules, activity traces, AI use, PDF context, submissions, and certificates collapsed into a reviewable record.

Every writing process has context, and that context matters. Humanly records the workspace, the writer's activity, in-platform AI interactions, source materials, and submission evidence together, so reviewers can understand how a document was produced instead of only reading the final text.

<p align="center">
  <img src="./assets/humanly-product-hero.svg" alt="Humanly writing workspace with PDF context, editor, and AI assistant" width="960" />
</p>

## Product

Humanly has two first-party web apps:

- **User portal** - writers create documents, enroll in assigned tasks, write in the controlled editor, use allowed AI tools, upload source PDFs, submit work, and share certificates.
- **Admin dashboard** - instructors, researchers, or reviewers create writing tasks, configure environment rules, review submissions, inspect analytics, audit event logs, and open issued certificates.

## Hosted Product

- User portal: [app.writehumanly.net](https://app.writehumanly.net/)
- Admin dashboard: [admin.writehumanly.net](https://admin.writehumanly.net/)

## Features

### Writing Workspaces

Humanly provides both personal writing spaces and admin-assigned tasks. Each workspace can be configured with writing policies, submission windows, attempt limits, instructions, AI permissions, and optional source materials.

### AI Controls

Administrators can configure AI access at multiple levels, including disabled, polish-only, chat-only, or full assistance. All AI interactions are recorded, allowing reviewers to inspect both the generated content and the surrounding writing activity.

### Process Tracing

Humanly captures detailed writing-process activity, including typing, editing, copy/paste actions, focus changes, navigation events, and workspace interactions. These records power analytics, behavioral insights, review workflows, and event-log auditing.

### PDF Context

Source PDFs can be attached to documents and tasks to provide additional context. Humanly indexes PDF content on the backend, enabling AI-assisted writing and chat features to reference relevant material during the writing process.

### Task Distribution

Administrators can distribute assignments through public share links, allowing participation by enrolled users or guests. Humanly tracks enrollment status, submissions, review progress, and task completion across the entire workflow.

### Certificates

Humanly generates shareable certificates for submitted work. Certificates include document snapshots, writing-process evidence, AI usage records, and verification metadata that support authenticity review and integrity validation.

## Architecture

Humanly is a pnpm workspace with one backend service, two Next.js apps, and
shared packages for editor, tracking, and cross-app types.

```text
packages/backend        Express API, storage, events, certificates, AI
packages/frontend       Admin dashboard
packages/frontend-user  User portal and writing workspace
packages/editor         Writing editor
packages/tracker        External-form tracking library
packages/shared         Shared types and utilities
```

Local and production deployments use PostgreSQL for durable data, Redis for
cache and realtime support, and object/file storage for uploaded PDFs and
attachments.

## Quick Start

### Requirements

- Node.js `>=20.19.0 <21`
- pnpm `>=9.0.0 <10`
- Docker and Docker Compose

The current local development flow uses Docker for PostgreSQL and Redis, then
runs the backend and two Next.js apps on the host.

```bash
pnpm install
pnpm setup:local
```

`pnpm setup:local` creates local env files, starts PostgreSQL and Redis, and
builds the shared packages needed by the apps.

Start the three app services in separate terminals:

```bash
pnpm dev:backend
pnpm dev:frontend
pnpm dev:frontend-user
```

Default local URLs:

- Admin dashboard: `http://localhost:3000`
- User portal: `http://localhost:3002`
- Backend API: `http://localhost:3001`
- Backend health: `http://localhost:3001/health`

Stop local databases:

```bash
pnpm docker:down
```

### One-command Docker Compose quickstart

Use Docker Compose to start every local service:

```bash
docker compose -f docker-compose.quickstart.yml up --build
```

This may take a moment as Docker Compose builds the local images, starts
PostgreSQL, Redis, the backend, and both web apps, then creates the default
local admin account.

### Log into Humanly

Open the admin dashboard at `http://localhost:3000` and log in with the default
quickstart account:

```text
Email:    admin@mail.com
Password: admin123456
```

The user portal will be available at `http://localhost:3002`.

If `localhost` shows stale Next.js assets such as `_next/static/*.js` 404s,
stop any old local dev servers on ports `3000` or `3002`, or open
`http://127.0.0.1:3000` and `http://127.0.0.1:3002` directly.

Humanly is now up and running on your machine.

To stop the quickstart stack:

```bash
docker compose -f docker-compose.quickstart.yml down
```

To reset the local quickstart database and uploaded-file volume:

```bash
docker compose -f docker-compose.quickstart.yml down -v
```

## Build And Verification

Build all workspace packages:

```bash
pnpm build:all
```

Useful focused builds:

```bash
pnpm build:shared
pnpm build:editor
pnpm build:tracker
pnpm build:backend
pnpm build:frontend
pnpm build:frontend-user
```

Type and lint checks:

```bash
pnpm lint
pnpm --filter @humanly/frontend type-check
pnpm --filter @humanly/frontend-user type-check
```

Current quality-gate notes:

- CI currently runs `pnpm build:all`.
- The Next.js apps are configured to ignore ESLint and TypeScript errors during
  `next build`, so run the explicit checks above when validating frontend work.
- There is no root `pnpm test` script in the current package manifests. Do not
  document or rely on a unified test command until it exists.
- Root `qa:*` scripts reference `scripts/qa/*.mjs`, but those files are not
  present in this checkout.

## Deployment

The production path uses Docker images for the backend, user portal, and admin
dashboard, plus PostgreSQL, Redis, and nginx from `docker-compose.prod.yml`.

Production env starts from:

```bash
cp .env.example .env
```

Then fill real secrets, domains, image names, storage config, email provider
settings, and frontend build-time variables.

Production deployment pieces:

- `.github/workflows/ci.yml` builds all packages on PRs and pushes to `main`.
- `.github/workflows/deploy.yml` builds and pushes changed Docker images, then
  deploys them to the configured VM.
- `scripts/deploy.sh` pulls changed images, runs pending migrations when the
  backend changes, restarts app services, ensures TLS, and recreates nginx.
- `scripts/run-migrations.sh` applies SQL migrations from
  `packages/backend/src/db/migrations`.

Storage options:

- `FILE_STORAGE_PROVIDER=local` stores uploads under `UPLOAD_DIR`.
- `FILE_STORAGE_PROVIDER=gcs` stores uploads in Google Cloud Storage. Configure
  `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, optional region/key-prefix values, and
  Google credentials.

## Certificates

A Humanly certificate can show:

- The submitted document and final text statistics.
- The writing environment and task rules active during writing.
- Authorship statistics for typed, pasted, and AI-assisted text.
- Event logs for writing, focus, navigation, copy/paste, and AI activity.
- Replay and review signals where available.
- Certificate seal and integrity details.

Certificates are evidence for review. They describe what happened inside the
Humanly workspace and do not make claims about off-platform behavior.

## Development

Recommended dependency build order:

```text
shared -> editor -> tracker -> backend -> frontend -> frontend-user
```

Common commands:

```bash
pnpm setup:local       # prepare env files, databases, shared, and editor
pnpm docker:up          # start local PostgreSQL and Redis
pnpm docker:logs        # stream local database logs
pnpm dev:backend        # API on localhost:3001
pnpm dev:frontend       # admin dashboard on localhost:3000
pnpm dev:frontend-user  # user portal on localhost:3002
pnpm dev:tracker        # watch-build tracker package
```

When editing shared packages, rebuild dependent packages or restart the relevant dev server so Next.js and the backend pick up the new output.

## Release Notes

Release notes are tracked in [CHANGELOG.md](CHANGELOG.md). Contribution guidelines live in [CONTRIBUTING.md](CONTRIBUTING.md), and the project follows the [Code of Conduct](CODE_OF_CONDUCT.md).

The project is licensed under [MIT](LICENSE).
