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
#include "EASaaS_TradeSync.mqh"
#include "EASaaS_Trade.mqh"

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════════

// SaaS Platform Connection
input string   InpLicenseKey     = "";               // License Key (from SaaS dashboard)
input string   InpApiKey         = "";               // API Key (from SaaS dashboard)
input string   InpServerUrl     = "https://tradecandle.net"; // API Server URL
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
datetime g_last_entry_time = 0;

bool IsGridStrategy()
{
   string lotSizingMethod = GetConfigValue("lotSizingMethod", "");
   if(lotSizingMethod == "") return false;

   string normalizedLotSizingMethod = lotSizingMethod;
   StringToLower(normalizedLotSizingMethod);
   return (StringFind(normalizedLotSizingMethod, "grid") >= 0 ||
           StringFind(normalizedLotSizingMethod, "martingale") >= 0);
}

bool GetConfigBool(string key, bool defaultValue)
{
   string value = GetConfigValue(key, defaultValue ? "true" : "false");
   string normalizedValue = value;
   StringToLower(normalizedValue);
   return (normalizedValue == "true" ||
           normalizedValue == "1" ||
           normalizedValue == "yes" ||
           normalizedValue == "on");
}

// ═══════════════════════════════════════════════════════════════════════════════
// OnInit — EA INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

int OnInit()
{
   Print("========================================");
   Print("  EA SaaS Platform Starter v1.0.0 (MT5)");
   Print("  License: ", InpLicenseKey != "" ? InpLicenseKey : "(not set)");
   Print("  API Key: ", InpApiKey != "" ? InpApiKey : "(not set)");
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
   LogInfo("Init config: license=" + InpLicenseKey +
      " apiKey=" + InpApiKey +
      " account=" + IntegerToString(accountNumber) +
      " server=" + InpServerUrl);

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
   SetTradeServerUrl(InpServerUrl);  // Enable trade event reporting

   // 9. Initialize Trade Sync
   TradeSyncInit();
   LogInfo("Trade sync enabled — all trades will be reported to platform.");

   // 10. Start Heartbeat
   StartHeartbeat(InpHeartbeatSec);

   // 11. Send Initial Heartbeat
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

   // 12. Mark Complete
   g_ea_initialized = true;
   g_ea_killed = false;
   g_last_bar_time = 0;
   g_last_entry_time = 0;

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

   // 6. Detect TP/SL Auto-Close → Report to Platform
   DetectAndReportClosedPositions(InpServerUrl, InpMagicNumber);

   // 7. New Bar Check
   if(InpTradeOnNewBar)
   {
      int currentBarTime = (int)iTime(_Symbol, PERIOD_CURRENT, 0);
      if(currentBarTime == g_last_bar_time)
         return;
      g_last_bar_time = currentBarTime;
   }

   // 8. Trading Logic
   ExecuteStrategy();

   // 9. Trailing Stop Management
   ManageTrailingStops();
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

void ExecuteStrategy()
{
   if(!CheckRiskRules(_Symbol, InpMagicNumber))
      return;

   string configuredSymbol = GetConfigValue("symbol", _Symbol);
   if(configuredSymbol != "" && configuredSymbol != _Symbol)
   {
      LogDebug("Grid strategy waiting for configured symbol: " + configuredSymbol);
      return;
   }

   int gridSizePips = GetConfigValueInt("gridSizePips", 3000);
   int gridTakeProfitPips = GetConfigValueInt("gridTakeProfitPips", 1200);
   int maxOrders = GetConfigValueInt("maxOrders", 6);
   int cooldownBarsAfterLoss = GetConfigValueInt("cooldownBarsAfterLoss", 3);
   int minBarsBetweenEntries = GetConfigValueInt("minBarsBetweenEntries", 2);
   double startLot = GetConfigValueNum("startLot", 0.01);
   double maxLot = GetConfigValueNum("maxLot", 0.10);
   double minAtrPips = GetConfigValueNum("minAtrPips", 4.0);
   double minEmaGapPips = GetConfigValueNum("minEmaGapPips", 2.5);
   string lotSizingMethod = GetConfigValue("lotSizingMethod", "fixed");
   bool allowLong = GetConfigBool("allowLong", false);
   bool allowShort = GetConfigBool("allowShort", true);
   bool restrictToOverlapSession = GetConfigBool("restrictToOverlapSession", true);

   if(restrictToOverlapSession && !IsInLondonNewYorkOverlap())
   {
      LogDebug("Grid strategy: outside preferred overlap session");
      return;
   }

   if(IsCooldownAfterLossActive(cooldownBarsAfterLoss))
   {
      LogDebug("Grid strategy: cooldown after loss is active");
      return;
   }

   if(g_last_entry_time > 0 && GetBarsSinceTime(g_last_entry_time) < minBarsBetweenEntries)
   {
      LogDebug("Grid strategy: entry spacing filter active");
      return;
   }

   int buyCount = CountSymbolPositionsByTypeMT5(POSITION_TYPE_BUY);
   int sellCount = CountSymbolPositionsByTypeMT5(POSITION_TYPE_SELL);
   int totalPositions = buyCount + sellCount;

   // Close the basket when price has mean-reverted enough from the average entry.
   ManageGridBasketExit(gridTakeProfitPips);

   if(totalPositions >= maxOrders)
   {
      LogDebug("Grid strategy: max orders reached");
      return;
   }

   double emaFast = GetEMAValue(21, 1);
   double emaSlow = GetEMAValue(55, 1);
   if(emaFast == EMPTY_VALUE || emaSlow == EMPTY_VALUE)
   {
      LogWarn("Grid strategy: EMA data not ready yet");
      return;
   }

   if(!IsSignalStrongEnough(emaFast, emaSlow, minEmaGapPips, minAtrPips))
   {
      LogDebug("Grid strategy: signal strength filter blocked entry");
      return;
   }

   bool bullishBias = (emaFast > emaSlow) && allowLong;
   bool bearishBias = (emaFast < emaSlow) && allowShort;

   if(totalPositions == 0)
   {
      double initialLots = ResolveGridLotSize(0, startLot, maxLot, lotSizingMethod);
      TradeResult result;

      if(bullishBias)
      {
         result = OpenBuy(_Symbol, initialLots, 0, 0, InpMagicNumber, InpTradeComment + "_GRID_BUY");
         if(result.success)
         {
            g_trade_count++;
            g_last_entry_time = TimeCurrent();
            LogInfo("Grid Trader Elite: initial BUY basket opened");
         }
      }
      else if(bearishBias)
      {
         result = OpenSell(_Symbol, initialLots, 0, 0, InpMagicNumber, InpTradeComment + "_GRID_SELL");
         if(result.success)
         {
            g_trade_count++;
            g_last_entry_time = TimeCurrent();
            LogInfo("Grid Trader Elite: initial SELL basket opened");
         }
      }
      else
      {
         LogDebug("Grid strategy: no directional bias yet");
      }
      return;
   }

   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double gridDistance = GridPipsToPriceDistance(gridSizePips, point, digits);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   if(buyCount > 0 && sellCount == 0)
   {
      double lowestBuyOpen = GetExtremeOpenPriceByTypeMT5(POSITION_TYPE_BUY, true);
      if(allowLong && lowestBuyOpen > 0 && bid <= (lowestBuyOpen - gridDistance))
      {
         double buyLots = ResolveGridLotSize(buyCount, startLot, maxLot, lotSizingMethod);
         TradeResult buyResult = OpenBuy(_Symbol, buyLots, 0, 0, InpMagicNumber, InpTradeComment + "_GRID_BUY");
         if(buyResult.success)
         {
            g_trade_count++;
            g_last_entry_time = TimeCurrent();
            LogInfo("Grid Trader Elite: additional BUY layer opened");
         }
      }
      return;
   }

   if(sellCount > 0 && buyCount == 0)
   {
      double highestSellOpen = GetExtremeOpenPriceByTypeMT5(POSITION_TYPE_SELL, false);
      if(allowShort && highestSellOpen > 0 && ask >= (highestSellOpen + gridDistance))
      {
         double sellLots = ResolveGridLotSize(sellCount, startLot, maxLot, lotSizingMethod);
         TradeResult sellResult = OpenSell(_Symbol, sellLots, 0, 0, InpMagicNumber, InpTradeComment + "_GRID_SELL");
         if(sellResult.success)
         {
            g_trade_count++;
            g_last_entry_time = TimeCurrent();
            LogInfo("Grid Trader Elite: additional SELL layer opened");
         }
      }
      return;
   }

   LogWarn("Grid strategy: mixed long/short basket detected, no new order opened");
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

int CountSymbolPositionsByTypeMT5(ENUM_POSITION_TYPE posType)
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 &&
         PositionGetInteger(POSITION_MAGIC) == InpMagicNumber &&
         PositionGetString(POSITION_SYMBOL) == _Symbol &&
         PositionGetInteger(POSITION_TYPE) == posType)
      {
         count++;
      }
   }
   return count;
}

double GetExtremeOpenPriceByTypeMT5(ENUM_POSITION_TYPE posType, bool lowest)
{
   double extreme = 0.0;
   bool found = false;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket <= 0 ||
         PositionGetInteger(POSITION_MAGIC) != InpMagicNumber ||
         PositionGetString(POSITION_SYMBOL) != _Symbol ||
         PositionGetInteger(POSITION_TYPE) != posType)
      {
         continue;
      }

      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      if(!found)
      {
         extreme = openPrice;
         found = true;
         continue;
      }

      if(lowest && openPrice < extreme)
         extreme = openPrice;
      if(!lowest && openPrice > extreme)
         extreme = openPrice;
   }

   return found ? extreme : 0.0;
}

double GetBasketAverageOpenPriceMT5(ENUM_POSITION_TYPE posType)
{
   double weightedSum = 0.0;
   double totalVolume = 0.0;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket <= 0 ||
         PositionGetInteger(POSITION_MAGIC) != InpMagicNumber ||
         PositionGetString(POSITION_SYMBOL) != _Symbol ||
         PositionGetInteger(POSITION_TYPE) != posType)
      {
         continue;
      }

      double volume = PositionGetDouble(POSITION_VOLUME);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      weightedSum += openPrice * volume;
      totalVolume += volume;
   }

   if(totalVolume <= 0.0)
      return 0.0;

   return weightedSum / totalVolume;
}

double GridPipsToPriceDistance(int pips, double point, int digits)
{
   if(point <= 0.0 || pips <= 0)
      return 0.0;

   double pipMultiplier = (digits == 3 || digits == 5) ? 10.0 : 1.0;
   return pips * pipMultiplier * point;
}

double PriceDistanceToPips(double distance, double point, int digits)
{
   if(point <= 0.0 || distance <= 0.0)
      return 0.0;

   double divisor = (digits == 3 || digits == 5) ? 10.0 : 1.0;
   return (distance / point) / divisor;
}

double ResolveGridLotSize(int layerIndex, double startLot, double maxLot, string lotSizingMethod)
{
   double lots = startLot > 0.0 ? startLot : 0.01;
   string normalizedLotSizingMethod = lotSizingMethod;
   StringToLower(normalizedLotSizingMethod);

   if(StringFind(normalizedLotSizingMethod, "martingale") >= 0)
      lots = startLot * MathPow(2.0, layerIndex);

   if(maxLot > 0.0 && lots > maxLot)
      lots = maxLot;

   return NormalizeLotSize(_Symbol, lots);
}

void ManageGridBasketExit(int gridTakeProfitPips)
{
   if(gridTakeProfitPips <= 0)
      return;

   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double targetDistance = GridPipsToPriceDistance(gridTakeProfitPips, point, digits);
   if(targetDistance <= 0.0)
      return;

   int buyCount = CountSymbolPositionsByTypeMT5(POSITION_TYPE_BUY);
   if(buyCount > 0)
   {
      double avgBuy = GetBasketAverageOpenPriceMT5(POSITION_TYPE_BUY);
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      if(avgBuy > 0.0 && bid >= (avgBuy + targetDistance))
      {
         int closedBuys = ClosePositionsByTypeCountMT5(POSITION_TYPE_BUY);
         if(closedBuys > 0)
            LogInfo("Grid Trader Elite: BUY basket closed at target");
      }
   }

   int sellCount = CountSymbolPositionsByTypeMT5(POSITION_TYPE_SELL);
   if(sellCount > 0)
   {
      double avgSell = GetBasketAverageOpenPriceMT5(POSITION_TYPE_SELL);
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(avgSell > 0.0 && ask <= (avgSell - targetDistance))
      {
         int closedSells = ClosePositionsByTypeCountMT5(POSITION_TYPE_SELL);
         if(closedSells > 0)
            LogInfo("Grid Trader Elite: SELL basket closed at target");
      }
   }
}

int GetBarsSinceTime(datetime eventTime)
{
   if(eventTime <= 0)
      return 999999;

   int shift = iBarShift(_Symbol, PERIOD_CURRENT, eventTime, true);
   if(shift < 0)
      return 999999;

   return shift;
}

double GetLatestClosedTradePnl(datetime &closeTime)
{
   closeTime = 0;
   if(!HistorySelect(TimeCurrent() - 86400 * 30, TimeCurrent()))
      return 0.0;

   int totalDeals = HistoryDealsTotal();
   for(int i = totalDeals - 1; i >= 0; i--)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket <= 0)
         continue;

      if(HistoryDealGetString(dealTicket, DEAL_SYMBOL) != _Symbol)
         continue;

      if((int)HistoryDealGetInteger(dealTicket, DEAL_MAGIC) != InpMagicNumber)
         continue;

      int entry = (int)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_INOUT)
         continue;

      closeTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
      return HistoryDealGetDouble(dealTicket, DEAL_PROFIT) +
             HistoryDealGetDouble(dealTicket, DEAL_SWAP) +
             HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
   }

   return 0.0;
}

bool IsCooldownAfterLossActive(int cooldownBars)
{
   if(cooldownBars <= 0)
      return false;

   datetime lastCloseTime = 0;
   double latestPnl = GetLatestClosedTradePnl(lastCloseTime);
   if(lastCloseTime <= 0 || latestPnl >= 0.0)
      return false;

   return (GetBarsSinceTime(lastCloseTime) < cooldownBars);
}

bool IsSignalStrongEnough(double emaFast, double emaSlow, double minEmaGapPips, double minAtrPips)
{
   double atrPips = GetATRPips(14, 1, PERIOD_CURRENT);
   if(atrPips == EMPTY_VALUE || atrPips < minAtrPips)
      return false;

   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double emaGapPips = PriceDistanceToPips(MathAbs(emaFast - emaSlow), point, digits);
   return (emaGapPips >= minEmaGapPips);
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

int ClosePositionsByTypeCountMT5(ENUM_POSITION_TYPE posType)
{
   int closed = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 &&
         PositionGetInteger(POSITION_MAGIC) == InpMagicNumber &&
         PositionGetString(POSITION_SYMBOL) == _Symbol &&
         PositionGetInteger(POSITION_TYPE) == posType)
      {
         if(ClosePosition(ticket))
            closed++;
      }
   }
   return closed;
}

void ClosePositionsByTypeMT5(ENUM_POSITION_TYPE posType)
{
   ClosePositionsByTypeCountMT5(posType);
}

void ManageTrailingStops()
{
   if(IsGridStrategy())
      return;

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
