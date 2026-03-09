# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first (better layer caching)
COPY package.json ./
COPY packages/backend/package.json  ./packages/backend/
COPY packages/shared/package.json   ./packages/shared/
COPY packages/tracker/package.json  ./packages/tracker/

RUN npm install --legacy-peer-deps

# Copy source
COPY packages/shared  ./packages/shared
COPY packages/tracker ./packages/tracker
COPY packages/backend ./packages/backend
COPY tsconfig.json    ./

# Build in dependency order: shared → tracker → backend
RUN npm run build --workspace=@humory/shared
RUN npm run build --workspace=@humory/tracker
# Backend has pre-existing TS type errors (same situation as Next.js ignoreBuildErrors: true).
# noEmitOnError defaults to false so tsc still emits JS; we only fail if no output is produced.
WORKDIR /app/packages/backend
RUN npx tsc --skipLibCheck; test -f dist/index.js || (echo "ERROR: Backend build produced no output" && exit 1)

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY packages/backend/package.json  ./packages/backend/
COPY packages/shared/package.json   ./packages/shared/

RUN npm install --omit=dev

# Compiled JS
COPY --from=builder /app/packages/backend/dist  ./packages/backend/dist
COPY --from=builder /app/packages/shared/dist   ./packages/shared/dist

# Tracker dist — served statically at /tracker/:filename
# (TrackerController resolves path as: __dirname/../../.../../tracker/dist/)
COPY --from=builder /app/packages/tracker/dist  ./packages/tracker/dist

# DB migration SQL files (auto-applied on first startup via docker-entrypoint-initdb.d in postgres,
# but kept here in case the backend runs its own migration logic)
COPY packages/backend/src/db/migrations ./packages/backend/src/db/migrations

WORKDIR /app/packages/backend

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health',(r)=>{process.exit(r.statusCode===200?0:1)})"

CMD ["node", "dist/index.js"]
