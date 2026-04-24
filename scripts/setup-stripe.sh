#!/bin/bash
# ─── EA SaaS Platform — Stripe Setup Guide ─────────────────────────────────
# This script does NOT automate Stripe (requires manual browser steps).
# It provides instructions and validates your setup after you've configured Stripe.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
AMBER='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔧 TradeCandle v11 — Stripe Setup Guide"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─── Step 1: Check if Stripe CLI is installed ──────────────────────────────
echo "📌 STEP 1: Check Stripe CLI"
echo "─────────────────────────────────────────────────────────────────────"

if command -v stripe &> /dev/null; then
    ok "Stripe CLI is installed: $(stripe version 2>/dev/null || echo 'installed')"
else
    warn "Stripe CLI not found."
    echo ""
    echo "  Install it:"
    echo "    macOS:  brew install stripe/stripe-cli/stripe"
    echo "    Linux:  https://github.com/stripe/stripe-cli/releases"
    echo "    Windows: https://github.com/stripe/stripe-cli/releases"
    echo "             or: scoop install stripe"
    echo ""
    echo "  Then login:"
    echo "    stripe login"
    echo ""
fi

# ─── Step 2: Create Stripe Products & Prices ──────────────────────────────
echo ""
echo "📌 STEP 2: Create Stripe Products & Prices"
echo "─────────────────────────────────────────────────────────────────────"
echo ""
echo "  Option A: Using Stripe Dashboard (recommended)"
echo "  ────────────────────────────────────────────────"
echo "  1. Go to https://dashboard.stripe.com/products"
echo "  2. Create 3 products:"
echo ""
echo "     Product: TradeCandle Starter"
echo "       - Price: 990 THB/month (recurring)"
echo "       - Copy the price_id (price_xxx)"
echo ""
echo "     Product: TradeCandle Pro"
echo "       - Price: 2,490 THB/month (recurring)"
echo "       - Copy the price_id (price_xxx)"
echo ""
echo "     Product: TradeCandle Elite"
echo "       - Price: 4,990 THB/month (recurring)"
echo "       - Copy the price_id (price_xxx)"
echo ""
echo "  Option B: Using Stripe CLI (if installed)"
echo "  ────────────────────────────────────────────────"
echo "    stripe products create --name=\"TradeCandle Starter\" --description=\"1 บัญชี MT5\""
echo "    stripe products create --name=\"TradeCandle Pro\" --description=\"3 บัญชี MT5\""
echo "    stripe products create --name=\"TradeCandle Elite\" --description=\"5 บัญชี MT5\""
echo ""
echo "    Then create prices for each product:"
echo "    stripe prices create --product=prod_xxx --unit-amount=99000 --currency=thb --recurring[interval=month]"
echo "    stripe prices create --product=prod_xxx --unit-amount=249000 --currency=thb --recurring[interval=month]"
echo "    stripe prices create --product=prod_xxx --unit-amount=499000 --currency=thb --recurring[interval=month]"
echo ""

# ─── Step 3: Update .env ──────────────────────────────────────────────────
echo ""
echo "📌 STEP 3: Update .env with Stripe Keys"
echo "─────────────────────────────────────────────────────────────────────"
echo ""
echo "  Add these to your .env file:"
echo ""
echo "    STRIPE_PUBLIC_KEY=pk_live_XXXX         # or pk_test_ for testing"
echo "    STRIPE_SECRET_KEY=sk_live_XXXX          # or sk_test_ for testing"
echo "    STRIPE_WEBHOOK_SECRET=whsec_XXXX       # from Stripe CLI or Dashboard"
echo "    STRIPE_STARTER_PRICE_ID=price_XXXX     # Starter 990 THB/month"
echo "    STRIPE_PRO_PRICE_ID=price_XXXX         # Pro 2,490 THB/month"
echo "    STRIPE_ELITE_PRICE_ID=price_XXXX       # Elite 4,990 THB/month"
echo ""

# ─── Step 4: Webhook ──────────────────────────────────────────────────────
echo ""
echo "📌 STEP 4: Configure Webhook"
echo "─────────────────────────────────────────────────────────────────────"
echo ""
echo "  For local development:"
echo "    stripe listen --forward-to localhost:3000/api/subscriptions/webhook"
echo "    (Copy the whsec_xxx from the output to STRIPE_WEBHOOK_SECRET)"
echo ""
echo "  For production:"
echo "    Go to https://dashboard.stripe.com/webhooks"
echo "    Add endpoint: https://your-domain.com/api/subscriptions/webhook"
echo "    Events to listen for:"
echo "      - checkout.session.completed"
echo "      - customer.subscription.created"
echo "      - customer.subscription.updated"
echo "      - customer.subscription.deleted"
echo "      - invoice.payment_succeeded"
echo "      - invoice.payment_failed"
echo ""

# ─── Step 5: Validate ──────────────────────────────────────────────────────
echo ""
echo "📌 STEP 5: Validate Configuration"
echo "─────────────────────────────────────────────────────────────────────"

if [ -f "$ENV_FILE" ]; then
    # Check each key
    STRIPE_PK=$(grep "^STRIPE_PUBLIC_KEY=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | head -1)
    STRIPE_SK=$(grep "^STRIPE_SECRET_KEY=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | head -1)
    
    if echo "$STRIPE_PK" | grep -q "REPLACE_WITH_YOUR_KEY"; then
        err "STRIPE_PUBLIC_KEY is still a placeholder!"
    elif [ -n "$STRIPE_PK" ]; then
        ok "STRIPE_PUBLIC_KEY is set (${STRIPE_PK:0:12}...)"
    else
        warn "STRIPE_PUBLIC_KEY is not set"
    fi
    
    if [ -n "$STRIPE_SK" ]; then
        ok "STRIPE_SECRET_KEY is set"
    else
        warn "STRIPE_SECRET_KEY is not set"
    fi
else
    err ".env file not found at $ENV_FILE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📖 Full guide: /mnt/c/fullstack/ea-saas-platform/docs/STRIPE_SETUP.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""