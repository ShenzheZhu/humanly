#!/bin/bash
# Run pending production SQL migrations through the postgres Compose service.
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-packages/backend/src/db/migrations}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-humanly_prod}"
POSTGRES_USER="${POSTGRES_USER:-humanly_user}"
BASELINE_EXISTING_DB="${BASELINE_EXISTING_DB:-true}"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "ERROR: Migration directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

checksum_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

psql_exec() {
  docker compose -f "$COMPOSE_FILE" exec -T -e PAGER=cat "$POSTGRES_SERVICE" \
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
}

psql_scalar() {
  psql_exec -At "$@"
}

echo "==> Preparing schema_migrations table"
psql_exec <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_seconds NUMERIC,
  baseline BOOLEAN NOT NULL DEFAULT FALSE
);
SQL

mapfile -t migration_files < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)

if [[ "${#migration_files[@]}" -eq 0 ]]; then
  echo "==> No migration files found"
  exit 0
fi

applied_count="$(psql_scalar -c 'SELECT COUNT(*) FROM schema_migrations;')"
users_table_exists="$(psql_scalar -c "SELECT to_regclass('public.users') IS NOT NULL;")"

if [[ "$applied_count" == "0" && "$BASELINE_EXISTING_DB" == "true" && "$users_table_exists" == "t" ]]; then
  echo "==> Existing database detected with no migration history"
  echo "==> Baselining current migration files without re-running old SQL"

  for file in "${migration_files[@]}"; do
    filename="$(basename "$file")"
    checksum="$(checksum_file "$file")"
    psql_exec -v filename="$filename" -v checksum="$checksum" <<'SQL'
INSERT INTO schema_migrations (filename, checksum, execution_seconds, baseline)
VALUES (:'filename', :'checksum', 0, TRUE)
ON CONFLICT (filename) DO NOTHING;
SQL
    echo "    baselined $filename"
  done

  echo "==> Baseline complete; future migration files will run automatically"
  exit 0
fi

echo "==> Running pending migrations"
pending_count=0

for file in "${migration_files[@]}"; do
  filename="$(basename "$file")"
  checksum="$(checksum_file "$file")"
  existing_checksum="$(psql_scalar -c "SELECT checksum FROM schema_migrations WHERE filename = '$filename';")"

  if [[ -n "$existing_checksum" ]]; then
    if [[ "$existing_checksum" != "$checksum" ]]; then
      echo "ERROR: Migration checksum changed after it was applied: $filename" >&2
      echo "       applied: $existing_checksum" >&2
      echo "       current: $checksum" >&2
      exit 1
    fi
    echo "    skip $filename"
    continue
  fi

  echo "    apply $filename"
  start_time="$(date +%s)"
  psql_exec -f "$file"
  end_time="$(date +%s)"
  duration="$((end_time - start_time))"

  psql_exec -v filename="$filename" -v checksum="$checksum" -v duration="$duration" <<'SQL'
INSERT INTO schema_migrations (filename, checksum, execution_seconds, baseline)
VALUES (:'filename', :'checksum', :'duration', FALSE);
SQL

  pending_count="$((pending_count + 1))"
done

echo "==> Migration complete (${pending_count} applied)"
