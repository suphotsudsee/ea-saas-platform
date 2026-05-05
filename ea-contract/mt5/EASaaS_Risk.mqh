//+------------------------------------------------------------------+
//| EASaaS_Risk.mqh                                                   |
//| EA SaaS Platform - Risk Management for MT5                       |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
#property strict

#ifndef EASAAS_RISK_MQH
#define EASAAS_RISK_MQH

#include "EASaaS_Http.mqh"
#include "EASaaS_Utils.mqh"

struct RiskConfig
{
   double   maxDrawdownPct;
   bool     maxDrawdownEnabled;
   double   maxDailyLossPct;
   bool     maxDailyLossEnabled;
   int      maxConsecutiveLosses;
   bool     consecutiveLossEnabled;
   double   equityProtectionUsd;
   bool     equityProtectionEnabled;
   int      maxOpenPositions;
   bool     maxPositionsEnabled;
   double   maxSpreadPips;
   bool     spreadFilterEnabled;
   int      sessionStartHour;
   int      sessionEndHour;
   bool     sessionFilterEnabled;
   double   marginLevelPct;
   bool     marginLevelEnabled;
   bool     loaded;
   string   configHash;
};

RiskConfig g_risk_config;
double g_daily_start_balance = 0;
datetime g_daily_start_date = 0;
int g_consecutive_losses = 0;

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

   g_daily_start_balance = AccountInfoDouble(ACCOUNT_BALANCE);
   MqlDateTime mdt;
   TimeToStruct(TimeCurrent(), mdt);
   g_daily_start_date = StringToTime(StringFormat("%04d.%02d.%02d", mdt.year, mdt.mon, mdt.day));
   g_consecutive_losses = 0;

   LogInfo("Risk module initialized with defaults");
}

bool LoadRiskConfig(string serverUrl)
{
   string url = serverUrl + "/api/ea/sync-config";
   HttpResponse resp = HttpGet(url);

   if(!resp.success)
   {
      LogError("Failed to load risk config: " + resp.error);
      return false;
   }

   if(JsonGetBool(resp.body, "killSwitch"))
   {
      LogError("Kill switch active in config response");
      return false;
   }

   string riskObj = JsonGetObject(resp.body, "riskConfig");
   if(riskObj == "{}")
   {
      LogWarn("No riskConfig found in server response, using defaults");
      g_risk_config.loaded = true;
      return true;
   }

   if(JsonHasKey(riskObj, "maxDrawdownPct"))
   { g_risk_config.maxDrawdownPct = JsonGetNumber(riskObj, "maxDrawdownPct"); g_risk_config.maxDrawdownEnabled = true; }
   if(JsonHasKey(riskObj, "maxDailyLossPct"))
   { g_risk_config.maxDailyLossPct = JsonGetNumber(riskObj, "maxDailyLossPct"); g_risk_config.maxDailyLossEnabled = true; }
   if(JsonHasKey(riskObj, "maxConsecutiveLosses"))
   { g_risk_config.maxConsecutiveLosses = JsonGetInt(riskObj, "maxConsecutiveLosses"); g_risk_config.consecutiveLossEnabled = true; }
   if(JsonHasKey(riskObj, "equityProtectionUsd"))
   { g_risk_config.equityProtectionUsd = JsonGetNumber(riskObj, "equityProtectionUsd"); g_risk_config.equityProtectionEnabled = true; }
   if(JsonHasKey(riskObj, "maxOpenPositions"))
   { g_risk_config.maxOpenPositions = JsonGetInt(riskObj, "maxOpenPositions"); g_risk_config.maxPositionsEnabled = true; }
   if(JsonHasKey(riskObj, "maxSpreadPips"))
   { g_risk_config.maxSpreadPips = JsonGetNumber(riskObj, "maxSpreadPips"); g_risk_config.spreadFilterEnabled = true; }
   if(JsonHasKey(riskObj, "sessionStartHour"))
   { g_risk_config.sessionStartHour = JsonGetInt(riskObj, "sessionStartHour"); g_risk_config.sessionFilterEnabled = true; }
   if(JsonHasKey(riskObj, "sessionEndHour"))
   { g_risk_config.sessionEndHour = JsonGetInt(riskObj, "sessionEndHour"); g_risk_config.sessionFilterEnabled = true; }
   if(JsonHasKey(riskObj, "marginLevelPct"))
   { g_risk_config.marginLevelPct = JsonGetNumber(riskObj, "marginLevelPct"); g_risk_config.marginLevelEnabled = true; }

   g_risk_config.configHash = JsonGetString(resp.body, "configHash");
   g_risk_config.loaded = true;

   LogInfo("Risk config loaded: DD=" + DoubleToString(g_risk_config.maxDrawdownPct, 1) +
      "% maxPos=" + IntegerToString(g_risk_config.maxOpenPositions) +
      " session=" + IntegerToString(g_risk_config.sessionStartHour) + "-" + IntegerToString(g_risk_config.sessionEndHour));
   return true;
}

bool CheckRiskRules(string symbol, int magicNumber)
{
   if(!g_risk_config.loaded)
   {
      LogWarn("Risk config not loaded, blocking trades");
      return false;
   }

   UpdateDailyBalance();

   bool allPassed = true;
   if(g_risk_config.equityProtectionEnabled && !EquityProtectionCheck()) allPassed = false;
   if(g_risk_config.maxDrawdownEnabled && !MaxDrawdownCheck()) allPassed = false;
   if(g_risk_config.maxDailyLossEnabled && !DailyLossLimitCheck()) allPassed = false;
   if(g_risk_config.maxPositionsEnabled && !MaxPositionsCheck(magicNumber)) allPassed = false;
   if(g_risk_config.spreadFilterEnabled && symbol != "" && !SpreadFilter(symbol)) allPassed = false;
   if(g_risk_config.sessionFilterEnabled && !SessionFilter()) allPassed = false;
   if(g_risk_config.consecutiveLossEnabled && !ConsecutiveLossCheck()) allPassed = false;
   return allPassed;
}

bool MaxDrawdownCheck()
{
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double drawdownPct = (balance > 0) ? ((balance - equity) / balance) * 100.0 : 0;
   if(drawdownPct >= g_risk_config.maxDrawdownPct)
   {
      LogError(StringFormat("RISK: Max drawdown exceeded! %.2f%% >= %.2f%%", drawdownPct, g_risk_config.maxDrawdownPct));
      return false;
   }
   return true;
}

bool MaxPositionsCheck(int magicNumber)
{
   int openPositions = CountPositionsByMagic(magicNumber);
   if(openPositions >= g_risk_config.maxOpenPositions)
   {
      LogWarn(StringFormat("RISK: Max positions! %d >= %d", openPositions, g_risk_config.maxOpenPositions));
      return false;
   }
   return true;
}

bool SpreadFilter(string symbol)
{
   double spread = SymbolInfoDouble(symbol, SYMBOL_ASK) - SymbolInfoDouble(symbol, SYMBOL_BID);
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   long digits = SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double spreadPips = 0;
   if(point > 0)
   {
      if(digits == 3 || digits == 5)
         spreadPips = (spread / point) / 10.0;
      else
         spreadPips = spread / point;
   }
   if(spreadPips > g_risk_config.maxSpreadPips)
   {
      LogWarn(StringFormat("RISK: Spread too wide! %.1f > %.1f pips for %s", spreadPips, g_risk_config.maxSpreadPips, symbol));
      return false;
   }
   return true;
}

bool SessionFilter()
{
   int currentHour = CurrentUTCHour();
   if(g_risk_config.sessionStartHour < g_risk_config.sessionEndHour)
   {
      if(currentHour < g_risk_config.sessionStartHour || currentHour >= g_risk_config.sessionEndHour)
         return false;
   }
   else
   {
      if(currentHour >= g_risk_config.sessionEndHour && currentHour < g_risk_config.sessionStartHour)
         return false;
   }
   return true;
}

bool EquityProtectionCheck()
{
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   if(equity < g_risk_config.equityProtectionUsd)
   {
      LogError(StringFormat("RISK: Equity below protection! $%.2f < $%.2f", equity, g_risk_config.equityProtectionUsd));
      return false;
   }
   return true;
}

bool ConsecutiveLossCheck()
{
   UpdateConsecutiveLosses();
   if(g_consecutive_losses >= g_risk_config.maxConsecutiveLosses)
   {
      LogError(StringFormat("RISK: Consecutive losses %d >= %d", g_consecutive_losses, g_risk_config.maxConsecutiveLosses));
      return false;
   }
   return true;
}

bool DailyLossLimitCheck()
{
   UpdateDailyBalance();
   double dailyPnl = AccountInfoDouble(ACCOUNT_BALANCE) - g_daily_start_balance;
   double dailyLossPct = (g_daily_start_balance > 0) ? MathAbs(dailyPnl) / g_daily_start_balance * 100.0 : 0;
   if(dailyPnl < 0 && dailyLossPct >= g_risk_config.maxDailyLossPct)
   {
      LogError(StringFormat("RISK: Daily loss limit! %.2f%% >= %.2f%%", dailyLossPct, g_risk_config.maxDailyLossPct));
      return false;
   }
   return true;
}

void UpdateDailyBalance()
{
   MqlDateTime mdt;
   TimeToStruct(TimeCurrent(), mdt);
   datetime today = StringToTime(StringFormat("%04d.%02d.%02d", mdt.year, mdt.mon, mdt.day));

   if(g_daily_start_date != today)
   {
      g_daily_start_balance = AccountInfoDouble(ACCOUNT_BALANCE);
      g_daily_start_date = today;
      g_consecutive_losses = 0;
      LogInfo("New trading day. Start balance: $" + DoubleToString(g_daily_start_balance, 2));
   }
}

void UpdateConsecutiveLosses()
{
   int losses = 0;
   int totalChecked = 0;
   int maxToCheck = 50;

   // MT5: use HistorySelect and iterate deals
   HistorySelect(0, TimeCurrent());
   int totalDeals = HistoryDealsTotal();

   for(int i = totalDeals - 1; i >= 0 && totalChecked < maxToCheck; i--)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket > 0)
      {
         int dealEntry = (int)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         if(dealEntry != DEAL_ENTRY_OUT && dealEntry != DEAL_ENTRY_INOUT) continue;

         totalChecked++;
         double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
         double swap = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
         double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);

         if(profit + swap + commission < 0)
            losses++;
         else
            break;
      }
   }

   g_consecutive_losses = losses;
}

int CountPositionsByMagic(int magicNumber)
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 && PositionGetInteger(POSITION_MAGIC) == magicNumber)
         count++;
   }
   return count;
}

double GetCurrentDrawdownPct()
{
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(balance <= 0) return 0;
   return MathMax(0, (balance - equity) / balance * 100.0);
}

string GetRiskSummary()
{
   return StringFormat("DD:%.1f%% Pos:%d Spread:%.1f Session:%d-%d Consec:%d Daily:%.1f%%",
      g_risk_config.maxDrawdownPct, g_risk_config.maxOpenPositions,
      g_risk_config.maxSpreadPips, g_risk_config.sessionStartHour,
      g_risk_config.sessionEndHour, g_risk_config.maxConsecutiveLosses,
      g_risk_config.maxDailyLossPct);
}


#endif // EASAAS_RISK_MQH
