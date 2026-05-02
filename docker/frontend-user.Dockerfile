# User portal (packages/frontend-user)
# Served at / via nginx

# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# NEXT_PUBLIC_* vars must be available at BUILD time (baked into JS bundle)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

COPY package.json ./
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json       ./packages/backend/
COPY packages/frontend/package.json      ./packages/frontend/
COPY packages/frontend-user/package.json ./packages/frontend-user/
COPY packages/shared/package.json        ./packages/shared/
COPY packages/editor/package.json        ./packages/editor/
COPY packages/tracker/package.json       ./packages/tracker/

RUN pnpm install --frozen-lockfile

COPY packages/shared       ./packages/shared
COPY packages/editor       ./packages/editor
COPY packages/frontend-user ./packages/frontend-user
COPY tsconfig.json ./

RUN pnpm --filter @humory/shared build
RUN pnpm --filter @humory/editor build
RUN pnpm --filter @humory/frontend-user build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json ./
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json       ./packages/backend/
COPY packages/frontend/package.json      ./packages/frontend/
COPY packages/frontend-user/package.json ./packages/frontend-user/
COPY packages/shared/package.json        ./packages/shared/
COPY packages/editor/package.json        ./packages/editor/
COPY packages/tracker/package.json       ./packages/tracker/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/frontend-user/.next  ./packages/frontend-user/.next
COPY --from=builder /app/packages/frontend-user/public ./packages/frontend-user/public
COPY --from=builder /app/packages/shared/dist          ./packages/shared/dist
COPY --from=builder /app/packages/editor/dist          ./packages/editor/dist

EXPOSE 3002

ENV PORT=3002
ENV HOSTNAME=0.0.0.0

WORKDIR /app/packages/frontend-user
CMD ["pnpm", "start"]
