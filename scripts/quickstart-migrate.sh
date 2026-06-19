#!/usr/bin/env sh
set -eu

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"

psql_exec() {
  psql -v ON_ERROR_STOP=1 "$@"
}

apply_migration() {
  file="$1"
  skip_legacy_continuous_aggregates="$2"

  awk -v skip_legacy_continuous_aggregates="$skip_legacy_continuous_aggregates" '
    /add_compression_policy/ {
      print "-- Quickstart skips Timescale compression policies during local bootstrap.";
      next;
    }
    /add_retention_policy/ {
      print "-- Quickstart skips Timescale retention policies during local bootstrap.";
      next;
    }
    skip_legacy_continuous_aggregates == "1" && /-- Continuous aggregates for analytics/ {
      skip = 1;
      print "-- Quickstart skips legacy continuous aggregates during local bootstrap.";
      next;
    }
    skip_legacy_continuous_aggregates == "1" && /-- Seed data for development/ {
      skip = 0;
      print;
      next;
    }
    skip {
      next;
    }
    {
      print;
    }
  ' "$file" | psql_exec
}

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migration directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

psql_exec <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

for file in "$MIGRATIONS_DIR"/*.sql; do
  filename="$(basename "$file")"
  applied="$(psql -At -v ON_ERROR_STOP=1 -c "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE filename = '$filename');")"

  if [ "$applied" = "t" ]; then
    echo "skip $filename"
    continue
  fi

  echo "apply $filename"

  if [ "$filename" = "009_rename_pdf_storage_key.sql" ]; then
    has_legacy_pdf_storage_key="$(psql -At -v ON_ERROR_STOP=1 -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'papers' AND column_name = 'pdf_storage_key');")"
    if [ "$has_legacy_pdf_storage_key" != "t" ]; then
      echo "skip $filename; papers.pdf_storage_key is already absent"
      psql_exec -v filename="$filename" <<'SQL'
INSERT INTO schema_migrations (filename)
VALUES (:'filename')
ON CONFLICT (filename) DO NOTHING;
SQL
      continue
    fi
  fi

  if [ "$filename" = "001_initial_schema.sql" ]; then
    apply_migration "$file" "1"
  else
    apply_migration "$file" "0"
  fi

  psql_exec -v filename="$filename" <<'SQL'
INSERT INTO schema_migrations (filename)
VALUES (:'filename')
ON CONFLICT (filename) DO NOTHING;
SQL
done
