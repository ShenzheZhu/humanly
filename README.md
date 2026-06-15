# Humanly

Humanly is a traceable, AI-native writing platform for producing verifiable
process evidence about how a document was written. It combines a configurable
writing workspace, in-platform AI assistance, fine-grained activity logging,
trajectory replay, and public writing certificates.

## Live Product

- User portal: [app.writehumanly.net](https://app.writehumanly.net/)
- Admin dashboard: [admin.writehumanly.net](https://admin.writehumanly.net/)
- API and tracker host: [api.writehumanly.net](https://api.writehumanly.net/)
- Current release: [v0.4.0 - Workspace Preview and Evidence Polish](https://github.com/ShenzheZhu/humanly/releases/tag/v0.4.0)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- License: [MIT](LICENSE)

## What Humanly Provides

Humanly is built around provenance rather than post-hoc text classification.
The platform records the writing process while it happens and turns that record
into evidence that writers, instructors, reviewers, and verifiers can inspect.

Core capabilities:

- Configurable writing environments for personal writing and assigned tasks.
- AI policy modes for Off, polish-only, chat-only, and full in-platform AI
  assistance.
- Rich write-time capture for typing, paste, selection, focus, workspace
  leave/return events, formatting, and AI interactions.
- Admin task creation with task links, guest/login submission policy, resource
  access settings, and submission controls.
- Workspace preview from setup screens so admins and writers can inspect the
  configured writing environment before creating or entering a task.
- Certificates with authorship statistics, environment summary, replay,
  abnormal-behavior review signals, and public verification links.
- Server-issued certificate integrity seals for newly generated certificates.

## Repository Layout

This is a pnpm workspace monorepo.

```text
packages/
  backend/        Express API, Socket.IO, PostgreSQL/TimescaleDB, Redis
  frontend/       Next.js admin dashboard
  frontend-user/  Next.js user portal and writing workspace
  editor/         Lexical editor package with provenance capture
  tracker/        External-form tracking library
  shared/         Shared TypeScript types and validators
docs/             Development, QA, regression, and deployment playbooks
docker/           Docker image definitions
nginx/            Production reverse-proxy configuration
scripts/          Local setup, deploy, QA, smoke, and maintenance helpers
```

Build order matters:

```text
shared -> editor -> tracker/backend/frontend/frontend-user
```

## Quick Start

Prerequisites:

- Node.js 20.19.x
- pnpm 9.x
- Docker Desktop for real backend and database-backed local testing

Install dependencies:

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install
```

### Fast User-Portal Smoke

Use this path when you only need the user portal with mock data and no database
or real LLM provider.

```bash
pnpm build:shared
pnpm build:editor
pnpm dev:mock
pnpm dev:frontend-user
```

Open:

```text
http://localhost:3002/dev-bypass-login.html
```

### Full Local Stack

Use this path when you need the backend, PostgreSQL, Redis, admin dashboard, and
user portal together.

```bash
bash scripts/setup-env.sh
pnpm docker:up
pnpm build:shared
pnpm build:editor
pnpm dev:backend
pnpm dev:frontend-user
pnpm dev:frontend
```

Local URLs:

- Backend API: [localhost:3001](http://localhost:3001)
- Admin dashboard: [localhost:3000](http://localhost:3000)
- User portal: [localhost:3002](http://localhost:3002)

## Common Commands

```bash
# Build packages
pnpm build:shared
pnpm build:editor
pnpm build:backend
pnpm build:frontend
pnpm build:frontend-user
pnpm build:tracker
pnpm build:all

# Test and lint
pnpm test:backend
pnpm test:frontend-user
pnpm test:frontend
pnpm test
pnpm lint

# Local infrastructure
pnpm docker:up
pnpm docker:down
pnpm docker:logs

# QA helpers
pnpm qa:backend:contract
pnpm qa:ai:usage
pnpm qa:deploy:smoke
pnpm qa:browser:guide
```

For a light local rebuild cleanup:

```bash
pnpm clean:ts-artifacts
```

`pnpm clean` is intentionally heavier because it removes `node_modules/` and
requires reinstalling dependencies afterward.

## Configuration

Copy `.env.example` to `.env` and fill in local or production values. Important
backend variables include:

- `DATABASE_URL` and `REDIS_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `FRONTEND_USER_URL` and `FRONTEND_ADMIN_URL`
- `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`
- `DEFAULT_AI_BASE_URL`, `DEFAULT_AI_MODEL`
- `AI_ENCRYPTION_KEY`

The default local AI provider can be `mock`. Real AI provider settings are
OpenAI-compatible and can be configured per deployment and per user where the
product supports user-provided keys.

## Documentation

Start here for maintainer docs:

- [docs/README.md](docs/README.md) - documentation map.
- [docs/CODEX_DEVELOPMENT_MANUAL.md](docs/CODEX_DEVELOPMENT_MANUAL.md) -
  development workflow, issue policy, PR policy, release rules, and verification
  ladder.
- [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md) - local mock and real-backend setup.
- [docs/testing/README.md](docs/testing/README.md) - QA framework and browser
  E2E references.
- [docs/PRODUCTION_QA_PLAYBOOK.md](docs/PRODUCTION_QA_PLAYBOOK.md) - production
  regression plan.
- [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) - production VM,
  Docker Compose, Artifact Registry, deploy, and rollback notes.

Package-specific references:

- [packages/backend/AUTH_IMPLEMENTATION.md](packages/backend/AUTH_IMPLEMENTATION.md)
- [packages/backend/ANALYTICS.md](packages/backend/ANALYTICS.md)
- [packages/backend/WEBSOCKET.md](packages/backend/WEBSOCKET.md)
- [packages/frontend/README.md](packages/frontend/README.md)
- [packages/tracker/README.md](packages/tracker/README.md)

## Development Workflow

Humanly uses issue-driven development.

1. Create or reuse a GitHub issue for product bugs and features.
2. Keep issues detailed enough to match
   [docs/ISSUE_AUTHORING_GUIDE.md](docs/ISSUE_AUTHORING_GUIDE.md).
3. Branch from the target branch named in the issue.
4. Commit focused changes.
5. Push and open a PR.
6. Run verification appropriate to the risk.
7. Merge to `main` when the change is ready to deploy.

Docs-only pushes to `main` are ignored by the production deploy workflow.
Product code, workflow, Docker, package, lockfile, migration, and deploy-script
changes can trigger production deployment.

## Production

Production runs on a single GCP VM with Docker Compose. GitHub Actions builds
the backend, user portal, and admin dashboard images, pushes commit-SHA tags to
GCP Artifact Registry, SSHes into the VM, runs migrations, and restarts Compose
services with the exact image tags.

See [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) for deploy,
TLS, rollback, and VM operations.

## Repository Hygiene

Keep generated research data, detector outputs, screenshots, browser profiles,
and temporary QA artifacts outside this product repository. The root `data/`
and `tmp/` directories are ignored for local artifacts. Durable research
outputs should live in the paper or artifact repository, not in the product
monorepo.

Do not commit `.env` files, `node_modules/`, package `dist/` directories,
Next.js `.next/` caches, backend storage, or temporary browser/test artifacts.

## Research Paper

Humanly is being prepared for the EMNLP 2026 System Demonstrations track. The
paper source lives in the companion Overleaf/LaTeX repository, not in this
product monorepo. Public paper links will be added when available.
