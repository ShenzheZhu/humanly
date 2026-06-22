#!/bin/sh
set -eu

max_attempts=5
attempt=1

while [ "$attempt" -le "$max_attempts" ]; do
  if corepack enable && pnpm install "$@"; then
    exit 0
  fi

  if [ "$attempt" -eq "$max_attempts" ]; then
    echo "pnpm install failed after ${max_attempts} attempts." >&2
    exit 1
  fi

  delay=$((attempt * 5))
  echo "pnpm install failed on attempt ${attempt}/${max_attempts}; retrying in ${delay}s." >&2
  sleep "$delay"
  attempt=$((attempt + 1))
done
