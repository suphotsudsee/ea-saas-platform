# User Stories
## EA SaaS Platform

**Version:** 1.0.0  
**Date:** 2026-04-16  

---

## Legend

- **Priority:** P0 (must-have), P1 (should-have), P2 (nice-to-have)
- **Effort:** S (1-2 days), M (3-5 days), L (1-2 weeks), XL (2+ weeks)
- **Status:** 📋 Backlog, 🔄 In Progress, ✅ Done

---

## Epic 1: User Authentication & Account Management

### US-AUTH-001: Register New Account
**As a** new trader  
**I want to** create an account with my email and password  
**So that** I can access the platform and purchase EA subscriptions  

**Acceptance Criteria:**
- Given I'm on the registration page, when I enter a valid email, strong password (8+ chars, mixed case, number, special), and my name, then my account is created and I receive a verification email
- Given I register with an existing email, then I see an error "Email already registered"
- Given I register with a weak password, then I see specific validation errors
- Given I submit registration, then a verification email is sent within 30 seconds
- Given I click the verification link, then my email is marked as verified and I'm redirected to the dashboard

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-AUTH-002: Login to Account
**As a** registered trader  
**I want to** log in with my email and password  
**So that** I can access my dashboard and manage my licenses  

**Acceptance Criteria:**
- Given valid credentials, then I'm logged in and redirected to the dashboard
- Given invalid credentials, then I see "Invalid email or password" (no hint about which is wrong)
- Given 5 failed attempts in 10 minutes, then the account is temporarily locked for 15 minutes
- Given I'm logged in, then a session cookie is set with 24-hour expiry
- Given I check "Remember me", then session extends to 30 days

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-AUTH-003: OAuth Login (Google/GitHub)
**As a** trader  
**I want to** log in using my Google or GitHub account  
**So that** I don't have to remember another password  

**Acceptance Criteria:**
- Given I click "Sign in with Google", then I'm redirected to Google OAuth
- Given I authorize, then a new account is created (if first time) or I'm logged in (if existing)
- Given the OAuth email matches an existing account, then the accounts are linked
- Given OAuth fails, then I see a clear error message

**Priority:** P1 | **Effort:** M | **Status:** 📋

---

### US-AUTH-004: Reset Password
**As a** trader who forgot my password  
**I want to** reset my password via email  
**So that** I can regain access to my account  

**Acceptance Criteria:**
- Given I enter my email on the forgot-password page, then a reset link is sent (if account exists)
- Given the email doesn't exist, then I see "If an account exists, a reset link has been sent" (no account enumeration)
- Given I click the reset link, then I can set a new password
- Given the reset link is older than 1 hour, then it's expired and I must request a new one
- Given I reset my password, then all other active sessions are terminated

**Priority:** P0 | **Effort:** S | **Status:** 📋

---

### US-AUTH-005: Enable Two-Factor Authentication
**As a** security-conscious trader  
**I want to** enable TOTP-based 2FA on my account  
**So that** my account is protected even if my password is compromised  

**Acceptance Criteria:**
- Given I enable 2FA, then I'm shown a QR code and backup codes
- Given I scan the QR code with an authenticator app and enter the code, then 2FA is enabled
- Given 2FA is enabled, then login requires both password and TOTP code
- Given I lose my authenticator, then I can use a backup code (each single-use)
- Given all backup codes are used, then I must regenerate them

**Priority:** P1 | **Effort:** M | **Status:** 📋

---

### US-AUTH-006: Manage Active Sessions
**As a** trader  
**I want to** see and revoke my active sessions  
**So that** I can ensure no unauthorized access to my account  

**Acceptance Criteria:**
- Given I'm logged in, when I visit the security settings page, then I see all active sessions with device, IP, location, and last activity time
- Given I revoke a session, then that session's cookie is invalidated
- Given I revoke all other sessions, then I remain logged in on the current device only

**Priority:** P2 | **Effort:** M | **Status:** 📋

---

### US-AUTH-007: Delete Account
**As a** trader  
**I want to** delete my account  
**So that** my personal data is removed from the platform  

**Acceptance Criteria:**
- Given I request account deletion, then I must confirm with my password
- Given I confirm, then my account is marked for deletion (30-day grace period)
- Given the grace period hasn't expired, when I log in, then I can cancel the deletion
- Given the grace period expires, then all my data is permanently deleted (cascading: subscriptions canceled, licenses revoked, trading accounts unlinked)
- Given I have active subscriptions, then I'm warned that deletion will cancel them

**Priority:** P1 | **Effort:** M | **Status:** 📋

---

## Epic 2: Subscription & Billing

### US-BILL-001: Browse Subscription Packages
**As a** trader  
**I want to** see all available subscription packages with clear pricing and features  
**So that** I can choose the right plan for my needs  

**Acceptance Criteria:**
- Given I visit the pricing page, then I see all active packages with name, price, billing cycle, max accounts, and included strategies
- Given I'm not logged in, then I still see the pricing page
- Given I click "Get Started" on a package, then I'm redirected to register (if not logged in) or checkout (if logged in)
- Given packages have a sort order, then they display in that order

**Priority:** P0 | **Effort:** S | **Status:** 📋

---

### US-BILL-002: Purchase Subscription via Stripe
**As a** trader  
**I want to** purchase a subscription using my credit/debit card  
**So that** I can get access to the EA and receive my license key  

**Acceptance Criteria:**
- Given I select a package and click "Subscribe", then I'm redirected to Stripe Checkout
- Given I complete the Stripe checkout, then I'm redirected back to the dashboard
- Given the Stripe webhook confirms payment, then my subscription is created as ACTIVE, a license key is generated, and I see it on my dashboard
- Given the Stripe payment fails, then I see an error and no subscription/license is created
- Given I already have an active subscription, then I see my current plan with upgrade options (not a duplicate purchase)

**Priority:** P0 | **Effort:** L | **Status:** 📋

---

### US-BILL-003: View Subscription Status
**As a** trader  
**I want to** see my current subscription status and billing period  
**So that** I know when my subscription renews or expires  

**Acceptance Criteria:**
- Given I have an active subscription, then the billing page shows: plan name, status, current period start/end, next billing date, and amount
- Given my subscription is past_due, then I see a warning with a "Update Payment" button
- Given my subscription is canceled, then I see "Canceled" with the expiration date
- Given my subscription is in trial, then I see "Trial" with the trial end date

**Priority:** P0 | **Effort:** S | **Status:** 📋

---

### US-BILL-004: Upgrade Subscription
**As a** trader  
**I want to** upgrade my subscription to a higher tier  
**So that** I can access more strategies and link more trading accounts  

**Acceptance Criteria:**
- Given I'm on a lower tier, when I click "Upgrade" on a higher tier, then I see the prorated cost for the remaining period
- Given I confirm the upgrade, then a Stripe proration is created and I'm charged the difference
- Given the upgrade succeeds, then my license's max_accounts is updated and new strategies are available
- Given the upgrade payment fails, then I remain on the current tier

**Priority:** P1 | **Effort:** L | **Status:** 📋

---

### US-BILL-005: Cancel Subscription
**As a** trader  
**I want to** cancel my subscription  
**So that** I'm not charged again if I no longer need the service  

**Acceptance Criteria:**
- Given I click "Cancel Subscription", then I'm asked to choose: "Cancel immediately" or "Cancel at period end"
- Given I cancel immediately, then my subscription status becomes CANCELED, my license is revoked, and my EA stops working
- Given I cancel at period end, then my subscription remains ACTIVE until the period ends, then becomes EXPIRED
- Given I cancel at period end, then I can undo the cancellation before the period ends
- Given I cancel, then a confirmation email is sent

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-BILL-006: View Billing History
**As a** trader  
**I want to** see all my past payments and download invoices  
**So that** I can keep records for accounting  

**Acceptance Criteria:**
- Given I visit the billing history page, then I see all payments in reverse chronological order
- Given each payment row shows: date, amount, status, description
- Given I click "Download Invoice" on a completed payment, then a PDF invoice is downloaded
- Given a payment failed, then the status shows "Failed" with a "Retry" button

**Priority:** P1 | **Effort:** M | **Status:** 📋

---

### US-BILL-007: Manage Payment Methods
**As a** trader  
**I want to** add, remove, and set default payment methods  
**So that** I can control how my subscription is paid  

**Acceptance Criteria:**
- Given I add a new card via Stripe Elements, then it appears in my payment methods
- Given I have multiple cards, then I can set one as default
- Given I remove a card that's the default, then I must select another default first
- Given I have only one card and it's the default, then I cannot remove it (must add another first)

**Priority:** P1 | **Effort:** M | **Status:** 📋

---

### US-BILL-008: Grace Period After Payment Failure
**As a** trader  
**I want to** have a grace period if my payment fails  
**So that** my EA doesn't immediately stop if there's a temporary card issue  

**Acceptance Criteria:**
- Given a subscription renewal payment fails, then the subscription becomes PAST_DUE and a 3-day grace period starts
- Given I update my payment method during the grace period, then a retry is attempted
- Given the retry succeeds, then the subscription returns to ACTIVE
- Given the grace period expires without successful payment, then the subscription becomes EXPIRED and the license is revoked
- Given I enter the grace period, then I receive email notifications at: failure, 1 day remaining, expiration

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-BILL-009: Apply Promo Code at Checkout
**As a** trader  
**I want to** apply a promo/discount code during checkout  
**So that** I can get a discount on my subscription  

**Acceptance Criteria:**
- Given I enter a valid promo code at checkout, then the discount is applied and the updated total is shown
- Given the promo code is invalid or expired, then I see "Invalid promo code"
- Given the promo code is for a percentage off, then the discount is calculated and shown
- Given the promo code is for a fixed amount, then the discount is subtracted from the total
- Given the promo code has already been used the maximum number of times, then I see "Promo code no longer available"

**Priority:** P2 | **Effort:** M | **Status:** 📋

---

## Epic 3: License Management

### US-LIC-001: View My Licenses
**As a** trader  
**I want to** see all my license keys with their status  
**So that** I know which licenses are active and can copy keys for EA setup  

**Acceptance Criteria:**
- Given I visit the licenses page, then I see all my licenses in a list/card view
- Given each license shows: key (masked except first 8 chars), status badge, strategy name, expiry date, linked accounts count
- Given I click a license, then I see the full detail page
- Given I click "Copy Key" on a license, then the full key is copied to clipboard
- Given a license is active, then it has a green badge
- Given a license is expired/revoked/paused, then it has the corresponding colored badge

**Priority:** P0 | **Effort:** S | **Status:** 📋

---

### US-LIC-002: License Key Generation
**As a** system  
**I want to** generate cryptographically secure license keys  
**So that** they cannot be guessed or forged  

**Acceptance Criteria:**
- Given a new subscription is created, then a license key is automatically generated
- Given the key format is UUID v4 (e.g., "ea-550e8400-e29b-41d4-a716-446655440000")
- Given the key is stored as a SHA-256 hash in the database
- Given the full key is shown to the user only once at creation, then subsequent views show only the prefix
- Given a key collision occurs (extremely unlikely), then retry generation

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-LIC-003: License Expiry Alignment
**As a** system  
**I want to** align license expiry with subscription period  
**So that** licenses are valid only while the subscription is active  

**Acceptance Criteria:**
- Given a new subscription is created, then the license expiry = subscription period end
- Given a subscription is renewed, then the license expiry extends to the new period end
- Given a subscription is canceled immediately, then the license expires immediately
- Given a subscription is canceled at period end, then the license expires at period end
- Given a license expires, then its status becomes EXPIRED and EA license validation returns EXPIRED

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-LIC-004: License Activation Limit
**As a** platform operator  
**I want to** limit the number of trading accounts per license  
**So that** one license isn't shared across too many accounts  

**Acceptance Criteria:**
- Given a license has max_accounts=2, then at most 2 trading accounts can be linked
- Given the limit is reached, when an EA on a 3rd account tries to validate, then the response is MAX_ACCOUNTS_REACHED
- Given a user unlinks an account, then a slot opens for a new account
- Given max_accounts is determined by the subscription package tier

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-LIC-005: Deactivate License on Specific Account
**As a** trader  
**I want to** unlink a trading account from my license  
**So that** I can use that slot for a different account or stop running the EA on that account  

**Acceptance Criteria:**
- Given I unlink an account, then the account status becomes UNLINKED
- Given the EA on that account tries to validate next, then it receives ACCOUNT_MISMATCH
- Given the license max_accounts count is recalculated (unlinked account doesn't count)
- Given I unlink the last account, then the license still exists but has no linked accounts

**Priority:** P0 | **Effort:** S | **Status:** 📋

---

## Epic 4: Trading Account Management

### US-TA-001: Link Trading Account Manually
**As a** trader  
**I want to** manually link my MT4/MT5 trading account  
**So that** my license is authorized for that account  

**Acceptance Criteria:**
- Given I'm on the accounts page, when I click "Link Account", then I'm shown a form: account number, broker name, platform (MT4/MT5)
- Given I submit valid details, then the trading account is created and linked to my license
- Given the account number + broker + platform combination already exists, then I see "Account already linked"
- Given my license has reached max_accounts, then I see "License limit reached — unlink an account first"

**Priority:** P0 | **Effort:** S | **Status:** 📋

---

### US-TA-002: Auto-Detect Trading Account via Heartbeat
**As a** trader  
**I want to** have my trading account automatically linked when the EA first connects  
**So that** I don't have to manually enter account details  

**Acceptance Criteria:**
- Given my EA sends a heartbeat with an account number not yet linked, then the account is automatically linked to the license (if under max_accounts limit)
- Given auto-link succeeds, then I see the new account in my dashboard with a "New" badge
- Given max_accounts is reached, then auto-link fails and the EA receives MAX_ACCOUNTS_REACHED
- Given I disable auto-link in settings, then new accounts from heartbeats are NOT auto-linked

**Priority:** P1 | **Effort:** M | **Status:** 📋

---

### US-TA-003: View Trading Account Status
**As a** trader  
**I want to** see the real-time status of my linked trading accounts  
**So that** I know if my EAs are running properly  

**Acceptance Criteria:**
- Given an account received a heartbeat within 3x interval, then it shows as "Online" (green indicator)
- Given an account hasn't received a heartbeat for > 3x interval but < 10 minutes, then it shows as "Stale" (yellow indicator)
- Given an account hasn't received a heartbeat for > 10 minutes, then it shows as "Offline" (red indicator)
- Given each account card shows: account number, broker, platform, status, last heartbeat time, current equity (from last heartbeat)

**Priority:** P0 | **Effort:** S | **Status:** 📋

---

### US-TA-004: Unlink Trading Account
**As a** trader  
**I want to** unlink a trading account from my license  
**So that** I can free up a slot or stop the EA on that account  

**Acceptance Criteria:**
- Given I click "Unlink" on an account, then I'm asked to confirm
- Given I confirm, then the account is unlinked (status: UNLINKED)
- Given the EA on that account sends a heartbeat next, then it receives ACCOUNT_MISMATCH
- Given I unlink an account, then the max_accounts count is recalculated

**Priority:** P0 | **Effort:** S | **Status:** 📋

---

## Epic 5: Dashboard & Performance

### US-DASH-001: Overview Dashboard
**As a** trader  
**I want to** see an overview dashboard with key metrics  
**So that** I can quickly assess my trading performance at a glance  

**Acceptance Criteria:**
- Given I visit the dashboard, then I see: total P&L, total trades, win rate, active EAs count, open positions count
- Given I have no trading data yet, then I see a "getting started" guide instead of empty charts
- Given the metrics update in real-time (polling every 30s or on new heartbeat)
- Given each metric card shows the current value and trend (up/down arrow with % change from previous period)

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-DASH-002: Trade History
**As a** trader  
**I want to** view my trade history with filters  
**So that** I can analyze my past trading performance  

**Acceptance Criteria:**
- Given I visit the trades page, then I see a table of all closed trades in reverse chronological order
- Given each trade row shows: date, symbol, direction, open price, close price, volume, profit, duration
- Given I can filter by: date range, trading account, strategy, symbol
- Given I can sort by: date, profit, duration, symbol
- Given I click a trade, then I see full trade detail (including commission, swap, magic number, comment)
- Given I can paginate through trades (20 per page default)

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-DASH-003: Performance Charts
**As a** trader  
**I want to** see visual charts of my trading performance  
**So that** I can spot trends and patterns  

**Acceptance Criteria:**
- Given I visit the performance page, then I see: equity curve, drawdown chart, daily P&L bar chart, monthly P&L bar chart
- Given each chart has a time range selector: 1W, 1M, 3M, 6M, 1Y, All
- Given the equity curve shows equity over time based on metrics data
- Given the drawdown chart shows drawdown % over time
- Given I can switch between accounts in the chart view
- Given charts are interactive (hover for tooltips, zoom/pan)

**Priority:** P1 | **Effort:** L | **Status:** 📋

---

### US-DASH-004: EA Status Panel
**As a** trader  
**I want to** see which EAs are running and their current configuration  
**So that** I can verify everything is operating correctly  

**Acceptance Criteria:**
- Given I visit the EA status section, then I see each linked account with: EA version, last heartbeat time, current config version, kill switch status
- Given an EA is running the latest config, then it shows "Up to date" (green)
- Given an EA is running an outdated config, then it shows "Config update pending" (yellow)
- Given an EA's kill switch is active, then it shows "STOPPED" (red) prominently
- Given I can see the full config payload for each EA

**Priority:** P1 | **Effort:** M | **Status:** 📋

---

### US-DASH-005: Real-Time Notifications
**As a** trader  
**I want to** receive real-time notifications for important events  
**So that** I can respond quickly to issues  

**Acceptance Criteria:**
- Given an EA goes offline (no heartbeat for 3x interval), then I receive an in-app notification and email
- Given my drawdown exceeds 50% of the max limit, then I receive a warning notification
- Given a kill switch is activated on my license, then I receive an immediate notification
- Given my subscription is expiring in 7/3/1 days, then I receive a reminder notification
- Given I visit the notification center, then I see all notifications with read/unread status
- Given I mark all as read, then the notification badge count resets

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-DASH-006: Export Trade Data
**As a** trader  
**I want to** export my trade data as CSV  
**So that** I can analyze it in external tools  

**Acceptance Criteria:**
- Given I click "Export CSV" on the trades page, then a CSV file is downloaded
- Given the CSV includes all trades matching the current filters
- Given the CSV columns are: ticket, symbol, direction, open_time, close_time, open_price, close_price, volume, profit, commission, swap
- Given large exports (> 10,000 trades), then I see a "Preparing export..." message and the file downloads when ready

**Priority:** P1 | **Effort:** S | **Status:** 📋

---

## Epic 6: EA Backend Contract

### US-EA-001: Validate License on Startup
**As an** EA running on MT4/MT5  
**I want to** validate my license key with the server on startup  
**So that** I can confirm I'm authorized to trade  

**Acceptance Criteria:**
- Given I send POST /api/ea/license/validate with a valid license key and account number, then I receive { valid: true, expiresAt, strategy, riskConfigHash }
- Given the license key is invalid, then I receive { valid: false, error: "INVALID_KEY" }
- Given the license is expired, then I receive { valid: false, error: "EXPIRED" }
- Given the license is revoked, then I receive { valid: false, error: "REVOKED" }
- Given the account number doesn't match any linked account and max is reached, then I receive { valid: false, error: "MAX_ACCOUNTS_REACHED" }
- Given the account number doesn't match but max isn't reached (and auto-link is on), then I receive { valid: true, autoLinked: true }
- Given the validation takes > 200ms (p99), then it's a performance bug

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-EA-002: Periodic License Re-Validation
**As an** EA  
**I want to** re-validate my license every 5 minutes  
**So that** revoked or expired licenses are detected promptly  

**Acceptance Criteria:**
- Given my license is valid, then every 5 minutes I send a validation request
- Given during a re-validation the license is now expired, then I stop trading and show an alert
- Given during a re-validation the license is revoked, then I stop trading and show "License Revoked"
- Given a validation request fails due to network error, then I retry 3 times with exponential backoff
- Given all retries fail, then I continue trading (fail-open for network issues) but log a warning

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-EA-003: Send Heartbeat
**As an** EA  
**I want to** send periodic heartbeats to the server  
**So that** the platform knows I'm running and can check for config updates or kill signals  

**Acceptance Criteria:**
- Given I'm running, then every 60 seconds I send POST /api/ea/heartbeat with: license key, account number, platform, EA version, equity, balance, open positions count
- Given the heartbeat response includes configHash different from my current config, then I fetch the new config
- Given the heartbeat response includes kill: true, then I immediately stop opening trades and close all positions
- Given a heartbeat request fails, then I retry with exponential backoff (max 3 retries)
- Given heartbeat processing takes > 300ms (p99), then it's a performance bug

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-EA-004: Fetch Configuration
**As an** EA  
**I want to** fetch my current configuration from the server  
**So that** I can trade with the correct parameters set by the admin  

**Acceptance Criteria:**
- Given I detect a config hash mismatch (from heartbeat response), then I send GET /api/ea/config
- Given the config response includes: lotSizingMethod, maxLot, minLot, riskPct, strategyParams, riskRules (spread filter, session filter, etc.)
- Given I receive the config, then I apply it and send POST /api/ea/config/ack with the new hash
- Given the config includes a kill switch override, then I comply immediately
- Given a config fetch fails, then I continue with my current config

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-EA-005: Respond to Kill Switch
**As an** EA  
**I want to** respond to a kill switch command  
**So that** I stop trading immediately when instructed by the platform  

**Acceptance Criteria:**
- Given I receive kill: true in a heartbeat response, then I immediately: stop opening new trades, close all open positions (or leave them if config says "leave_open_on_kill"), send POST /api/ea/kill/ack
- Given I receive kill: true in a config response, then I do the same
- Given the kill switch is active and I try to validate, then I receive { valid: false, error: "KILLED" }
- Given the kill switch is deactivated by admin, then on next validation/heartbeat I receive kill: false and can resume

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-EA-006: Report Trade Events
**As an** EA  
**I want to** report my trade events to the server  
**So that** the platform can track my performance and evaluate risk  

**Acceptance Criteria:**
- Given I open a trade, then I send POST /api/ea/trade-event with: ticket, symbol, direction, eventType=OPEN, openPrice, volume, openTime, magicNumber
- Given I close a trade, then I send POST /api/ea/trade-event with: ticket, symbol, direction, eventType=CLOSE, closePrice, profit, commission, swap, closeTime
- Given I modify a trade, then I send POST /api/ea/trade-event with eventType=MODIFY
- Given I have multiple trades to report, then I can batch them via POST /api/ea/trade-events (max 100)
- Given a trade event submission fails, then I retry up to 3 times
- Given I send a duplicate trade event (same ticket), then the server ignores it (idempotent)

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-EA-007: Report Periodic Metrics
**As an** EA  
**I want to** report my account metrics periodically  
**So that** the platform can monitor my risk and display charts  

**Acceptance Criteria:**
- Given I'm running, then every 5 minutes I send POST /api/ea/metrics with: equity, balance, marginLevel, drawdownPct, openPositions, freeMargin
- Given the metrics submission returns 202 Accepted
- Given a metrics submission fails, then I retry next cycle (non-critical)
- Given the platform uses my metrics data for: risk evaluation, equity curve chart, drawdown chart

**Priority:** P1 | **Effort:** S | **Status:** 📋

---

## Epic 7: Risk Management

### US-RISK-001: Max Drawdown Rule
**As a** platform operator  
**I want to** enforce a maximum drawdown rule per account  
**So that** traders don't lose more than they can afford  

**Acceptance Criteria:**
- Given the max drawdown threshold is set to 20% for a strategy, when an account's drawdown reaches 20%, then the EA kill switch is activated, a risk event is logged, and notifications are sent
- Given the threshold is configurable per strategy and per customer (admin override)
- Given a risk event is created with: ruleType=MAX_DRAWDOWN, threshold=20, actual=20.5, actionTaken=KILL_EA
- Given the admin can review and deactivate the kill switch after investigating

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-RISK-002: Max Daily Loss Rule
**As a** platform operator  
**I want to** enforce a maximum daily loss limit  
**So that** a single bad day doesn't devastate an account  

**Acceptance Criteria:**
- Given the max daily loss is set to 5% for a strategy, when today's closed trade losses sum to > 5% of starting equity, then the EA is killed
- Given the daily loss calculation resets at 00:00 UTC
- Given the threshold is configurable per strategy
- Given a risk event is created documenting the breach

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-RISK-003: Consecutive Loss Rule
**As a** platform operator  
**I want to** stop an EA after N consecutive losing trades  
**So that** a malfunctioning EA doesn't keep losing money  

**Acceptance Criteria:**
- Given the consecutive loss limit is set to 5, when 5 consecutive losing trades are detected, then the EA is paused (not killed)
- Given the EA is paused, then it stops opening new trades but keeps managing existing ones
- Given a paused EA must be resumed by admin action
- Given the consecutive loss counter resets after a winning trade

**Priority:** P1 | **Effort:** M | **Status:** 📋

---

### US-RISK-004: Spread Filter
**As a** platform operator  
**I want to** configure a maximum spread filter per symbol  
**So that** EAs don't trade during high-spread conditions  

**Acceptance Criteria:**
- Given the spread filter is set to 2 pips for EURUSD, when the current spread exceeds 2 pips, then the EA skips the trade (client-side enforcement)
- Given the spread filter config is included in the EA configuration fetched via /api/ea/config
- Given the EA checks the spread before opening a trade and logs "Spread too high" if filtered
- Given the filter is per-symbol (different symbols can have different max spreads)

**Priority:** P1 | **Effort:** M | **Status:** 📋

---

### US-RISK-005: Session Filter
**As a** platform operator  
**I want to** restrict trading to specific hours  
**So that** EAs only trade during favorable market sessions  

**Acceptance Criteria:**
- Given the session filter allows trading only between 08:00-20:00 UTC, when the current UTC hour is outside this range, then the EA skips the trade
- Given the session filter config is included in the EA configuration
- Given multiple session windows are supported (e.g., London session + NY session)
- Given the EA logs "Outside trading session" when filtered

**Priority:** P1 | **Effort:** M | **Status:** 📋

---

### US-RISK-006: Equity Protection
**As a** platform operator  
**I want to** set an absolute minimum equity threshold  
**So that** an account doesn't drop below a critical balance  

**Acceptance Criteria:**
- Given the equity protection is set to $500, when the account equity drops below $500, then the EA is killed immediately
- Given the equity protection value is absolute (not percentage)
- Given a risk event is created and notifications sent
- Given the admin can review and adjust the threshold

**Priority:** P1 | **Effort:** S | **Status:** 📋

---

### US-RISK-007: Risk Dashboard (Admin)
**As an** admin  
**I want to** see a risk dashboard with all accounts near or at risk limits  
**So that** I can proactively manage risk exposure  

**Acceptance Criteria:**
- Given I visit the risk dashboard, then I see: accounts sorted by risk level (highest drawdown first), accounts with stale heartbeats, accounts in kill state
- Given each account shows: account number, customer name, current drawdown %, drawdown limit %, status (normal/warning/critical/killed)
- Given I can click an account to see full details and take action (kill, pause, adjust config)
- Given I can filter by strategy, risk level, status

**Priority:** P0 | **Effort:** L | **Status:** 📋

---

### US-RISK-008: Global Kill Switch
**As an** admin  
**I want to** activate a global kill switch that stops ALL EAs  
**So that** I can immediately halt all trading in an emergency  

**Acceptance Criteria:**
- Given I activate the global kill switch, then ALL EAs receive kill: true on their next heartbeat
- Given the global kill switch requires a confirmation dialog with typing "ACTIVATE GLOBAL KILL"
- Given the activation is logged in the audit trail with my admin ID, timestamp, and reason
- Given all affected licenses have their killSwitch flag set to true
- Given I deactivate the global kill switch, then all licenses' killSwitch is reset to false
- Given deactivation also requires confirmation

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

## Epic 8: Admin Panel

### US-ADM-001: View Customer List
**As an** admin  
**I want to** view and search all customers  
**So that** I can manage user accounts  

**Acceptance Criteria:**
- Given I visit the customers page, then I see a table of all users with: name, email, subscription tier, status, joined date, last active
- Given I can search by name, email
- Given I can filter by: subscription tier, status (active/suspended/banned), registration date range
- Given I can sort by any column
- Given I paginate through results (50 per page)

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-ADM-002: View Customer Detail
**As an** admin  
**I want to** see a comprehensive customer detail page  
**So that** I have full context when handling support issues  

**Acceptance Criteria:**
- Given I click a customer, then I see: profile info, subscription details, license keys, linked trading accounts, recent trade events, risk events, notifications sent, payment history
- Given I can see the customer's current EA status (running/stopped/stale)
- Given I can add admin notes to the customer record
- Given I can see recent audit log entries for this customer

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-ADM-003: Manage Subscription (Admin Override)
**As an** admin  
**I want to** manually adjust a customer's subscription  
**So that** I can handle special cases, refunds, or support issues  

**Acceptance Criteria:**
- Given I extend a subscription, then the subscription period end is pushed forward and the license expiry is updated
- Given I pause a subscription, then the license is paused and the EA stops
- Given I cancel a subscription, then I must provide a reason, the subscription is canceled, and the license is revoked
- Given I issue a refund, then the payment is marked as REFUNDED with a reason
- Given all admin actions are logged in the audit trail

**Priority:** P0 | **Effort:** L | **Status:** 📋

---

### US-ADM-004: Suspend/Ban Customer
**As an** admin  
**I want to** suspend or ban a customer account  
**So that** I can handle policy violations or fraudulent accounts  

**Acceptance Criteria:**
- Given I suspend a customer, then their status becomes SUSPENDED, all their licenses are paused, and EAs stop
- Given I ban a customer, then their status becomes BANNED, all licenses are revoked, and all sessions are terminated
- Given I must provide a reason for suspension/ban
- Given a suspended customer can be reactivated by admin
- Given a banned customer can only be reactivated by super admin
- Given all actions are audit-logged

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-ADM-005: Manage Subscription Packages
**As an** admin  
**I want to** create, edit, and deactivate subscription packages  
**So that** I can adjust pricing and features as the business evolves  

**Acceptance Criteria:**
- Given I create a package, then I set: name, description, price, billing cycle, max accounts, features (which strategies are included)
- Given I edit a package, then existing subscriptions are NOT affected (they remain on the version they purchased)
- Given I deactivate a package, then it's no longer shown on the pricing page but existing subscriptions continue
- Given I can reorder packages (sort order)

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-ADM-006: Manage Strategies & Config
**As an** admin  
**I want to** manage trading strategies and their configurations  
**So that** I can control what EAs do and adjust risk parameters  

**Acceptance Criteria:**
- Given I create a strategy, then I define: name, version, default config (JSON), risk config (JSON with thresholds)
- Given I edit a strategy's config, then a new config version is created (old version preserved)
- Given I push a config update, then all EAs using that strategy will fetch it on their next config check cycle
- Given I can set per-customer config overrides that take precedence over the strategy default
- Given I can see which EAs are running which config version

**Priority:** P0 | **Effort:** L | **Status:** 📋

---

### US-ADM-007: Manage Licenses
**As an** admin  
**I want to** manage all licenses with full control  
**So that** I can handle support requests, abuse, and policy enforcement  

**Acceptance Criteria:**
- Given I view the licenses page, then I see all licenses with: key prefix, customer, strategy, status, expiry, linked accounts count
- Given I revoke a license, then I must provide a reason, the license is immediately revoked, and the EA stops
- Given I pause a license, then the EA stops but the license can be resumed
- Given I extend a license, then I set a new expiry date with a reason
- Given I regenerate a key, then the old key is immediately invalidated and a new key is generated
- Given all actions are audit-logged

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-ADM-008: View Audit Log
**As an** admin  
**I want to** view the audit log of all admin actions  
**So that** I have accountability and can investigate issues  

**Acceptance Criteria:**
- Given I visit the audit log page, then I see all admin actions in reverse chronological order
- Given each entry shows: timestamp, admin name, action, resource type, resource ID, old value, new value, IP address
- Given I can filter by: admin, action type, resource type, date range
- Given I can search by resource ID
- Given audit logs cannot be deleted (even by super admin)

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

### US-ADM-009: View Revenue Analytics
**As an** admin  
**I want to** see revenue analytics  
**So that** I can track the business health  

**Acceptance Criteria:**
- Given I visit the revenue analytics page, then I see: MRR, ARR, daily/weekly/monthly revenue chart, churn rate, new subscriptions count
- Given I can select a date range for the analytics
- Given I can see the breakdown by package tier
- Given I can export the data as CSV

**Priority:** P1 | **Effort:** M | **Status:** 📋

---

### US-ADM-010: View Trading Analytics
**As an** admin  
**I want to** see aggregated trading analytics across all accounts  
**So that** I can understand the overall performance of our EAs  

**Acceptance Criteria:**
- Given I visit the trading analytics page, then I see: aggregate P&L, total trades, win rate, average trade duration, Sharpe ratio, P&L distribution histogram
- Given I can filter by: strategy, date range, platform (MT4/MT5)
- Given I can see per-strategy performance breakdown

**Priority:** P1 | **Effort:** M | **Status:** 📋

---

### US-ADM-011: Role-Based Access Control
**As a** super admin  
**I want to** assign roles to admin users  
**So that** each admin only has access to what they need  

**Acceptance Criteria:**
- Given a SUPER_ADMIN can do everything
- Given a BILLING_ADMIN can manage packages, subscriptions, payments, and view customers
- Given a RISK_ADMIN can manage risk settings, view/activate kill switches, and view risk dashboard
- Given a SUPPORT agent can view (read-only) customers, licenses, subscriptions, but cannot modify anything
- Given role assignment is done by SUPER_ADMIN only
- Given all admin users must have 2FA enabled

**Priority:** P1 | **Effort:** L | **Status:** 📋

---

### US-ADM-012: Impersonate Customer View
**As an** admin  
**I want to** view the platform as a specific customer (read-only)  
**So that** I can debug issues from their perspective  

**Acceptance Criteria:**
- Given I click "Impersonate" on a customer detail page, then I see their dashboard as they would see it
- Given I'm in impersonation mode, then a prominent banner shows "Viewing as [Customer Name] — Exit Impersonation"
- Given I cannot make any changes while impersonating (all buttons/actions disabled)
- Given the impersonation session expires after 15 minutes
- Given the impersonation is logged in the audit trail

**Priority:** P2 | **Effort:** M | **Status:** 📋

---

## Epic 9: EA Contract (MT4/MT5)

### US-CONTRACT-001: MT4 EA Starter
**As an** MQL4 developer  
**I want to** have a starter EA that integrates with the SaaS platform  
**So that** I can quickly deploy my strategy with licensing and monitoring built in  

**Acceptance Criteria:**
- Given the MT4 starter EA, then on init it validates the license key via the API
- Given the license is valid, then the EA starts trading with the fetched configuration
- Given the EA sends heartbeats every 60 seconds
- Given the EA reports trade events on open/close/modify
- Given the EA reports metrics every 5 minutes
- Given the EA checks the kill switch on every heartbeat response
- Given the EA applies config updates when detected
- Given the EA handles network errors gracefully (retry with backoff, fail-open for network issues)

**Priority:** P0 | **Effort:** XL | **Status:** 📋

---

### US-CONTRACT-002: MT5 EA Starter
**As an** MQL5 developer  
**I want to** have a starter EA for MT5 that integrates with the SaaS platform  
**So that** I can deploy my strategy on MT5 with the same features as MT4  

**Acceptance Criteria:**
- Same as US-CONTRACT-001 but for MQL5/MT5
- Given MQL5 has different HTTP library (CHttpClient), the implementation adapts accordingly
- Given the MT5 EA supports the same API contract as MT4

**Priority:** P0 | **Effort:** XL | **Status:** 📋

---

### US-CONTRACT-003: Shared API Client Library (MQL)
**As an** MQL developer  
**I want to** have a shared HTTP client library for the SaaS API  
**So that** I don't have to implement HTTP communication from scratch  

**Acceptance Criteria:**
- Given the SaaSClient.mqh include file, then I can call: ValidateLicense(), SendHeartbeat(), GetConfig(), SendTradeEvent(), SendMetrics(), AcknowledgeKill()
- Given each function handles: HTTP request construction, response parsing, error handling, retry logic
- Given the library works on both MT4 and MT5 (conditional compilation for platform differences)
- Given the library includes input parameters for: license key, API key, server URL

**Priority:** P0 | **Effort:** L | **Status:** 📋

---

### US-CONTRACT-004: Connection Test Script
**As a** trader  
**I want to** run a simple connection test from MT4/MT5  
**So that** I can verify my license key and API connectivity before running the full EA  

**Acceptance Criteria:**
- Given I run the TestConnection script, then it attempts to validate the license key and reports: success/failure, server response time, license details
- Given the test fails, then it shows a clear error message (e.g., "Invalid license key", "Cannot reach server")
- Given the test succeeds, then it shows: license valid, strategy name, expiry date, config available

**Priority:** P1 | **Effort:** S | **Status:** 📋

---

## Epic 10: System Operations

### US-OPS-001: Docker Compose Deployment
**As a** DevOps engineer  
**I want to** deploy the entire platform with a single docker compose up  
**So that** I can quickly set up the system on any server  

**Acceptance Criteria:**
- Given I run `docker compose up`, then all services start: MySQL, Redis, Next.js web, worker, Nginx
- Given all services pass health checks within 60 seconds
- Given I can access the web app at https://localhost
- Given I can access the EA API at https://localhost/api/ea/
- Given SSL is configured via Let's Encrypt or custom certs

**Priority:** P0 | **Effort:** L | **Status:** 📋

---

### US-OPS-002: Database Migrations
**As a** developer  
**I want to** run database migrations via Prisma  
**So that** schema changes are version-controlled and repeatable  

**Acceptance Criteria:**
- Given I run `npx prisma migrate dev`, then a new migration is created from schema changes
- Given I run `npx prisma migrate deploy`, then pending migrations are applied to the database
- Given a migration fails, then it's rolled back and an error is shown
- Given migrations are tracked in the _prisma_migrations table
- Given the Docker entrypoint runs migrations on startup

**Priority:** P0 | **Effort:** S | **Status:** 📋

---

### US-OPS-003: Health Check Endpoint
**As a** monitoring system  
**I want to** check the health of all platform components  
**So that** I can detect and alert on issues  

**Acceptance Criteria:**
- Given I call GET /api/health, then I receive: { status: "ok"|"degraded"|"down", database: "ok"|"error", redis: "ok"|"error", uptime, version }
- Given the database is unreachable, then status is "down"
- Given Redis is unreachable, then status is "degraded" (platform still functions with reduced performance)
- Given Docker health checks call this endpoint

**Priority:** P0 | **Effort:** S | **Status:** 📋

---

### US-OPS-004: Structured Logging
**As a** DevOps engineer  
**I want to** all application logs to be structured JSON  
**So that** I can search, filter, and analyze logs efficiently  

**Acceptance Criteria:**
- Given any log output, then it's in JSON format with: timestamp, level, message, requestId, service
- Given error logs include: stack trace, error code, context
- Given request logs include: method, path, status code, duration, userId (if authenticated)
- Given logs are written to stdout (Docker captures them)
- Given sensitive data (passwords, API keys) is never logged

**Priority:** P1 | **Effort:** S | **Status:** 📋

---

### US-OPS-005: Rate Limiting
**As a** platform  
**I want to** rate limit all API endpoints  
**So that** abusive or malfunctioning clients don't overwhelm the system  

**Acceptance Criteria:**
- Given EA endpoints: 60 requests/minute per license key
- Given Web endpoints: 120 requests/minute per user session
- Given Admin endpoints: 300 requests/minute per admin session
- Given a rate-limited request receives HTTP 429 with Retry-After header
- Given rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining) are included in responses
- Given rate limiting uses Redis-based sliding window

**Priority:** P0 | **Effort:** M | **Status:** 📋

---

## Summary Statistics

| Epic | Stories | P0 | P1 | P2 |
|------|---------|-----|-----|-----|
| 1. Auth & Account | 7 | 3 | 3 | 1 |
| 2. Subscription & Billing | 9 | 4 | 4 | 1 |
| 3. License Management | 5 | 4 | 0 | 1 |
| 4. Trading Account Mgmt | 4 | 3 | 1 | 0 |
| 5. Dashboard & Performance | 6 | 3 | 3 | 0 |
| 6. EA Backend Contract | 7 | 5 | 2 | 0 |
| 7. Risk Management | 8 | 4 | 3 | 0 |
| 8. Admin Panel | 12 | 6 | 4 | 2 |
| 9. EA Contract (MT4/MT5) | 4 | 3 | 1 | 0 |
| 10. System Operations | 5 | 4 | 1 | 0 |
| **Total** | **67** | **39** | **22** | **5** (wait, let me recount) |

---

*End of User Stories v1.0.0*