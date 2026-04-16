#!/usr/bin/env bash
# ─── EA SaaS Platform — Health Check ────────────────────────────────────
# Usage: ./scripts/health-check.sh [staging|production]
# Exit code 0 = all healthy, 1 = one or more services down
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ENV="${1:-development}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker/docker-compose.yml"

# ─── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*"; }

FAILED=0

# ─── Helper Functions ────────────────────────────────────────────────────────
check_http() {
    local name="$1" url="$2" expected_status="${3:-200}"
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [[ "$status" == "$expected_status" ]]; then
        ok "$name — HTTP $status ✓"
    else
        fail "$name — HTTP $status (expected $expected_status) ✗"
        FAILED=$((FAILED + 1))
    fi
}

check_tcp() {
    local name="$1" host="$2" port="$3"
    if command -v nc >/dev/null 2>&1; then
        if nc -z -w5 "$host" "$port" 2>/dev/null; then
            ok "$name — $host:$port reachable ✓"
        else
            fail "$name — $host:$port unreachable ✗"
            FAILED=$((FAILED + 1))
        fi
    elif command -v timeout >/dev/null 2>&1; then
        if timeout 5 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
            ok "$name — $host:$port reachable ✓"
        else
            fail "$name — $host:$port unreachable ✗"
            FAILED=$((FAILED + 1))
        fi
    else
        warn "$name — cannot check TCP (nc/timeout not available)"
    fi
}

check_docker_container() {
    local name="$1" service="$2"
    if docker compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "Up\|running\|healthy"; then
        ok "$name — container running ✓"
    else
        fail "$name — container not running ✗"
        FAILED=$((FAILED + 1))
    fi
}

# ─── Health Checks ───────────────────────────────────────────────────────────
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "  EA SaaS Platform — Health Check ($ENV)"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─── Application ─────────────────────────────────────────────────────────────
info "Checking application..."
check_http "Next.js App" "http://localhost:3000/api/health" 200

# ─── Database ────────────────────────────────────────────────────────────────
info "Checking database..."
if command -v docker >/dev/null 2>&1; then
    check_docker_container "MySQL" "mysql"
    check_docker_container "Redis" "redis"
else
    check_tcp "MySQL" "localhost" "3306"
    check_tcp "Redis" "localhost" "6379"
fi

# ─── Adminer (dev/staging only) ─────────────────────────────────────────────
if [[ "$ENV" != "production" ]]; then
    info "Checking admin tools..."
    check_http "Adminer" "http://localhost:8080" 200
fi

# ─── Database Connectivity ──────────────────────────────────────────────────
info "Checking database connectivity..."
if command -v docker >/dev/null 2>&1; then
    DB_CHECK=$(docker compose -f "$COMPOSE_FILE" exec -T mysql \
        mysql -uea_user -pea_password123 -e "SELECT 1 AS ok" ea_saas 2>/dev/null | grep -c "ok" || echo "0")
    if [[ "$DB_CHECK" -ge 1 ]]; then
        ok "MySQL — query test ✓"
    else
        fail "MySQL — query test ✗"
        FAILED=$((FAILED + 1))
    fi
fi

# ─── Redis Connectivity ──────────────────────────────────────────────────────
info "Checking Redis connectivity..."
if command -v docker >/dev/null 2>&1; then
    REDIS_PONG=$(docker compose -f "$COMPOSE_FILE" exec -T redis \
        redis-cli -a redis123 ping 2>/dev/null || echo "FAIL")
    if [[ "$REDIS_PONG" == *"PONG"* ]]; then
        ok "Redis — ping test ✓"
    else
        fail "Redis — ping test ✗"
        FAILED=$((FAILED + 1))
    fi
fi

# ─── Disk Space ──────────────────────────────────────────────────────────────
info "Checking system resources..."
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
if [[ "$DISK_USAGE" -lt 90 ]]; then
    ok "Disk usage — ${DISK_USAGE}% ✓"
else
    warn "Disk usage — ${DISK_USAGE}% ⚠️  (above 90%)"
fi

# ─── Memory ──────────────────────────────────────────────────────────────────
if command -v free >/dev/null 2>&1; then
    MEM_AVAIL=$(free -m | awk 'NR==2{print $7}')
    if [[ "$MEM_AVAIL" -gt 256 ]]; then
        ok "Available memory — ${MEM_AVAIL}MB ✓"
    else
        warn "Available memory — ${MEM_AVAIL}MB ⚠️  (below 256MB)"
    fi
fi

# ─── Docker Volumes ─────────────────────────────────────────────────────────
if command -v docker >/dev/null 2>&1; then
    info "Checking Docker volumes..."
    docker volume ls -q | grep -q "ea-saas.*mysql_data" && ok "MySQL volume exists ✓" || warn "MySQL volume not found"
    docker volume ls -q | grep -q "ea-saas.*redis_data" && ok "Redis volume exists ✓" || warn "Redis volume not found"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
if [[ "$FAILED" -eq 0 ]]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✅ All services healthy ($FAILED failures)${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ❌ $FAILED check(s) failed${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi
echo ""

exit $FAILED