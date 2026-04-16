# EA SaaS Platform — MT4/MT5 Expert Advisor Contract

> **Version:** 1.0.0  
> **Last Updated:** 2026-04-16  
> **Compatible with:** MetaTrader 4 (Build 1240+), MetaTrader 5 (Build 3800+)

Complete, production-ready MQL4/MQL5 source code for connecting your Expert Advisor to the EA SaaS Platform backend. Includes license validation, heartbeat reporting, configuration sync, kill switch handling, risk management, and trade execution — all wired to the platform's REST API.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation Guide](#installation-guide)
4. [Configuration Guide](#configuration-guide)
5. [API Contract Reference](#api-contract-reference)
6. [License Lifecycle](#license-lifecycle)
7. [Risk Rules Reference](#risk-rules-reference)
8. [File Reference](#file-reference)
9. [Building from Source](#building-from-source)
10. [Security Best Practices](#security-best-practices)
11. [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview

The EA SaaS Platform provides a cloud-based management layer for your Expert Advisors. This contract code enables your EA to:

- **Validate licenses** against the platform before trading
- **Report heartbeats** with account status (equity, balance, positions, margin)
- **Receive kill switch commands** from the platform (manual or risk-triggered)
- **Synchronize configuration** — strategy parameters and risk rules updated server-side
- **Enforce risk rules** locally — 8 configurable risk checks before every trade
- **Execute trades safely** with pre-trade validation, retries, and error recovery

### Key Features

| Feature | Description |
|---------|-------------|
| License Validation | HTTP POST to `/api/ea/validate-license` with license key + account number |
| Heartbeat System | Periodic POST to `/api/ea/heartbeat` every 60s (configurable) |
| Config Sync | GET `/api/ea/sync-config` for live parameter updates |
| Kill Switch | Server-side kill propagated via heartbeat response or license revalidation |
| Risk Engine | 8 rules: drawdown, daily loss, positions, spread, session, equity, consecutive loss, margin |
| Request Signing | HMAC-SHA256 signed requests for tamper-proof API communication |
| Retry Logic | Exponential backoff on network failures for all API calls |
| Structured Logging | File + terminal logging with configurable levels (TRACE → ERROR) |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│            MetaTrader 4 / 5                 │
│  ┌───────────────────────────────────────┐  │
│  │       EASaaS_Starter.mq4/.mq5        │  │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ │  │
│  │  │ License  │ │Heartbeat │ │ Config │ │  │
│  │  │ Module   │ │ System   │ │ Manager│ │  │
│  │  └────┬─────┘ └────┬─────┘ └───┬────┘ │  │
│  │       │            │           │       │  │
│  │  ┌────┴────────────┴───────────┴────┐ │  │
│  │  │          HTTP Client               │ │  │
│  │  │   (WebRequest + HMAC Signing)      │ │  │
│  │  └──────────────┬────────────────────┘ │  │
│  └─────────────────┼─────────────────────┘  │
│                    │ HTTPS                   │
└────────────────────┼────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│         EA SaaS Platform Backend            │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐  │
│  │ License  │ │ Heartbeat │ │  Config &  │  │
│  │ Service  │ │ Processor │ │ Risk Engine │  │
│  └──────────┘ └───────────┘ └────────────┘  │
│  ┌──────────┐ ┌───────────┐               │
│  │ Kill     │ │  Trade    │               │
│  │ Switch   │ │  Events   │               │
│  └──────────┘ └───────────┘               │
│           MySQL + Redis                     │
└─────────────────────────────────────────────┘
```

### Data Flow

1. **OnInit**: EA validates license → loads config + risk rules → sends initial heartbeat
2. **OnTick (every tick)**: Kill switch check → heartbeat (if due) → license revalidation (if cache expired) → config sync (if due) → new bar check → risk rules → trade execution
3. **OnDeinit**: Final heartbeat → cleanup

---

## Installation Guide

### MT4 Installation

1. **Copy files** to your MetaTrader 4 data folder:
   ```
   <MT4_Data_Folder>/MQL4/Experts/EASaaS_Starter.mq4
   <MT4_Data_Folder>/MQL4/Include/EASaaS_Http.mqh
   <MT4_Data_Folder>/MQL4/Include/EASaaS_License.mqh
   <MT4_Data_Folder>/MQL4/Include/EASaaS_Heartbeat.mqh
   <MT4_Data_Folder>/MQL4/Include/EASaaS_Risk.mqh
   <MT4_Data_Folder>/MQL4/Include/EASaaS_Config.mqh
   <MT4_Data_Folder>/MQL4/Include/EASaaS_Utils.mqh
   <MT4_Data_Folder>/MQL4/Include/EASaaS_Trade.mqh
   ```

2. **Find your MT4 data folder**: Open MetaTrader 4 → File → Open Data Folder

3. **Add API server to WebRequest whitelist**:
   - Open MetaTrader 4 → Tools → Options → Expert Advisors
   - Check **"Allow WebRequest for listed URL"**
   - Add your API server URL: `https://api.yourdomain.com`
   - Click OK

4. **Compile**: Open MetaEditor → Open `EASaaS_Starter.mq4` → Press F7 (Compile)

5. **Attach to chart**: Drag the compiled EA onto any chart

6. **Configure inputs**: Enter your license key, API key, and server URL in the EA properties

### MT5 Installation

1. **Copy files** to your MetaTrader 5 data folder:
   ```
   <MT5_Data_Folder>/MQL5/Experts/EASaaS_Starter.mq5
   <MT5_Data_Folder>/MQL5/Include/EASaaS_Http.mqh
   <MT5_Data_Folder>/MQL5/Include/EASaaS_License.mqh
   <MT5_Data_Folder>/MQL5/Include/EASaaS_Heartbeat.mqh
   <MT5_Data_Folder>/MQL5/Include/EASaaS_Risk.mqh
   <MT5_Data_Folder>/MQL5/Include/EASaaS_Config.mqh
   <MT5_Data_Folder>/MQL5/Include/EASaaS_Utils.mqh
   <MT5_Data_Folder>/MQL5/Include/EASaaS_Trade.mqh
   ```

2. **Find your MT5 data folder**: Open MetaTrader 5 → File → Open Data Folder

3. **Add API server to WebRequest whitelist**:
   - Open MetaTrader 5 → Tools → Options → Expert Advisors
   - Check **"Allow WebRequest for listed URL"**
   - Add your API server URL: `https://api.yourdomain.com`
   - Click OK

4. **Compile**: Open MetaEditor → Open `EASaaS_Starter.mq5` → Press F7 (Compile)

5. **Attach to chart**: Drag the compiled EA onto any chart

6. **Configure inputs**: Enter your license key, API key, and server URL in the EA properties

### Important Notes

- The `.mqh` files **must** be in the `Include/` folder, not the `Experts/` folder
- The `.mq4`/`.mq5` file goes in the `Experts/` folder
- Both MT4 and MT5 require the server URL added to the WebRequest whitelist
- Ensure **"Allow DLL imports"** is NOT required (this EA uses only WebRequest)
- Enable **"Allow live trading"** in Expert Advisors options for the EA to trade

---

## Configuration Guide

### Required Input Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `InpLicenseKey` | string | License key from the SaaS dashboard (format: `ea-<uuid>`) |
| `InpApiKey` | string | API key for authentication (from SaaS dashboard) |
| `InpServerUrl` | string | Platform API base URL (e.g., `https://api.yourdomain.com`) |

### Strategy Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `InpLotSize` | double | 0.0 | Fixed lot size. Set to 0 for risk-based calculation |
| `InpRiskPercent` | double | 1.0 | Risk percentage per trade (used when lot size = 0) |
| `InpStopLossPips` | int | 50 | Stop loss distance in pips |
| `InpTakeProfitPips` | int | 100 | Take profit distance in pips |
| `InpTrailingStop` | int | 0 | Trailing stop in pips (0 = disabled) |
| `InpMagicNumber` | int | 12345 | Magic number for identifying this EA's trades |

### Trading Settings

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `InpTradeComment` | string | "EASaaS" | Comment text attached to each order |
| `InpMaxSlippage` | int | 10 | Maximum allowed slippage in points |
| `InpTradeOnNewBar` | bool | true | Only evaluate signals on new bar formation |
| `InpCloseOnKill` | bool | true | Close all positions when kill switch activates |

### Heartbeat Settings

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `InpHeartbeatSec` | int | 60 | Heartbeat interval in seconds |
| `InpLicenseRevalidateSec` | int | 300 | How often to revalidate license (seconds) |

### Risk Override Parameters

These override server-provided risk rules when set to non-zero values:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `InpMaxDrawdownPct` | double | 20.0 | Maximum account drawdown percentage |
| `InpMaxDailyLossPct` | double | 5.0 | Maximum daily loss percentage |
| `InpMaxPositions` | int | 5 | Maximum number of open positions |
| `InpMaxSpreadPips` | double | 30.0 | Maximum spread in pips |
| `InpSessionStart` | int | 7 | Trading session start hour (UTC) |
| `InpSessionEnd` | int | 20 | Trading session end hour (UTC) |
| `InpEquityProtect` | double | 500.0 | Minimum equity in USD |
| `InpMaxConsecLoss` | int | 5 | Maximum consecutive losses before pause |

### Logging

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `InpLogLevel` | enum | INFO | Logging verbosity: TRACE, DEBUG, INFO, WARN, ERROR, NONE |

### Config Precedence

Server-provided configuration takes **priority** over local input parameters. The precedence order is:

1. **Server config** (via `/api/ea/sync-config`) — overrides everything
2. **Local input parameters** — used as fallback if server config unavailable
3. **Built-in defaults** — hardcoded in each module

---

## API Contract Reference

All API endpoints require authentication via HTTP headers:

```
X-API-Key: <your-api-key>
X-License-Key: <your-license-key>
Content-Type: application/json
```

Optional HMAC signing headers (when `InpHmacSecret` is configured):

```
X-Timestamp: <unix-timestamp>
X-Signature: <hmac-sha256-signature>
```

### POST /api/ea/validate-license

Validates the license key and optionally checks account binding.

**Request:**
```json
{
  "licenseKey": "ea-550e8400-e29b-41d4-a716-446655440000",
  "accountNumber": "12345678"
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "license": {
    "id": "lic_abc123",
    "key": "ea-550e8400-...",
    "userId": "user_xyz",
    "strategyId": "strat_def",
    "status": "ACTIVE",
    "expiresAt": "2027-04-16T00:00:00.000Z",
    "maxAccounts": 3,
    "killSwitch": false
  },
  "strategy": {
    "id": "strat_def",
    "name": "MA Crossover Pro",
    "version": "2.1.0",
    "defaultConfig": { ... },
    "riskConfig": { ... }
  },
  "configHash": "a1b2c3d4e5f6..."
}
```

**Error Response (200):**
```json
{
  "valid": false,
  "error": "EXPIRED",
  "message": "License has expired"
}
```

**Error Codes:**

| Error | Description |
|-------|-------------|
| `INVALID_KEY` | License key not found |
| `EXPIRED` | License has passed its expiration date |
| `REVOKED` | License was revoked by admin |
| `PAUSED` | License is temporarily paused |
| `ACCOUNT_MISMATCH` | Account is suspended or banned |
| `MAX_ACCOUNTS_REACHED` | Maximum linked accounts limit reached |
| `KILLED` | Kill switch is active on this license |
| `SUBSCRIPTION_INACTIVE` | Associated subscription is not active |

---

### POST /api/ea/heartbeat

Reports EA status and receives directives (kill switch, config updates).

**Request:**
```json
{
  "accountNumber": "12345678",
  "platform": "MT5",
  "eaVersion": "1.0.0",
  "equity": 10542.50,
  "balance": 10000.00,
  "openPositions": 2,
  "marginLevel": 350.5,
  "serverTime": "2026-04-16T08:30:00Z"
}
```

**Response (200):**
```json
{
  "status": "ok",
  "configHash": "a1b2c3d4e5f6...",
  "kill": false,
  "message": null
}
```

**Kill Switch Response:**
```json
{
  "status": "killed",
  "kill": true,
  "killReason": "Risk rule breached: MAX_DRAWDOWN",
  "configHash": "a1b2c3d4e5f6..."
}
```

**Config Update Response:**
```json
{
  "status": "config_update",
  "configHash": "new_hash_value",
  "kill": false,
  "message": "Configuration update available"
}
```

**Status Values:**

| Status | Meaning |
|--------|---------|
| `ok` | Everything normal |
| `killed` | Kill switch is active — stop trading immediately |
| `config_update` | New configuration available — call `/api/ea/sync-config` |

**Server-Side Processing:**

On each heartbeat, the backend:
1. Finds or auto-links the trading account
2. Stores heartbeat state in Redis (real-time)
3. Pushes to heartbeat stream for DB persistence
4. Checks kill switch (Redis → DB)
5. Checks config hash for updates
6. Evaluates risk rules (drawdown, equity, positions, margin, daily loss, consecutive losses)
7. If risk breached with `KILL_EA` or `PAUSE_EA` action → returns `killed` status

---

### GET /api/ea/sync-config

Fetches current strategy configuration and risk rules.

**Request:** `GET /api/ea/sync-config` (no body)

**Response (200):**
```json
{
  "configHash": "a1b2c3d4e5f6...",
  "config": {
    "lotSize": 0.1,
    "riskPercent": 1.5,
    "stopLossPips": 40,
    "takeProfitPips": 80,
    "trailingStopPips": 20,
    "maxSlippage": 15,
    "tradeOnNewBar": true,
    "comment": "EASaaS_v2",
    "syncIntervalSec": 300
  },
  "riskConfig": {
    "maxDrawdownPct": 15,
    "maxDailyLossPct": 3,
    "maxConsecutiveLosses": 4,
    "equityProtectionUsd": 1000,
    "maxOpenPositions": 3,
    "maxSpreadPips": 20,
    "sessionStartHour": 8,
    "sessionEndHour": 18,
    "marginLevelPct": 200
  },
  "killSwitch": false,
  "killSwitchReason": null
}
```

### POST /api/ea/sync-config

Acknowledges receipt of a configuration update.

**Request:**
```json
{
  "configHash": "a1b2c3d4e5f6...",
  "timestamp": "2026-04-16T08:30:00Z"
}
```

**Response (200):**
```json
{
  "acknowledged": true
}
```

---

### POST /api/ea/kill-switch

Acknowledges that the EA received and processed the kill switch.

**Request:**
```json
{
  "accountNumber": "12345678",
  "acknowledged": true,
  "reason": "Risk rule breached: MAX_DRAWDOWN",
  "timestamp": "2026-04-16T08:30:00Z"
}
```

**Response (200):**
```json
{
  "acknowledged": true
}
```

The server creates an audit log entry for this acknowledgment.

---

## License Lifecycle

```
                    ┌──────────┐
                    │ UNKNOWN   │ ← Initial state on EA start
                    └─────┬─────┘
                          │ ValidateLicense()
                          ▼
                    ┌──────────┐
              ┌─────│VALIDATING│─────┐
              │     └─────┬─────┘    │
              │            │          │
         ┌────▼────┐  ┌────▼────┐    │
         │  ACTIVE │  │  ERROR  │◄───┘ (network/server error)
         └────┬────┘  └─────────┘
              │
     ┌────────┼────────┬──────────┐
     ▼        ▼        ▼          ▼
┌─────────┐┌────────┐┌────────┐┌────────┐
│ EXPIRED ││REVOKED ││ KILLED ││ PAUSED │
└─────────┘└────────┘└────────┘└────────┘
```

### State Transitions

| From | To | Trigger |
|------|----|---------|
| UNKNOWN | VALIDATING | `ValidateLicense()` called |
| VALIDATING | ACTIVE | Server returns `valid: true` |
| VALIDATING | EXPIRED | Server returns `error: "EXPIRED"` |
| VALIDATING | REVOKED | Server returns `error: "REVOKED"` |
| VALIDATING | KILLED | Server returns `error: "KILLED"` or kill switch active |
| VALIDATING | PAUSED | Server returns `error: "PAUSED"` |
| VALIDATING | INVALID | Server returns `error: "INVALID_KEY"` or `"MAX_ACCOUNTS_REACHED"` |
| VALIDATING | ERROR | Network failure or server error |
| ACTIVE | EXPIRED | License expiration date passed or server returns expired |
| ACTIVE | KILLED | Kill switch activated (manual or risk breach) |
| ACTIVE | EXPIRED | Cache TTL exceeded and revalidation returns expired |
| ERROR | VALIDATING | Retry attempt on network/server failure |
| ERROR | ACTIVE | Subsequent validation succeeds |

### License Caching

- Valid license results are cached locally for `InpLicenseRevalidateSec` seconds (default: 300s / 5 min)
- During cache TTL, `CheckLicenseValid()` returns the cached result without API calls
- After TTL expires, `LicenseNeedsRevalidation()` returns true, triggering revalidation
- Server-side caching: Redis caches license validation for `RedisTTL.LICENSE_CACHE` seconds
- Kill switch check: Always checked in Redis (fast path) even during cache period

### License Key Format

- Prefix: `ea-`
- Full format: `ea-<uuid>` (e.g., `ea-550e8400-e29b-41d4-a716-446655440000`)
- Keys are stored hashed (SHA-256) in the database; the raw key is shown only once at creation

---

## Risk Rules Reference

The platform enforces 8 risk rules. Rules are evaluated **both server-side** (on heartbeat/metrics) and **client-side** (before each trade). Server-side breaches can trigger `KILL_EA` or `PAUSE_EA` actions. Client-side blocks trade execution.

### 1. Max Drawdown (`MAX_DRAWDOWN`)

**Server Action:** `KILL_EA`  
**Client Check:** `MaxDrawdownCheck()`

| Property | Value |
|----------|-------|
| Config Key | `maxDrawdownPct` |
| Unit | Percentage |
| Default | 20% |
| Calculation | `(Balance - Equity) / Balance × 100` |
| When Breached | No new trades. If `InpCloseOnKill = true`, all positions closed. |

The drawdown is calculated from the current balance vs equity. When drawdown exceeds the threshold, the EA stops opening new trades and optionally closes all positions.

### 2. Daily Loss Limit (`DAILY_LOSS`)

**Server Action:** `KILL_EA`  
**Client Check:** `DailyLossLimitCheck()`

| Property | Value |
|----------|-------|
| Config Key | `maxDailyLossPct` |
| Unit | Percentage |
| Default | 5% |
| Calculation | `|Daily PnL| / Day Start Balance × 100` |
| When Breached | No new trades for the rest of the day. |

The daily start balance is captured at the beginning of each trading day (midnight server time). The daily PnL is calculated from closed trades. When the loss exceeds the threshold, trading is paused until the next day.

### 3. Max Open Positions (`MAX_POSITIONS`)

**Server Action:** `KILL_EA`  
**Client Check:** `MaxPositionsCheck()`

| Property | Value |
|----------|-------|
| Config Key | `maxOpenPositions` |
| Unit | Count |
| Default | 5 |
| Calculation | Count of open positions with the EA's magic number |
| When Breached | No new trades until a position is closed. |

Counts positions by magic number, so multiple EAs on different magic numbers won't interfere.

### 4. Spread Filter (`SPREAD_FILTER`)

**Server Action:** N/A (client-side only)  
**Client Check:** `SpreadFilter()`

| Property | Value |
|----------|-------|
| Config Key | `maxSpreadPips` |
| Unit | Pips |
| Default | 30 |
| Calculation | `(Ask - Bid) / Point` (adjusted for 3/5-digit brokers) |
| When Breached | Trade entry blocked until spread narrows. |

Automatically handles 3-digit (JPY pairs) and 5-digit (ECN) brokers. The spread is checked before every trade entry.

### 5. Session Filter (`SESSION_FILTER`)

**Server Action:** N/A (client-side only)  
**Client Check:** `SessionFilter()`

| Property | Value |
|----------|-------|
| Config Key | `sessionStartHour`, `sessionEndHour` |
| Unit | Hour (0-23, UTC) |
| Default | 7 – 20 |
| Calculation | Current UTC hour |
| When Breached | No trades outside the configured session. |

Supports overnight sessions (e.g., `22` to `6`) where `sessionStartHour > sessionEndHour`.

### 6. Equity Protection (`EQUITY_PROTECTION`)

**Server Action:** `KILL_EA`  
**Client Check:** `EquityProtectionCheck()`

| Property | Value |
|----------|-------|
| Config Key | `equityProtectionUsd` |
| Unit | USD |
| Default | 500 |
| Calculation | `AccountEquity()` |
| When Breached | No new trades. Positions closed if `InpCloseOnKill = true`. |

An absolute equity floor. When equity drops below this threshold, the EA stops trading entirely.

### 7. Consecutive Losses (`CONSECUTIVE_LOSSES`)

**Server Action:** `PAUSE_EA`  
**Client Check:** `ConsecutiveLossCheck()`

| Property | Value |
|----------|-------|
| Config Key | `maxConsecutiveLosses` |
| Unit | Count |
| Default | 5 |
| Calculation | Count of consecutive losing trades (most recent first) |
| When Breached | No new trades. Reset on next winning trade or new day. |

Scans trade history from the most recent closed trade backward. Resets to zero on the first winning trade found. Also resets at the start of a new trading day.

### 8. Margin Level (`MARGIN_LEVEL`)

**Server Action:** `NOTIFY` (warning only)  
**Client Check:** Not enforced client-side by default (configurable)

| Property | Value |
|----------|-------|
| Config Key | `marginLevelPct` |
| Unit | Percentage |
| Default | 150% |
| Calculation | `Equity / Margin × 100` |
| When Breached | Server sends notification. EA does not block trades by default. |

This is primarily a server-side notification rule. The server sends an alert to the user but does not kill the EA. Client-side enforcement can be enabled by setting `g_risk_config.marginLevelEnabled = true`.

### Risk Evaluation Order

Before each trade, `CheckRiskRules()` evaluates in this order:

1. **Equity Protection** — fastest check
2. **Max Drawdown** — requires equity + balance
3. **Daily Loss Limit** — requires daily PnL tracking
4. **Max Positions** — counts open positions
5. **Spread Filter** — requires current market data
6. **Session Filter** — requires current time
7. **Consecutive Losses** — requires trade history scan

All rules must pass for a trade to execute. A single failure blocks the trade.

---

## File Reference

### MT4 Files (`ea-contract/mt4/`)

| File | Purpose | Size |
|------|---------|------|
| `EASaaS_Starter.mq4` | Main EA — OnInit/OnDeinit/OnTick, strategy logic | ~16 KB |
| `EASaaS_Http.mqh` | HTTP client — GET/POST with retry, HMAC signing | ~8 KB |
| `EASaaS_License.mqh` | License state machine — validation, caching, retry | ~9 KB |
| `EASaaS_Heartbeat.mqh` | Heartbeat system — periodic reporting, kill switch detection | ~6 KB |
| `EASaaS_Risk.mqh` | Risk engine — 8 rules, config loading | ~11 KB |
| `EASaaS_Config.mqh` | Config manager — sync, apply, change detection | ~6 KB |
| `EASaaS_Utils.mqh` | Utilities — JSON, Base64, HMAC-SHA256, SHA-256, logging | ~15 KB |
| `EASaaS_Trade.mqh` | Trade execution — open/close/modify with pre-trade checks | ~14 KB |

### MT5 Files (`ea-contract/mt5/`)

| File | Purpose |
|------|---------|
| `EASaaS_Starter.mq5` | MT5 main EA — uses `MqlTradeRequest`/`MqlTradeResult` |
| `EASaaS_Http.mqh` | MT5 HTTP client — `CharArrayToString` for response parsing |
| `EASaaS_License.mqh` | MT5 license — same logic, MQL5 syntax |
| `EASaaS_Heartbeat.mqh` | MT5 heartbeat — `PositionsTotal()`/`PositionGetTicket()` |
| `EASaaS_Risk.mqh` | MT5 risk — `HistoryDealsTotal()`/`HistoryDealGetTicket()` |
| `EASaaS_Config.mqh` | MT5 config — same logic |
| `EASaaS_Utils.mqh` | MT5 utils — `StringGetCharacter()`, `TimeToStruct()` |
| `EASaaS_Trade.mqh` | MT5 trade — `OrderSend(request, result)`, `PositionSelectByTicket()` |

### Key MT4 vs MT5 Differences

| Feature | MT4 | MT5 |
|---------|-----|-----|
| Order send | `OrderSend(symbol, cmd, lots, price, ...)` | `OrderSend(MqlTradeRequest, MqlTradeResult)` |
| Position select | `OrderSelect(ticket, SELECT_BY_TICKET)` | `PositionSelectByTicket(ticket)` |
| Position iteration | `OrdersTotal()` + `OrderSelect(i)` | `PositionsTotal()` + `PositionGetTicket(i)` |
| Trade close | `OrderClose(ticket, lots, price, ...)` | `OrderSend()` with `ORDER_TYPE_SELL`/`BUY` + `position: ticket` |
| Modify SL/TP | `OrderModify(ticket, price, sl, tp, ...)` | `OrderSend()` with `TRADE_ACTION_SLTP` |
| History access | `OrdersHistoryTotal()` + `OrderSelect(i, ...)` | `HistoryDealsTotal()` + `HistoryDealGetTicket(i)` |
| String char | `StringGetCharacter(str, pos)` | `StringGetCharacter(str, pos)` (same) |
| Byte array | `StringToCharArray()` | `StringToByteArray()` (custom) |
| iMA return | Returns double directly | Returns int handle, use `CopyBuffer()` |
| Account info | `AccountBalance()`, `AccountEquity()` | `AccountInfoDouble(ACCOUNT_BALANCE)`, `AccountInfoDouble(ACCOUNT_EQUITY)` |

---

## Building from Source

### Prerequisites

- MetaTrader 4 (Build 1240+) or MetaTrader 5 (Build 3800+)
- MetaEditor (included with MetaTrader)

### Build Steps

1. **Copy all files** to the correct directories (see Installation Guide)

2. **Open MetaEditor**: From MetaTrader, press F4 or Tools → MetaQuotes Language Editor

3. **Open the main file**:
   - MT4: Open `MQL4/Experts/EASaaS_Starter.mq4`
   - MT5: Open `MQL5/Experts/EASaaS_Starter.mq5`

4. **Compile**: Press F7 or click the Compile button

5. **Check for errors**: The Output tab should show `0 errors, 0 warnings`

6. **Verify compilation**: The compiled `.ex4` or `.ex5` file appears in the `Experts/` folder

### Common Compilation Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `cannot open 'EASaaS_Http.mqh'` | Include file not found | Ensure `.mqh` files are in the `Include/` folder |
| `'WebRequest' - function not defined` | Old MT4 build | Update MetaTrader 4 to Build 1240+ |
| `struct undefined` | MQL4 strict mode issue | Add `#property strict` at the top |
| `'PositionSelectByTicket' - undeclared identifier` | MT4 code in MT5 | Use the MT5-specific files from `mt5/` folder |

### Customizing the Strategy

The starter EA includes a simple MA crossover strategy in `ExecuteStrategy()`. To implement your own strategy:

1. Modify `ExecuteStrategy()` in `EASaaS_Starter.mq4`/`.mq5`
2. All platform features (license, heartbeat, risk, config) remain active
3. Your strategy code runs after all pre-trade checks pass
4. Use `OpenBuy()` and `OpenSell()` from `EASaaS_Trade.mqh` — they handle all platform integration automatically

---

## Security Best Practices

### 1. Protect Your License Key

- **Never share** your license key with anyone
- **Never hardcode** the license key in source code distributed to others
- The EA stores the license key only in the input parameter (not written to files)
- License keys are transmitted over HTTPS only

### 2. HMAC Request Signing

When `InpHmacSecret` is configured, all API requests are signed with HMAC-SHA256:

```
Signature = HMAC-SHA256(secret, "METHOD\nPATH\nTIMESTAMP\nBODY")
```

The server can verify request integrity and reject tampered or replayed requests. To enable:

1. Generate a strong secret (32+ characters)
2. Configure it in both the SaaS dashboard and the EA's `InpHmacSecret` parameter
3. The `X-Timestamp` and `X-Signature` headers are automatically added to all requests

### 3. HTTPS Only

- Always use `https://` for the `InpServerUrl`
- Never use `http://` — license keys and account data would be transmitted in plaintext
- The EA does not validate TLS certificates (MT4/MT5 handles this internally)

### 4. WebRequest Whitelist

- Add **only** your API server URL to the MetaTrader WebRequest whitelist
- Do not add wildcard URLs or unrelated domains
- This prevents malicious EAs from exfiltrating data to other servers

### 5. Account Number Binding

- Each license key can be bound to a maximum number of trading accounts (`maxAccounts`)
- The platform auto-links accounts on first heartbeat (if user has auto-link enabled)
- If max accounts is reached, the heartbeat returns `killed` status
- This prevents license sharing between multiple traders

### 6. Kill Switch Security

- Kill switch can be activated by:
  - Platform admin (manual kill)
  - Global kill switch (affects all EAs)
  - Risk engine (automatic kill on rule breach)
- Kill switch state is stored in Redis for instant propagation
- EA must acknowledge kill switch receipt via `/api/ea/kill-switch`
- All kill switch events are audit-logged

### 7. Logging Security

- The EA writes logs to `EASaaS_log.txt` in the common data folder
- Logs include API responses (truncated to 200 chars)
- **License keys are NOT written to log files**
- **API keys are NOT written to log files**
- Only partial keys/hashes may appear for debugging

---

## Troubleshooting Guide

### EA Won't Start

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| Alert: "License key is required!" | `InpLicenseKey` is empty | Enter your license key in EA properties |
| Alert: "API key is required!" | `InpApiKey` is empty | Enter your API key in EA properties |
| Alert: "Server URL not configured!" | Default URL not changed | Set `InpServerUrl` to your platform URL |
| Alert: "License validation failed!" | Invalid/expired license | Check license status in SaaS dashboard |
| EA loads but doesn't trade | Kill switch active | Check SaaS dashboard for kill switch status |
| EA removed immediately | `INIT_PARAMETERS_INCORRECT` | Check all required input parameters |

### Network Errors

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 4060 | WebRequest not allowed | Add server URL to MT4/MT5 whitelist (Tools → Options → EA) |
| 401 | Unauthorized | Check `InpApiKey` and `InpLicenseKey` are correct |
| 403 | Forbidden | License may be revoked or account banned |
| 429 | Too Many Requests | Reduce heartbeat frequency or check rate limits |
| 500 | Server Error | Platform issue — retry with backoff (automatic) |
| Timeout | Server unreachable | Check internet connection and server URL |

### Heartbeat Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| Heartbeat fails repeatedly | Network issue or wrong URL | Check server URL, internet connection |
| `Kill switch activated` in logs | Server sent kill signal | Check SaaS dashboard, resolve risk events |
| Stale heartbeat warning in dashboard | EA not sending heartbeats | Check EA is running, heartbeat interval |
| Heartbeat returns `config_update` every time | Config hash mismatch | Call `/api/ea/sync-config` and acknowledge |

### Risk Rule Breaches

| Rule | How to Fix |
|------|------------|
| `MAX_DRAWDOWN` | Reduce position sizes, increase `maxDrawdownPct` in strategy config |
| `DAILY_LOSS` | Wait for next trading day, or increase `maxDailyLossPct` |
| `MAX_POSITIONS` | Close some positions, or increase `maxOpenPositions` |
| `SPREAD_FILTER` | Wait for spread to narrow, or increase `maxSpreadPips` |
| `SESSION_FILTER` | Wait for trading session, or adjust `sessionStartHour`/`sessionEndHour` |
| `EQUITY_PROTECTION` | Deposit more funds, or lower `equityProtectionUsd` |
| `CONSECUTIVE_LOSSES` | Wait for a winning trade or new day, or increase `maxConsecutiveLosses` |
| `MARGIN_LEVEL` | Deposit more funds or reduce position sizes |

### Kill Switch Recovery

1. **Check the reason**: Look at `g_license.killSwitchReason` in logs
2. **Fix the root cause**: Address the risk breach (see above)
3. **Admin action**: An admin must deactivate the kill switch in the SaaS dashboard
4. **EA recovery**: On next heartbeat with `kill: false`, the EA automatically resumes trading
5. **Manual restart**: If the EA was deinitialized, remove and re-attach it to the chart

### Compilation Errors

| Error | Solution |
|-------|----------|
| `cannot open include file` | Ensure all `.mqh` files are in the `Include/` folder |
| `'CharArrayToString' undeclared` | You're compiling MT5 code in MT4 — use the `mt4/` files |
| `'OrderSend' - wrong parameters count` | MT4 syntax used in MT5 — use the `mt5/` files |
| `struct has no member` | Check file version matches (MT4 vs MT5) |
| Stack overflow | Reduce array sizes in SHA-256 (unlikely with default config) |

### Log File Location

- **MT4**: `<MT4_Data_Folder>/Common/EASaaS_log.txt`
- **MT5**: `<MT5_Data_Folder>/Common/EASaaS_log.txt`
- Access via: File → Open Common Data Folder
- Log rotation: Manual — delete or archive old logs periodically

### Getting Help

1. Check the log file (`EASaaS_log.txt`) for detailed error messages
2. Set `InpLogLevel` to `LOG_DEBUG` or `LOG_TRACE` for maximum verbosity
3. Check the SaaS dashboard for license status and risk events
4. Verify the server URL is accessible from your VPS/browser
5. Contact platform support with your license key prefix (first 8 chars only)

---

## Quick Start Checklist

- [ ] Copy all 8 files to correct MT4/MT5 directories
- [ ] Add API server URL to WebRequest whitelist
- [ ] Compile in MetaEditor (0 errors)
- [ ] Attach EA to chart
- [ ] Enter license key, API key, server URL
- [ ] Enable "Allow live trading" in EA properties
- [ ] Verify license validated (check Experts tab)
- [ ] Verify heartbeat sending (check logs)
- [ ] Confirm risk rules loaded (check logs)
- [ ] Place a test trade or wait for strategy signal

---

*EA SaaS Platform Contract v1.0.0 — Built for reliability, security, and 24/7 forex trading.*