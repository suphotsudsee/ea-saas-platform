# TradeCandle Production Implementation Plan

**Date:** 2026-05-01
**Target:** Production-ready SaaS on Hostinger shared hosting at tradecandle.net
**Stack:** Next.js Static Export + PHP API + MySQL (LiteSpeed)
**Repository:** `/home/suphot/ea-saas-platform` (local WSL)
**Deploy target:** `/home/u175893330/domains/tradecandle.net/public_html/` (Hostinger)

---

## Task Dependency Graph

```
                    ┌────────────────────────────────────────────┐
                    │          WORKSTREAM A: PHP API Core        │
                    │          (Fix register + complete stubs)   │
                    └───────────────┬────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ WORKSTREAM B:     │   │ WORKSTREAM C:     │   │ WORKSTREAM D:     │
│ Payment Flow      │   │ EA Contract API   │   │ Dashboard Data    │
│ (USDT deposits)   │   │ (heartbeat/       │   │ (real queries)    │
│                   │   │  validate/sync)   │   │                   │
└────────┬──────────┘   └────────┬──────────┘   └────────┬──────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────────────────────┐
                    │          WORKSTREAM E: Frontend Polish      │
                    │          (error handling, UX, auth guard)   │
                    └────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────────────────────┐
                    │          WORKSTREAM F: Build & Deploy       │
                    │          (Next.js build, deploy to Hostinger)│
                    └────────────────────────────────────────────┘
```

**Parallelizable:** Workstreams B, C, D can run in parallel after A is complete.
**Sequential:** E depends on B+C+D. F depends on E.

---

## ═══════════════════════════════════════════════════════════════
## WORKSTREAM A: PHP API Core — Fix Registration + Complete Stubs
## ═══════════════════════════════════════════════════════════════

### Task A1: Fix Registration API SQL Bug
**File:** `public/api/auth/register.php`
**Problem:** Line 33-34 uses a double-quoted PHP string with `\`key\`` — MariaDB receives literal `\`` instead of escaping the backtick. This causes SQL syntax error 500 when inserting licenses.
**Also:** On line 50, `$db->prepare(...)->execute(...)->fetch()` chains incorrectly — `execute()` returns bool, not statement. Must separate.

**Actions:**
1. Change line 33-34 from:
```php
$db->prepare('INSERT INTO users (id, email, passwordHash, name, role, status, emailVerified, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)')
   ->execute([$userId, $email, $passwordHash, $name ?: 'Trader', 'TRADER', 'ACTIVE', $now, $now, $now]);
```
   To use proper chaining with try/catch. Note: this is already single-quoted so it's fine. The real bug is a different file — let me re-check.

**Actually re-read register.php:** The file at `public/api/auth/register.php` looks fine at line 33-34. It uses single-quoted strings. The reported bug about `\`key\`` with PHP double-quoted strings is likely in the **seed.sql** or a **different API file**. Let me check all PHP files for `\`key\`` pattern.

**Search:** `\`key\`` in all PHP files under `public/api/`. If found, fix the escaping by using single-quoted SQL strings or parameterized queries.

**Verification:** POST to `/api/auth/register.php` with `{"email":"test@test.com","password":"Test1234!","name":"Test"}` should return 200 with user object and token.

---

### Task A2: Fix Subscriptions Endpoint for Stripe Columns
**File:** `public/api/subscriptions/list.php`
**Problem:** This serves packages, but calls itself `subscriptions/list`. The frontend expects `packages` in response. Works but uses try/catch on MySQL which hides errors.
**Action:** Rename semantically — keep file at `subscriptions/list.php` but make it robust:
1. Remove the try/catch that silently swallows errors
2. Keep the JSON fallback if DB fails
3. Ensure `PACKAGES_FILE` constant is defined in config.php or use inline path

**Verification:** GET `/api/subscriptions/list` returns `{"packages":[{...}]}` with all 4 packages.

---

### Task A3: Create `packages/list.php` Endpoint
**File:** `public/api/packages/list.php` (NEW)
**Purpose:** Public endpoint listing active packages.
**Implementation:**
```php
<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json');
$db = getDB();
$packages = $db->query('SELECT * FROM packages WHERE isActive = 1 ORDER BY sortOrder ASC')->fetchAll();
echo json_encode(['packages' => $packages]);
```
**Verification:** GET `/api/packages/list` returns active packages.

---

### Task A4: Complete Payment History Endpoint
**File:** `public/api/payments/history.php`
**Current state:** Returns `{"payments":[]}` (hardcoded empty).
**Action:** Replace stub with real MySQL query:
```php
$db = getDB();
$stmt = $db->prepare('SELECT * FROM payments WHERE userId = ? ORDER BY createdAt DESC LIMIT 50');
$stmt->execute([$user['id']]);
$payments = $stmt->fetchAll();
jsonSuccess(['payments' => $payments]);
```
**Verification:** GET `/api/payments/history` returns user's payments.

---

### Task A5: Complete License Create Endpoint
**File:** `public/api/licenses/create.php`
**Current state:** Returns fake license.
**Action:** Implement real license creation:
1. Verify user has active subscription
2. Count existing active licenses under subscription
3. Check against package maxAccounts
4. Generate license key in format: `TC-XXXX-XXXX-XXXX-XXXX-XXXX`
5. Insert into licenses table
6. Return created license

**Verification:** POST to `/api/licenses/create` creates a real license.

---

### Task A6: Fix Trade Events Endpoints (list + stats)
**Files:** `public/api/trade-events/list.php`, `public/api/trade-events/stats.php`

**Problem in list.php:** Queries `WHERE userId = ?` but `trade_events` table has NO `userId` column. Must join through `trading_accounts` or `licenses`.

**Fix for list.php:**
```sql
SELECT te.*, ta.accountNumber as tradingAccountNumber
FROM trade_events te
JOIN trading_accounts ta ON te.tradingAccountId = ta.id
WHERE ta.userId = ?
ORDER BY te.createdAt DESC
LIMIT ? OFFSET ?
```

**Fix for stats.php:**
Replace hardcoded zeros with real aggregation:
```sql
SELECT
  COUNT(*) as totalTrades,
  SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) as winningTrades,
  SUM(CASE WHEN profit <= 0 THEN 1 ELSE 0 END) as losingTrades,
  SUM(profit) as totalPnl,
  SUM(commission) as totalCommission,
  SUM(swap) as totalSwap,
  SUM(profit + commission + swap) as netPnl,
  SUM(volume) as totalVolume
FROM trade_events te
JOIN trading_accounts ta ON te.tradingAccountId = ta.id
WHERE ta.userId = ?
  AND te.eventType = 'CLOSE'
  AND te.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
```
Calculate winRate from winningTrades/totalTrades in PHP.

**Verification:** Dashboard page shows real trade stats (or zeros if no data).

---

### Task A7: Complete Trading Account Status Endpoint
**File:** `public/api/trading-accounts/status.php`
**Current state:** Returns `{"status":[]}`.
**Action:** Return accounts with enriched heartbeat data:
```sql
SELECT ta.*, l.key as licenseKey, s.name as strategyName, s.version as strategyVersion
FROM trading_accounts ta
LEFT JOIN licenses l ON ta.licenseId = l.id
LEFT JOIN strategies s ON l.strategyId = s.id
WHERE ta.userId = ?
```
Compute status (online/stale/offline) from `lastHeartbeatAt` in PHP.

**Verification:** `/dashboard/trading-accounts` shows real account list.

---

### Task A8: Fix License List to Include Nested Data
**File:** `public/api/licenses/list.php`
**Problem:** Returns flat license data. Frontend expects nested `strategy`, `tradingAccounts`, `subscription` objects.
**Action:** After fetching licenses, for each license fetch:
1. Trading accounts linked to this license
2. Strategy info (already joined)
3. Subscription info (join subscriptions + packages)

Return structured as:
```json
{
  "licenses": [{
    "id": "...",
    "key": "TC-...",
    "status": "ACTIVE",
    "expiresAt": "...",
    "strategy": {"id": "...", "name": "...", "version": "..."},
    "tradingAccounts": [{"id": "...", "accountNumber": "...", ...}],
    "subscription": {"status": "...", "package": {"name": "...", ...}}
  }]
}
```

**Verification:** `/dashboard/licenses` renders license cards with account counts.

---

### Task A9: Fix License By-ID to Include Nested Data
**File:** `public/api/licenses/by-id.php`
**Same issue as A8.** Must return nested `strategy`, `subscription`, `tradingAccounts`.

---

## ═══════════════════════════════════════════════════════════════
## WORKSTREAM B: USDT Payment Flow
## ═══════════════════════════════════════════════════════════════

### Task B1: Implement `create-deposit.php` (FULL)
**File:** `public/api/payments/create-deposit.php`
**Current state:** Stub returning empty data.
**Full implementation:**

**Input:** `{"packageId":"pkg_pro", "network":"ERC-20"}` (or BEP-20)

**Logic:**
1. Validate user auth
2. Fetch package by ID, verify it exists and is active
3. Calculate USDT amount (priceCents / 100, since USDT tracks USD)
4. Generate unique payment ID: `pay_` + random hex
5. Generate unique deposit reference/memo: `TC-` + random hex (8 chars)
6. Use static wallet: `0x7b0bCf03c2f622bcb4e5e1B0f4A243a66A3f9b90`
7. Insert into `payments`:
   - id, userId, amountCents, currency='USDT', status='PENDING_PAYMENT'
   - paymentMethod='USDT_ERC20' or 'USDT_BEP20'
   - depositAddress = static wallet
   - depositNetwork = network
   - expiresAt = NOW() + 24 hours
   - description = `${package.name} subscription`
8. Create subscription with status='PENDING_PAYMENT':
   - id = `sub_` + random
   - userId, packageId, status='PENDING_PAYMENT'
   - currentPeriodStart = NOW(), currentPeriodEnd = NOW() + 30 days
9. Return deposit info

**Output:**
```json
{
  "success": true,
  "deposit": {
    "paymentId": "pay_abc123",
    "depositAddress": "0x7b0bCf03c2f622bcb4e5e1B0f4A243a66A3f9b90",
    "network": "ERC-20",
    "amount": 9.90,
    "currency": "USDT",
    "reference": "TC-A1B2C3D4",
    "status": "PENDING_PAYMENT",
    "expiresAt": "2026-05-02T07:00:00Z",
    "packageName": "Starter"
  }
}
```

**Verification:** POST creates payment + pending subscription in DB.

---

### Task B2: Implement `verify.php` (Deposit Verification)
**File:** `public/api/payments/verify.php` (NEW)

**Purpose:** Admin or cron endpoint to manually verify a deposit.
Since Hostinger shared hosting can't run blockchain listeners, deposits are verified manually by admin.

**Input:** `{"paymentId":"pay_abc123", "txHash":"0x..."}`

**Logic:**
1. Admin auth check
2. Find payment by ID, verify status is PENDING_PAYMENT
3. Update payment: status='COMPLETED', txHash, verifiedAt=NOW()
4. Update linked subscription: status='ACTIVE'
5. Generate license key for user:
   - Format: `TC-XXXX-XXXX-XXXX-XXXX-XXXX`
   - Associate with user, subscription, strategy
   - expiresAt = subscription.currentPeriodEnd
6. Insert license record
7. Return license key

**Output:**
```json
{
  "success": true,
  "payment": {"id": "...", "status": "COMPLETED"},
  "subscription": {"id": "...", "status": "ACTIVE"},
  "license": {"id": "...", "key": "TC-XXXX-...", "status": "ACTIVE"}
}
```

**Verification:** POST with valid paymentId activates subscription + creates license.

---

### Task B3: Create Admin Payment Verification UI
**File:** `public/api/admin/payments.php` (NEW)
**Purpose:** List all payments with status filter, allow admin to verify deposits.

**Implementation:**
1. GET: List all payments, newest first, with user email + package name joined
2. POST: Verify a deposit (same as B2 logic)

**Verification:** Admin can view and verify pending payments.

---

## ═══════════════════════════════════════════════════════════════
## WORKSTREAM C: EA Contract API Endpoints
## ═══════════════════════════════════════════════════════════════

**CRITICAL MISMATCH:** The MT5 EA sends requests to `/api/ea/validate-license`, `/api/ea/heartbeat`, `/api/ea/sync-config`, `/api/ea/kill-switch`. But the PHP API only has `/api/licenses/validate.php`. The `.htaccess` handles `*.php` extension, but the EA-expected URL paths don't exist.

**Solution:** Create the missing PHP files that the EA actually calls.

---

### Task C1: Create `ea/validate-license.php`
**File:** `public/api/ea/validate-license.php` (NEW)

**Purpose:** EA calls this on startup and periodic revalidation.
**Input:** POST with JSON `{"licenseKey":"TC-...", "accountNumber":"12345", "apiKey":"...", "licenseKey":"..."}`

The EA's `EASaaS_Http.mqh` injects `apiKey` and `licenseKey` into every request body via `InjectAuthIntoJsonBody()`. The EA expects:
- `licenseKey` in body
- `accountNumber` in body
- `X-API-Key` header
- `X-License-Key` header

**Logic:**
1. Extract license key from body or header
2. Look up license in DB (with joins: strategy, subscription, package, user)
3. Validate: status=ACTIVE, not expired, not killed, user active
4. Check/auto-link trading account:
   - Find or create `trading_accounts` row for this accountNumber
   - Count linked accounts vs maxAccounts
5. Return validation result with strategy config:
```json
{
  "valid": true,
  "id": "lic_xxx",
  "userId": "user_xxx",
  "strategyId": "strat_xauusd_v12",
  "strategy": {"name": "PA/SMC Scalper v12", "version": "12.0"},
  "license": {"id": "lic_xxx", "userId": "...", "strategyId": "...", "expiresAt": "...", "maxAccounts": 1, "killSwitch": false},
  "configHash": "...",
  "strategyConfig": {"lotSize": 0.01, "maxPositions": 1, ...},
  "riskConfig": {"maxDailyLossPercent": 5, ...}
}
```

**Critical:** The EA License module (EASaaS_License.mqh) parses the response. It looks for:
- `resp.body` top-level: `"valid"` (bool), `"id"`, `"license"` (object), `"strategy"` (object), `"configHash"`
- Inside `"license"`: `"id"`, `"userId"`, `"strategyId"`, `"expiresAt"`, `"maxAccounts"`, `"killSwitch"`
- Inside `"strategy"`: `"id"`, `"name"`, `"version"`

**Verification:** POST with valid license key + account number returns `{"valid":true,...}`.

---

### Task C2: Create `ea/heartbeat.php`
**File:** `public/api/ea/heartbeat.php` (NEW)

**Purpose:** EA sends heartbeat every 60s with equity, balance, open positions, margin level.

**EA sends (`EASaaS_Heartbeat.mqh`):**
```json
{
  "apiKey": "...",
  "licenseKey": "...",
  "accountNumber": "12345",
  "platform": "MT5",
  "eaVersion": "1.0.0",
  "equity": 10250.50,
  "balance": 10000.00,
  "openPositions": 2,
  "marginLevel": 450.5,
  "serverTime": "2026-05-01T07:30:00Z"
}
```

**Logic:**
1. Authenticate via licenseKey + apiKey
2. Find license and trading account
3. Update `trading_accounts`:
   - lastHeartbeatAt = NOW()
   - lastKnownIp = $_SERVER['REMOTE_ADDR']
   - Store equity, balance, openPositions (add columns? or use Redis)
4. Check kill switch flags from license
5. Return response:
```json
{
  "status": "ok",
  "kill": false,
  "killReason": "",
  "configHash": "...",
  "configUpdate": false
}
```

**Schema consideration:** `trading_accounts` table doesn't have equity/balance columns. Options:
- **A:** ALTER TABLE to add: `currentEquity DOUBLE`, `currentBalance DOUBLE`, `currentMarginLevel DOUBLE`, `openPositions INT`
- **B:** Store in separate `heartbeat_logs` table
- **Recommendation:** Option A (simpler, dashboard reads directly)

**Add columns to `trading_accounts`:**
```sql
ALTER TABLE trading_accounts
  ADD COLUMN currentEquity DOUBLE DEFAULT 0 AFTER status,
  ADD COLUMN currentBalance DOUBLE DEFAULT 0 AFTER currentEquity,
  ADD COLUMN currentMarginLevel DOUBLE DEFAULT 0 AFTER currentBalance,
  ADD COLUMN openPositions INT DEFAULT 0 AFTER currentMarginLevel;
```

**Verification:** POST heartbeat updates account's lastHeartbeatAt + equity/balance.

---

### Task C3: Create `ea/sync-config.php`
**File:** `public/api/ea/sync-config.php` (NEW)

**Purpose:** EA periodically fetches latest strategy config.
**Input:** GET with query params `?apiKey=...&licenseKey=...` (as appended by `AppendAuthToUrl()`)

**Logic:**
1. Authenticate license
2. Fetch strategy defaultConfig + riskConfig from strategies table
3. Generate configHash from md5 of JSON config
4. Return:
```json
{
  "config": {"lotSize": 0.01, "maxPositions": 1, "useTrailingStop": true, "trailingStopPips": 150},
  "riskConfig": {"maxDailyLossPercent": 5, "maxConsecutiveLosses": 3},
  "configHash": "a1b2c3d4",
  "killSwitch": false,
  "killSwitchReason": ""
}
```

**Verification:** GET returns strategy config with consistent hash.

---

### Task C4: Create `ea/kill-switch.php`
**File:** `public/api/ea/kill-switch.php` (NEW)

**Purpose:** EA acknowledges kill switch when detected via heartbeat.
**Input:** POST with `{"accountNumber":"...", "acknowledged":"true", "reason":"...", "timestamp":"..."}`

**Logic:** Record acknowledgment (log or status update). Simple 200 response.

**Verification:** POST returns 200.

---

### Task C5: Update .htaccess for EA Routes
**File:** `public/.htaccess`
**Action:** EA routes are already covered by rule 2b (`.php` extension auto-append). But verify:
- `/api/ea/validate-license` → `/api/ea/validate-license.php` ✓
- `/api/ea/heartbeat` → `/api/ea/heartbeat.php` ✓
- `/api/ea/sync-config` → `/api/ea/sync-config.php` ✓
- `/api/ea/kill-switch` → `/api/ea/kill-switch.php` ✓

These should work with existing rewrite rules. Verify the directory exists at deploy time.

---

## ═══════════════════════════════════════════════════════════════
## WORKSTREAM D: Dashboard Real Data
## ═══════════════════════════════════════════════════════════════

### Task D1: Fix API Client Interceptor for All Endpoints
**File:** `src/lib/api.ts`
**Current:** Adds `.php` suffix. Works correctly for all routes.
**Verify:** No change needed, but verify that `/licenses/${id}` correctly maps to `/licenses/by-id.php?id=${id}`. The `.htaccess` handles this via rule 2c. The axios interceptor should NOT add `.php` to URLs that already contain query params in a way that would break.

**Check:** `api.get('/licenses/' + params.id)` → interceptor adds `.php` → `/licenses/lic_e2e_001.php` → `.htaccess` rule 2c rewrites to `/licenses/by-id.php?id=lic_e2e_001`. ✓

---

### Task D2: Create `subscriptions/list.php` for User's Own Subscriptions
**Note:** Current `subscriptions/list.php` returns packages (public). But frontend subscription page also calls this expecting packages. That's fine.

**But:** The frontend subscription page (`SubscriptionPage`) also needs the user's subscription history. Currently it calls `/subscriptions/current` and `/subscriptions/list` (for packages) and `/payments/history`.

**Actual:** The frontend expects `response.data.data` from history (line 106: `paymentsResult.value.data.data ?? []`). But `payments/history.php` returns `{"payments":[...]}`. This is a frontend bug.

**Fix:** In `subscription/page.tsx` line 106, change from `response.data.data` to `response.data.payments`.

---

### Task D3: Dashboard Overview Data Contract Alignment
**File:** `src/app/(dashboard)/dashboard/page.tsx`

**Issues found:**
1. Line 101: Expects `subscription.package` (nested) but `subscriptions/current.php` returns flat structure (`packageName`, `packageDescription` etc.)
2. Line 108: Expects nested `subscription.package.maxAccounts` — doesn't match flat response.

**Fix for `subscriptions/current.php`:** Return nested package object:
```php
// After fetching subscription row:
$subscription['package'] = [
    'id' => $subscription['packageId'],
    'name' => $subscription['packageName'],
    'maxAccounts' => $subscription['packageMaxAccounts'],
    'priceCents' => $subscription['priceCents'],
    'currency' => $subscription['currency'],
    'billingCycle' => $subscription['billingCycle'],
    'description' => $subscription['packageDescription'],
    'features' => json_decode($subscription['features'] ?? '[]', true),
];
```
**OR** fix the frontend to expect flat structure. Backend fix is cleaner.

---

### Task D4: Fix `trade-events/list.php` Response Shape
**File:** `public/api/trade-events/list.php`
**Frontend expectation (line 100):** `response.data.trades` — each trade has `tradingAccount` nested with `accountNumber`.
**Current response:** Flat trade row, no nested trading account.

**Fix:** After querying trades, for each trade fetch `trading_accounts.accountNumber` and include as `tradingAccount: {accountNumber: "..."}.`

Or better: join in the main query.

---

### Task D5: Fix Dashboard Stats Response
**File:** `public/api/trade-events/stats.php`
**Frontend expectation:** `stats.winningTrades`, `stats.losingTrades`, `stats.totalPnl`, `stats.netPnl`, `stats.totalCommission`, `stats.totalSwap`, `stats.totalVolume`
**Current:** Returns fixed zeros with different field names.

**Fix:** As described in A6 — real aggregation query.

---

## ═══════════════════════════════════════════════════════════════
## WORKSTREAM E: Frontend Polish
## ═══════════════════════════════════════════════════════════════

### Task E1: Fix SPA Navigation on Landing Page
**File:** `src/app/page.tsx` lines 1022-1029
**Status:** ✅ ALREADY FIXED. Login and Register use `window.location.href` for proper page navigation.
**Verify:** `git diff` confirms change is committed.

---

### Task E2: Add Auth Guards to Dashboard Routes
**Files:** `src/app/(dashboard)/dashboard/layout.tsx`, `src/app/(dashboard)/admin/*/page.tsx`

**Problem:** Currently if a user types `/dashboard` URL directly without being logged in, the page will try to load and all API calls fail with 401.

**Fix:** Add auth redirect in dashboard layout:
```tsx
// In dashboard/layout.tsx:
'use client';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated]);
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return null;
  
  return <>{children}</>;
}
```

**Note:** With static export, server-side redirects don't work. Must use client-side redirect.

---

### Task E3: Add Proper Error Handling to All Dashboard Pages
**All dashboard pages** should:
1. Show error state when API fails (not just silently show empty)
2. Show loading skeletons/spinners during data fetch
3. Retry or refresh button on error

**Specific files to review:**
- `dashboard/page.tsx` — has isLoading, but network errors are silently caught
- `dashboard/licenses/page.tsx` — catches error with empty array, should show error message
- `dashboard/trading-accounts/page.tsx` — has error state ✓
- `dashboard/subscription/page.tsx` — has depositError ✓

---

### Task E4: Add Logout Button in Dashboard Sidebar
**File:** Dashboard layout or sidebar component.
**Action:** Ensure sidebar has a working logout button that calls `logout()` from `useAuth()`.

---

### Task E5: Fix Subscription Page Payment Data Access
**File:** `src/app/(dashboard)/dashboard/subscription/page.tsx`
**Line 106:** `paymentsResult.value.data.data ?? []` — should be `paymentsResult.value.data.payments ?? []`.

---

### Task E6: Add "Copy License Key" to License Detail Page
**File:** `src/app/(dashboard)/dashboard/licenses/[id]/page.tsx`
**Current:** Shows license key but no copy button.
**Add:** Copy-to-clipboard button like on licenses list page.

---

### Task E7: Add Network Selection to Registration Page
**File:** `src/app/(auth)/register/page.tsx`
The registration page currently does NOT select a network. After A1 fix (which creates trial subscription directly), no deposit is needed for trial. But for non-trial packages, the flow should go to subscription page.

**Current behavior:** Register → auto-creates trial subscription + license. ✓ Good for launch.

---

### Task E8: Add `deploy-autopull.php` Security Note
**File:** `deploy-autopull.php` (if deployed to public_html)
**Risk:** This file could be called by anyone. If deployed, ensure it's removed or password-protected.

---

## ═══════════════════════════════════════════════════════════════
## WORKSTREAM F: Build & Production Deploy
## ═══════════════════════════════════════════════════════════════

### Task F1: Add `.env.production` Configuration
**File:** `.env.production` (already exists)
**Verify:**
```
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SITE_URL=https://tradecandle.net
```

---

### Task F2: Build Next.js Static Export
**Command:** `cd /home/suphot/ea-saas-platform && npm run build`
**Output:** `out/` directory with:
- `index.html` (landing page)
- `login.html`, `register.html`, `forgot-password.html`
- `dashboard.html`, `dashboard/licenses.html`, etc.
- `_next/static/` (JS bundles, CSS)

**Verify build:** `ls out/` shows all expected HTML files.

---

### Task F3: Prepare Deploy Package
**Commands:**
```bash
cd /home/suphot/ea-saas-platform

# Copy all PHP API files to out/
cp -r public/api out/
cp public/.htaccess out/
cp public/index.php out/

# Remove any development artifacts
rm -f out/api/*.bak out/api/**/*.bak

# Create tarball
tar czf deploy-static.tar.gz -C out .
```

**Deploy package content:**
```
index.html
login.html
register.html
dashboard.html
dashboard/
_next/static/
api/ (PHP files)
.htaccess
index.php
backtests/
images/
favicon.ico (if exists)
robots.txt (if exists)
```

---

### Task F4: Deploy to Hostinger via SSH
**Connection:** SSH `u175893330@46.202.138.35:65002`

**Deploy steps:**
```bash
# Upload tarball
scp -P 65002 deploy-static.tar.gz u175893330@46.202.138.35:~/domains/tradecandle.net/

# SSH in
ssh -p 65002 u175893330@46.202.138.35

# On Hostinger:
cd ~/domains/tradecandle.net/
rm -rf public_html.bak
mv public_html public_html.bak 2>/dev/null
mkdir public_html
cd public_html
tar xzf ../deploy-static.tar.gz
chmod -R 755 .
```

---

### Task F5: Run Database Migrations on Hostinger
**Actions:**
1. SSH to Hostinger
2. Run `schema.sql` if schema changed:
```bash
mysql -u u175893330_usrP4n -p'h=0Zx5V^' u175893330_dbA7k9 < schema_updates.sql
```
3. If table alterations needed (from C2):
```sql
ALTER TABLE trading_accounts
  ADD COLUMN IF NOT EXISTS currentEquity DOUBLE DEFAULT 0 AFTER status,
  ADD COLUMN IF NOT EXISTS currentBalance DOUBLE DEFAULT 0 AFTER currentEquity,
  ADD COLUMN IF NOT EXISTS currentMarginLevel DOUBLE DEFAULT 0 AFTER currentBalance,
  ADD COLUMN IF NOT EXISTS openPositions INT DEFAULT 0 AFTER currentMarginLevel;
```

---

### Task F6: Verify Production Deployment
**Checklist:**
- [ ] https://tradecandle.net/ loads landing page
- [ ] https://tradecandle.net/login loads login page
- [ ] https://tradecandle.net/api/auth/login.php handles login
- [ ] https://tradecandle.net/api/subscriptions/list.php returns packages
- [ ] https://tradecandle.net/api/licenses/validate.php works with demo license
- [ ] https://tradecandle.net/dashboard loads after login (redirects to dashboard.html or dashboard/index.html)
- [ ] All dashboard pages render
- [ ] No 404 errors on JS/CSS assets
- [ ] No CORS errors
- [ ] PHP errors logged to Hostinger error log

---

## ═══════════════════════════════════════════════════════════════
## BONUS: Post-Launch Tasks (Not Blocking Production)
## ═══════════════════════════════════════════════════════════════

### G1: Admin Dashboard Real Data
**Files:** `public/api/admin/*.php`
Currently have stubs. Populate with real queries for:
- User count, subscription count, revenue
- License management (revoke, kill switch toggle)
- Risk rule management

### G2: Email Notifications
- Welcome email on registration
- Payment confirmation on deposit verification
- License expiry warning (7 days before)
- Kill switch notification

### G3: Automated Deposit Monitoring
- Use Etherscan/BscScan free API tier to poll for deposits
- Cron job on external service (cron-job.org free tier)
- Auto-verify when transaction detected

### G4: Stripe Integration (Alternative Payment)
- Add Stripe checkout for credit card payments
- Requires Stripe webhook endpoint

### G5: TRC-20 Support
- Add TRC-20 deposit address
- Manual verification for now

### G6: SSL Certificate
- Hostinger typically provides free SSL via Let's Encrypt
- Verify HTTPS works

---

## ═══════════════════════════════════════════════════════════════
## SUMMARY: Execution Order
## ═══════════════════════════════════════════════════════════════

**Phase 1 (Sequential — 1 executor): Workstream A**
- A1: Fix register SQL bug
- A2-A9: Complete all PHP stubs with real queries
- Estimated: 1-2 hours

**Phase 2 (Parallel — 3 executors): Workstreams B, C, D**
- Executor 1: B1-B3 (Payment flow)
- Executor 2: C1-C5 (EA contract API)
- Executor 3: D1-D5 (Dashboard data alignment)
- Estimated: 2-3 hours

**Phase 3 (Sequential — 1 executor): Workstream E**
- E1-E8: Frontend polish
- Estimated: 1 hour

**Phase 4 (Sequential — 1 executor): Workstream F**
- F1-F6: Build and deploy
- Estimated: 30 min

**Total estimated time: 5-7 hours**

---

## ═══════════════════════════════════════════════════════════════
## KEY FILES MAP
## ═══════════════════════════════════════════════════════════════

### PHP API (MODIFY):
| File | Task | Change |
|------|------|--------|
| `public/api/auth/register.php` | A1 | Fix SQL bug, fix chaining |
| `public/api/subscriptions/current.php` | D3 | Return nested package object |
| `public/api/subscriptions/list.php` | A2 | Robust error handling |
| `public/api/payments/history.php` | A4 | Real DB query |
| `public/api/licenses/create.php` | A5 | Real license creation |
| `public/api/licenses/list.php` | A8 | Nested strategy + tradingAccounts |
| `public/api/licenses/by-id.php` | A9 | Nested data |
| `public/api/trade-events/list.php` | A6/D4 | Fix query + join, add nested tradingAccount |
| `public/api/trade-events/stats.php` | A6/D5 | Real aggregation |
| `public/api/trading-accounts/status.php` | A7 | Real account data + heartbeat status |

### PHP API (CREATE):
| File | Task | Purpose |
|------|------|---------|
| `public/api/packages/list.php` | A3 | Public package listing |
| `public/api/payments/create-deposit.php` | B1 | Full deposit creation |
| `public/api/payments/verify.php` | B2 | Manual deposit verification |
| `public/api/admin/payments.php` | B3 | Admin payment management |
| `public/api/ea/validate-license.php` | C1 | EA license validation |
| `public/api/ea/heartbeat.php` | C2 | EA heartbeat receiver |
| `public/api/ea/sync-config.php` | C3 | EA config sync |
| `public/api/ea/kill-switch.php` | C4 | EA kill switch ack |

### Next.js Frontend (MODIFY):
| File | Task | Change |
|------|------|--------|
| `src/app/(dashboard)/dashboard/layout.tsx` | E2 | Add auth guard |
| `src/app/(dashboard)/dashboard/subscription/page.tsx` | E5 | Fix data path `data.data` → `data.payments` |
| `src/app/(dashboard)/dashboard/licenses/[id]/page.tsx` | E6 | Add copy button |

### Infrastructure:
| File | Task | Change |
|------|------|--------|
| `db/schema.sql` | C2 | Add equity/balance columns to trading_accounts |
| `public/.htaccess` | C5 | Verify EA routes work (should already) |
