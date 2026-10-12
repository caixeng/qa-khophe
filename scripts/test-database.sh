#!/usr/bin/env bash
set -euo pipefail
: "${TEST_DATABASE_URL:?Set TEST_DATABASE_URL to an isolated PostgreSQL database}"
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/bootstrap.sql
for migration in supabase/migrations/*.sql; do
  case "$(basename "$migration")" in
    007_seed_notebook_data.sql|013_update_employees_list.sql) continue ;;
  esac
  psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
done
for test in supabase/tests/*.sql; do
  [[ "$(basename "$test")" == bootstrap.sql ]] && continue
  psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$test"
done
