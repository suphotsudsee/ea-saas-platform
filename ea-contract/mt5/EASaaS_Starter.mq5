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

#include "EASaaS_Utils.mqh"
#include "EASaaS_Http.mqh"
#include "EASaaS_License.mqh"
#include "EASaaS_Heartbeat.mqh"
#include "EASaaS_Risk.mqh"
#include "EASaaS_Config.mqh"
#include "EASaaS_Trade.mqh"

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
   ManageTrailingStops();
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

void ExecuteStrategy()
{
   if(!CheckRiskRules(_Symbol, InpMagicNumber))
      return;

   // Forex Swing Master refined swing logic:
   // 1. Align current timeframe with higher-timeframe trend (H4 50/200 EMA)
   // 2. Require a pullback into the trend area
   // 3. Confirm break of structure on the signal candle
   // 4. Size stops dynamically with ATR
   const int trendFastPeriod = 50;
   const int trendSlowPeriod = 200;
   const int rsiPeriod = 14;
   const int atrPeriod = 14;
   const int swingLookback = 6;
   const ENUM_TIMEFRAMES trendTimeframe = PERIOD_H4;

   double emaFast_1 = GetEMAValue(trendFastPeriod, 1);
   double emaFast_2 = GetEMAValue(trendFastPeriod, 2);
   double emaSlow_1 = GetEMAValue(trendSlowPeriod, 1);
   double emaSlow_2 = GetEMAValue(trendSlowPeriod, 2);
   double emaFastHTF_1 = GetEMAValueForTimeframe(trendFastPeriod, 1, trendTimeframe);
   double emaFastHTF_2 = GetEMAValueForTimeframe(trendFastPeriod, 2, trendTimeframe);
   double emaSlowHTF_1 = GetEMAValueForTimeframe(trendSlowPeriod, 1, trendTimeframe);
   double emaSlowHTF_2 = GetEMAValueForTimeframe(trendSlowPeriod, 2, trendTimeframe);
   double rsi_1 = GetRSIValue(rsiPeriod, 1);
   double atrPips = GetATRPips(atrPeriod, 1, PERIOD_CURRENT);

   if(emaFast_1 == EMPTY_VALUE || emaFast_2 == EMPTY_VALUE ||
      emaSlow_1 == EMPTY_VALUE || emaSlow_2 == EMPTY_VALUE ||
      emaFastHTF_1 == EMPTY_VALUE || emaFastHTF_2 == EMPTY_VALUE ||
      emaSlowHTF_1 == EMPTY_VALUE || emaSlowHTF_2 == EMPTY_VALUE ||
      rsi_1 == EMPTY_VALUE || atrPips == EMPTY_VALUE)
   {
      LogWarn("Forex Swing Master: indicator data not ready yet");
      return;
   }

   bool bullishTrend = emaFast_1 > emaSlow_1 &&
                       emaFast_2 >= emaSlow_2 &&
                       emaFastHTF_1 > emaSlowHTF_1 &&
                       emaFastHTF_2 >= emaSlowHTF_2;
   bool bearishTrend = emaFast_1 < emaSlow_1 &&
                       emaFast_2 <= emaSlow_2 &&
                       emaFastHTF_1 < emaSlowHTF_1 &&
                       emaFastHTF_2 <= emaSlowHTF_2;

   double close_1 = iClose(_Symbol, PERIOD_CURRENT, 1);
   double open_1 = iOpen(_Symbol, PERIOD_CURRENT, 1);
   double high_1 = iHigh(_Symbol, PERIOD_CURRENT, 1);
   double low_1 = iLow(_Symbol, PERIOD_CURRENT, 1);
   double htfClose_1 = iClose(_Symbol, trendTimeframe, 1);
   double htfOpen_1 = iOpen(_Symbol, trendTimeframe, 1);

   double swingHigh = GetRecentSwingHigh(swingLookback, 2);
   double swingLow = GetRecentSwingLow(swingLookback, 2);

   bool bullishBreakOfStructure = close_1 > swingHigh;
   bool bearishBreakOfStructure = close_1 < swingLow;
   bool htfBullishClose = htfClose_1 > htfOpen_1;
   bool htfBearishClose = htfClose_1 < htfOpen_1;
   bool inOverlapSession = IsInLondonNewYorkOverlap();

   bool bullishPullback = bullishTrend &&
                          inOverlapSession &&
                          htfBullishClose &&
                          low_1 <= emaFast_1 &&
                          low_1 > emaSlow_1 &&
                          close_1 > open_1 &&
                          rsi_1 >= 50.0 && rsi_1 <= 68.0 &&
                          bullishBreakOfStructure;

   bool bearishPullback = bearishTrend &&
                          inOverlapSession &&
                          htfBearishClose &&
                          high_1 >= emaFast_1 &&
                          high_1 < emaSlow_1 &&
                          close_1 < open_1 &&
                          rsi_1 >= 32.0 && rsi_1 <= 50.0 &&
                          bearishBreakOfStructure;

   int dynamicStopLossPips = (int)MathMax((double)g_stop_loss_pips, MathCeil(atrPips * 1.5));
   int dynamicTakeProfitPips = (int)MathMax((double)g_take_profit_pips, (double)(dynamicStopLossPips * 2));

   if(bullishPullback)
   {
      if(HasPositionMT5(POSITION_TYPE_BUY))
         return;

      ClosePositionsByTypeMT5(POSITION_TYPE_SELL);

      double lots = CalculateLotSize(_Symbol, g_risk_percent, g_stop_loss_pips);
      TradeResult result = OpenBuy(
         _Symbol,
         lots,
         dynamicStopLossPips,
         dynamicTakeProfitPips,
         InpMagicNumber,
         InpTradeComment + "_FSM_BUY"
      );

      if(result.success)
      {
         g_trade_count++;
         LogInfo("Forex Swing Master: bullish swing entry opened");
      }
      return;
   }

   if(bearishPullback)
   {
      if(HasPositionMT5(POSITION_TYPE_SELL))
         return;

      ClosePositionsByTypeMT5(POSITION_TYPE_BUY);

      double lots = CalculateLotSize(_Symbol, g_risk_percent, g_stop_loss_pips);
      TradeResult result = OpenSell(
         _Symbol,
         lots,
         dynamicStopLossPips,
         dynamicTakeProfitPips,
         InpMagicNumber,
         InpTradeComment + "_FSM_SELL"
      );

      if(result.success)
      {
         g_trade_count++;
         LogInfo("Forex Swing Master: bearish swing entry opened");
      }
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

double GetEMAValue(int period, int shift)
{
   return GetEMAValueForTimeframe(period, shift, PERIOD_CURRENT);
}

double GetEMAValueForTimeframe(int period, int shift, ENUM_TIMEFRAMES timeframe)
{
   int handle = iMA(_Symbol, timeframe, period, 0, MODE_EMA, PRICE_CLOSE);
   if(handle == INVALID_HANDLE)
      return EMPTY_VALUE;

   double buffer[];
   ArraySetAsSeries(buffer, true);

   if(CopyBuffer(handle, 0, shift, 1, buffer) <= 0)
   {
      IndicatorRelease(handle);
      return EMPTY_VALUE;
   }

   IndicatorRelease(handle);
   return buffer[0];
}

double GetRSIValue(int period, int shift)
{
   int handle = iRSI(_Symbol, PERIOD_CURRENT, period, PRICE_CLOSE);
   if(handle == INVALID_HANDLE)
      return EMPTY_VALUE;

   double buffer[];
   ArraySetAsSeries(buffer, true);

   if(CopyBuffer(handle, 0, shift, 1, buffer) <= 0)
   {
      IndicatorRelease(handle);
      return EMPTY_VALUE;
   }

   IndicatorRelease(handle);
   return buffer[0];
}

double GetATRPips(int period, int shift, ENUM_TIMEFRAMES timeframe)
{
   int handle = iATR(_Symbol, timeframe, period);
   if(handle == INVALID_HANDLE)
      return EMPTY_VALUE;

   double buffer[];
   ArraySetAsSeries(buffer, true);

   if(CopyBuffer(handle, 0, shift, 1, buffer) <= 0)
   {
      IndicatorRelease(handle);
      return EMPTY_VALUE;
   }

   IndicatorRelease(handle);

   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double pipSize = (digits == 3 || digits == 5) ? point * 10.0 : point;
   if(pipSize <= 0.0)
      return EMPTY_VALUE;

   return buffer[0] / pipSize;
}

bool IsInLondonNewYorkOverlap()
{
   MqlDateTime now;
   TimeToStruct(TimeGMT(), now);
   return now.hour >= 13 && now.hour < 17;
}

double GetRecentSwingHigh(int bars, int startShift)
{
   double highest = iHigh(_Symbol, PERIOD_CURRENT, startShift);
   for(int shift = startShift + 1; shift < startShift + bars; shift++)
   {
      double high = iHigh(_Symbol, PERIOD_CURRENT, shift);
      if(high > highest)
         highest = high;
   }
   return highest;
}

double GetRecentSwingLow(int bars, int startShift)
{
   double lowest = iLow(_Symbol, PERIOD_CURRENT, startShift);
   for(int shift = startShift + 1; shift < startShift + bars; shift++)
   {
      double low = iLow(_Symbol, PERIOD_CURRENT, shift);
      if(low < lowest)
         lowest = low;
   }
   return lowest;
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
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket <= 0 || PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)
         continue;

      string sym = PositionGetString(POSITION_SYMBOL);
      int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      double point = SymbolInfoDouble(sym, SYMBOL_POINT);
      double atrTrailPips = GetATRPips(14, 1, PERIOD_CURRENT);
      double baseTrailPips = g_trailing_stop_pips > 0 ? g_trailing_stop_pips : atrTrailPips;
      if(baseTrailPips == EMPTY_VALUE || baseTrailPips <= 0.0)
         continue;

      double effectiveTrailPips = g_trailing_stop_pips > 0 ? MathMax((double)g_trailing_stop_pips, atrTrailPips) : atrTrailPips;
      double trailPoints = (digits == 3 || digits == 5) ? effectiveTrailPips * 10 : effectiveTrailPips;
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
