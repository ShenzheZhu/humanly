#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ROOT_DIR/packages/backend/.env" ]; then
  cp "$ROOT_DIR/packages/backend/.env.example" "$ROOT_DIR/packages/backend/.env"
  echo "Created packages/backend/.env"
else
  echo "packages/backend/.env already exists, skipping"
fi

if [ ! -f "$ROOT_DIR/packages/frontend-user/.env" ]; then
  cp "$ROOT_DIR/packages/frontend-user/.env.example" "$ROOT_DIR/packages/frontend-user/.env"
  echo "Created packages/frontend-user/.env"
else
  echo "packages/frontend-user/.env already exists, skipping"
fi