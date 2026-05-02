#!/bin/bash
# =============================================================================
# migrate.sh — Apply schema.sql to RDS PostgreSQL via AWS SSM Session Manager
#
# Prerequisites:
#   - AWS CLI configured (aws configure)
#   - Session Manager plugin installed: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html
#   - RDS Proxy endpoint and DB credentials in Secrets Manager at /portfolio/db-credentials
#   - psql installed locally (brew install libpq)
#
# Usage:
#   ./migrate.sh [--dry-run]
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRET_NAME="/portfolio/db-credentials"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "DRY RUN — SQL will be printed but not executed"
fi

echo "Fetching DB credentials from Secrets Manager..."
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" \
  --query SecretString \
  --output text)

DB_HOST=$(echo "$SECRET" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['host'])")
DB_USER=$(echo "$SECRET" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['username'])")
DB_PASS=$(echo "$SECRET" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['password'])")
DB_NAME=$(echo "$SECRET" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('dbname','portfolio'))")
DB_PORT=$(echo "$SECRET" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('port',5432))")

echo "DB Host: $DB_HOST"
echo "DB Name: $DB_NAME"
echo "DB User: $DB_USER"

if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "=== schema.sql content ==="
  cat "$SCRIPT_DIR/schema.sql"
  exit 0
fi

echo ""
echo "Applying schema.sql..."
PGPASSWORD="$DB_PASS" psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --file="$SCRIPT_DIR/schema.sql" \
  --echo-errors \
  --set ON_ERROR_STOP=1

echo ""
echo "Schema applied successfully."
echo ""
echo "Next steps:"
echo "  1. Create your admin Cognito user in the AWS Console"
echo "  2. Add the user to the 'admin' Cognito group"
echo "  3. Import data from Supabase (see AWS_MIGRATION.md, Phase 2)"
