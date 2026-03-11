#!/bin/bash
# Production deploy script.
# Runs on the GCP VM. Called by GitHub Actions on every push to main,
# or run manually: bash scripts/deploy.sh
set -euo pipefail

REPO_DIR="/home/humanly/humanly"
COMPOSE_FILE="docker-compose.prod.yml"

echo "==> [1/5] Pull latest code"
cd "$REPO_DIR"
git pull origin main

echo "==> [2/5] Ensure uploads directory exists"
mkdir -p uploads

echo "==> [3/5] Build changed images"
docker compose -f "$COMPOSE_FILE" build backend frontend-user

echo "==> [4/5] Restart services (zero-downtime rolling replace)"
docker compose -f "$COMPOSE_FILE" up -d --no-deps --wait backend frontend-user

echo "==> [5/5] Clean up dangling images"
docker image prune -f

echo "==> Deploy complete"
