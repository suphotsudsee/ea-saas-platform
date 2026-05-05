//+------------------------------------------------------------------+
//| EASaaS_TradeSync.mqh                                              |
//| EA SaaS Platform - Trade Event Sync for MT5                      |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
//| Reports every trade event (OPEN/CLOSE/TP/SL/PARTIAL) back to     |
//| the SaaS platform so users can see real-time P&L, win rate, and  |
//| trade history on their dashboard.                                 |
//+------------------------------------------------------------------+
#property strict

#ifndef EASAAS_TRADESYNC_MQH
#define EASAAS_TRADESYNC_MQH

#include "EASaaS_Http.mqh"

// Configuration
int    g_tradesync_timeout_ms = 8000;
int    g_tradesync_max_queue = 50;
int    g_tradesync_enabled = 1;

// Track known positions for TP/SL detection
struct KnownPosition
{
   ulong    ticket;
   string   symbol;
   int      type;       // POSITION_TYPE_BUY=0, POSITION_TYPE_SELL=1
   double   openPrice;
   double   volume;
   double   sl;
   double   tp;
   datetime openTime;
   int      magicNumber;
   string   comment;
};

KnownPosition g_knownPositions[];
int           g_knownPositionCount = 0;

// ─── Initialize ────────────────────────────────────────────────────────────────

void TradeSyncInit()
{
   g_knownPositionCount = 0;
   ArrayResize(g_knownPositions, 0);
   LogInfo("TradeSync initialized. All trade events will be reported to platform.");
}

// ─── Report Trade Open ─────────────────────────────────────────────────────────

void ReportTradeOpen(string serverUrl,
                     ulong ticket,
                     string symbol,
                     string direction,  // "BUY" or "SELL"
                     double volume,
                     double openPrice,
                     double sl,
                     double tp,
                     int magicNumber,
                     string tradeComment,
                     int positionType)
{
   if(!g_tradesync_enabled) return;

   string url = serverUrl + "/api/ea/trade-events";
   string body = "{";
   body += JsonField("accountNumber", IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))) + ",";
   body += JsonField("platform", "MT5") + ",";
   body += JsonField("ticket", IntegerToString(ticket)) + ",";
   body += JsonField("symbol", symbol) + ",";
   body += JsonField("direction", direction) + ",";
   body += JsonField("eventType", "OPEN") + ",";
   body += JsonFieldNum("openPrice", openPrice) + ",";
   body += JsonFieldNum("volume", volume) + ",";
   body += JsonField("openTime", CurrentTimeISO8601()) + ",";
   body += JsonFieldInt("magicNumber", magicNumber) + ",";
   body += JsonField("comment", tradeComment);
   body += "}";

   LogInfo("Reporting OPEN: " + symbol + " " + direction + " ticket=" + IntegerToString(ticket) +
           " lots=" + DoubleToString(volume, 2) + " price=" + DoubleToString(openPrice, (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)));

   HttpResponse resp = HttpPost(url, body, g_tradesync_timeout_ms);
   if(!resp.success)
   {
      LogError("Failed to report trade OPEN: " + resp.error);
      return;
   }

   // Add to known positions for TP/SL detection
   AddKnownPosition(ticket, symbol, positionType, openPrice, volume, sl, tp, TimeCurrent(), magicNumber, tradeComment);
}

// ─── Report Trade Close ────────────────────────────────────────────────────────

void ReportTradeClose(string serverUrl,
                      ulong ticket,
                      string symbol,
                      string direction,
                      double volume,
                      double openPrice,
                      double closePrice,
                      double profit,
                      double commission,
                      double swap,
                      int magicNumber,
                      datetime openTime,
                      string closeReason)  // "MANUAL", "TP", "SL", "TRAILING", "KILL_SWITCH", "GRID_EXIT"
{
   if(!g_tradesync_enabled) return;

   string eventType = "CLOSE";
   if(StringFind(closeReason, "PARTIAL") >= 0)
      eventType = "PARTIAL_CLOSE";

   string url = serverUrl + "/api/ea/trade-events";
   string body = "{";
   body += JsonField("accountNumber", IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))) + ",";
   body += JsonField("platform", "MT5") + ",";
   body += JsonField("ticket", IntegerToString(ticket)) + ",";
   body += JsonField("symbol", symbol) + ",";
   body += JsonField("direction", direction) + ",";
   body += JsonField("eventType", eventType) + ",";
   body += JsonFieldNum("openPrice", openPrice) + ",";
   body += JsonFieldNum("closePrice", closePrice) + ",";
   body += JsonFieldNum("volume", volume) + ",";
   body += JsonField("openTime", TimeToString(openTime, TIME_DATE|TIME_MINUTES|TIME_SECONDS)) + ",";
   body += JsonField("closeTime", CurrentTimeISO8601()) + ",";
   body += JsonFieldNum("profit", profit) + ",";
   body += JsonFieldNum("commission", commission) + ",";
   body += JsonFieldNum("swap", swap) + ",";
   body += JsonFieldInt("magicNumber", magicNumber) + ",";
   body += JsonField("comment", closeReason);
   body += "}";

   // Calculate P&L summary
   double netProfit = profit + commission + swap;
   string profitSign = (netProfit >= 0) ? "+" : "";
   LogInfo("Reporting CLOSE (" + closeReason + "): " + symbol + " " + direction +
           " ticket=" + IntegerToString(ticket) +
           " P&L=" + profitSign + DoubleToString(netProfit, 2) + " USD" +
           " (profit=" + DoubleToString(profit, 2) + " comm=" + DoubleToString(commission, 2) + " swap=" + DoubleToString(swap, 2) + ")");

   HttpResponse resp = HttpPost(url, body, g_tradesync_timeout_ms);
   if(!resp.success)
   {
      LogError("Failed to report trade CLOSE: " + resp.error);
      return;
   }

   // Remove from known positions
   RemoveKnownPosition(ticket);
}

// ─── Known Positions Management ─────────────────────────────────────────────────

void AddKnownPosition(ulong ticket,
                      string symbol,
                      int type,
                      double openPrice,
                      double volume,
                      double sl,
                      double tp,
                      datetime openTime,
                      int magicNumber,
                      string comment)
{
   // Don't add duplicates
   for(int i = 0; i < g_knownPositionCount; i++)
   {
      if(g_knownPositions[i].ticket == ticket)
         return;
   }

   if(g_knownPositionCount >= g_tradesync_max_queue)
   {
      LogWarn("Known positions queue full (" + IntegerToString(g_tradesync_max_queue) + ")");
      return;
   }

   int idx = g_knownPositionCount;
   ArrayResize(g_knownPositions, g_knownPositionCount + 1);
   g_knownPositions[idx].ticket      = ticket;
   g_knownPositions[idx].symbol      = symbol;
   g_knownPositions[idx].type        = type;
   g_knownPositions[idx].openPrice   = openPrice;
   g_knownPositions[idx].volume      = volume;
   g_knownPositions[idx].sl          = sl;
   g_knownPositions[idx].tp          = tp;
   g_knownPositions[idx].openTime    = openTime;
   g_knownPositions[idx].magicNumber = magicNumber;
   g_knownPositions[idx].comment     = comment;
   g_knownPositionCount++;
}

void RemoveKnownPosition(ulong ticket)
{
   for(int i = 0; i < g_knownPositionCount; i++)
   {
      if(g_knownPositions[i].ticket == ticket)
      {
         // Shift remaining elements
         for(int j = i; j < g_knownPositionCount - 1; j++)
         {
            g_knownPositions[j] = g_knownPositions[j + 1];
         }
         g_knownPositionCount--;
         if(g_knownPositionCount >= 0)
            ArrayResize(g_knownPositions, g_knownPositionCount);
         return;
      }
   }
}

int GetKnownPositionIndex(ulong ticket)
{
   for(int i = 0; i < g_knownPositionCount; i++)
   {
      if(g_knownPositions[i].ticket == ticket)
         return i;
   }
   return -1;
}

// ─── Detect TP/SL and auto-close events ────────────────────────────────────────

bool DetectAndReportClosedPositions(string serverUrl, int magicNumber)
{
   if(!g_tradesync_enabled) return false;

   bool reported = false;

   // Iterate backwards through known positions
   for(int i = g_knownPositionCount - 1; i >= 0; i--)
   {
      ulong ticket = g_knownPositions[i].ticket;

      // Check if position still exists
      if(PositionSelectByTicket(ticket))
         continue;  // Still open

      // Position no longer exists — it was closed
      KnownPosition kp = g_knownPositions[i];

      // Try to get close details from history
      string closeReason = "MANUAL";
      if(HistorySelectByPosition(ticket))
      {
         // Check if it hit TP or SL by comparing close price to original SL/TP
         for(int j = 0; j < HistoryDealsTotal(); j++)
         {
            ulong dealTicket = HistoryDealGetTicket(j);
            if(dealTicket > 0 && HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID) == ticket)
            {
               ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
               if(entry == DEAL_ENTRY_OUT)
               {
                  double closePrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
                  double profit      = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
                  double commission  = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
                  double swap        = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
                  datetime closeTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

                  // Detect reason
                  int digits = (int)SymbolInfoInteger(kp.symbol, SYMBOL_DIGITS);
                  double point = SymbolInfoDouble(kp.symbol, SYMBOL_POINT);

                  if(kp.type == POSITION_TYPE_BUY)
                  {
                     if(kp.tp > 0 && closePrice >= kp.tp - point)
                        closeReason = "TP";
                     else if(kp.sl > 0 && closePrice <= kp.sl + point)
                        closeReason = "SL";
                  }
                  else if(kp.type == POSITION_TYPE_SELL)
                  {
                     if(kp.tp > 0 && closePrice <= kp.tp + point)
                        closeReason = "TP";
                     else if(kp.sl > 0 && closePrice >= kp.sl - point)
                        closeReason = "SL";
                  }

                  // Direction string
                  string dir = (kp.type == POSITION_TYPE_BUY) ? "BUY" : "SELL";

                  ReportTradeClose(serverUrl, ticket, kp.symbol, dir,
                                   kp.volume, kp.openPrice, closePrice,
                                   profit, commission, swap,
                                   kp.magicNumber, kp.openTime, closeReason);
                  reported = true;
               }
            }
         }
      }
      else
      {
         // Still report as "UNKNOWN" close — we know it's gone
         string dir = (kp.type == POSITION_TYPE_BUY) ? "BUY" : "SELL";
         ReportTradeClose(serverUrl, ticket, kp.symbol, dir,
                          kp.volume, kp.openPrice, 0,
                          0, 0, 0,
                          kp.magicNumber, kp.openTime, "UNKNOWN");
         reported = true;
      }
   }

   return reported;
}

// ─── Configuration ─────────────────────────────────────────────────────────────

void TradeSyncSetEnabled(int enabled) { g_tradesync_enabled = enabled; }
void TradeSyncSetTimeout(int ms) { g_tradesync_timeout_ms = ms; }
bool IsTradeSyncEnabled() { return g_tradesync_enabled != 0; }


#endif // EASAAS_TRADESYNC_MQH
