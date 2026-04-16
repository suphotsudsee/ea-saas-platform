//+------------------------------------------------------------------+
//| EASaaS_Risk.mqh                                                   |
//| EA SaaS Platform - Risk Management for MT4                       |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
//| Provides:                                                         |
//|   - CheckRiskRules() — Evaluate all risk rules before trading    |
//|   - MaxDrawdownCheck() — Account drawdown limit                   |
//|   - MaxPositionsCheck() — Position count limit                    |
//|   - SpreadFilter() — Reject trades when spread too wide          |
//|   - SessionFilter() — Only trade during allowed hours             |
//|   - EquityProtection() — Minimum equity threshold                 |
//|   - ConsecutiveLossCheck() — Stop after N consecutive losses     |
//|   - LoadRiskConfig() — Get risk config from API / cached         |
//|   - DailyLossLimit() — Daily loss threshold                      |
//+------------------------------------------------------------------+
#property strict
#include <EASaaS_Http.mqh>
#include <EASaaS_Utils.mqh>

// ─── Risk Rule Result ─────────────────────────────────────────────────────────
struct RiskCheckResult
{
   bool   passed;            // Did the check pass?
   string ruleName;         // Name of the rule
   string message;          // Explanation if failed
   double threshold;       // Configured threshold
   double actual;           // Current actual value
};

// ─── Risk Configuration Structure ─────────────────────────────────────────────
struct RiskConfig
{
   // Max drawdown percentage (e.g., 20.0 means 20%)
   double   maxDrawdownPct;
   bool     maxDrawdownEnabled;

   // Max daily loss percentage (e.g., 5.0 means 5%)
   double   maxDailyLossPct;
   bool     maxDailyLossEnabled;

   // Max consecutive losses before pause (e.g., 5)
   int      maxConsecutiveLosses;
   bool     consecutiveLossEnabled;

   // Equity protection - minimum equity in account currency (e.g., 500.00)
   double   equityProtectionUsd;
   bool     equityProtectionEnabled;

   // Max open positions (e.g., 3)
   int      maxOpenPositions;
   bool     maxPositionsEnabled;

   // Spread filter - max spread in pips per symbol (e.g., 30 pips)
   double   maxSpreadPips;
   bool     spreadFilterEnabled;

   // Session filter - allowed trading hours (UTC)
   int      sessionStartHour;   // e.g., 7 (07:00 UTC)
   int      sessionEndHour;     // e.g., 20 (20:00 UTC)
   bool     sessionFilterEnabled;

   // Margin level minimum percentage (e.g., 150.0)
   double   marginLevelPct;
   bool     marginLevelEnabled;

   // Config loaded flag
   bool     loaded;
   string   configHash;       // Hash of the config for change detection
};

// ─── Global Risk Config ───────────────────────────────────────────────────────
RiskConfig g_risk_config;

// Track today's loss and daily start balance
double g_daily_start_balance = 0;
datetime g_daily_start_date = 0;

// Consecutive loss tracker
int g_consecutive_losses = 0;

// ─── Initialize Risk Config ───────────────────────────────────────────────────

/// Initialize risk config with safe defaults
void RiskInit()
{
   g_risk_config.maxDrawdownPct = 20.0;
   g_risk_config.maxDrawdownEnabled = true;

   g_risk_config.maxDailyLossPct = 5.0;
   g_risk_config.maxDailyLossEnabled = true;

   g_risk_config.maxConsecutiveLosses = 5;
   g_risk_config.consecutiveLossEnabled = true;

   g_risk_config.equityProtectionUsd = 500.0;
   g_risk_config.equityProtectionEnabled = true;

   g_risk_config.maxOpenPositions = 5;
   g_risk_config.maxPositionsEnabled = true;

   g_risk_config.maxSpreadPips = 30.0;
   g_risk_config.spreadFilterEnabled = true;

   g_risk_config.sessionStartHour = 7;
   g_risk_config.sessionEndHour = 20;
   g_risk_config.sessionFilterEnabled = true;

   g_risk_config.marginLevelPct = 150.0;
   g_risk_config.marginLevelEnabled = false;

   g_risk_config.loaded = false;
   g_risk_config.configHash = "";

   g_daily_start_balance = AccountBalance();
   g_daily_start_date = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
   g_consecutive_losses = 0;

   LogInfo("Risk module initialized with defaults");
}

// ─── Load Risk Config from API ────────────────────────────────────────────────

/// Load risk configuration from the SaaS backend
bool LoadRiskConfig(string serverUrl)
{
   string url = serverUrl + "/api/ea/sync-config";

   HttpResponse resp = HttpGet(url);

   if(!resp.success)
   {
      LogError("Failed to load risk config: " + resp.error);
      return false;
   }

   // Check for kill switch in config response
   if(JsonGetBool(resp.body, "killSwitch"))
   {
      LogError("Kill switch active in config response");
      return false;
   }

   // Parse risk config from response
   string riskObj = JsonGetObject(resp.body, "riskConfig");
   if(riskObj == "{}")
   {
      LogWarn("No riskConfig found in server response, using defaults");
      g_risk_config.loaded = true;
      return true;
   }

   // Update risk config from server values
   if(JsonHasKey(riskObj, "maxDrawdownPct"))
   {
      g_risk_config.maxDrawdownPct = JsonGetNumber(riskObj, "maxDrawdownPct");
      g_risk_config.maxDrawdownEnabled = true;
   }
   if(JsonHasKey(riskObj, "maxDailyLossPct"))
   {
      g_risk_config.maxDailyLossPct = JsonGetNumber(riskObj, "maxDailyLossPct");
      g_risk_config.maxDailyLossEnabled = true;
   }
   if(JsonHasKey(riskObj, "maxConsecutiveLosses"))
   {
      g_risk_config.maxConsecutiveLosses = JsonGetInt(riskObj, "maxConsecutiveLosses");
      g_risk_config.consecutiveLossEnabled = true;
   }
   if(JsonHasKey(riskObj, "equityProtectionUsd"))
   {
      g_risk_config.equityProtectionUsd = JsonGetNumber(riskObj, "equityProtectionUsd");
      g_risk_config.equityProtectionEnabled = true;
   }
   if(JsonHasKey(riskObj, "maxOpenPositions"))
   {
      g_risk_config.maxOpenPositions = JsonGetInt(riskObj, "maxOpenPositions");
      g_risk_config.maxPositionsEnabled = true;
   }
   if(JsonHasKey(riskObj, "maxSpreadPips"))
   {
      g_risk_config.maxSpreadPips = JsonGetNumber(riskObj, "maxSpreadPips");
      g_risk_config.spreadFilterEnabled = true;
   }
   if(JsonHasKey(riskObj, "sessionStartHour"))
   {
      g_risk_config.sessionStartHour = JsonGetInt(riskObj, "sessionStartHour");
      g_risk_config.sessionFilterEnabled = true;
   }
   if(JsonHasKey(riskObj, "sessionEndHour"))
   {
      g_risk_config.sessionEndHour = JsonGetInt(riskObj, "sessionEndHour");
      g_risk_config.sessionFilterEnabled = true;
   }
   if(JsonHasKey(riskObj, "marginLevelPct"))
   {
      g_risk_config.marginLevelPct = JsonGetNumber(riskObj, "marginLevelPct");
      g_risk_config.marginLevelEnabled = true;
   }

   // Store config hash for change detection
   g_risk_config.configHash = JsonGetString(resp.body, "configHash");
   g_risk_config.loaded = true;

   LogInfo("Risk config loaded from server: drawdown=" + DoubleToString(g_risk_config.maxDrawdownPct, 1) +
      "% dailyLoss=" + DoubleToString(g_risk_config.maxDailyLossPct, 1) +
      "% maxPositions=" + IntegerToString(g_risk_config.maxOpenPositions) +
      " session=" + IntegerToString(g_risk_config.sessionStartHour) + "-" + IntegerToString(g_risk_config.sessionEndHour) + " UTC");

   return true;
}

// ─── Check All Risk Rules ─────────────────────────────────────────────────────

/// Evaluate all enabled risk rules. Returns true if ALL pass.
bool CheckRiskRules(string symbol, int magicNumber)
{
   if(!g_risk_config.loaded)
   {
      LogWarn("Risk config not loaded, blocking trades");
      return false;
   }

   // Update daily start balance if new day
   UpdateDailyBalance();

   bool allPassed = true;

   // 1. Equity Protection
   if(g_risk_config.equityProtectionEnabled)
   {
      if(!EquityProtectionCheck())
         allPassed = false;
   }

   // 2. Max Drawdown
   if(g_risk_config.maxDrawdownEnabled)
   {
      if(!MaxDrawdownCheck())
         allPassed = false;
   }

   // 3. Max Daily Loss
   if(g_risk_config.maxDailyLossEnabled)
   {
      if(!DailyLossLimitCheck())
         allPassed = false;
   }

   // 4. Max Positions
   if(g_risk_config.maxPositionsEnabled)
   {
      if(!MaxPositionsCheck(magicNumber))
         allPassed = false;
   }

   // 5. Spread Filter
   if(g_risk_config.spreadFilterEnabled && symbol != "")
   {
      if(!SpreadFilter(symbol))
         allPassed = false;
   }

   // 6. Session Filter
   if(g_risk_config.sessionFilterEnabled)
   {
      if(!SessionFilter())
         allPassed = false;
   }

   // 7. Consecutive Losses
   if(g_risk_config.consecutiveLossEnabled)
   {
      if(!ConsecutiveLossCheck())
         allPassed = false;
   }

   return allPassed;
}

// ─── Individual Risk Checks ────────────────────────────────────────────────────

/// Max Drawdown Check: Ensure account drawdown hasn't exceeded threshold
bool MaxDrawdownCheck()
{
   double equity = AccountEquity();
   double balance = AccountBalance();

   // Calculate drawdown percentage
   // Drawdown = (peak equity - current equity) / peak equity * 100
   // We use balance as proxy for peak if we don't track peak
   double drawdownPct = 0;
   if(balance > 0)
   {
      drawdownPct = ((balance - equity) / balance) * 100.0;
   }

   if(drawdownPct >= g_risk_config.maxDrawdownPct)
   {
      LogError(StringFormat("RISK: Max drawdown exceeded! %.2f%% >= %.2f%%",
         drawdownPct, g_risk_config.maxDrawdownPct));
      return false;
   }

   LogTrace(StringFormat("Risk: Drawdown %.2f%% / %.2f%% - OK", drawdownPct, g_risk_config.maxDrawdownPct));
   return true;
}

/// Max Positions Check: Ensure we haven't exceeded the position limit
bool MaxPositionsCheck(int magicNumber)
{
   int openPositions = CountPositionsByMagic(magicNumber);

   if(openPositions >= g_risk_config.maxOpenPositions)
   {
      LogWarn(StringFormat("RISK: Max positions reached! %d >= %d",
         openPositions, g_risk_config.maxOpenPositions));
      return false;
   }

   LogTrace(StringFormat("Risk: Positions %d / %d - OK", openPositions, g_risk_config.maxOpenPositions));
   return true;
}

/// Spread Filter: Reject trades when spread is too wide
bool SpreadFilter(string symbol)
{
   double spread = MarketInfo(symbol, MODE_SPREAD);
   double point = MarketInfo(symbol, MODE_POINT);
   double spreadPips = 0;

   // Calculate spread in pips
   if(point > 0)
   {
      // For 5-digit brokers, spread is in points, need to convert
      int digits = (int)MarketInfo(symbol, MODE_DIGITS);
      if(digits == 3 || digits == 5)
         spreadPips = spread / 10.0;
      else
         spreadPips = spread;
   }

   if(spreadPips > g_risk_config.maxSpreadPips)
   {
      LogWarn(StringFormat("RISK: Spread too wide! %.1f pips > %.1f pips for %s",
         spreadPips, g_risk_config.maxSpreadPips, symbol));
      return false;
   }

   LogTrace(StringFormat("Risk: Spread %.1f / %.1f pips for %s - OK",
      spreadPips, g_risk_config.maxSpreadPips, symbol));
   return true;
}

/// Session Filter: Only trade during allowed hours (UTC)
bool SessionFilter()
{
   int currentHour = CurrentUTCHour();

   // Handle overnight sessions (e.g., 22:00 - 06:00)
   if(g_risk_config.sessionStartHour < g_risk_config.sessionEndHour)
   {
      // Normal session: e.g., 07:00 - 20:00
      if(currentHour < g_risk_config.sessionStartHour || currentHour >= g_risk_config.sessionEndHour)
      {
         LogDebug(StringFormat("RISK: Outside trading session! Hour %d not in [%d, %d) UTC",
            currentHour, g_risk_config.sessionStartHour, g_risk_config.sessionEndHour));
         return false;
      }
   }
   else
   {
      // Overnight session: e.g., 22:00 - 06:00
      if(currentHour >= g_risk_config.sessionEndHour && currentHour < g_risk_config.sessionStartHour)
      {
         LogDebug(StringFormat("RISK: Outside trading session! Hour %d not in overnight [%d, %d) UTC",
            currentHour, g_risk_config.sessionStartHour, g_risk_config.sessionEndHour));
         return false;
      }
   }

   LogTrace(StringFormat("Risk: Session %d UTC in [%d, %d) - OK",
      currentHour, g_risk_config.sessionStartHour, g_risk_config.sessionEndHour));
   return true;
}

/// Equity Protection: Ensure account equity is above minimum
bool EquityProtectionCheck()
{
   double equity = AccountEquity();

   if(equity < g_risk_config.equityProtectionUsd)
   {
      LogError(StringFormat("RISK: Equity below protection level! $%.2f < $%.2f",
         equity, g_risk_config.equityProtectionUsd));
      return false;
   }

   LogTrace(StringFormat("Risk: Equity $%.2f > $%.2f - OK", equity, g_risk_config.equityProtectionUsd));
   return true;
}

/// Consecutive Loss Check: Stop trading after N consecutive losses
bool ConsecutiveLossCheck()
{
   UpdateConsecutiveLosses();

   if(g_consecutive_losses >= g_risk_config.maxConsecutiveLosses)
   {
      LogError(StringFormat("RISK: Consecutive losses %d >= %d — trading paused",
         g_consecutive_losses, g_risk_config.maxConsecutiveLosses));
      return false;
   }

   LogTrace(StringFormat("Risk: Consecutive losses %d / %d - OK",
      g_consecutive_losses, g_risk_config.maxConsecutiveLosses));
   return true;
}

/// Daily Loss Limit Check: Stop trading if daily loss exceeds threshold
bool DailyLossLimitCheck()
{
   UpdateDailyBalance();

   double dailyPnl = AccountBalance() - g_daily_start_balance;
   double dailyLossPct = 0;

   if(g_daily_start_balance > 0)
   {
      dailyLossPct = MathAbs(dailyPnl) / g_daily_start_balance * 100.0;
   }

   // Only check if we're losing
   if(dailyPnl < 0 && dailyLossPct >= g_risk_config.maxDailyLossPct)
   {
      LogError(StringFormat("RISK: Daily loss limit! %.2f%% >= %.2f%% (loss: $%.2f)",
         dailyLossPct, g_risk_config.maxDailyLossPct, dailyPnl));
      return false;
   }

   LogTrace(StringFormat("Risk: Daily P&L $%.2f (%.2f%% / %.2f%%) - OK",
      dailyPnl, dailyLossPct, g_risk_config.maxDailyLossPct));
   return true;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/// Update daily start balance at the start of each new day
void UpdateDailyBalance()
{
   datetime today = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));

   if(g_daily_start_date != today)
   {
      g_daily_start_balance = AccountBalance();
      g_daily_start_date = today;
      g_consecutive_losses = 0; // Reset consecutive losses for new day
      LogInfo("New trading day. Start balance: $" + DoubleToString(g_daily_start_balance, 2));
   }
}

/// Update consecutive loss count by scanning recent closed orders
void UpdateConsecutiveLosses()
{
   int losses = 0;
   int totalChecked = 0;
   int maxToCheck = 50; // Look at last 50 closed orders

   for(int i = OrdersHistoryTotal() - 1; i >= 0 && totalChecked < maxToCheck; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
      {
         if(OrderType() > OP_SELL) continue; // Skip pending orders
         if(OrderCloseTime() == 0) continue;  // Skip open orders

         totalChecked++;

         if(OrderProfit() + OrderSwap() + OrderCommission() < 0)
         {
            losses++;
         }
         else
         {
            break; // Found a winner, stop counting
         }
      }
   }

   g_consecutive_losses = losses;
}

/// Count positions by magic number
int CountPositionsByMagic(int magicNumber)
{
   int count = 0;
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderMagicNumber() == magicNumber && OrderCloseTime() == 0)
            count++;
      }
   }
   return count;
}

/// Get current drawdown percentage
double GetCurrentDrawdownPct()
{
   double equity = AccountEquity();
   double balance = AccountBalance();
   if(balance <= 0) return 0;
   return MathMax(0, (balance - equity) / balance * 100.0);
}

/// Get current daily P&L
double GetDailyPnL()
{
   UpdateDailyBalance();
   return AccountBalance() - g_daily_start_balance;
}

/// Get risk config summary as string
string GetRiskSummary()
{
   return StringFormat("DD:%.1f%% Pos:%d Spread:%.1f Session:%d-%d Consec:%d Daily:%.1f%%",
      g_risk_config.maxDrawdownPct,
      g_risk_config.maxOpenPositions,
      g_risk_config.maxSpreadPips,
      g_risk_config.sessionStartHour,
      g_risk_config.sessionEndHour,
      g_risk_config.maxConsecutiveLosses,
      g_risk_config.maxDailyLossPct);
}