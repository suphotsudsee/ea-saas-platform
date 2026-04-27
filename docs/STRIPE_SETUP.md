# 🔧 Stripe Setup Guide — TradeCandle v11 EA SaaS Platform

## Overview

The platform uses **Stripe** for:
- 💳 Checkout sessions (buy subscription)
- 🔄 Recurring billing (automatic monthly charges)
- 🔔 Webhooks (notifications when payment/cancel occurs)
- 👤 Customer management (create/manage Stripe customers)

---

## 🚀 Quick Setup (5 Steps)

### 1️⃣ Sign Up for Stripe Account

1. Go to **https://dashboard.stripe.com/register**
2. Sign up with email
3. Confirm email + Enable account
4. (For Thailand) Set **THB** as primary currency in Settings → Business settings → Currency

### 2️⃣ Download API Keys

1. Go to **https://dashboard.stripe.com/apikeys**
2. Copy:
   - **Publishable key** (`pk_test_...` for test, `pk_live_...` for production)
   - **Secret key** (`sk_test_...` / `sk_live_...`)

3. Enter in `.env`:
```env
STRIPE_PUBLIC_KEY=pk_test_51Abc...
STRIPE_SECRET_KEY=***
```

### 3️⃣ Create Products & Prices

Go to **https://dashboard.stripe.com/products** → **Add product**

Create 3 products:

| Product | Name | Price | Billing |
|---------|------|-------|---------|
| 1 | TradeCandle Starter | 990 THB | Monthly recurring |
| 2 | TradeCandle Pro | 2,490 THB | Monthly recurring |
| 3 | TradeCandle Elite | 4,990 THB | Monthly recurring |

**Important:** Copy the `price_id` (`price_xxx`) for each product and add to `.env`:

```env
STRIPE_STARTER_PRICE_ID=price_1Abc...
STRIPE_PRO_PRICE_ID=price_1Def...
STRIPE_ELITE_PRICE_ID=price_1Ghi...
```

### 4️⃣ Set Up Webhook

#### For Local Development:
```bash
# Install Stripe CLI
# macOS:  brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe

# Login
stripe login

# Forward webhook to localhost
stripe listen --forward-to localhost:3000/api/subscriptions/webhook
```

Copy `whsec_xxx` from output and enter in `.env`:
```env
STRIPE_WEBHOOK_SECRET=***
```

#### For Production:
Go to **https://dashboard.stripe.com/webhooks** → **Add endpoint**

- **Endpoint URL:** `https://tradecandle.ai/api/subscriptions/webhook`
- **Events to listen for:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### 5️⃣ Seed Packages & Test

```bash
# In PowerShell (without WSL)
cd C:\fullstack\ea-saas-platform
npx prisma generate
npx prisma db push
npx tsx scripts/seed-packages.ts
```

---

## 💡 How the System Works

### Checkout Flow
```
User → Select Plan → POST /api/subscriptions/checkout
                            ↓
                    Stripe Checkout Session
                            ↓
                    User pays (Stripe)
                            ↓
                    Webhook: checkout.session.completed
                            ↓
                    Create Subscription + License Key
                            ↓
                    User sees License Key in Dashboard
```

### Supported Webhook Events
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create Subscription + License |
| `customer.subscription.updated` | Update status (ACTIVE, PAST_DUE) |
| `customer.subscription.deleted` | Cancel Subscription + Close License |
| `invoice.payment_succeeded` | Save Payment + Renew License |
| `invoice.payment_failed` | Notify + mark PAST_DUE |

### Database Models
```
User → Subscription → Package
                    → License
         → Payment
```

---

## 🧪 Test with Stripe Test Mode

1. Use `pk_test_...` and `sk_test_...` in `.env`
2. Use test card: `4242 4242 4242 4242` (Visa) — any future expiry date
3. Create test products in Stripe Dashboard (test mode)
4. Run `stripe listen --forward-to localhost:3000/api/subscriptions/webhook`
5. Test purchase through the website

---

## ⚠️ Important Notes

1. **Don't forget to switch from test → live keys** when deploying to production
2. **Webhook secret** will be different between test and live — must update it too
3. **THB currency** — must be enabled in Stripe Dashboard (Settings → Currencies)
4. **Set product names** in English in Stripe (shown on receipts)

---

## 📁 Related Files

| File | Purpose |
|------|---------|
| `src/api/services/billing.service.ts` | Stripe client, checkout, webhooks |
| `src/api/routes/subscriptions/checkout/route.ts` | POST /api/subscriptions/checkout |
| `src/api/routes/subscriptions/webhook/route.ts` | POST /api/subscriptions/webhook |
| `src/api/routes/subscriptions/portal/route.ts` | Customer portal (manage subscription) |
| `scripts/seed-packages.ts` | Seed 3 pricing packages |
| `prisma/schema.prisma` | Package + Subscription models |
| `.env` | Stripe keys |

---

*Created: April 2026*