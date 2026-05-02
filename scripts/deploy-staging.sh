#!/bin/bash
# Staging deploy script.
# Runs on the GCP VM. Intended for validating a branch before merging to main.
set -euo pipefail

SOURCE_REPO_DIR="${SOURCE_REPO_DIR:-/home/humanly/humanly}"
STAGING_REPO_DIR="${STAGING_REPO_DIR:-/home/humanly/humanly-staging}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-fix/pnpm-workspace}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.staging.yml}"
ENV_FILE="${ENV_FILE:-$SOURCE_REPO_DIR/.env.staging}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-humanly-staging}"
export ENV_FILE

echo "==> [1/7] Fetch ${DEPLOY_BRANCH}"
cd "$SOURCE_REPO_DIR"
git fetch origin "$DEPLOY_BRANCH"

echo "==> [2/7] Prepare isolated staging worktree"
if [ ! -d "$STAGING_REPO_DIR/.git" ] && [ ! -f "$STAGING_REPO_DIR/.git" ]; then
  git worktree add --detach "$STAGING_REPO_DIR" "origin/$DEPLOY_BRANCH"
fi

cd "$STAGING_REPO_DIR"
git fetch origin "$DEPLOY_BRANCH"
git checkout --detach "origin/$DEPLOY_BRANCH"

echo "==> [3/7] Verify staging environment file"
test -f "$ENV_FILE" || (echo "ERROR: Missing $ENV_FILE on VM" && exit 1)

echo "==> [4/7] Ensure staging uploads directory exists"
mkdir -p uploads-staging

echo "==> [5/7] Build staging images"
docker compose --env-file "$ENV_FILE" -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" build backend frontend-user

echo "==> [6/7] Start staging services"
docker compose --env-file "$ENV_FILE" -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" up -d --wait

echo "==> [7/7] Clean up dangling images"
docker image prune -f

echo "==> Staging deploy complete"
