//+------------------------------------------------------------------+
//| EASaaS_Starter.mq4                                               |
//| EA SaaS Platform - Starter Expert Advisor for MT4               |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
//| This EA connects to the EA SaaS Platform backend and provides:   |
//|   - License validation on startup                                |
//|   - Periodic heartbeat to the platform                           |
//|   - Configuration sync from the platform                         |
//|   - Kill switch handling                                          |
//|   - Full risk management integration                             |
//|   - Trade execution with safety checks                           |
//|                                                                    |
//| SETUP:                                                             |
//|   1. Enter your License Key from the SaaS dashboard              |
//|   2. Enter your API Key from the SaaS dashboard                  |
//|   3. Set the API Server URL (e.g., https://api.yourdomain.com)   |
//|   4. Add the server URL to MT4 whitelist:                        |
//|      Tools > Options > Expert Advisors > Allow WebRequest        |
//+------------------------------------------------------------------+
#property copyright "EA SaaS Platform"
#property link      "https://yourdomain.com"
#property version   "1.00"
#property strict

// ─── Include Libraries ────────────────────────────────────────────────────────
#include <EASaaS_Utils.mqh>
#include <EASaaS_Http.mqh>
#include <EASaaS_License.mqh>
#include <EASaaS_Heartbeat.mqh>
#include <EASaaS_Risk.mqh>
#include <EASaaS_Config.mqh>
#include <EASaaS_Trade.mqh>

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── SaaS Platform Connection ─────────────────────────────────────────────────
input string   InpLicenseKey     = "";              // License Key (from SaaS dashboard)
input string   InpApiKey         = "";              // API Key (from SaaS dashboard)
input string   InpServerUrl     = "https://api.yourdomain.com"; // API Server URL
input string   InpHmacSecret    = "";              // HMAC Signing Secret (optional)

// ─── Strategy Parameters ──────────────────────────────────────────────────────
input double   InpLotSize        = 0.0;             // Lot Size (0 = risk-based)
input double   InpRiskPercent    = 1.0;             // Risk % per trade
input int      InpStopLossPips   = 50;              // Stop Loss (pips)
input int      InpTakeProfitPips = 100;             // Take Profit (pips)
input int      InpTrailingStop   = 0;               // Trailing Stop (pips, 0=off)
input int      InpMagicNumber   = 12345;            // Magic Number

// ─── Trading Settings ─────────────────────────────────────────────────────────
input string   InpTradeComment  = "EASaaS";         // Order Comment
input int      InpMaxSlippage   = 10;               // Max Slippage (points)
input bool     InpTradeOnNewBar = true;             // Trade Only on New Bar
input bool     InpCloseOnKill   = true;             // Close Positions on Kill Switch

// ─── Heartbeat Settings ───────────────────────────────────────────────────────
input int      InpHeartbeatSec  = 60;               // Heartbeat Interval (seconds)
input int      InpLicenseRevalidateSec = 300;       // License Revalidation (seconds)

// ─── Risk Override Parameters ─────────────────────────────────────────────────
input double   InpMaxDrawdownPct = 20.0;            // Max Drawdown % (0=use server)
input double   InpMaxDailyLossPct = 5.0;            // Max Daily Loss % (0=use server)
input int      InpMaxPositions   = 5;               // Max Open Positions (0=use server)
input double   InpMaxSpreadPips = 30.0;             // Max Spread Pips (0=use server)
input int      InpSessionStart  = 7;                // Trading Start Hour (UTC)
input int      InpSessionEnd    = 20;               // Trading End Hour (UTC)
input double   InpEquityProtect = 500.0;            // Min Equity (0=use server)
input int      InpMaxConsecLoss = 5;                // Max Consecutive Losses (0=use server)

// ─── Logging ──────────────────────────────────────────────────────────────────
input LOG_LEVEL InpLogLevel      = LOG_INFO;         // Log Level

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL STATE
// ═══════════════════════════════════════════════════════════════════════════════

bool   g_ea_initialized = false;       // Whether EA has been fully initialized
bool   g_ea_killed = false;            // Kill switch active flag
int    g_last_bar_time = 0;            // Time of last processed bar (for new bar detection)

// Config values that can be updated from server
double g_lot_size;
double g_risk_percent;
int    g_stop_loss_pips;
int    g_take_profit_pips;
int    g_trailing_stop_pips;
int    g_max_slippage;

// Counters
int    g_tick_count = 0;
int    g_trade_count = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// OnInit — EA INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

int OnInit()
{
   Print("========================================");
   Print("  EA SaaS Platform Starter v1.0.0");
   Print("  License: ", InpLicenseKey != "" ? InpLicenseKey : "(not set)");
   Print("  Account: ", IntegerToString(AccountNumber()));
   Print("  Server:  ", InpServerUrl);
   Print("========================================");

   // ─── 1. Set Log Level ───────────────────────────────────────────────────
   g_log_level = InpLogLevel;
   LogInfo("EA SaaS Platform Starter v1.0.0 initializing...");

   // ─── 2. Validate Required Inputs ────────────────────────────────────────
   if(InpLicenseKey == "")
   {
      LogError("License key is required! Set InpLicenseKey in EA properties.");
      Alert("EA SaaS: License key is required!");
      return(INIT_PARAMETERS_INCORRECT);
   }

   if(InpApiKey == "")
   {
      LogError("API key is required! Set InpApiKey in EA properties.");
      Alert("EA SaaS: API key is required!");
      return(INIT_PARAMETERS_INCORRECT);
   }

   if(InpServerUrl == "" || InpServerUrl == "https://api.yourdomain.com")
   {
      LogError("Server URL not configured! Set InpServerUrl in EA properties.");
      Alert("EA SaaS: Server URL not configured!");
      return(INIT_PARAMETERS_INCORRECT);
   }

   // ─── 3. Configure HTTP Module ──────────────────────────────────────────
   HttpSetApiKey(InpApiKey);
   HttpSetLicenseKey(InpLicenseKey);
   HttpSetHmacSecret(InpHmacSecret);
   HttpSetTimeout(10000);
   HttpSetMaxRetries(3);
   HttpSetBaseDelay(1000);

   // ─── 4. Initialize License Module ──────────────────────────────────────
   LicenseInit();
   g_license_cache_ttl_sec = InpLicenseRevalidateSec;

   // ─── 5. Validate License ──────────────────────────────────────────────
   LogInfo("Validating license with SaaS platform...");
   string accountNumber = IntegerToString(AccountNumber());

   if(!ValidateLicenseWithRetry(InpServerUrl, accountNumber))
   {
      LogError("License validation failed! EA cannot start.");
      Alert("EA SaaS: License validation failed! " + g_license.lastError);
      return(INIT_FAILED);
   }

   LogInfo("License validated successfully!");

   // ─── 6. Load Configuration from Server ────────────────────────────────
   ConfigInit();

   // Apply local input defaults first
   g_lot_size = InpLotSize;
   g_risk_percent = InpRiskPercent;
   g_stop_loss_pips = InpStopLossPips;
   g_take_profit_pips = InpTakeProfitPips;
   g_trailing_stop_pips = InpTrailingStop;
   g_max_slippage = InpMaxSlippage;

   if(LoadConfig(InpServerUrl))
   {
      // Apply server config (overrides local defaults)
      ApplyConfig(g_lot_size, g_risk_percent, g_stop_loss_pips,
                  g_take_profit_pips, g_trailing_stop_pips, g_max_slippage);
      LogInfo("Server configuration loaded and applied");
   }
   else
   {
      LogWarn("Failed to load server config, using local defaults");
   }

   // ─── 7. Initialize Risk Module ────────────────────────────────────────
   RiskInit();

   // Apply local risk overrides (if non-zero, they override server values)
   if(InpMaxDrawdownPct > 0) g_risk_config.maxDrawdownPct = InpMaxDrawdownPct;
   if(InpMaxDailyLossPct > 0) g_risk_config.maxDailyLossPct = InpMaxDailyLossPct;
   if(InpMaxPositions > 0) g_risk_config.maxOpenPositions = InpMaxPositions;
   if(InpMaxSpreadPips > 0) g_risk_config.maxSpreadPips = InpMaxSpreadPips;
   if(InpSessionStart > 0 || InpSessionEnd > 0)
   {
      g_risk_config.sessionStartHour = InpSessionStart;
      g_risk_config.sessionEndHour = InpSessionEnd;
   }
   if(InpEquityProtect > 0) g_risk_config.equityProtectionUsd = InpEquityProtect;
   if(InpMaxConsecLoss > 0) g_risk_config.maxConsecutiveLosses = InpMaxConsecLoss;

   // Load risk config from server (may override local values)
   if(g_risk_config.loaded == false && g_raw_risk_config_json != "")
   {
      // Risk config was loaded with the main config
      LogInfo("Risk config available from server response");
   }
   else if(LoadRiskConfig(InpServerUrl))
   {
      LogInfo("Risk config loaded from server");
   }
   else
   {
      LogWarn("Failed to load risk config from server, using local overrides");
   }

   LogInfo("Risk rules: " + GetRiskSummary());

   // ─── 8. Configure Trade Module ────────────────────────────────────────
   SetTradeMagicNumber(InpMagicNumber);
   SetTradeMaxSlippage(g_max_slippage);
   SetTradeRetryCount(3);
   SetTradeRetryDelay(1000);

   // ─── 9. Start Heartbeat System ────────────────────────────────────────
   StartHeartbeat(InpHeartbeatSec);

   // ─── 10. Send Initial Heartbeat ────────────────────────────────────────
   HeartbeatResult hbResult = SendHeartbeat(InpServerUrl, accountNumber);
   if(hbResult.success)
   {
      LogInfo("Initial heartbeat sent successfully");
      HandleHeartbeatResponse(hbResult, InpServerUrl);
   }
   else
   {
      LogWarn("Initial heartbeat failed (will retry on next tick)");
   }

   // ─── 11. Mark Initialization Complete ─────────────────────────────────
   g_ea_initialized = true;
   g_ea_killed = false;
   g_last_bar_time = 0;

   LogInfo("EA initialization complete. Ready to trade.");
   Print("  EA SaaS Starter initialized successfully!");

   return(INIT_SUCCEEDED);
}

// ═══════════════════════════════════════════════════════════════════════════════
// OnDeinit — EA CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

void OnDeinit(const int reason)
{
   string reasonStr = "";
   switch(reason)
   {
      case REASON_REMOVE:     reasonStr = "EA removed from chart"; break;
      case REASON_PARAMETERS: reasonStr = "Parameters changed"; break;
      case REASON_ACCOUNT:    reasonStr = "Account changed"; break;
      case REASON_CHARTCHANGE: reasonStr = "Chart timeframe/symbol changed"; break;
      case REASON_RECOMPILE:  reasonStr = "EA recompiled"; break;
      case REASON_CLOSE:      reasonStr = "Terminal closing"; break;
      default:                reasonStr = "Unknown (reason=" + IntegerToString(reason) + ")"; break;
   }

   LogInfo("EA deinitializing. Reason: " + reasonStr);

   // Send final heartbeat
   SendFinalHeartbeat(InpServerUrl, IntegerToString(AccountNumber()));

   // Stop heartbeat system
   StopHeartbeat();

   // Log final stats
   LogInfo(StringFormat("Session stats: ticks=%d trades=%d", g_tick_count, g_trade_count));
   LogInfo("EA deinitialization complete.");

   g_ea_initialized = false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OnTick — MAIN TRADING LOOP
// ═══════════════════════════════════════════════════════════════════════════════

void OnTick()
{
   g_tick_count++;

   // ─── 1. Check Initialization ────────────────────────────────────────────
   if(!g_ea_initialized) return;

   // ─── 2. Handle Kill Switch ──────────────────────────────────────────────
   if(g_ea_killed || g_license.state == LICENSE_KILLED || g_license.killSwitch)
   {
      // Kill switch is active — don't open new trades
      // Optionally close existing positions
      if(InpCloseOnKill && !g_ea_killed)
      {
         LogError("Kill switch detected! Closing all positions...");
         CloseAllPositions(InpMagicNumber);
         g_ea_killed = true;
      }
      else if(!g_ea_killed)
      {
         g_ea_killed = true;
         LogError("Kill switch active. No new trades will be opened.");
      }

      // Still send heartbeats while killed
      if(IsHeartbeatDue())
      {
         HeartbeatResult hbResult = SendHeartbeat(InpServerUrl, IntegerToString(AccountNumber()));
         HandleHeartbeatResponse(hbResult, InpServerUrl);

         // Check if kill switch was deactivated
         if(hbResult.success && !hbResult.killSwitch && g_license.state == LICENSE_ACTIVE)
         {
            g_ea_killed = false;
            LogInfo("Kill switch deactivated! Resuming trading.");
         }
      }
      return;
   }

   // ─── 3. Send Heartbeat if Due ──────────────────────────────────────────
   if(IsHeartbeatDue())
   {
      HeartbeatResult hbResult = SendHeartbeat(InpServerUrl, IntegerToString(AccountNumber()));
      HandleHeartbeatResponse(hbResult, InpServerUrl);

      // Check heartbeat response for kill switch
      if(hbResult.killSwitch)
      {
         g_ea_killed = true;
         if(InpCloseOnKill)
         {
            CloseAllPositions(InpMagicNumber);
         }
         return;
      }

      // Check if config update needed
      if(hbResult.configUpdate)
      {
         LogInfo("Config update detected from heartbeat");
         if(LoadConfig(InpServerUrl))
         {
            ApplyConfig(g_lot_size, g_risk_percent, g_stop_loss_pips,
                        g_take_profit_pips, g_trailing_stop_pips, g_max_slippage);
            AcknowledgeConfig(InpServerUrl);
         }

         // Also reload risk config
         LoadRiskConfig(InpServerUrl);
      }
   }

   // ─── 4. Periodic License Revalidation ──────────────────────────────────
   if(LicenseNeedsRevalidation())
   {
      LogDebug("Periodic license revalidation...");
      if(!ValidateLicense(InpServerUrl, IntegerToString(AccountNumber())))
      {
         LogError("License revalidation failed: " + g_license.lastError);

         // If killed or revoked, stop trading
         if(g_license.state == LICENSE_KILLED || g_license.state == LICENSE_REVOKED)
         {
            g_ea_killed = true;
            if(InpCloseOnKill)
               CloseAllPositions(InpMagicNumber);
            return;
         }
      }
   }

   // ─── 5. Periodic Config Sync ──────────────────────────────────────────
   if(ConfigNeedsSync())
   {
      if(LoadConfig(InpServerUrl))
      {
         if(HasConfigChanged())
         {
            ApplyConfig(g_lot_size, g_risk_percent, g_stop_loss_pips,
                        g_take_profit_pips, g_trailing_stop_pips, g_max_slippage);
            AcknowledgeConfig(InpServerUrl);
            LoadRiskConfig(InpServerUrl);
            LogInfo("Config synced and applied: " + GetConfigSummary());
         }
      }
   }

   // ─── 6. New Bar Check ──────────────────────────────────────────────────
   if(InpTradeOnNewBar)
   {
      int currentBarTime = iTime(Symbol(), PERIOD_CURRENT, 0);
      if(currentBarTime == g_last_bar_time)
         return; // Same bar, skip
      g_last_bar_time = currentBarTime;
   }

   // ─── 7. Trading Logic ──────────────────────────────────────────────────
   // This is where you implement YOUR strategy.
   // The starter provides a simple signal example using MA crossover.
   // Replace this with your actual trading strategy.

   ExecuteStrategy();

   // ─── 8. Trailing Stop Management ──────────────────────────────────────
   if(g_trailing_stop_pips > 0)
   {
      ManageTrailingStops();
   }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

/// Execute the trading strategy.
/// This is a SIMPLE MA crossover example — REPLACE with your own strategy.
void ExecuteStrategy()
{
   // ─── Pre-trade Risk Check ──────────────────────────────────────────────
   if(!CheckRiskRules(Symbol(), InpMagicNumber))
      return;

   // ─── Strategy: Simple Moving Average Crossover ────────────────────────
   // Fast MA (period 10) crosses Slow MA (period 50)
   int fastPeriod = 10;
   int slowPeriod = 50;

   double fastMA_0 = iMA(Symbol(), PERIOD_CURRENT, fastPeriod, 0, MODE_EMA, PRICE_CLOSE, 0);
   double fastMA_1 = iMA(Symbol(), PERIOD_CURRENT, fastPeriod, 0, MODE_EMA, PRICE_CLOSE, 1);
   double slowMA_0 = iMA(Symbol(), PERIOD_CURRENT, slowPeriod, 0, MODE_EMA, PRICE_CLOSE, 0);
   double slowMA_1 = iMA(Symbol(), PERIOD_CURRENT, slowPeriod, 0, MODE_EMA, PRICE_CLOSE, 1);

   // Buy signal: Fast MA crosses above Slow MA
   if(fastMA_1 <= slowMA_1 && fastMA_0 > slowMA_0)
   {
      // Check if we already have a buy position
      if(HasPosition(OP_BUY)) return;

      // Close any sell positions first (if hedging not allowed)
      ClosePositionsByType(OP_SELL);

      // Calculate lot size
      double lots = CalculateLotSize(Symbol(), g_risk_percent, g_stop_loss_pips);

      // Open buy
      TradeResult result = OpenBuy(Symbol(), lots, g_stop_loss_pips,
         g_take_profit_pips, InpMagicNumber, InpTradeComment);

      if(result.success)
         g_trade_count++;
   }

   // Sell signal: Fast MA crosses below Slow MA
   if(fastMA_1 >= slowMA_1 && fastMA_0 < slowMA_0)
   {
      // Check if we already have a sell position
      if(HasPosition(OP_SELL)) return;

      // Close any buy positions first
      ClosePositionsByType(OP_BUY);

      // Calculate lot size
      double lots = CalculateLotSize(Symbol(), g_risk_percent, g_stop_loss_pips);

      // Open sell
      TradeResult result = OpenSell(Symbol(), lots, g_stop_loss_pips,
         g_take_profit_pips, InpMagicNumber, InpTradeComment);

      if(result.success)
         g_trade_count++;
   }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/// Check if we have an open position of the specified type
bool HasPosition(int orderType)
{
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderMagicNumber() == InpMagicNumber &&
            OrderType() == orderType &&
            OrderCloseTime() == 0)
         {
            return true;
         }
      }
   }
   return false;
}

/// Close all positions of a specific type
void ClosePositionsByType(int orderType)
{
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderMagicNumber() == InpMagicNumber &&
            OrderType() == orderType &&
            OrderCloseTime() == 0)
         {
            ClosePosition(OrderTicket());
         }
      }
   }
}

/// Manage trailing stops for all open positions
void ManageTrailingStops()
{
   if(g_trailing_stop_pips <= 0) return;

   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderMagicNumber() != InpMagicNumber || OrderCloseTime() != 0)
            continue;

         string sym = OrderSymbol();
         int digits = (int)MarketInfo(sym, MODE_DIGITS);
         double point = MarketInfo(sym, MODE_POINT);

         // Convert trailing pips to points (for 5-digit brokers)
         double trailPoints = g_trailing_stop_pips;
         if(digits == 3 || digits == 5)
            trailPoints = g_trailing_stop_pips * 10;

         double trailDistance = trailPoints * point;

         if(OrderType() == OP_BUY)
         {
            double currentBid = MarketInfo(sym, MODE_BID);
            double newSL = NormalizeDouble(currentBid - trailDistance, digits);

            // Only move stop up, never down
            if(newSL > OrderStopLoss() || OrderStopLoss() == 0)
            {
               // Make sure new SL is at least a few points from current SL to avoid unnecessary modifications
               if(MathAbs(newSL - OrderStopLoss()) > point)
               {
                  ModifyPosition(OrderTicket(), newSL, OrderTakeProfit());
               }
            }
         }
         else if(OrderType() == OP_SELL)
         {
            double currentAsk = MarketInfo(sym, MODE_ASK);
            double newSL = NormalizeDouble(currentAsk + trailDistance, digits);

            // Only move stop down, never up
            if(newSL < OrderStopLoss() || OrderStopLoss() == 0)
            {
               if(MathAbs(newSL - OrderStopLoss()) > point)
               {
                  ModifyPosition(OrderTicket(), newSL, OrderTakeProfit());
               }
            }
         }
      }
   }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OnChartEvent — Handle Chart Events
// ═══════════════════════════════════════════════════════════════════════════════

void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
{
   // Handle custom chart events if needed
   // For example, you could add a button to manually sync config or revalidate license
}

// ═══════════════════════════════════════════════════════════════════════════════
// OnTimer — Timer Handler (if using EventSetTimer)
// ═══════════════════════════════════════════════════════════════════════════════

void OnTimer()
{
   // Timer-based operations can be used for more precise heartbeat scheduling
   // But we use tick-based heartbeat in this starter
}

//+------------------------------------------------------------------+