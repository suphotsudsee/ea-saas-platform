//+------------------------------------------------------------------+
//| EASaaS_Starter.mq5                                               |
//| EA SaaS Platform - Starter Expert Advisor for MT5               |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
//| MQL5 version of the EA SaaS Platform Starter                     |
//| Uses MqlTradeRequest/MqlTradeResult for OrderSend               |
//| PositionSelect instead of OrderSelect                            |
//| MQL5-compatible HTTP calls                                       |
//+------------------------------------------------------------------+
#property copyright "EA SaaS Platform"
#property link      "https://yourdomain.com"
#property version   "1.00"
#property strict

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

// SaaS Platform Connection
input string   InpLicenseKey     = "";               // License Key (from SaaS dashboard)
input string   InpApiKey         = "";               // API Key (from SaaS dashboard)
input string   InpServerUrl     = "https://api.yourdomain.com"; // API Server URL
input string   InpHmacSecret    = "";               // HMAC Signing Secret (optional)

// Strategy Parameters
input double   InpLotSize        = 0.0;              // Lot Size (0 = risk-based)
input double   InpRiskPercent    = 1.0;              // Risk % per trade
input int      InpStopLossPips   = 50;               // Stop Loss (pips)
input int      InpTakeProfitPips = 100;              // Take Profit (pips)
input int      InpTrailingStop   = 0;                // Trailing Stop (pips, 0=off)
input int      InpMagicNumber   = 12345;             // Magic Number

// Trading Settings
input string   InpTradeComment  = "EASaaS";           // Order Comment
input int      InpMaxSlippage   = 10;                // Max Slippage (points)
input bool     InpTradeOnNewBar = true;              // Trade Only on New Bar
input bool     InpCloseOnKill   = true;              // Close Positions on Kill Switch

// Heartbeat Settings
input int      InpHeartbeatSec  = 60;                // Heartbeat Interval (seconds)
input int      InpLicenseRevalidateSec = 300;        // License Revalidation (seconds)

// Risk Override Parameters
input double   InpMaxDrawdownPct = 20.0;             // Max Drawdown % (0=use server)
input double   InpMaxDailyLossPct = 5.0;            // Max Daily Loss % (0=use server)
input int      InpMaxPositions   = 5;               // Max Open Positions (0=use server)
input double   InpMaxSpreadPips = 30.0;             // Max Spread Pips (0=use server)
input int      InpSessionStart  = 7;                 // Trading Start Hour (UTC)
input int      InpSessionEnd    = 20;                // Trading End Hour (UTC)
input double   InpEquityProtect = 500.0;            // Min Equity (0=use server)
input int      InpMaxConsecLoss = 5;                 // Max Consecutive Losses (0=use server)

// Logging
input LOG_LEVEL InpLogLevel      = LOG_INFO;          // Log Level

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL STATE
// ═══════════════════════════════════════════════════════════════════════════════

bool   g_ea_initialized = false;
bool   g_ea_killed = false;
int    g_last_bar_time = 0;
double g_lot_size;
double g_risk_percent;
int    g_stop_loss_pips;
int    g_take_profit_pips;
int    g_trailing_stop_pips;
int    g_max_slippage;
int    g_tick_count = 0;
int    g_trade_count = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// OnInit — EA INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

int OnInit()
{
   Print("========================================");
   Print("  EA SaaS Platform Starter v1.0.0 (MT5)");
   Print("  License: ", InpLicenseKey != "" ? InpLicenseKey : "(not set)");
   Print("  Account: ", IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)));
   Print("  Server:  ", InpServerUrl);
   Print("========================================");

   // 1. Set Log Level
   g_log_level = InpLogLevel;
   LogInfo("EA SaaS Platform Starter v1.0.0 (MT5) initializing...");

   // 2. Validate Required Inputs
   if(InpLicenseKey == "")
   {
      LogError("License key is required!");
      Alert("EA SaaS: License key is required!");
      return(INIT_PARAMETERS_INCORRECT);
   }
   if(InpApiKey == "")
   {
      LogError("API key is required!");
      Alert("EA SaaS: API key is required!");
      return(INIT_PARAMETERS_INCORRECT);
   }
   if(InpServerUrl == "" || InpServerUrl == "https://api.yourdomain.com")
   {
      LogError("Server URL not configured!");
      Alert("EA SaaS: Server URL not configured!");
      return(INIT_PARAMETERS_INCORRECT);
   }

   // 3. Configure HTTP Module
   HttpSetApiKey(InpApiKey);
   HttpSetLicenseKey(InpLicenseKey);
   HttpSetHmacSecret(InpHmacSecret);
   HttpSetTimeout(10000);
   HttpSetMaxRetries(3);
   HttpSetBaseDelay(1000);

   // 4. Initialize License Module
   LicenseInit();
   g_license_cache_ttl_sec = InpLicenseRevalidateSec;

   // 5. Validate License
   LogInfo("Validating license with SaaS platform...");
   long accountNumber = AccountInfoInteger(ACCOUNT_LOGIN);

   if(!ValidateLicenseWithRetry(InpServerUrl, IntegerToString(accountNumber)))
   {
      LogError("License validation failed! EA cannot start.");
      Alert("EA SaaS: License validation failed! " + g_license.lastError);
      return(INIT_FAILED);
   }

   LogInfo("License validated successfully!");

   // 6. Load Configuration
   ConfigInit();
   g_lot_size = InpLotSize;
   g_risk_percent = InpRiskPercent;
   g_stop_loss_pips = InpStopLossPips;
   g_take_profit_pips = InpTakeProfitPips;
   g_trailing_stop_pips = InpTrailingStop;
   g_max_slippage = InpMaxSlippage;

   if(LoadConfig(InpServerUrl))
   {
      ApplyConfig(g_lot_size, g_risk_percent, g_stop_loss_pips,
                  g_take_profit_pips, g_trailing_stop_pips, g_max_slippage);
      LogInfo("Server configuration loaded and applied");
   }
   else
   {
      LogWarn("Failed to load server config, using local defaults");
   }

   // 7. Initialize Risk Module
   RiskInit();

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

   LoadRiskConfig(InpServerUrl);
   LogInfo("Risk rules: " + GetRiskSummary());

   // 8. Configure Trade Module
   SetTradeMagicNumber(InpMagicNumber);
   SetTradeMaxSlippage(g_max_slippage);
   SetTradeRetryCount(3);
   SetTradeRetryDelay(1000);

   // 9. Start Heartbeat
   StartHeartbeat(InpHeartbeatSec);

   // 10. Send Initial Heartbeat
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

   // 11. Mark Complete
   g_ea_initialized = true;
   g_ea_killed = false;
   g_last_bar_time = 0;

   LogInfo("EA initialization complete. Ready to trade.");
   Print("  EA SaaS Starter (MT5) initialized successfully!");

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
      case REASON_REMOVE:      reasonStr = "EA removed from chart"; break;
      case REASON_PARAMETERS:  reasonStr = "Parameters changed"; break;
      case REASON_ACCOUNT:     reasonStr = "Account changed"; break;
      case REASON_CHARTCHANGE: reasonStr = "Chart changed"; break;
      case REASON_RECOMPILE:   reasonStr = "EA recompiled"; break;
      case REASON_CLOSE:       reasonStr = "Terminal closing"; break;
      default:                 reasonStr = "Unknown"; break;
   }

   LogInfo("EA deinitializing. Reason: " + reasonStr);
   SendFinalHeartbeat(InpServerUrl, AccountInfoInteger(ACCOUNT_LOGIN));
   StopHeartbeat();
   LogInfo(StringFormat("Session stats: ticks=%d trades=%d", g_tick_count, g_trade_count));
   g_ea_initialized = false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OnTick — MAIN TRADING LOOP
// ═══════════════════════════════════════════════════════════════════════════════

void OnTick()
{
   g_tick_count++;

   if(!g_ea_initialized) return;

   // 2. Handle Kill Switch
   if(g_ea_killed || g_license.state == LICENSE_KILLED || g_license.killSwitch)
   {
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

      if(IsHeartbeatDue())
      {
         HeartbeatResult hbResult = SendHeartbeat(InpServerUrl, AccountInfoInteger(ACCOUNT_LOGIN));
         HandleHeartbeatResponse(hbResult, InpServerUrl);
         if(hbResult.success && !hbResult.killSwitch && g_license.state == LICENSE_ACTIVE)
         {
            g_ea_killed = false;
            LogInfo("Kill switch deactivated! Resuming trading.");
         }
      }
      return;
   }

   // 3. Heartbeat
   if(IsHeartbeatDue())
   {
      HeartbeatResult hbResult = SendHeartbeat(InpServerUrl, AccountInfoInteger(ACCOUNT_LOGIN));
      HandleHeartbeatResponse(hbResult, InpServerUrl);

      if(hbResult.killSwitch)
      {
         g_ea_killed = true;
         if(InpCloseOnKill)
            CloseAllPositions(InpMagicNumber);
         return;
      }

      if(hbResult.configUpdate)
      {
         LogInfo("Config update detected from heartbeat");
         if(LoadConfig(InpServerUrl))
         {
            ApplyConfig(g_lot_size, g_risk_percent, g_stop_loss_pips,
                        g_take_profit_pips, g_trailing_stop_pips, g_max_slippage);
            AcknowledgeConfig(InpServerUrl);
         }
         LoadRiskConfig(InpServerUrl);
      }
   }

   // 4. License Revalidation
   if(LicenseNeedsRevalidation())
   {
      LogDebug("Periodic license revalidation...");
      if(!ValidateLicense(InpServerUrl, IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))))
      {
         LogError("License revalidation failed: " + g_license.lastError);
         if(g_license.state == LICENSE_KILLED || g_license.state == LICENSE_REVOKED)
         {
            g_ea_killed = true;
            if(InpCloseOnKill)
               CloseAllPositions(InpMagicNumber);
            return;
         }
      }
   }

   // 5. Config Sync
   if(ConfigNeedsSync())
   {
      if(LoadConfig(InpServerUrl) && HasConfigChanged())
      {
         ApplyConfig(g_lot_size, g_risk_percent, g_stop_loss_pips,
                     g_take_profit_pips, g_trailing_stop_pips, g_max_slippage);
         AcknowledgeConfig(InpServerUrl);
         LoadRiskConfig(InpServerUrl);
         LogInfo("Config synced: " + GetConfigSummary());
      }
   }

   // 6. New Bar Check
   if(InpTradeOnNewBar)
   {
      int currentBarTime = (int)iTime(_Symbol, PERIOD_CURRENT, 0);
      if(currentBarTime == g_last_bar_time)
         return;
      g_last_bar_time = currentBarTime;
   }

   // 7. Trading Logic
   ExecuteStrategy();

   // 8. Trailing Stop Management
   if(g_trailing_stop_pips > 0)
      ManageTrailingStops();
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

void ExecuteStrategy()
{
   if(!CheckRiskRules(_Symbol, InpMagicNumber))
      return;

   // Simple MA Crossover Strategy
   int fastPeriod = 10;
   int slowPeriod = 50;

   double fastMA_0 = iMA(_Symbol, PERIOD_CURRENT, fastPeriod, 0, MODE_EMA, PRICE_CLOSE, 0);
   double fastMA_1 = iMA(_Symbol, PERIOD_CURRENT, fastPeriod, 0, MODE_EMA, PRICE_CLOSE, 1);
   double slowMA_0 = iMA(_Symbol, PERIOD_CURRENT, slowPeriod, 0, MODE_EMA, PRICE_CLOSE, 0);
   double slowMA_1 = iMA(_Symbol, PERIOD_CURRENT, slowPeriod, 0, MODE_EMA, PRICE_CLOSE, 1);

   // Buy signal
   if(fastMA_1 <= slowMA_1 && fastMA_0 > slowMA_0)
   {
      if(HasPositionMT5(POSITION_TYPE_BUY)) return;
      ClosePositionsByTypeMT5(POSITION_TYPE_SELL);

      double lots = CalculateLotSize(_Symbol, g_risk_percent, g_stop_loss_pips);
      TradeResult result = OpenBuy(_Symbol, lots, g_stop_loss_pips,
         g_take_profit_pips, InpMagicNumber, InpTradeComment);

      if(result.success) g_trade_count++;
   }

   // Sell signal
   if(fastMA_1 >= slowMA_1 && fastMA_0 < slowMA_0)
   {
      if(HasPositionMT5(POSITION_TYPE_SELL)) return;
      ClosePositionsByTypeMT5(POSITION_TYPE_BUY);

      double lots = CalculateLotSize(_Symbol, g_risk_percent, g_stop_loss_pips);
      TradeResult result = OpenSell(_Symbol, lots, g_stop_loss_pips,
         g_take_profit_pips, InpMagicNumber, InpTradeComment);

      if(result.success) g_trade_count++;
   }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

bool HasPositionMT5(ENUM_POSITION_TYPE posType)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 &&
         PositionGetInteger(POSITION_MAGIC) == InpMagicNumber &&
         PositionGetString(POSITION_SYMBOL) == _Symbol &&
         PositionGetInteger(POSITION_TYPE) == posType)
      {
         return true;
      }
   }
   return false;
}

void ClosePositionsByTypeMT5(ENUM_POSITION_TYPE posType)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 &&
         PositionGetInteger(POSITION_MAGIC) == InpMagicNumber &&
         PositionGetString(POSITION_SYMBOL) == _Symbol &&
         PositionGetInteger(POSITION_TYPE) == posType)
      {
         ClosePosition(ticket);
      }
   }
}

void ManageTrailingStops()
{
   if(g_trailing_stop_pips <= 0) return;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket <= 0 || PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)
         continue;

      string sym = PositionGetString(POSITION_SYMBOL);
      int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      double point = SymbolInfoDouble(sym, SYMBOL_POINT);
      double trailPoints = (digits == 3 || digits == 5) ? g_trailing_stop_pips * 10 : g_trailing_stop_pips;
      double trailDistance = trailPoints * point;

      if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
      {
         double currentBid = SymbolInfoDouble(sym, SYMBOL_BID);
         double newSL = NormalizeDouble(currentBid - trailDistance, digits);
         double currentSL = PositionGetDouble(POSITION_SL);

         if(newSL > currentSL || currentSL == 0)
         {
            if(MathAbs(newSL - currentSL) > point)
               ModifyPosition(ticket, newSL, PositionGetDouble(POSITION_TP));
         }
      }
      else if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL)
      {
         double currentAsk = SymbolInfoDouble(sym, SYMBOL_ASK);
         double newSL = NormalizeDouble(currentAsk + trailDistance, digits);
         double currentSL = PositionGetDouble(POSITION_SL);

         if(newSL < currentSL || currentSL == 0)
         {
            if(MathAbs(newSL - currentSL) > point)
               ModifyPosition(ticket, newSL, PositionGetDouble(POSITION_TP));
         }
      }
   }
}

//+------------------------------------------------------------------+