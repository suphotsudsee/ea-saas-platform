# Architecture Document
## EA SaaS Platform — System Architecture & Project Structure

**Version:** 1.0.0  
**Date:** 2026-04-16  

---

## 1. Architecture Overview

The EA SaaS Platform follows a **modular monorepo** architecture with clear separation between the customer-facing web app, the EA backend contract API, shared business logic, and the MT4/MT5 EA contract code.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Compose                           │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  Nginx   │  │  Next.js │  │  Next.js │  │   Redis      │    │
│  │ Reverse  │──│  Web App │  │  API     │──│   Cache      │    │
│  │ Proxy    │  │ :3000    │  │  :3001   │  │   :6379      │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
│                                     │                           │
│                              ┌──────────────┐                   │
│                              │   MySQL      │                   │
│                              │   :3306      │                   │
│                              └──────────────┘                   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐                                     │
│  │  Redis   │  │  Worker  │  Background job processing          │
│  │  Streams │──│  Process │  (heartbeat persist, notifications)  │
│  └──────────┘  └──────────┘                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Topology

All services run in Docker containers orchestrated by Docker Compose:

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| nginx | `ea-nginx` | 80/443 | Reverse proxy, SSL termination, rate limiting |
| web | `ea-web` | 3000 | Next.js SaaS web app + admin panel |
| api | `ea-api` | 3001 | Next.js EA backend contract API |
| mysql | `ea-mysql` | 3306 | Primary database |
| redis | `ea-redis` | 6379 | Cache, sessions, rate limits, streams |
| worker | `ea-worker` | — | Background job processor |

> **Note:** In production, `web` and `api` can be the same Next.js application with route groups, or separate processes for independent scaling. The initial deployment uses a single Next.js app with route groups `/(web)` and `/(api)`.

---

## 2. Technology Stack

### Runtime & Framework
- **Runtime:** Node.js 20+ (LTS)
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript 5+ (strict mode)
- **ORM:** Prisma 5+
- **Database:** MySQL 8 / MariaDB 10.11+
- **Cache/Queue:** Redis 7+
- **Containerization:** Docker + Docker Compose

### Frontend
- **UI Library:** React 18+
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** React Query (TanStack Query) + Zustand
- **Charts:** Recharts or Chart.js
- **Forms:** React Hook Form + Zod validation

### Backend
- **API Style:** REST (JSON)
- **Auth:** NextAuth.js v5 (web sessions) + API Key auth (EA endpoints)
- **Payment:** Stripe SDK + Stripe CLI (webhook testing)
- **Email:** Resend or SendGrid SDK
- **Validation:** Zod schemas
- **Logging:** Pino (structured JSON logging)
- **Rate Limiting:** Redis-based sliding window

### Testing
- **Unit:** Vitest
- **Integration:** Vitest + Supertest
- **E2E:** Playwright
- **Load:** k6 or Artillery

### DevOps
- **CI/CD:** GitHub Actions
- **Containers:** Docker (multi-stage builds)
- **Reverse Proxy:** Nginx
- **SSL:** Let's Encrypt / Certbot
- **Monitoring:** Health check endpoints + structured logs

---

## 3. System Architecture — Detailed

### 3.1 Request Flow: Web App

```
Browser → HTTPS → Nginx → Next.js (port 3000)
  ├── / (public pages: landing, pricing, docs)
  ├── /auth/* (login, register, forgot-password)
  ├── /dashboard/* (protected: overview, trades, licenses, accounts)
  ├── /admin/* (protected + admin role: customers, strategies, risk)
  ├── /api/auth/* (NextAuth endpoints)
  ├── /api/billing/* (checkout, webhooks)
  ├── /api/licenses/* (CRUD)
  └── /api/trading-accounts/* (CRUD)
```

### 3.2 Request Flow: EA Backend Contract

```
MT4/MT5 EA → HTTPS → Nginx → Next.js API (port 3001)
  ├── /api/ea/license/validate  (POST) — License check
  ├── /api/ea/heartbeat         (POST) — Heartbeat report
  ├── /api/ea/config            (GET)  — Config fetch
  ├── /api/ea/config/ack        (POST) — Config acknowledgment
  ├── /api/ea/trade-event       (POST) — Single trade event
  ├── /api/ea/trade-events      (POST) — Batch trade events
  ├── /api/ea/metrics           (POST) — Periodic metrics
  └── /api/ea/kill/ack          (POST) — Kill switch acknowledgment
```

### 3.3 Authentication Layers

```
┌─────────────────────────────────────────────────┐
│              Authentication Architecture          │
│                                                   │
│  Web App Users ──→ NextAuth.js (session-based)   │
│  - Email/Password                                 │
│  - OAuth2 (Google, GitHub)                         │
│  - 2FA (TOTP optional)                           │
│                                                   │
│  EA Clients ──→ API Key + License Key (header)    │
│  - X-API-Key: <api_key>                          │
│  - X-License-Key: <license_key>                  │
│  - Validated on every EA endpoint request          │
│                                                   │
│  Admin Users ──→ NextAuth.js (session + role)    │
│  - Same as web users + admin role check           │
│  - 2FA required                                   │
│  - IP allowlist (optional)                        │
└─────────────────────────────────────────────────┘
```

### 3.4 Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│                  Redis Cache Layers                      │
│                                                         │
│  Layer 1: License Validation Cache                      │
│  - Key: license:{license_key}:account:{account_number}  │
│  - TTL: 5 minutes                                       │
│  - Invalidation: on license status change, config update│
│                                                         │
│  Layer 2: Config Cache                                  │
│  - Key: config:{strategy_id}:{version_hash}            │
│  - TTL: 1 hour (config changes push new version)       │
│  - Invalidation: on config update                       │
│                                                         │
│  Layer 3: Heartbeat State                               │
│  - Key: heartbeat:{license_id}:{account_id}             │
│  - TTL: 3x heartbeat interval (no TTL = stale)         │
│  - No invalidation needed (overwritten on each beat)    │
│                                                         │
│  Layer 4: Session Store                                 │
│  - Key: session:{session_id}                            │
│  - TTL: 24 hours                                        │
│  - Extended on activity                                 │
│                                                         │
│  Layer 5: Rate Limiting                                  │
│  - Key: ratelimit:{identifier}:{window}                 │
│  - TTL: window duration                                 │
│  - Sliding window counter                               │
│                                                         │
│  Layer 6: Redis Streams (job queue)                     │
│  - Stream: heartbeat-persist                            │
│  - Stream: trade-events-process                         │
│  - Stream: notification-send                            │
│  - Consumer groups for reliable processing              │
└─────────────────────────────────────────────────────────┘
```

### 3.5 Data Flow: Trade Event Processing

```
EA → POST /api/ea/trade-event
  → API validates license + API key
  → Push to Redis Stream "trade-events-process"
  → Return 202 Accepted immediately
  
Background Worker:
  → Read from Redis Stream (consumer group)
  → Validate trade event data
  → Check idempotency (ticket + license_id unique)
  → Persist to MySQL trade_events table
  → Update Redis metrics cache
  → Evaluate risk rules
  → [If risk breach] → Set kill switch, create risk_event, send notification
  → Acknowledge stream message
```

### 3.6 Data Flow: Risk Engine

```
Input Sources:
  ├── Heartbeat data (equity, balance, open positions) → every 60s
  ├── Metrics data (drawdown %, margin level) → every 5 min
  └── Trade events (profit/loss, consecutive losses) → real-time

Risk Evaluation (on each heartbeat/metrics input):
  1. Load risk rules from Redis cache (per strategy + per customer overrides)
  2. Evaluate each rule against current data
  3. If any rule breached:
     a. Create risk_event record in MySQL
     b. Set kill switch flag on license (Redis + MySQL)
     c. Send notification to user + admin
     d. Log audit entry
  4. Return risk status in heartbeat response

Rule Types:
  ├── Max Drawdown: compare current drawdown_pct from metrics vs threshold
  ├── Max Daily Loss: sum today's closed trade losses vs threshold  
  ├── Stop After Losses: count consecutive losing trades vs N
  ├── Equity Protection: compare current equity vs absolute minimum
  ├── Max Open Positions: compare open_positions from heartbeat vs max
  └── Margin Level: compare margin_level from metrics vs minimum %
```

---

## 4. Project Directory Structure

```
C:\fullstack\ea-saas-platform\
│
├── docs/                           # Project documentation
│   ├── PRD.md                       # Product requirements document
│   ├── ARCHITECTURE.md              # This file
│   ├── USER_STORIES.md              # User stories
│   └── API_CONTRACT.md              # EA API contract specification (future)
│
├── src/                             # Application source code
│   ├── web/                         # Next.js web application (customer + admin)
│   │   ├── app/                     # Next.js App Router pages
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── page.tsx             # Landing page
│   │   │   ├── _auth/              # Auth route group
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── forgot-password/page.tsx
│   │   │   ├── _dashboard/         # Dashboard route group (protected)
│   │   │   │   ├── layout.tsx       # Dashboard layout (sidebar, auth check)
│   │   │   │   ├── page.tsx         # Dashboard overview
│   │   │   │   ├── licenses/page.tsx
│   │   │   │   ├── accounts/page.tsx
│   │   │   │   ├── trades/page.tsx
│   │   │   │   ├── performance/page.tsx
│   │   │   │   ├── billing/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   ├── _admin/             # Admin route group (protected + admin)
│   │   │   │   ├── layout.tsx       # Admin layout
│   │   │   │   ├── page.tsx         # Admin dashboard
│   │   │   │   ├── customers/page.tsx
│   │   │   │   ├── customers/[id]/page.tsx
│   │   │   │   ├── subscriptions/page.tsx
│   │   │   │   ├── packages/page.tsx
│   │   │   │   ├── strategies/page.tsx
│   │   │   │   ├── strategies/[id]/page.tsx
│   │   │   │   ├── licenses/page.tsx
│   │   │   │   ├── risk/page.tsx
│   │   │   │   ├── analytics/page.tsx
│   │   │   │   ├── audit-logs/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   └── api/                # API routes (Next.js route handlers)
│   │   │       ├── auth/[...nextauth]/route.ts
│   │   │       ├── billing/
│   │   │       │   ├── packages/route.ts
│   │   │       │   ├── checkout/route.ts
│   │   │       │   ├── webhook/route.ts
│   │   │       │   └── subscription/route.ts
│   │   │       ├── licenses/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/route.ts
│   │   │       ├── trading-accounts/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/route.ts
│   │   │       ├── trades/route.ts
│   │   │       ├── metrics/route.ts
│   │   │       ├── notifications/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/route.ts
│   │   │       ├── health/route.ts
│   │   │       └── webhooks/stripe/route.ts
│   │   ├── components/             # React components
│   │   │   ├── ui/                 # Base UI components (shadcn/ui)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   ├── dropdown.tsx
│   │   │   │   └── tabs.tsx
│   │   │   ├── dashboard/          # Dashboard-specific components
│   │   │   │   ├── overview-cards.tsx
│   │   │   │   ├── license-card.tsx
│   │   │   │   ├── account-status.tsx
│   │   │   │   ├── trade-table.tsx
│   │   │   │   └── ea-status-panel.tsx
│   │   │   ├── admin/             # Admin-specific components
│   │   │   │   ├── customer-table.tsx
│   │   │   │   ├── subscription-manager.tsx
│   │   │   │   ├── license-admin-panel.tsx
│   │   │   │   ├── risk-dashboard.tsx
│   │   │   │   ├── strategy-config-editor.tsx
│   │   │   │   └── audit-log-viewer.tsx
│   │   │   └── charts/            # Chart components
│   │   │       ├── equity-curve.tsx
│   │   │       ├── drawdown-chart.tsx
│   │   │       ├── pnl-chart.tsx
│   │   │       └── revenue-chart.tsx
│   │   ├── lib/                    # Business logic & utilities
│   │   │   ├── auth/               # Authentication logic
│   │   │   │   ├── nextauth-config.ts
│   │   │   │   ├── session.ts
│   │   │   │   └── guards.ts
│   │   │   ├── billing/            # Billing logic
│   │   │   │   ├── stripe.ts
│   │   │   │   ├── subscription-service.ts
│   │   │   │   └── webhook-handler.ts
│   │   │   └── utils/             # General utilities
│   │   │       ├── crypto.ts        # License key generation
│   │   │       ├── format.ts        # Number/date formatting
│   │   │       └── validators.ts   # Zod schemas
│   │   ├── hooks/                  # Custom React hooks
│   │   │   ├── use-auth.ts
│   │   │   ├── use-subscription.ts
│   │   │   ├── use-licenses.ts
│   │   │   └── use-trades.ts
│   │   └── styles/                # Global styles
│   │       └── globals.css
│   │
│   ├── api/                        # EA Backend Contract API
│   │   ├── routes/                 # API route handlers
│   │   │   ├── license/
│   │   │   │   └── validate/route.ts
│   │   │   ├── heartbeat/
│   │   │   │   └── route.ts
│   │   │   ├── config/
│   │   │   │   ├── route.ts
│   │   │   │   └── ack/route.ts
│   │   │   ├── kill-switch/
│   │   │   │   └── ack/route.ts
│   │   │   ├── trade-events/
│   │   │   │   └── route.ts
│   │   │   └── metrics/
│   │   │       └── route.ts
│   │   ├── middleware/             # API middleware
│   │   │   ├── auth/
│   │   │   │   └── ea-auth.ts      # License key + API key validation
│   │   │   ├── rate-limit/
│   │   │   │   └── sliding-window.ts
│   │   │   └── validate/
│   │   │       └── request-schema.ts
│   │   └── services/              # Business logic services
│   │       ├── license/
│   │       │   ├── license-service.ts
│   │       │   └── license-cache.ts
│   │       ├── heartbeat/
│   │       │   ├── heartbeat-service.ts
│   │       │   └── stale-detector.ts
│   │       ├── config/
│   │       │   ├── config-service.ts
│   │       │   └── config-versioning.ts
│   │       ├── risk/
│   │       │   ├── risk-engine.ts
│   │       │   ├── rules/
│   │       │   │   ├── max-drawdown.ts
│   │       │   │   ├── daily-loss.ts
│   │       │   │   ├── consecutive-losses.ts
│   │       │   │   ├── equity-protection.ts
│   │       │   │   ├── max-positions.ts
│   │       │   │   ├── spread-filter.ts
│   │       │   │   └── session-filter.ts
│   │       │   └── risk-event-handler.ts
│   │       ├── trade/
│   │       │   ├── trade-event-service.ts
│   │       │   └── idempotency-check.ts
│   │       └── metrics/
│   │           ├── metrics-service.ts
│   │           └── metrics-aggregator.ts
│   │
│   └── shared/                     # Shared code between web + api
│       ├── constants/
│       │   ├── license-statuses.ts  # ACTIVE, EXPIRED, REVOKED, PAUSED
│       │   ├── subscription-statuses.ts
│       │   ├── risk-rules.ts
│       │   ├── platforms.ts         # MT4, MT5
│       │   └── api-errors.ts
│       ├── types/
│       │   ├── license.ts
│       │   ├── subscription.ts
│       │   ├── trading-account.ts
│       │   ├── trade-event.ts
│       │   ├── heartbeat.ts
│       │   ├── risk.ts
│       │   ├── user.ts
│       │   └── api-responses.ts
│       ├── utils/
│       │   ├── date.ts
│       │   ├── crypto.ts
│       │   ├── format.ts
│       │   └── logger.ts
│       └── validators/
│           ├── license-schemas.ts
│           ├── heartbeat-schema.ts
│           ├── trade-event-schema.ts
│           └── metrics-schema.ts
│
├── prisma/                          # Prisma ORM
│   ├── schema.prisma                # Database schema definition
│   ├── migrations/                  # Database migrations
│   └── seed.ts                      # Seed data for development
│
├── ea-contract/                     # MT4/MT5 EA code (MQL4/MQL5)
│   ├── mt4/
│   │   ├── Experts/
│   │   │   └── EASaaS.mq4          # Main EA file for MT4
│   │   ├── Include/
│   │   │   ├── SaaSClient.mqh      # HTTP client library
│   │   │   ├── SaaSConfig.mqh      # Config structures
│   │   │   └── SaaSRisk.mqh        # Risk check helpers
│   │   └── Scripts/
│   │       └── TestConnection.mq4  # Connection test script
│   ├── mt5/
│   │   ├── Experts/
│   │   │   └── EASaaS.mq5          # Main EA file for MT5
│   │   ├── Include/
│   │   │   ├── SaaSClient.mqh
│   │   │   ├── SaaSConfig.mqh
│   │   │   └── SaaSRisk.mqh
│   │   └── Scripts/
│   │       └── TestConnection.mq5
│   └── shared/
│       ├── API_SPEC.md              # API contract documentation for MQL devs
│       ├── PROTOCOL.md              # Communication protocol details
│       └── CHANGELOG.md
│
├── scripts/                         # Utility scripts
│   ├── generate-license.ts          # CLI tool to generate license keys
│   ├── seed-packages.ts             # Seed subscription packages
│   ├── migrate.ts                   # Run migrations
│   └── health-check.ts             # Verify all services are up
│
├── tests/                           # Test files
│   ├── unit/
│   │   ├── api/
│   │   │   ├── license-service.test.ts
│   │   │   ├── heartbeat-service.test.ts
│   │   │   ├── risk-engine.test.ts
│   │   │   ├── config-service.test.ts
│   │   │   └── trade-event-service.test.ts
│   │   └── web/
│   │       ├── subscription-service.test.ts
│   │       ├── auth.test.ts
│   │       └── validators.test.ts
│   ├── integration/
│   │   ├── license/
│   │   │   └── validate-flow.test.ts
│   │   ├── billing/
│   │   │   └── stripe-webhook.test.ts
│   │   └── heartbeat/
│   │       └── heartbeat-flow.test.ts
│   ├── e2e/
│   │   ├── auth-flow.spec.ts
│   │   ├── purchase-flow.spec.ts
│   │   ├── license-management.spec.ts
│   │   └── admin-flow.spec.ts
│   └── fixtures/
│       ├── users.ts
│       ├── licenses.ts
│       └── trade-events.ts
│
├── docker/                          # Docker configuration
│   ├── Dockerfile                   # Multi-stage build for app
│   ├── Dockerfile.worker            # Worker process build
│   ├── docker-compose.yml           # Full stack composition
│   ├── docker-compose.dev.yml       # Development overrides
│   ├── nginx/
│   │   ├── nginx.conf               # Nginx configuration
│   │   └── ssl/                     # SSL certificates (git-ignored)
│   └── mysql/
│       └── init.sql                 # MySQL initialization
│
├── redis/                           # Redis configuration
│   └── redis.conf                   # Redis config
│
├── .env.example                     # Environment variables template
├── .env.local                       # Local env vars (git-ignored)
├── .gitignore
├── package.json                     # Root package.json (workspace)
├── tsconfig.json                    # TypeScript configuration
├── next.config.js                   # Next.js configuration
├── tailwind.config.ts               # Tailwind CSS configuration
├── vitest.config.ts                 # Test configuration
├── playwright.config.ts             # E2E test configuration
├── docker-compose.yml               # Root compose (symlinks to docker/)
└── README.md                        # Project overview
```

---

## 5. Database Schema (Prisma)

```prisma
// prisma/schema.prisma - Full schema definition

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ─── User Management ───────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?
  name          String?
  timezone      String    @default("UTC")
  emailVerified DateTime?
  twoFactorEnabled Boolean @default(false)
  twoFactorSecret  String?
  role          UserRole  @default(TRADER)
  status        UserStatus @default(ACTIVE)
  
  subscriptions  Subscription[]
  licenses       License[]
  tradingAccounts TradingAccount[]
  notifications  Notification[]
  payments       Payment[]
  apiKeys        ApiKey[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@map("users")
}

enum UserRole {
  TRADER
  ADMIN
  SUPER_ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  BANNED
  DELETED
}

// ─── Subscription & Billing ────────────────────────────

model Package {
  id            String    @id @default(cuid())
  name          String
  description   String?
  priceCents    Int
  currency      String    @default("USD")
  billingCycle  BillingCycle
  maxAccounts   Int       @default(1)
  features      Json      // { strategyIds, priority, support }
  isActive      Boolean   @default(true)
  sortOrder     Int       @default(0)
  
  subscriptions Subscription[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@map("packages")
}

enum BillingCycle {
  MONTHLY
  QUARTERLY
  YEARLY
}

model Subscription {
  id                  String            @id @default(cuid())
  userId              String
  packageId           String
  status              SubscriptionStatus @default(ACTIVE)
  currentPeriodStart  DateTime
  currentPeriodEnd    DateTime
  cancelAtPeriodEnd   Boolean           @default(false)
  stripeSubscriptionId String?         @unique
  stripeCustomerId    String?
  
  user              User        @relation(fields: [userId], references: [id])
  package           Package     @relation(fields: [packageId], references: [id])
  licenses          License[]
  payments          Payment[]
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  @@map("subscriptions")
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  EXPIRED
  TRIAL
}

model Payment {
  id              String      @id @default(cuid())
  userId          String
  subscriptionId  String?
  amountCents     Int
  currency        String      @default("USD")
  status          PaymentStatus @default(PENDING)
  stripePaymentId String?     @unique
  description     String?
  
  user            User          @relation(fields: [userId], references: [id])
  subscription    Subscription? @relation(fields: [subscriptionId], references: [id])
  
  createdAt       DateTime      @default(now())
  
  @@map("payments")
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

// ─── License Management ────────────────────────────────

model License {
  id            String        @id @default(cuid())
  key           String        @unique
  userId        String
  subscriptionId String
  strategyId    String
  status        LicenseStatus @default(ACTIVE)
  expiresAt     DateTime
  maxAccounts   Int           @default(1)
  killSwitch    Boolean       @default(false)
  killSwitchReason String?
  killSwitchAt  DateTime?
  pausedAt      DateTime?
  pausedReason  String?
  
  user          User          @relation(fields: [userId], references: [id])
  subscription  Subscription  @relation(fields: [subscriptionId], references: [id])
  strategy      Strategy      @relation(fields: [strategyId], references: [id])
  tradingAccounts TradingAccount[]
  heartbeats    Heartbeat[]
  tradeEvents   TradeEvent[]
  metrics       Metric[]
  riskEvents    RiskEvent[]
  
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  @@map("licenses")
}

enum LicenseStatus {
  ACTIVE
  EXPIRED
  REVOKED
  PAUSED
}

// ─── Strategy & Configuration ──────────────────────────

model Strategy {
  id            String    @id @default(cuid())
  name          String    @unique
  description   String?
  version       String
  defaultConfig Json      // Full strategy config
  riskConfig    Json      // Risk rule thresholds
  isActive      Boolean   @default(true)
  
  licenses      License[]
  configVersions ConfigVersion[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@map("strategies")
}

model ConfigVersion {
  id          String    @id @default(cuid())
  strategyId  String
  configHash  String    // SHA-256 of config JSON
  configJson  Json
  changedBy   String?   // Admin user ID
  changeReason String?
  
  strategy    Strategy  @relation(fields: [strategyId], references: [id])
  
  createdAt   DateTime  @default(now())
  
  @@unique([strategyId, configHash])
  @@map("config_versions")
}

// ─── Trading Accounts ─────────────────────────────────

model TradingAccount {
  id            String            @id @default(cuid())
  userId        String
  licenseId     String
  accountNumber String
  brokerName    String
  platform      Platform
  status        AccountStatus     @default(ACTIVE)
  lastHeartbeatAt DateTime?
  lastKnownIp   String?
  
  user          User        @relation(fields: [userId], references: [id])
  license       License     @relation(fields: [licenseId], references: [id])
  heartbeats    Heartbeat[]
  tradeEvents   TradeEvent[]
  metrics       Metric[]
  riskEvents    RiskEvent[]
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  @@unique([accountNumber, brokerName, platform])
  @@map("trading_accounts")
}

enum Platform {
  MT4
  MT5
}

enum AccountStatus {
  ACTIVE
  OFFLINE
  STALE
  UNLINKED
}

// ─── EA Data: Heartbeats, Trades, Metrics ──────────────

model Heartbeat {
  id                String    @id @default(cuid())
  licenseId         String
  tradingAccountId  String
  eaVersion         String?
  equity            Float?
  balance           Float?
  openPositions     Int        @default(0)
  marginLevel       Float?
  serverTime        DateTime?
  
  license           License        @relation(fields: [licenseId], references: [id])
  tradingAccount    TradingAccount @relation(fields: [tradingAccountId], references: [id])
  
  receivedAt        DateTime      @default(now())
  
  @@index([licenseId, receivedAt])
  @@map("heartbeats")
}

model TradeEvent {
  id                String        @id @default(cuid())
  licenseId         String
  tradingAccountId  String
  ticket            String
  symbol            String
  direction         TradeDirection
  eventType         TradeEventType
  openPrice         Float?
  closePrice        Float?
  volume            Float
  openTime          DateTime?
  closeTime         DateTime?
  profit            Float?
  commission        Float?         @default(0)
  swap              Float?         @default(0)
  magicNumber       Int?
  comment           String?
  
  license           License        @relation(fields: [licenseId], references: [id])
  tradingAccount    TradingAccount @relation(fields: [tradingAccountId], references: [id])
  
  createdAt         DateTime       @default(now())
  
  @@unique([licenseId, ticket])
  @@index([tradingAccountId, closeTime])
  @@map("trade_events")
}

enum TradeDirection {
  BUY
  SELL
}

enum TradeEventType {
  OPEN
  CLOSE
  MODIFY
  PARTIAL_CLOSE
}

model Metric {
  id                String    @id @default(cuid())
  licenseId         String
  tradingAccountId  String
  equity            Float
  balance           Float
  marginLevel       Float?
  drawdownPct       Float
  openPositions     Int
  freeMargin        Float?
  
  license           License        @relation(fields: [licenseId], references: [id])
  tradingAccount    TradingAccount @relation(fields: [tradingAccountId], references: [id])
  
  recordedAt        DateTime      @default(now())
  
  @@index([tradingAccountId, recordedAt])
  @@map("metrics")
}

// ─── Risk Management ──────────────────────────────────

model RiskEvent {
  id                String        @id @default(cuid())
  licenseId         String
  tradingAccountId  String
  ruleType          RiskRuleType
  thresholdValue    Float
  actualValue       Float
  actionTaken       String
  resolvedAt        DateTime?
  resolvedBy        String?
  
  license           License        @relation(fields: [licenseId], references: [id])
  tradingAccount    TradingAccount @relation(fields: [tradingAccountId], references: [id])
  
  createdAt         DateTime      @default(now())
  
  @@index([licenseId, createdAt])
  @@map("risk_events")
}

enum RiskRuleType {
  MAX_DRAWDOWN
  DAILY_LOSS
  CONSECUTIVE_LOSSES
  EQUITY_PROTECTION
  MAX_POSITIONS
  MARGIN_LEVEL
  SPREAD_FILTER
  SESSION_FILTER
}

// ─── Notifications ─────────────────────────────────────

model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String
  title     String
  message   String
  isRead    Boolean   @default(false)
  link      String?
  
  user      User      @relation(fields: [userId], references: [id])
  
  createdAt DateTime  @default(now())
  
  @@index([userId, isRead, createdAt])
  @@map("notifications")
}

// ─── Admin & Security ─────────────────────────────────

model AdminUser {
  id            String      @id @default(cuid())
  email         String      @unique
  passwordHash  String
  name          String
  role          AdminRole   @default(SUPPORT)
  twoFactorEnabled Boolean @default(false)
  twoFactorSecret  String?
  
  auditLogs  AuditLog[]
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  @@map("admin_users")
}

enum AdminRole {
  SUPER_ADMIN
  BILLING_ADMIN
  RISK_ADMIN
  SUPPORT
}

model AuditLog {
  id            String    @id @default(cuid())
  actorId       String?
  actorType     String    // "admin" | "system" | "user"
  action        String
  resourceType  String
  resourceId    String?
  oldValue      Json?
  newValue      Json?
  ipAddress     String?
  userAgent     String?
  
  actor         AdminUser? @relation(fields: [actorId], references: [id])
  
  createdAt     DateTime  @default(now())
  
  @@index([resourceType, resourceId])
  @@index([createdAt])
  @@map("audit_logs")
}

model ApiKey {
  id            String    @id @default(cuid())
  userId       String
  keyHash      String    @unique
  keyPrefix    String    // First 8 chars for identification
  name         String
  lastUsedAt   DateTime?
  expiresAt    DateTime?
  
  user         User      @relation(fields: [userId], references: [id])
  
  createdAt    DateTime  @default(now())
  
  @@map("api_keys")
}
```

---

## 6. Environment Variables

```bash
# .env.example

# ─── Database ──────────────────────────────────────────
DATABASE_URL="mysql://ea_user:password@localhost:3306/ea_saas"

# ─── Redis ─────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ─── Authentication ─────────────────────────────────────
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="https://yourdomain.com"

# ─── Stripe ────────────────────────────────────────────
STRIPE_PUBLIC_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# ─── Email ─────────────────────────────────────────────
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"

# ─── Application ───────────────────────────────────────
APP_URL="https://yourdomain.com"
API_URL="https://api.yourdomain.com"
NODE_ENV="development"

# ─── Rate Limiting ─────────────────────────────────────
RATE_LIMIT_EA_RPM=60
RATE_LIMIT_WEB_RPM=120

# ─── Heartbeat ─────────────────────────────────────────
HEARTBEAT_INTERVAL_SEC=60
HEARTBEAT_STALE_FACTOR=3

# ─── License ───────────────────────────────────────────
LICENSE_CACHE_TTL_SEC=300

# ─── Admin ─────────────────────────────────────────────
ADMIN_IP_ALLOWLIST="0.0.0.0/0"
```

---

## 7. Docker Compose Configuration

```yaml
# docker/docker-compose.yml

version: "3.9"

services:
  mysql:
    image: mysql:8.0
    container_name: ea-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ea_saas
      MYSQL_USER: ea_user
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ea-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ../redis/redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    container_name: ea-web
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: mysql://ea_user:${MYSQL_PASSWORD}@mysql:3306/ea_saas
      REDIS_URL: redis://redis:6379
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${APP_URL}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      RESEND_API_KEY: ${RESEND_API_KEY}
      NODE_ENV: production
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    build:
      context: ..
      dockerfile: docker/Dockerfile.worker
    container_name: ea-worker
    restart: unless-stopped
    environment:
      DATABASE_URL: mysql://ea_user:${MYSQL_PASSWORD}@mysql:3306/ea_saas
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy

  nginx:
    image: nginx:alpine
    container_name: ea-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - web

volumes:
  mysql_data:
  redis_data:
```

---

## 8. Security Architecture

### 8.1 Authentication Flow
```
Web User:
  1. POST /api/auth/login → NextAuth validates credentials
  2. Session cookie set (HttpOnly, Secure, SameSite=Lax)
  3. Subsequent requests include session cookie
  4. Server validates session on every protected request

EA Client:
  1. EA sends X-API-Key + X-License-Key headers
  2. Middleware validates API key against api_keys table
  3. Middleware validates license key against licenses table
  4. License key + account number must match trading_accounts
  5. All EA endpoints require both headers
```

### 8.2 Encryption
- **In transit:** HTTPS (TLS 1.2+) enforced on all endpoints
- **At rest:** Database encryption (MySQL TDE or disk-level encryption)
- **Sensitive fields:** API keys stored as SHA-256 hashes
- **License keys:** Stored as hashes; full key shown to user only once at generation

### 8.3 Rate Limiting
```
EA endpoints:
  - Window: 1 minute sliding
  - Limit: 60 requests/minute per license key
  - Implementation: Redis INCR + EXPIRE
  - Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

Web endpoints:
  - Window: 1 minute sliding
  - Limit: 120 requests/minute per user session
  - Implementation: Redis INCR + EXPIRE

Admin endpoints:
  - Window: 1 minute sliding
  - Limit: 300 requests/minute per admin session
```

### 8.4 CSRF Protection
- NextAuth CSRF token on all state-changing web requests
- EA API uses header-based auth (no CSRF risk — not browser-based)

---

## 9. Monitoring & Observability

### Health Checks
- `GET /api/health` — Returns status of: database, Redis, external services
- Docker health checks for each container
- Nginx health check endpoint

### Logging
- Structured JSON logs via Pino
- Correlation IDs on all requests (X-Request-ID header)
- Log levels: error, warn, info, debug
- Log rotation via Docker log driver

### Metrics (Application-Level)
- API response time histogram
- Request count by endpoint
- Error rate by endpoint
- Active EA connections gauge
- Redis cache hit/miss ratio
- Database connection pool usage

### Alerting Rules
- License API error rate > 1% → Alert
- Heartbeat API p99 > 500ms → Alert
- MySQL connection pool exhaustion → Alert
- Redis memory > 80% → Alert
- Global kill switch activated → Immediate alert

---

## 10. Development Workflow

### Local Development
```bash
# Start infrastructure
docker compose -f docker/docker-compose.dev.yml up -d mysql redis

# Run migrations
npx prisma migrate dev

# Start Next.js dev server
npm run dev

# Run tests
npm run test          # unit + integration
npm run test:e2e      # playwright
npm run test:load     # k6 load tests
```

### CI/CD Pipeline (GitHub Actions)
```
Push to main/feature branch:
  1. Lint (ESLint + Prettier)
  2. Type check (tsc --noEmit)
  3. Unit + Integration tests (Vitest)
  4. Build Docker image
  5. Push to container registry

Push to main (merge):
  1. All above steps
  2. E2E tests (Playwright)
  3. Deploy to staging
  4. Smoke tests on staging
  5. Manual approval for production
  6. Deploy to production
  7. Health check verification
```

---

*End of Architecture Document v1.0.0*