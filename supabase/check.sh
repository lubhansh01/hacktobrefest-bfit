#!/usr/bin/env bash
# Runs schema.sql + schema.check.sql against a throwaway local Postgres.
# Needs psql on PATH (brew install postgresql@16).
set -euo pipefail

cd "$(dirname "$0")"
PORT="${PGPORT:-55433}"
HOST="${PGHOST:-127.0.0.1}"
DB="schemacheck_$$"

psql -h "$HOST" -p "$PORT" -U postgres -q -c "create database \"$DB\";"
trap 'psql -h "$HOST" -p "$PORT" -U postgres -q -c "drop database if exists \"$DB\";" >/dev/null 2>&1' EXIT

for f in auth_stub.sql schema.sql schema.check.sql; do
  psql -h "$HOST" -p "$PORT" -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 -f "$f" \
    2>&1 | grep -vi 'notice\|wal_level\|^HINT' || true
done
