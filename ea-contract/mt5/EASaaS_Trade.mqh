//+------------------------------------------------------------------+
//| EASaaS_Trade.mqh                                                  |
//| EA SaaS Platform - Trade Execution for MT5                       |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
//| Uses MqlTradeRequest/MqlTradeResult for OrderSend                |
//| PositionSelect instead of OrderSelect                             |
//| MQL5-compatible trade operations                                   |
//+------------------------------------------------------------------+
#property strict
#include <EASaaS_Utils.mqh>
#include <EASaaS_License.mqh>
#include <EASaaS_Risk.mqh>

struct TradeResult
{
   bool   success;
   ulong  ticket;
   double openPrice;
   double lots;
   int    errorCode;
   string errorMessage;
};

int g_trade_magic_number = 12345;
int g_trade_max_slippage = 10;
int g_trade_retry_count = 3;
int g_trade_retry_delay = 1000;

bool PreTradeCheck(string symbol)
{
   if(!CheckLicenseValid())
   {
      LogError("TRADE BLOCKED: License not valid. State: " + GetLicenseStateString(g_license.state));
      return false;
   }
   if(g_license.state == LICENSE_KILLED || g_license.killSwitch)
   {
      LogError("TRADE BLOCKED: Kill switch is active");
      return false;
   }
   if(!CheckRiskRules(symbol, g_trade_magic_number))
   {
      LogWarn("TRADE BLOCKED: Risk rule violation");
      return false;
   }
   return true;
}

/// Open a buy position
TradeResult OpenBuy(string symbol, double lots, int slPips, int tpPips, int magicNumber, string comment = "")
{
   TradeResult result;
   result.success = false;
   result.ticket = 0;
   result.openPrice = 0;
   result.lots = lots;
   result.errorCode = 0;
   result.errorMessage = "";

   if(!PreTradeCheck(symbol))
   {
      result.errorMessage = "Pre-trade check failed";
      return result;
   }

   lots = NormalizeLotSize(symbol, lots);

   double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   double slPrice = 0;
   double tpPrice = 0;

   if(slPips > 0)
   {
      double slPoints = (digits == 3 || digits == 5) ? slPips * 10 : slPips;
      slPrice = NormalizeDouble(ask - slPoints * point, digits);
   }
   if(tpPips > 0)
   {
      double tpPoints = (digits == 3 || digits == 5) ? tpPips * 10 : tpPips;
      tpPrice = NormalizeDouble(ask + tpPoints * point, digits);
   }

   string orderComment = (comment != "") ? comment : "EASaaS";

   for(int attempt = 0; attempt <= g_trade_retry_count; attempt++)
   {
      if(attempt > 0)
      {
         Sleep(g_trade_retry_delay);
         LogDebug(StringFormat("Buy retry %d/%d for %s", attempt, g_trade_retry_count, symbol));
      }

      ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
      if(slPips > 0) slPrice = NormalizeDouble(ask - ((digits == 3 || digits == 5) ? slPips * 10 : slPips) * point, digits);
      if(tpPips > 0) tpPrice = NormalizeDouble(ask + ((digits == 3 || digits == 5) ? tpPips * 10 : tpPips) * point, digits);

      MqlTradeRequest request;
      MqlTradeResult tradeResult;

      ZeroMemory(request);
      ZeroMemory(tradeResult);

      request.action = TRADE_ACTION_DEAL;
      request.symbol = symbol;
      request.volume = lots;
      request.type = ORDER_TYPE_BUY;
      request.price = ask;
      request.sl = slPrice;
      request.tp = tpPrice;
      request.deviation = g_trade_max_slippage;
      request.magic = magicNumber;
      request.comment = orderComment;
      request.type_filling = ORDER_FILLING_FOK;

      if(OrderSend(request, tradeResult))
      {
         if(tradeResult.retcode == TRADE_RETCODE_DONE || tradeResult.retcode == TRADE_RETCODE_PLACED)
         {
            result.success = true;
            result.ticket = tradeResult.order;
            result.openPrice = ask;
            result.lots = lots;
            LogTrade("BUY", symbol, lots, ask,
               StringFormat("ticket=%I64u sl=%.5f tp=%.5f", tradeResult.order, slPrice, tpPrice));
            return result;
         }
      }

      result.errorCode = (int)tradeResult.retcode;
      result.errorMessage = TradeErrorDescriptionMT5(tradeResult.retcode);
      LogError(StringFormat("BUY FAILED: %s lots=%.2f retcode=%d (%s)",
         symbol, lots, result.errorCode, result.errorMessage));

      if(tradeResult.retcode == TRADE_RETCODE_NO_MONEY ||
         tradeResult.retcode == TRADE_RETCODE_MARKET_CLOSED ||
         tradeResult.retcode == TRADE_RETCODE_FROZEN ||
         tradeResult.retcode == TRADE_RETCODE_INVALID_VOLUME ||
         tradeResult.retcode == TRADE_RETCODE_INVALID_STOPS)
         break;
   }

   return result;
}

/// Open a sell position
TradeResult OpenSell(string symbol, double lots, int slPips, int tpPips, int magicNumber, string comment = "")
{
   TradeResult result;
   result.success = false;
   result.ticket = 0;
   result.openPrice = 0;
   result.lots = lots;
   result.errorCode = 0;
   result.errorMessage = "";

   if(!PreTradeCheck(symbol))
   {
      result.errorMessage = "Pre-trade check failed";
      return result;
   }

   lots = NormalizeLotSize(symbol, lots);

   double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   double slPrice = 0;
   double tpPrice = 0;

   if(slPips > 0)
   {
      double slPoints = (digits == 3 || digits == 5) ? slPips * 10 : slPips;
      slPrice = NormalizeDouble(bid + slPoints * point, digits);
   }
   if(tpPips > 0)
   {
      double tpPoints = (digits == 3 || digits == 5) ? tpPips * 10 : tpPips;
      tpPrice = NormalizeDouble(bid - tpPoints * point, digits);
   }

   string orderComment = (comment != "") ? comment : "EASaaS";

   for(int attempt = 0; attempt <= g_trade_retry_count; attempt++)
   {
      if(attempt > 0)
      {
         Sleep(g_trade_retry_delay);
         LogDebug(StringFormat("Sell retry %d/%d for %s", attempt, g_trade_retry_count, symbol));
      }

      bid = SymbolInfoDouble(symbol, SYMBOL_BID);
      if(slPips > 0) slPrice = NormalizeDouble(bid + ((digits == 3 || digits == 5) ? slPips * 10 : slPips) * point, digits);
      if(tpPips > 0) tpPrice = NormalizeDouble(bid - ((digits == 3 || digits == 5) ? tpPips * 10 : tpPips) * point, digits);

      MqlTradeRequest request;
      MqlTradeResult tradeResult;

      ZeroMemory(request);
      ZeroMemory(tradeResult);

      request.action = TRADE_ACTION_DEAL;
      request.symbol = symbol;
      request.volume = lots;
      request.type = ORDER_TYPE_SELL;
      request.price = bid;
      request.sl = slPrice;
      request.tp = tpPrice;
      request.deviation = g_trade_max_slippage;
      request.magic = magicNumber;
      request.comment = orderComment;
      request.type_filling = ORDER_FILLING_FOK;

      if(OrderSend(request, tradeResult))
      {
         if(tradeResult.retcode == TRADE_RETCODE_DONE || tradeResult.retcode == TRADE_RETCODE_PLACED)
         {
            result.success = true;
            result.ticket = tradeResult.order;
            result.openPrice = bid;
            result.lots = lots;
            LogTrade("SELL", symbol, lots, bid,
               StringFormat("ticket=%I64u sl=%.5f tp=%.5f", tradeResult.order, slPrice, tpPrice));
            return result;
         }
      }

      result.errorCode = (int)tradeResult.retcode;
      result.errorMessage = TradeErrorDescriptionMT5(tradeResult.retcode);
      LogError(StringFormat("SELL FAILED: %s lots=%.2f retcode=%d (%s)",
         symbol, lots, result.errorCode, result.errorMessage));

      if(tradeResult.retcode == TRADE_RETCODE_NO_MONEY ||
         tradeResult.retcode == TRADE_RETCODE_MARKET_CLOSED ||
         tradeResult.retcode == TRADE_RETCODE_FROZEN ||
         tradeResult.retcode == TRADE_RETCODE_INVALID_VOLUME ||
         tradeResult.retcode == TRADE_RETCODE_INVALID_STOPS)
         break;
   }

   return result;
}

/// Close a position by ticket
bool ClosePosition(ulong ticket)
{
   for(int attempt = 0; attempt <= g_trade_retry_count; attempt++)
   {
      if(attempt > 0)
      {
         Sleep(g_trade_retry_delay);
         LogDebug(StringFormat("Close retry %d/%d ticket=%I64u", attempt, g_trade_retry_count, ticket));
      }

      if(!PositionSelectByTicket(ticket))
      {
         LogError("Cannot select position " + IntegerToString(ticket));
         return false;
      }

      string sym = PositionGetString(POSITION_SYMBOL);
      double lots = PositionGetDouble(POSITION_VOLUME);
      long posType = PositionGetInteger(POSITION_TYPE);

      double closePrice = 0;
      ENUM_ORDER_TYPE closeType;

      if(posType == POSITION_TYPE_BUY)
      {
         closePrice = SymbolInfoDouble(sym, SYMBOL_BID);
         closeType = ORDER_TYPE_SELL;
      }
      else
      {
         closePrice = SymbolInfoDouble(sym, SYMBOL_ASK);
         closeType = ORDER_TYPE_BUY;
      }

      MqlTradeRequest request;
      MqlTradeResult tradeResult;
      ZeroMemory(request);
      ZeroMemory(tradeResult);

      request.action = TRADE_ACTION_DEAL;
      request.symbol = sym;
      request.volume = lots;
      request.type = closeType;
      request.position = ticket;
      request.price = closePrice;
      request.deviation = g_trade_max_slippage;
      request.type_filling = ORDER_FILLING_FOK;

      if(OrderSend(request, tradeResult))
      {
         if(tradeResult.retcode == TRADE_RETCODE_DONE)
         {
            LogTrade("CLOSE", sym, lots, closePrice, StringFormat("ticket=%I64u", ticket));
            return true;
         }
      }

      int err = (int)tradeResult.retcode;
      LogError(StringFormat("Close failed: ticket=%I64u retcode=%d (%s)", ticket, err, TradeErrorDescriptionMT5(tradeResult.retcode)));

      if(err == TRADE_RETCODE_INVALID_ORDER || err == TRADE_RETCODE_ORDER_FROZEN)
         break;
   }

   return false;
}

/// Close all positions with our magic number
int CloseAllPositions(int magicNumber)
{
   int closedCount = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 && PositionGetInteger(POSITION_MAGIC) == magicNumber)
      {
         if(ClosePosition(ticket))
            closedCount++;
      }
   }
   if(closedCount > 0)
      LogInfo(StringFormat("Closed %d positions (magic=%d)", closedCount, magicNumber));
   return closedCount;
}

/// Modify SL/TP for an existing position
bool ModifyPosition(ulong ticket, double sl, double tp)
{
   for(int attempt = 0; attempt <= g_trade_retry_count; attempt++)
   {
      if(attempt > 0)
      {
         Sleep(g_trade_retry_delay);
      }

      if(!PositionSelectByTicket(ticket))
      {
         LogError("Modify: cannot select position " + IntegerToString(ticket));
         return false;
      }

      string sym = PositionGetString(POSITION_SYMBOL);
      int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      sl = NormalizeDouble(sl, digits);
      tp = NormalizeDouble(tp, digits);

      MqlTradeRequest request;
      MqlTradeResult tradeResult;
      ZeroMemory(request);
      ZeroMemory(tradeResult);

      request.action = TRADE_ACTION_SLTP;
      request.symbol = sym;
      request.position = ticket;
      request.sl = sl;
      request.tp = tp;

      if(OrderSend(request, tradeResult))
      {
         if(tradeResult.retcode == TRADE_RETCODE_DONE)
         {
            LogInfo(StringFormat("MODIFY: ticket=%I64u sl=%.5f tp=%.5f", ticket, sl, tp));
            return true;
         }
      }

      int err = (int)tradeResult.retcode;
      LogError(StringFormat("Modify failed: ticket=%I64u retcode=%d", ticket, err));

      if(err == TRADE_RETCODE_INVALID_ORDER || err == TRADE_RETCODE_INVALID_STOPS)
         break;
   }

   return false;
}

/// Calculate lot size based on risk
double CalculateLotSize(string symbol, double riskPercent, int slPips)
{
   if(g_config.loaded && g_config.lotSize > 0)
      return NormalizeLotSize(symbol, g_config.lotSize);

   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double riskAmount = equity * (riskPercent / 100.0);

   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);

   double lotSize = 0;
   if(tickValue > 0 && point > 0 && slPips > 0)
   {
      double pipMultiplier = (digits == 3 || digits == 5) ? 10.0 : 1.0;
      double slPoints = slPips * pipMultiplier;
      double slCostPerLot = (slPoints * point / tickSize) * tickValue;

      if(slCostPerLot > 0)
         lotSize = riskAmount / slCostPerLot;
   }

   return NormalizeLotSize(symbol, lotSize);
}

double NormalizeLotSize(string symbol, double lots)
{
   double minLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);

   if(lots < minLot) lots = minLot;
   if(lots > maxLot) lots = maxLot;

   if(lotStep > 0)
   {
      int steps = (int)MathFloor(lots / lotStep);
      lots = steps * lotStep;
   }

   lots = NormalizeDouble(lots, 2);
   return lots;
}

int GetOpenPositions(int magicNumber)
{
   return CountPositionsByMagic(magicNumber);
}

double GetOpenPositionsProfit(int magicNumber)
{
   double totalProfit = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 && PositionGetInteger(POSITION_MAGIC) == magicNumber)
      {
         totalProfit += PositionGetDouble(POSITION_PROFIT) +
                        PositionGetDouble(POSITION_SWAP);
      }
   }
   return totalProfit;
}

string TradeErrorDescriptionMT5(uint retcode)
{
   switch(retcode)
   {
      case TRADE_RETCODE_REQUOTE:           return "Requote";
      case TRADE_RETCODE_REJECT:            return "Request rejected";
      case TRADE_RETCODE_CANCEL:           return "Request canceled by trader";
      case TRADE_RETCODE_PLACED:           return "Order placed";
      case TRADE_RETCODE_DONE:             return "Request completed";
      case TRADE_RETCODE_DONE_PARTIAL:     return "Only part of request completed";
      case TRADE_RETCODE_ERROR:            return "Request processing error";
      case TRADE_RETCODE_TIMEOUT:          return "Request canceled by timeout";
      case TRADE_RETCODE_INVALID:          return "Invalid request";
      case TRADE_RETCODE_INVALID_VOLUME:   return "Invalid volume";
      case TRADE_RETCODE_INVALID_PRICE:    return "Invalid price";
      case TRADE_RETCODE_INVALID_STOPS:    return "Invalid stops";
      case TRADE_RETCODE_TRADE_DISABLED:   return "Trade disabled";
      case TRADE_RETCODE_MARKET_CLOSED:    return "Market closed";
      case TRADE_RETCODE_NO_MONEY:         return "Not enough money";
      case TRADE_RETCODE_PRICE_CHANGED:    return "Prices changed";
      case TRADE_RETCODE_PRICE_OFF:        return "No quotes";
      case TRADE_RETCODE_INVALID_EXPIRATION: return "Invalid expiration";
      case TRADE_RETCODE_ORDER_CHANGED:    return "Order state changed";
      case TRADE_RETCODE_TOO_MANY_REQUESTS: return "Too frequent requests";
      case TRADE_RETCODE_NO_CHANGES:       return "No changes";
      case TRADE_RETCODE_SERVER_DISABLES_AT: return "Autotrading disabled by server";
      case TRADE_RETCODE_CLIENT_DISABLES_AT: return "Autotrading disabled by client";
      case TRADE_RETCODE_LOCKED:           return "Order locked";
      case TRADE_RETCODE_FROZEN:           return "Order frozen";
      case TRADE_RETCODE_INVALID_FILL:     return "Invalid fill type";
      case TRADE_RETCODE_CONNECTION:       return "No connection";
      case TRADE_RETCODE_ONLY_REAL:        return "Only real accounts allowed";
      case TRADE_RETCODE_LIMIT_ORDERS:     return "Pending order limit reached";
      case TRADE_RETCODE_LIMIT_VOLUME:     return "Volume limit reached";
      case TRADE_RETCODE_INVALID_ORDER:    return "Invalid order";
      case TRADE_RETCODE_POSITION_CLOSED:  return "Position already closed";
      default: return "Unknown retcode " + IntegerToString(retcode);
   }
}

void SetTradeMagicNumber(int magic) { g_trade_magic_number = magic; }
void SetTradeMaxSlippage(int slip) { g_trade_max_slippage = slip; }
void SetTradeRetryCount(int retries) { g_trade_retry_count = retries; }
void SetTradeRetryDelay(int delayMs) { g_trade_retry_delay = delayMs; }