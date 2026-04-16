#!/usr/bin/env bash
# ─── EA SaaS Platform — Database Backup ──────────────────────────────────
# Usage: ./scripts/backup.sh [TAG]
#   TAG  Optional label (default: timestamp)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TAG="${1:-$(date +%Y%m%d_%H%M%S)}"
COMPOSE_FILE="${PROJECT_ROOT}/docker/docker-compose.yml"

# Load Docker env if available
[[ -f "${PROJECT_ROOT}/docker/.env.docker" ]] && set -a && source "${PROJECT_ROOT}/docker/.env.docker" && set +a

# Database connection (defaults from Docker compose)
DB_HOST="${MYSQL_HOST:-localhost}"
DB_PORT="${MYSQL_PORT:-3306}"
DB_USER="${MYSQL_USER:-ea_user}"
DB_PASS="${MYSQL_PASSWORD:-ea_password123}"
DB_NAME="${MYSQL_DATABASE:-ea_saas}"

FILENAME="ea_saas_${TAG}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

# ─── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ─── Create Backup Directory ────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ─── Backup ──────────────────────────────────────────────────────────────────
info "Starting database backup..."
info "  Tag:      $TAG"
info "  File:     $FILENAME"
info "  Database: $DB_NAME"

# Try Docker first, then local mysqldump
if docker compose -f "$COMPOSE_FILE" ps mysql 2>/dev/null | grep -q "Up\|running"; then
    info "Using Docker mysql container for backup..."
    docker compose -f "$COMPOSE_FILE" exec -T mysql \
        mysqldump \
        -u"$DB_USER" \
        -p"$DB_PASS" \
        --single-transaction \
        --routines \
        --triggers \
        --add-drop-table \
        --order-by-primary \
        --hex-blob \
        "$DB_NAME" | gzip > "$FILEPATH"
elif command -v mysqldump >/dev/null 2>&1; then
    info "Using local mysqldump..."
    mysqldump \
        -h"$DB_HOST" \
        -P"$DB_PORT" \
        -u"$DB_USER" \
        -p"$DB_PASS" \
        --single-transaction \
        --routines \
        --triggers \
        --add-drop-table \
        --order-by-primary \
        --hex-blob \
        "$DB_NAME" | gzip > "$FILEPATH"
else
    err "Neither Docker mysql container nor local mysqldump available"
fi

# ─── Verify Backup ──────────────────────────────────────────────────────────
if [[ -f "$FILEPATH" ]]; then
    SIZE=$(du -h "$FILEPATH" | cut -f1)
    ok "Backup created: $FILEPATH ($SIZE)"

    # Verify the backup is a valid gzip
    if gzip -t "$FILEPATH" 2>/dev/null; then
        ok "Backup file integrity verified (valid gzip)"
    else
        err "Backup file is corrupted (invalid gzip)"
    fi
else
    err "Backup file was not created"
fi

# ─── Cleanup Old Backups ─────────────────────────────────────────────────────
info "Cleaning up backups older than 30 days..."
find "$BACKUP_DIR" -name "ea_saas_*.sql.gz" -type f -mtime +30 -delete 2>/dev/null || true

TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "ea_saas_*.sql.gz" -type f 2>/dev/null | wc -l)
info "Total backups retained: $TOTAL_BACKUPS"

echo ""
echo -e "${GREEN}  ✅ Backup Complete${NC}"
echo "  File: $FILEPATH"
echo "  Size: $SIZE"
echo ""
echo "  Restore with:"
echo "    gunzip -c $FILEPATH | docker compose -f docker/docker-compose.yml exec -T mysql mysql -u\$DB_USER -p\$DB_PASS \$DB_NAME"
echo ""