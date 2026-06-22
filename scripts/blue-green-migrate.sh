#!/usr/bin/env bash
# scripts/blue-green-migrate.sh
# ──────────────────────────────
# Blue-Green Database Migration Script — issue #1658, AC #1
#
# Implements the Expand-and-Contract pattern for zero-downtime migrations.
# Run this script to perform a safe, staged schema migration:
#
#   Step 1 — Pre-migration validation (snapshot + integrity checks)
#   Step 2 — Expand phase (additive changes only, backward-compatible)
#   Step 3 — Traffic switch (deploy Green; Blue stays on standby)
#   Step 4 — Post-migration validation
#   Step 5 — Contract phase (destructive cleanup, only after Green confirmed)
#
# Usage:
#   bash scripts/blue-green-migrate.sh expand     # Steps 1–2
#   bash scripts/blue-green-migrate.sh switch     # Step 3
#   bash scripts/blue-green-migrate.sh validate   # Step 4
#   bash scripts/blue-green-migrate.sh contract   # Step 5
#   bash scripts/blue-green-migrate.sh rollback   # Revert expand phase
#
# Environment variables required:
#   DATABASE_URL       — target PostgreSQL connection string
#   STAGING_DATABASE_URL — staging DB for pre-prod validation (optional)
#
# See docs/DATABASE_MIGRATIONS.md for full Blue-Green strategy documentation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_DIR="$REPO_ROOT/server"
LOG_FILE="$REPO_ROOT/logs/migration-$(date +%Y%m%d-%H%M%S).log"
PHASE="${1:-}"

mkdir -p "$REPO_ROOT/logs"

# ── Helpers ───────────────────────────────────────────────────────────────────

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
err() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2; }

require_env() {
  if [ -z "${!1:-}" ]; then
    err "Required environment variable $1 is not set."
    exit 1
  fi
}

confirm() {
  read -rp "$1 [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]] || { log "Aborted by user."; exit 0; }
}

psql_run() {
  psql "$DATABASE_URL" -c "$1"
}

# ── Phase: expand ─────────────────────────────────────────────────────────────
# Apply additive, backward-compatible migrations.
# Both the old (Blue) and new (Green) app versions can run on this schema.

phase_expand() {
  log "=== EXPAND PHASE: Applying additive migrations ==="
  require_env DATABASE_URL

  log "Step 1: Pre-migration validation snapshot"
  cd "$SERVER_DIR"
  node scripts/validate-database.js --pre 2>&1 | tee -a "$LOG_FILE" || {
    err "Pre-migration validation FAILED. Aborting — database unchanged."
    exit 1
  }

  log "Step 2: Recording row count baseline"
  psql_run "
    SELECT tablename,
           (xpath('/row/count/text()', query_to_xml('SELECT COUNT(*) FROM ' || tablename, true, true, '')))[1]::text::int AS row_count
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  " 2>&1 | tee -a "$LOG_FILE" || true

  log "Step 3: Applying pending migrations (expand-only)"
  npm run migrate:latest 2>&1 | tee -a "$LOG_FILE"

  log "Expand phase complete. Both Blue and Green can now run on this schema."
  log "Next step: bash scripts/blue-green-migrate.sh switch"
}

# ── Phase: switch ─────────────────────────────────────────────────────────────
# Deploy Green (new app version). Blue stays on standby for 10 minutes.

phase_switch() {
  log "=== SWITCH PHASE: Routing traffic to Green ==="
  log "This step deploys the new application version (Green)."
  log "The old version (Blue) remains available for rollback for 10 minutes."
  confirm "Proceed with traffic switch to Green?"

  log "Triggering Green deployment..."
  if [ -n "${RENDER_API_KEY:-}" ] && [ -n "${RENDER_PRODUCTION_SERVICE_ID:-}" ]; then
    curl -s -X POST \
      "https://api.render.com/v1/services/${RENDER_PRODUCTION_SERVICE_ID}/deploys" \
      -H "Authorization: Bearer ${RENDER_API_KEY}" \
      -H "Content-Type: application/json" | tee -a "$LOG_FILE"
    log "Render deploy triggered. Monitor at https://dashboard.render.com"
  else
    log "RENDER_API_KEY or RENDER_PRODUCTION_SERVICE_ID not set."
    log "Deploy manually, then run: bash scripts/blue-green-migrate.sh validate"
  fi

  log "Switch phase initiated. Run validate once Green is healthy:"
  log "  bash scripts/blue-green-migrate.sh validate"
}

# ── Phase: validate ───────────────────────────────────────────────────────────
# Post-migration validation — run after Green is live.

phase_validate() {
  log "=== VALIDATION PHASE: Post-migration integrity checks ==="
  require_env DATABASE_URL

  cd "$SERVER_DIR"
  node scripts/validate-database.js --post 2>&1 | tee -a "$LOG_FILE"

  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    log "Post-migration validation PASSED."
    log "Green is confirmed healthy. You may now run the contract phase."
    log "  bash scripts/blue-green-migrate.sh contract"
  else
    err "Post-migration validation FAILED."
    err "Rolling back to Blue is recommended:"
    err "  bash scripts/blue-green-migrate.sh rollback"
    exit 1
  fi
}

# ── Phase: contract ───────────────────────────────────────────────────────────
# Run ONLY after Green is confirmed healthy and Blue is decommissioned.
# Applies destructive changes (drops old columns/tables).

phase_contract() {
  log "=== CONTRACT PHASE: Applying destructive cleanup migrations ==="
  log "WARNING: This phase removes old columns/tables. Blue cannot be restored after this."
  confirm "Are you sure Green is stable and Blue is decommissioned?"

  require_env DATABASE_URL
  cd "$SERVER_DIR"

  log "Applying contract migrations..."
  npm run migrate:latest 2>&1 | tee -a "$LOG_FILE"

  log "Running final post-contract validation..."
  node scripts/validate-database.js --post 2>&1 | tee -a "$LOG_FILE"

  log "Contract phase complete. Migration finished."
}

# ── Phase: rollback ───────────────────────────────────────────────────────────
# Revert the expand phase. Only safe before the contract phase.

phase_rollback() {
  log "=== ROLLBACK PHASE: Reverting last migration batch ==="
  log "This reverts the most recent migration batch (expand phase only)."
  log "If contract phase has already run, manual intervention may be needed."
  confirm "Proceed with rollback?"

  require_env DATABASE_URL
  cd "$SERVER_DIR"

  log "Rolling back Node.js migrations..."
  npm run migrate:rollback 2>&1 | tee -a "$LOG_FILE"

  log "Running post-rollback validation..."
  node scripts/validate-database.js --post 2>&1 | tee -a "$LOG_FILE"

  log "Rollback complete. Re-deploy the Blue version of the application."
}

# ── Dispatch ──────────────────────────────────────────────────────────────────

case "$PHASE" in
  expand)   phase_expand   ;;
  switch)   phase_switch   ;;
  validate) phase_validate ;;
  contract) phase_contract ;;
  rollback) phase_rollback ;;
  *)
    echo "Usage: bash scripts/blue-green-migrate.sh <expand|switch|validate|contract|rollback>"
    echo ""
    echo "Phases:"
    echo "  expand    — Run pre-migration checks, apply additive migrations"
    echo "  switch    — Deploy Green application version"
    echo "  validate  — Run post-migration integrity checks"
    echo "  contract  — Apply destructive cleanup (only after Green confirmed)"
    echo "  rollback  — Revert expand phase migrations"
    exit 1
    ;;
esac

log "Log saved to: $LOG_FILE"
