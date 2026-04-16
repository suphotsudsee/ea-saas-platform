#!/usr/bin/env bash
# ─── EA SaaS Platform — First-Time Setup ──────────────────────────────────
# Usage: ./scripts/setup.sh [--env ENV] [--skip-seed]
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
err()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ─── Defaults ────────────────────────────────────────────────────────────────
ENV="development"
SKIP_SEED=false
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ─── Parse Arguments ────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --env)       ENV="$2"; shift 2 ;;
        --skip-seed) SKIP_SEED=true; shift ;;
        -h|--help)
            echo "Usage: setup.sh [--env ENV] [--skip-seed]"
            echo ""
            echo "Options:"
            echo "  --env ENV        Environment: development|staging|production (default: development)"
            echo "  --skip-seed      Skip database seeding"
            exit 0 ;;
        *) err "Unknown option: $1" ;;
    esac
done

cd "$PROJECT_ROOT"

info "EA SaaS Platform Setup"
info "Environment: $ENV"
info "Project root: $PROJECT_ROOT"
echo ""

# ─── Prerequisites Check ────────────────────────────────────────────────────
info "Checking prerequisites..."

command -v node >/dev/null 2>&1   || err "Node.js is required (https://nodejs.org)"
command -v npm >/dev/null 2>&1    || err "npm is required"
command -v docker >/dev/null 2>&1 || warn "Docker not found — database services won't start automatically"

NODE_VERSION=$(node -v | sed 's/v\([0-9]*\).*/\1/')
[[ "$NODE_VERSION" -lt 18 ]] && err "Node.js 18+ required (found v$(node -v))"

ok "Prerequisites satisfied"

# ─── Environment File ────────────────────────────────────────────────────────
if [[ "$ENV" == "development" ]]; then
    ENV_FILE=".env.local"
    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f ".env.example" ]]; then
            cp .env.example "$ENV_FILE"
            ok "Created $ENV_FILE from .env.example"
            warn "Review $ENV_FILE and update secrets before running in production!"
        else
            err "No .env.example found — create $ENV_FILE manually"
        fi
    else
        ok "$ENV_FILE already exists"
    fi
elif [[ "$ENV" == "staging" ]]; then
    ENV_FILE=".env.local"
    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f ".env.staging" ]]; then
            cp .env.staging "$ENV_FILE"
            ok "Created $ENV_FILE from .env.staging"
        else
            err "No .env.staging found"
        fi
    fi
elif [[ "$ENV" == "production" ]]; then
    ENV_FILE=".env.local"
    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f ".env.production" ]]; then
            cp .env.production "$ENV_FILE"
            ok "Created $ENV_FILE from .env.production"
            warn "⚠️  UPDATE ALL SECRETS IN $ENV_FILE BEFORE PROCEEDING!"
        else
            err "No .env.production found"
        fi
    fi
fi

# ─── Install Dependencies ────────────────────────────────────────────────────
info "Installing dependencies..."
npm ci
ok "Dependencies installed"

# ─── Generate Prisma Client ─────────────────────────────────────────────────
info "Generating Prisma client..."
npx prisma generate
ok "Prisma client generated"

# ─── Start Database Services (Docker) ────────────────────────────────────────
if command -v docker >/dev/null 2>&1; then
    info "Starting database services via Docker..."
    docker compose -f docker/docker-compose.yml up -d mysql redis

    info "Waiting for MySQL to be ready..."
    RETRY=0
    MAX_RETRIES=30
    until docker compose -f docker/docker-compose.yml exec -T mysql mysqladmin ping -h localhost -u ea_user -pea_password123 --silent 2>/dev/null; do
        RETRY=$((RETRY + 1))
        if [[ $RETRY -ge $MAX_RETRIES ]]; then
            err "MySQL did not become ready in time"
        fi
        echo "  Attempt $RETRY/$MAX_RETRIES..."
        sleep 2
    done
    ok "MySQL is ready"

    info "Waiting for Redis to be ready..."
    RETRY=0
    until docker compose -f docker/docker-compose.yml exec -T redis redis-cli -a redis123 ping 2>/dev/null | grep -q PONG; do
        RETRY=$((RETRY + 1))
        if [[ $RETRY -ge $MAX_RETRIES ]]; then
            err "Redis did not become ready in time"
        fi
        echo "  Attempt $RETRY/$MAX_RETRIES..."
        sleep 1
    done
    ok "Redis is ready"
else
    warn "Docker not available — ensure MySQL and Redis are running externally"
fi

# ─── Database Migrations ──────────────────────────────────────────────────────
info "Running database migrations..."
if [[ "$ENV" == "production" || "$ENV" == "staging" ]]; then
    npx prisma migrate deploy
else
    npx prisma migrate dev --name init
fi
ok "Migrations applied"

# ─── Seed Database ───────────────────────────────────────────────────────────
if [[ "$SKIP_SEED" == "false" ]]; then
    info "Seeding database..."
    npm run db:seed
    ok "Database seeded"
else
    warn "Skipping database seed (--skip-seed)"
fi

# ─── Build Application ───────────────────────────────────────────────────────
info "Building application..."
npm run build
ok "Build complete"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Start development server:"
echo "    npm run dev"
echo ""
echo "  Start all Docker services:"
echo "    npm run docker:up"
echo ""
echo "  Open Prisma Studio:"
echo "    npm run db:studio"
echo ""
echo "  View database at Adminer:"
echo "    http://localhost:8080"
echo ""