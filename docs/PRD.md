# Product Requirements Document (PRD)
## EA SaaS Platform — Expert Advisor Licensing & Management Platform

**Version:** 1.0.0  
**Date:** 2026-04-16  
**Status:** Draft  
**Author:** PM Agent  

---

## 1. Executive Summary

The EA SaaS Platform is a full-stack, production-grade system that enables a business to sell Expert Advisor (EA) trading software as a service. The platform provides:

- A **customer-facing SaaS web application** where traders sign up, purchase subscription packages, receive license keys, link their MT4/MT5 trading accounts, and monitor trade performance.
- An **EA Backend Contract** — a well-defined API that MT4/MT5 Expert Advisors call to validate licenses, report heartbeats, synchronize configuration, receive kill-switch commands, and stream trade events.
- An **Admin Panel** for operators to manage customers, subscriptions, strategies, risk parameters, and perform license revocation/pausing.

The platform is built with **Next.js + Prisma + MySQL/MariaDB + Redis + Docker**, designed for horizontal scalability, strong security, and 24/7 uptime — matching the always-on nature of forex trading.

---

## 2. Problem Statement

Selling EA trading software today typically involves:
- Manual license key distribution via email or messaging
- No visibility into whether EAs are running, on which accounts, or with what results
- No centralized risk management — a misconfigured EA can blow through an account
- No subscription lifecycle management (renewals, downgrades, expirations)
- No aggregated trade performance data for business analytics

This platform solves all of these problems with a unified, automated, and auditable system.

---

## 3. Goals & Objectives

### Primary Goals
1. **Automate the full EA license lifecycle** — from purchase through activation, monitoring, and expiration/revocation.
2. **Provide real-time visibility** into EA deployment status, trading activity, and risk exposure.
3. **Enable subscription-based billing** with multiple tiers, automatic renewal handling, and grace periods.
4. **Enforce risk management** at the platform level — independent of EA-side logic — including drawdown limits, session filters, spread filters, and kill-switch capabilities.
5. **Deliver a production-ready system** deployable via Docker Compose with minimal ops overhead.

### Secondary Goals
6. Support both **MT4 and MT5** platforms through a unified backend contract.
7. Provide **aggregated analytics** for business intelligence (MRR, churn, trade volume, P&L distribution).
8. Enable **multi-strategy** support — different EAs or EA configurations mapped to different subscription packages.
9. Make the system **extensible** for future features (multi-tenant white-label, affiliate system, signal copying).

### Non-Goals (Out of Scope v1)
- Signal copying / trade mirroring between accounts
- White-label / multi-tenant SaaS
- Mobile native applications (responsive web only)
- Real-time chat / community features
- Custom EA development (EAs are provided separately; this platform licenses them)
- Direct broker API integration / trade execution from the platform

---

## 4. Target Users

### 4.1 Trader (End User)
- Forex/crypto trader who purchases EA subscriptions
- Wants: easy purchase, quick setup, visibility into performance, reliable licensing
- Technical level: varies from beginner to advanced
- Uses: SaaS Web App (dashboard), receives license key, enters it in MT4/MT5 EA

### 4.2 Platform Operator / Admin
- Business owner or operations team member
- Wants: customer management, revenue tracking, risk oversight, ability to pause/kill EAs
- Technical level: moderate to advanced
- Uses: Admin Panel

### 4.3 EA (System User)
- Automated trading bot running on MT4/MT5
- "Uses" the Backend Contract API endpoints
- Communicates via HTTP REST calls from MQL4/MQL5 code

---

## 5. Core Features — Detailed Requirements

### 5.1 SaaS Web App (Customer-Facing)

#### 5.1.1 Authentication & Account Management
- **FR-AUTH-001**: Email + password registration with email verification
- **FR-AUTH-002**: OAuth2 login (Google, GitHub) as optional convenience
- **FR-AUTH-003**: Two-factor authentication (TOTP) as optional security layer
- **FR-AUTH-004**: Password reset via email token (time-limited, single-use)
- **FR-AUTH-005**: Session management — view active sessions, revoke individual sessions
- **FR-AUTH-006**: Account deletion with grace period (30 days recoverable)
- **FR-AUTH-007**: Profile management — name, timezone, email change with verification

#### 5.1.2 Subscription & Billing
- **FR-BILL-001**: Browse available subscription packages with clear tier differentiation
- **FR-BILL-002**: Purchase subscription via integrated payment processor (Stripe primary)
- **FR-BILL-003**: View subscription status: active, past_due, canceled, expired
- **FR-BILL-004**: Automatic renewal processing with pre-expiry notifications (7d, 3d, 1d)
- **FR-BILL-005**: Grace period handling (3 days) after payment failure before license suspension
- **FR-BILL-006**: Upgrade/downgrade subscription with prorated billing
- **FR-BILL-007**: Cancel subscription — immediate or at period end (user choice)
- **FR-BILL-008**: View billing history with invoice download (PDF)
- **FR-BILL-009**: Payment method management — add/remove cards, set default
- **FR-BILL-010**: Promo/discount code support at checkout

#### 5.1.3 License Management
- **FR-LIC-001**: View all owned license keys with status (active, expired, revoked, paused)
- **FR-LIC-002**: Each license key is cryptographically generated (UUID v4 + checksum)
- **FR-LIC-003**: License key is tied to a specific subscription + strategy combination
- **FR-LIC-004**: License expiry automatically aligned with subscription period
- **FR-LIC-005**: One license per subscription tier (enforced, but admin can override)
- **FR-LIC-006**: License activation limit — max N trading accounts per license (configurable per tier)
- **FR-LIC-007**: Deactivate license on a specific trading account (user-initiated)

#### 5.1.4 Trading Account Linking
- **FR-TA-001**: Link MT4/MT5 trading account by entering account number + broker name + platform type
- **FR-TA-002**: Auto-detect trading account on first heartbeat from EA (alternative linking method)
- **FR-TA-003**: View all linked trading accounts with status indicators (online/offline/heartbeat stale)
- **FR-TA-004**: Unlink trading account (disassociates from license, EA will fail license check)
- **FR-TA-005**: Trading account verification — EA heartbeat confirms account ownership

#### 5.1.5 Dashboard & Trade Performance
- **FR-DASH-001**: Overview dashboard with key metrics: total P&L, win rate, trade count, active EAs
- **FR-DASH-002**: Trade history view with filters: date range, account, strategy, symbol
- **FR-DASH-003**: Performance charts: equity curve, drawdown chart, daily/weekly/monthly P&L
- **FR-DASH-004**: Individual trade detail view (entry/exit, duration, profit, risk metrics)
- **FR-DASH-005**: EA status panel — which EAs are running, last heartbeat time, current config
- **FR-DASH-006**: Real-time notification for: EA went offline, high drawdown alert, kill-switch activated
- **FR-DASH-007**: Export trade data as CSV for external analysis

#### 5.1.6 User Notifications
- **FR-NOTIF-001**: In-app notification center for system events
- **FR-NOTIF-002**: Email notifications for: subscription expiry, payment failure, EA offline, kill-switch
- **FR-NOTIF-003**: Notification preferences — user can opt in/out of email categories
- **FR-NOTIF-004**: Push notification support (future, via service worker)

---

### 5.2 EA Backend Contract (API for MT4/MT5)

The Backend Contract is the API surface that EAs call. All endpoints require a valid license key and API key in headers.

#### 5.2.1 License Validation
- **FR-EA-001**: `POST /api/ea/license/validate` — EA sends license key + account number; server validates and returns: valid/invalid, expiry date, allowed strategies, risk config hash
- **FR-EA-002**: License validation must respond in < 200ms (p99) to avoid EA startup delays
- **FR-EA-003**: Cached validation in Redis with 5-minute TTL to reduce DB load
- **FR-EA-004**: Failed validation returns clear error code: INVALID_KEY, EXPIRED, REVOKED, ACCOUNT_MISMATCH, MAX_ACCOUNTS_REACHED
- **FR-EA-005**: EA must validate license on startup AND periodically (every 5 minutes configurable)

#### 5.2.2 Heartbeat
- **FR-EA-006**: `POST /api/ea/heartbeat` — EA sends: license key, account number, platform (MT4/MT5), EA version, current equity, balance, open positions count, server timestamp
- **FR-EA-007**: Heartbeat interval: every 60 seconds (configurable per strategy)
- **FR-EA-008**: Server marks account as "offline" if no heartbeat received within 3x interval
- **FR-EA-009**: Heartbeat response includes: server config version hash, kill-switch status, config updates available flag
- **FR-EA-010**: Heartbeat data stored in Redis (latest state) with periodic flush to DB for history
- **FR-EA-011**: Stale heartbeat detection triggers: user notification + admin alert

#### 5.2.3 Configuration Sync
- **FR-EA-012**: `GET /api/ea/config` — EA fetches current configuration (risk params, strategy settings)
- **FR-EA-013**: Configuration includes: lot sizing method, max lot, min lot, risk percentage, strategy-specific params, risk layer settings
- **FR-EA-014**: Config versioned with hash — EA only re-fetches when hash changes (detected via heartbeat response)
- **FR-EA-015**: `POST /api/ea/config/ack` — EA acknowledges config receipt and applies it
- **FR-EA-016**: Admin can push config changes that take effect on next EA config fetch cycle
- **FR-EA-017**: Config changes are audited — who changed what, when, previous value

#### 5.2.4 Kill Switch
- **FR-EA-018**: Kill switch is a boolean flag per license, checked on every heartbeat response
- **FR-EA-019**: When kill switch is active, heartbeat response includes `"kill": true`
- **FR-EA-020**: EA upon receiving kill signal: immediately stops opening new trades, closes all open positions (configurable: close or leave open), reports kill acknowledged
- **FR-EA-021**: Kill switch can be triggered by: admin action, risk rule breach, subscription expiration
- **FR-EA-022**: `POST /api/ea/kill/ack` — EA acknowledges kill switch received and action taken
- **FR-EA-023**: Kill switch is a one-way gate — once activated, requires admin to explicitly deactivate
- **FR-EA-024**: Emergency global kill switch — admin can kill ALL EAs across the platform in one action

#### 5.2.5 Trade Event Streaming
- **FR-EA-025**: `POST /api/ea/trade-event` — EA reports trade events: open, close, modify, partial close
- **FR-EA-026**: Trade event payload: ticket, symbol, type (buy/sell), open_price, close_price, volume, open_time, close_time, profit, commission, swap, magic_number, comment
- **FR-EA-027**: Trade events are idempotent — re-sending same ticket+event is a no-op
- **FR-EA-028**: Batch submission supported: `POST /api/ea/trade-events` (array, max 100 per batch)
- **FR-EA-029**: Trade events processed asynchronously — stored in queue, then persisted to DB
- **FR-EA-030**: Trade events feed the dashboard metrics and analytics pipeline

#### 5.2.6 Metrics Reporting
- **FR-EA-031**: `POST /api/ea/metrics` — EA reports periodic metrics: equity, balance, margin level, drawdown %, open positions summary
- **FR-EA-032**: Metrics submitted every 5 minutes (configurable)
- **FR-EA-033**: Metrics stored in time-series fashion for chart rendering
- **FR-EA-034**: Metrics feed the risk engine for real-time risk assessment

---

### 5.3 Admin Panel

#### 5.3.1 Customer Management
- **FR-ADM-001**: View all customers with search/filter: name, email, status, subscription tier
- **FR-ADM-002**: View customer detail: profile, subscriptions, licenses, trading accounts, trade history
- **FR-ADM-003**: Manually adjust subscription: extend, pause, cancel with reason logging
- **FR-ADM-004**: Issue manual refund with reason tracking
- **FR-ADM-005**: Suspend/ban customer account with cascade options (revoke all licenses, kill all EAs)
- **FR-ADM-006**: Impersonate customer view (read-only) for debugging
- **FR-ADM-007**: Add manual notes/flags to customer records

#### 5.3.2 Subscription & Package Management
- **FR-ADM-008**: CRUD subscription packages: name, description, price, billing cycle, features, max accounts
- **FR-ADM-009**: Define which strategies are available per package
- **FR-ADM-010**: Package versioning — changes create new version; existing subscriptions unaffected
- **FR-ADM-011**: View subscription analytics: MRR, churn rate, conversion funnel, LTV

#### 5.3.3 Strategy & Configuration Management
- **FR-ADM-012**: CRUD trading strategies: name, description, version, default config
- **FR-ADM-013**: Strategy configuration schema definition (JSON Schema) — defines what params EAs accept
- **FR-ADM-014**: Per-customer config overrides — modify risk/strategy params for specific customers
- **FR-ADM-015**: Bulk config update — push new config to all EAs using a strategy
- **FR-ADM-016**: Config change audit log with rollback capability

#### 5.3.4 License Management
- **FR-ADM-017**: View all licenses with filters: status, customer, strategy, expiry
- **FR-ADM-018**: Manually revoke license with reason
- **FR-ADM-019**: Manually pause/resume license
- **FR-ADM-020**: Extend license expiry (with reason)
- **FR-ADM-021**: Regenerate license key (old key immediately invalidated)
- **FR-ADM-022**: View license usage history (heartbeats, validations, linked accounts)

#### 5.3.5 Risk Management
- **FR-ADM-023**: Global risk settings: max drawdown threshold, max daily loss, max open positions per account
- **FR-ADM-024**: Per-strategy risk settings: spread filter (max spread per symbol), session filter (allowed trading hours UTC), news filter (pause before/after major news)
- **FR-ADM-025**: Risk rule breach actions: kill EA, notify admin, notify user, pause license
- **FR-ADM-026**: Risk dashboard: accounts near drawdown limits, accounts with stale heartbeats, accounts in kill state
- **FR-ADM-027**: Manual kill switch per license, per strategy, or global
- **FR-ADM-028**: Risk event audit log

#### 5.3.6 Analytics & Reporting
- **FR-ADM-029**: Revenue dashboard: daily/weekly/monthly revenue, MRR, ARR, churn
- **FR-ADM-030**: Trading analytics: aggregate P&L, win rate, average trade duration, Sharpe ratio
- **FR-ADM-031**: Platform health: active EAs, heartbeat compliance, API response times, error rates
- **FR-ADM-032**: Export reports as CSV/PDF
- **FR-ADM-033**: Custom date range for all analytics views

#### 5.3.7 System & Security
- **FR-ADM-034**: Admin role-based access control: Super Admin, Billing Admin, Risk Admin, Support Agent (read-only)
- **FR-ADM-035**: Admin action audit log — all admin actions logged with timestamp, user, action, affected resource
- **FR-ADM-036**: API key management — view, rotate, revoke API keys
- **FR-ADM-037**: System configuration: heartbeat intervals, grace periods, notification templates
- **FR-ADM-038**: View application logs and error tracking integration

---

## 6. Risk Management Layer (Detailed)

The risk management layer operates independently from EA-side logic. It evaluates data from heartbeats and metrics to enforce platform-level risk rules.

### 6.1 Risk Rules Engine

| Rule | Description | Trigger | Action |
|------|-------------|---------|--------|
| Max Drawdown | Account equity drops X% from peak | Equity from heartbeat/metrics < threshold | Kill EA + Notify |
| Max Daily Loss | Account loses X% in a calendar day | Sum of today's closed trade losses > threshold | Kill EA + Notify |
| Spread Filter | Current spread exceeds X pips for a symbol | EA checks before opening trade (via config) | EA skips trade |
| Session Filter | Trading outside allowed hours | EA checks current UTC hour against config | EA skips trade |
| Stop After N Consecutive Losses | After N consecutive losing trades | Consecutive loss count from trade events | Pause EA + Notify |
| Equity Protection | Account equity falls below absolute threshold | Equity from heartbeat < minimum | Kill EA + Notify |
| Max Open Positions | Account has too many open positions | Open position count from heartbeat > limit | Kill EA + Notify |
| Margin Level Alert | Margin level falls below X% | Margin from metrics < threshold | Notify + Reduce positions |

### 6.2 Risk Rule Configuration
- Rules defined at strategy level with defaults
- Per-customer overrides possible (admin action)
- Rules evaluated server-side (heartbeat/metrics analysis) AND client-side (EA reads config)
- Server-side evaluation is the authority — if server says kill, EA must comply
- Client-side evaluation is preventive — EA avoids risky trades proactively

### 6.3 Risk Event Flow
1. EA reports heartbeat/metrics
2. Risk engine evaluates rules against incoming data
3. If rule breached: set kill switch flag on license, create risk event record, trigger notifications
4. On next heartbeat, EA receives kill signal
5. EA acknowledges kill and takes action
6. Admin reviews risk event, may deactivate kill switch or adjust config

---

## 7. Non-Functional Requirements

### 7.1 Performance
- **NFR-PERF-001**: License validation API: < 50ms median, < 200ms p99
- **NFR-PERF-002**: Heartbeat API: < 100ms median, < 300ms p99
- **NFR-PERF-003**: Dashboard page load: < 2s first contentful paint
- **NFR-PERF-004**: Support 1,000 concurrent EA connections (heartbeat traffic)
- **NFR-PERF-005**: Support 10,000 registered users with 500 concurrent web sessions
- **NFR-PERF-006**: Trade event processing: handle 100 events/second sustained

### 7.2 Reliability & Availability
- **NFR-REL-001**: 99.9% uptime SLA for EA backend API (licenses must work for trading)
- **NFR-REL-002**: Graceful degradation: if Redis is down, license validation falls back to DB
- **NFR-REL-003**: Heartbeat processing continues even if DB write fails (queue + retry)
- **NFR-REL-004**: No single point of failure in critical path (license validation + kill switch)

### 7.3 Security
- **NFR-SEC-001**: All API communications over HTTPS (TLS 1.2+)
- **NFR-SEC-002**: License keys are validated server-side — cannot be forged
- **NFR-SEC-003**: API key authentication for all EA endpoints
- **NFR-SEC-004**: Rate limiting: 60 requests/minute per license key for EA endpoints
- **NFR-SEC-005**: Rate limiting: 120 requests/minute per user for web endpoints
- **NFR-SEC-006**: Admin panel: IP allowlist option + 2FA required
- **NFR-SEC-007**: Passwords hashed with bcrypt (cost factor 12+)
- **NFR-SEC-008**: Sensitive data encrypted at rest (payment details, API keys)
- **NFR-SEC-009**: SQL injection prevention via Prisma parameterized queries
- **NFR-SEC-010**: XSS prevention: all user inputs sanitized, CSP headers
- **NFR-SEC-011**: CSRF protection on all state-changing web endpoints
- **NFR-SEC-012**: Audit logging for all security-relevant events
- **NFR-SEC-013**: Data retention policy: trade events kept 2 years, heartbeats 90 days, audit logs indefinite
- **NFR-SEC-014**: GDPR compliance: right to export, right to delete (within constraints)

### 7.4 Scalability
- **NFR-SCALE-001**: Horizontal scaling via stateless API servers behind load balancer
- **NFR-SCALE-002**: Redis cluster for session/cache scaling
- **NFR-SCALE-003**: Database read replicas for dashboard queries
- **NFR-SCALE-004**: Trade event ingestion decoupled via queue (Redis Streams or similar)

### 7.5 Maintainability
- **NFR-MAINT-001**: TypeScript throughout (strict mode)
- **NFR-MAINT-002**: 80%+ test coverage for business logic
- **NFR-MAINT-003**: Docker Compose for reproducible environments
- **NFR-MAINT-004**: CI/CD pipeline with automated testing
- **NFR-MAINT-005**: Database migrations via Prisma (version controlled)
- **NFR-MAINT-006**: Structured logging with correlation IDs for request tracing
- **NFR-MAINT-007**: Health check endpoints for all services

---

## 8. Database Schema Overview

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Customer accounts | id, email, password_hash, name, timezone, role, created_at, updated_at |
| `subscriptions` | Subscription records | id, user_id, package_id, status, current_period_start, current_period_end, stripe_subscription_id, created_at |
| `packages` | Subscription tiers | id, name, description, price_cents, billing_cycle, max_accounts, features_json, is_active, created_at |
| `licenses` | EA license keys | id, key, user_id, subscription_id, strategy_id, status, expires_at, max_accounts, created_at |
| `strategies` | EA strategy definitions | id, name, description, version, default_config_json, risk_config_json, is_active |
| `trading_accounts` | Linked MT4/MT5 accounts | id, user_id, license_id, account_number, broker_name, platform, status, last_heartbeat_at, created_at |
| `trade_events` | Individual trade records | id, license_id, trading_account_id, ticket, symbol, direction, open_price, close_price, volume, open_time, close_time, profit, commission, swap, magic_number |
| `metrics` | Periodic EA metrics | id, license_id, trading_account_id, equity, balance, margin_level, drawdown_pct, open_positions, recorded_at |
| `heartbeats` | EA heartbeat records | id, license_id, trading_account_id, ea_version, equity, balance, open_positions, received_at |
| `risk_events` | Risk rule violations | id, license_id, trading_account_id, rule_type, threshold_value, actual_value, action_taken, resolved_at, created_at |
| `notifications` | User notifications | id, user_id, type, title, message, is_read, created_at |
| `audit_logs` | System audit trail | id, actor_id, actor_type, action, resource_type, resource_id, old_value, new_value, ip_address, created_at |
| `payments` | Payment records | id, user_id, subscription_id, amount_cents, currency, status, stripe_payment_id, created_at |
| `admin_users` | Admin accounts | id, email, password_hash, name, role, created_at |
| `config_versions` | Strategy config versions | id, strategy_id, config_hash, config_json, created_by, created_at |
| `api_keys` | EA API keys | id, user_id, key_hash, name, last_used_at, expires_at, created_at |

### Key Relationships
- User → Subscriptions (1:N)
- Subscription → Package (N:1)
- Subscription → Licenses (1:N)
- License → Strategy (N:1)
- License → Trading Accounts (1:N)
- Trading Account → Trade Events (1:N)
- Trading Account → Metrics (1:N)
- Trading Account → Heartbeats (1:N)
- License → Risk Events (1:N)

---

## 9. API Design Summary

### EA Backend Contract (requires API Key + License Key)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/ea/license/validate` | Validate license key + account |
| POST | `/api/ea/heartbeat` | Report EA status |
| GET | `/api/ea/config` | Fetch current configuration |
| POST | `/api/ea/config/ack` | Acknowledge config received |
| POST | `/api/ea/trade-event` | Report single trade event |
| POST | `/api/ea/trade-events` | Report batch trade events |
| POST | `/api/ea/metrics` | Report periodic metrics |
| POST | `/api/ea/kill/ack` | Acknowledge kill switch |

### Web App API (requires session auth)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register new account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/billing/packages` | List available packages |
| POST | `/api/billing/checkout` | Create checkout session |
| POST | `/api/billing/webhook` | Stripe webhook |
| GET | `/api/billing/subscription` | Get user's subscription |
| GET | `/api/licenses` | List user's licenses |
| GET | `/api/licenses/:id` | Get license detail |
| GET | `/api/trading-accounts` | List linked accounts |
| POST | `/api/trading-accounts` | Link trading account |
| DELETE | `/api/trading-accounts/:id` | Unlink trading account |
| GET | `/api/trades` | List trade events |
| GET | `/api/metrics` | Get performance metrics |
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications/:id` | Mark notification read |

### Admin API (requires admin auth)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/users` | List customers |
| GET | `/api/admin/users/:id` | Customer detail |
| PATCH | `/api/admin/users/:id` | Update customer |
| GET | `/api/admin/subscriptions` | List subscriptions |
| CRUD | `/api/admin/packages` | Package management |
| CRUD | `/api/admin/strategies` | Strategy management |
| CRUD | `/api/admin/licenses` | License management |
| PATCH | `/api/admin/licenses/:id/kill` | Toggle kill switch |
| PATCH | `/api/admin/licenses/:id/pause` | Pause/resume license |
| GET | `/api/admin/risk` | Risk dashboard data |
| PATCH | `/api/admin/risk/config` | Update risk config |
| POST | `/api/admin/kill-switch/global` | Global kill switch |
| GET | `/api/admin/analytics/revenue` | Revenue analytics |
| GET | `/api/admin/analytics/trading` | Trading analytics |
| GET | `/api/admin/audit-logs` | View audit logs |

---

## 10. Third-Party Integrations

| Service | Purpose | Integration Point |
|---------|---------|-------------------|
| Stripe | Payment processing, subscriptions, invoices | Web App billing, admin refunds |
| SendGrid / Resend | Email notifications | Auth emails, billing alerts, EA alerts |
| Redis | Caching, session store, rate limiting, pub/sub | All API services |
| Docker | Containerization | All services |
| GitHub Actions | CI/CD | Automated testing + deployment |

---

## 11. Data Flow Diagrams

### 11.1 License Validation Flow
```
EA (MT4/MT5) → POST /api/ea/license/validate → API Server
  → Check Redis cache (license_key + account_number)
  → [Cache Hit] → Return cached result
  → [Cache Miss] → Prisma → MySQL: query licenses + subscriptions + trading_accounts
  → Evaluate: is_valid, expiry, strategy, max_accounts
  → Cache result in Redis (TTL 5min)
  → Return to EA
```

### 11.2 Heartbeat Flow
```
EA → POST /api/ea/heartbeat → API Server
  → Validate license key (via middleware)
  → Upsert heartbeat data in Redis (real-time state)
  → Push to Redis Stream (for async DB persist)
  → Evaluate risk rules against heartbeat data
  → [Risk OK] → Return: config_hash, kill=false
  → [Risk Breach] → Set kill switch, create risk_event → Return: kill=true
  → Background worker: persist heartbeat to MySQL
```

### 11.3 Subscription Purchase Flow
```
User → Browse Packages → Select Package → POST /api/billing/checkout
  → Create Stripe Checkout Session → Redirect to Stripe
  → User completes payment → Stripe → POST /api/billing/webhook
  → Webhook handler: verify signature, create subscription record
  → Generate license key → Create license record → Associate with user
  → Send confirmation email
  → User sees license in dashboard
```

---

## 12. Release Milestones

### Phase 1: Foundation (Weeks 1-2)
- Monorepo scaffold, Docker Compose setup
- Prisma schema + migrations
- Auth system (register, login, session)
- Basic web app shell

### Phase 2: Core Business Logic (Weeks 3-5)
- Package + billing integration (Stripe)
- License key generation + management
- EA Backend Contract: license validation, heartbeat, config sync
- Trading account linking

### Phase 3: Monitoring & Risk (Weeks 6-7)
- Trade event ingestion + storage
- Metrics reporting + storage
- Risk rules engine
- Kill switch implementation
- Dashboard: performance charts, EA status

### Phase 4: Admin & Polish (Weeks 8-9)
- Admin panel: full CRUD for all entities
- Admin analytics + reports
- Audit logging
- Notification system (email + in-app)
- Rate limiting + security hardening

### Phase 5: EA Contract & Testing (Weeks 10-11)
- MT4 EA starter (MQL4)
- MT5 EA starter (MQL5)
- End-to-end testing
- Load testing
- Security audit

### Phase 6: Launch (Week 12)
- Production deployment
- DNS + SSL
- Monitoring setup (logging, alerts)
- Documentation
- Go live

---

## 13. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| License validation latency (p99) | < 200ms | API monitoring |
| Heartbeat processing latency (p99) | < 300ms | API monitoring |
| Platform uptime | 99.9% | Uptime monitoring |
| Test coverage (business logic) | > 80% | CI reporting |
| Time to first trade (from purchase) | < 10 min | User analytics |
| Admin response to kill switch | < 30 sec | Audit log |
| Monthly churn rate | < 5% | Analytics |

---

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| EA API downtime during trading hours | Medium | Critical | Redundant API servers, Redis cache for license validation, health checks + auto-restart |
| Stripe webhook failures | Medium | High | Webhook retry queue, idempotency keys, manual reconciliation tool |
| License key sharing / piracy | High | High | Account binding, max account limits, heartbeat IP tracking, anomaly detection |
| Database corruption / data loss | Low | Critical | Daily backups, point-in-time recovery, replication |
| Redis cache invalidation issues | Medium | Medium | Cache TTL strategy, explicit invalidation on config changes, cache warm-up on restart |
| Excessive EA API calls | Medium | Medium | Rate limiting per license, Redis-based counter, automatic throttling |
| MT4/MT5 MQL HTTP library limitations | Medium | Medium | EA contract uses simple REST with minimal payload, graceful error handling in EA code |

---

## 15. Glossary

| Term | Definition |
|------|-----------|
| EA | Expert Advisor — automated trading program for MT4/MT5 |
| MT4 | MetaTrader 4 — forex trading platform |
| MT5 | MetaTrader 5 — newer forex/CFD trading platform |
| License Key | Cryptographic token authorizing an EA to run |
| Kill Switch | Emergency stop command that halts EA trading |
| Heartbeat | Periodic signal from EA confirming it's alive |
| Drawdown | Decline from peak equity, expressed as percentage |
| Pip | Smallest price movement unit in forex |
| Strategy | Specific EA trading algorithm/configuration |
| Package | Subscription tier defining features and pricing |
| MRR | Monthly Recurring Revenue |
| LTV | Lifetime Value (of a customer) |

---

*End of PRD v1.0.0*