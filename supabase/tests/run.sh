#!/usr/bin/env bash
# Yerel PostgreSQL üzerinde migration'ları sıfırdan kurar ve testleri çalıştırır.
# Kullanım: PGHOST=/tmp/pg PGPORT=5544 PGUSER=postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${TEST_DB:-bookflix_test}
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
run() { psql -v ON_ERROR_STOP=1 -q -X -d "$DB" -f "$1"; }
run tests/00_supabase_shim.sql
for f in migrations/*.sql; do
  case "$f" in *_storage.sql|*_cron.sql) echo "skip (Supabase'e özel): $f"; continue;; esac
  echo "migrate: $f"; run "$f"
done
for f in tests/[1-9]*.sql; do
  echo "test: $f"; run "$f"
done
echo "TÜM TESTLER GEÇTİ"
