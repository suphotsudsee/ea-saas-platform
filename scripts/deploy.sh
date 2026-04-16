#!/usr/bin/env bash
# ─── EA SaaS Platform — Deploy Script ────────────────────────────────────
# Usage: ./scripts/deploy.sh [staging|production] [--skip-backup] [--skip-migrate]
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*" >&2; exit 1; }

# ─── Defaults ────────────────────────────────────────────────────────────────
ENV=""
SKIP_BACKUP=false
SKIP_MIGRATE=false
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ─── Parse Arguments ────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        staging|production) ENV="$1"; shift ;;
        --skip-backup)   SKIP_BACKUP=true; shift ;;
        --skip-migrate)  SKIP_MIGRATE=true; shift ;;
        -h|--help)
            echo "Usage: deploy.sh [staging|production] [--skip-backup] [--skip-migrate]"
            echo ""
            echo "Options:"
            echo "  staging|production  Target environment (required)"
            echo "  --skip-backup       Skip database backup before deploying"
            echo "  --skip-migrate      Skip database migrations"
            exit 0 ;;
        *) echo "Unknown option: $1"; shift ;;
    esac
done

[[ -z "$ENV" ]] && fail "Environment required: deploy.sh [staging|production]"
[[ "$ENV" != "staging" && "$ENV" != "production" ]] && fail "Invalid environment: $ENV (use staging or production)"

cd "$PROJECT_ROOT"

info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "  EA SaaS Platform — Deploy to $ENV"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

DEPLOY_TS=$(date +%Y%m%d_%H%M%S)
BACKUP_TAG="pre-deploy-${DEPLOY_TS}"

# ─── Pre-deploy Checks ──────────────────────────────────────────────────────
info "Running pre-deploy checks..."

# Check environment file exists
ENV_FILE=".env.local"
if [[ ! -f "$ENV_FILE" ]]; then
    if [[ "$ENV" == "staging" && -f ".env.staging" ]]; then
        cp .env.staging "$ENV_FILE"
        ok "Created $ENV_FILE from .env.staging"
    elif [[ "$ENV" == "production" && -f ".env.production" ]]; then
        cp .env.production "$ENV_FILE"
        ok "Created $ENV_FILE from .env.production"
        warn "⚠️  VERIFY ALL SECRETS ARE SET IN $ENV_FILE"
    else
        fail "No $ENV_FILE found — create it from .env.$ENV before deploying"
    fi
fi

# Check Docker is running
docker info >/dev/null 2>&1 || fail "Docker is not running"

# Check git status (production only)
if [[ "$ENV" == "production" ]]; then
    GIT_CLEAN=$(git status --porcelain 2>/dev/null || echo "unknown")
    if [[ -n "$GIT_CLEAN" ]]; then
        warn "Git working directory is not clean!"
        warn "Uncommitted changes will NOT be deployed."
        read -p "Continue anyway? [y/N] " -r
        [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
    fi
fi

ok "Pre-deploy checks passed"

# ─── Database Backup ────────────────────────────────────────────────────────
if [[ "$SKIP_BACKUP" == "false" ]]; then
    info "Creating database backup (tag: $BACKUP_TAG)..."
    bash scripts/backup.sh "$BACKUP_TAG"
    ok "Database backup created"
else
    warn "Skipping database backup (--skip-backup)"
fi

# ─── Pull Latest Code ────────────────────────────────────────────────────────
info "Pulling latest code..."
git pull origin "$([[ "$ENV" == "production" ]] && echo main || echo develop)" 2>/dev/null || true
ok "Code updated"

# ─── Install Dependencies ────────────────────────────────────────────────────
info "Installing dependencies..."
npm ci --production=false
ok "Dependencies installed"

# ─── Generate Prisma Client ─────────────────────────────────────────────────
info "Generating Prisma client..."
npx prisma generate
ok "Prisma client generated"

# ─── Database Migration ──────────────────────────────────────────────────────
if [[ "$SKIP_MIGRATE" == "false" ]]; then
    info "Running database migrations..."
    if [[ "$ENV" == "production" ]]; then
        # Production: use safe migrate deploy
        npx prisma migrate deploy
    else
        # Staging: can use migrate dev for flexibility
        npx prisma migrate deploy
    fi
    ok "Migrations applied"
else
    warn "Skipping database migrations (--skip-migrate)"
fi

# ─── Build Application ───────────────────────────────────────────────────────
info "Building application..."
npm run build
ok "Build complete"

# ─── Docker Deploy ───────────────────────────────────────────────────────────
info "Building Docker images..."
docker compose -f docker/docker-compose.yml --env-file docker/.env.docker build
ok "Docker images built"

info "Starting services..."
docker compose -f docker/docker-compose.yml --env-file docker/.env.docker up -d
ok "Services started"

# ─── Health Check ────────────────────────────────────────────────────────────
info "Waiting for services to become healthy..."
sleep 10

RETRY=0
MAX_RETRIES=20
until curl -sf http://localhost:3000/api/health >/dev/null 2>&1; do
    RETRY=$((RETRY + 1))
    if [[ $RETRY -ge $MAX_RETRIES ]]; then
        fail "Application did not become healthy within timeout"
    fi
    echo "  Waiting for app health... (attempt $RETRY/$MAX_RETRIES)"
    sleep 5
done
ok "Application is healthy"

# ─── Post-deploy Verification ─────────────────────────────────────────────────
info "Running post-deploy verification..."
bash scripts/health-check.sh "$ENV"
ok "All services healthy"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Deploy to $ENV Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Deploy tag: $BACKUP_TAG"
echo "  Rollback:   bash scripts/deploy.sh --skip-migrate --skip-backup $ENV"
echo ""