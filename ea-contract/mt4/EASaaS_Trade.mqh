//+------------------------------------------------------------------+
//| EASaaS_Trade.mqh                                                  |
//| EA SaaS Platform - Trade Execution for MT4                       |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
//| Provides:                                                         |
//|   - OpenBuy(), OpenSell() — With risk/license/kill checks         |
//|   - ClosePosition() — Safe close with retry                       |
//|   - ModifyPosition() — SL/TP modification                         |
//|   - GetOpenPositions() — Count positions by magic number         |
//|   - CalculateLotSize() — Risk-based lot calculation              |
//|   - Trade result handling                                          |
//|   - Error recovery                                                 |
//+------------------------------------------------------------------+
#property strict
#include <EASaaS_Utils.mqh>
#include <EASaaS_License.mqh>
#include <EASaaS_Risk.mqh>

// ─── Trade Result ─────────────────────────────────────────────────────────────
struct TradeResult
{
   bool   success;          // Trade succeeded
   int    ticket;           // Order ticket (if successful)
   double openPrice;       // Actual open price
   double lots;            // Actual lot size
   int    errorCode;       // MQL error code
   string errorMessage;    // Human-readable error
};

// ─── Trade Configuration ──────────────────────────────────────────────────────
int g_trade_magic_number = 12345;     // Magic number for all orders
int g_trade_max_slippage = 10;        // Max slippage in points
int g_trade_retry_count = 3;          // Number of retries for trade operations
int g_trade_retry_delay = 1000;       // Delay between retries (ms)

// ─── Pre-Trade Checks ──────────────────────────────────────────────────────────

/// Perform all pre-trade checks (license, kill switch, risk)
bool PreTradeCheck(string symbol)
{
   // 1. License check
   if(!CheckLicenseValid())
   {
      LogError("TRADE BLOCKED: License not valid. State: " +
         GetLicenseStateString(g_license.state));
      return false;
   }

   // 2. Kill switch check
   if(g_license.state == LICENSE_KILLED || g_license.killSwitch)
   {
      LogError("TRADE BLOCKED: Kill switch is active");
      return false;
   }

   // 3. Risk rules check
   if(!CheckRiskRules(symbol, g_trade_magic_number))
   {
      LogWarn("TRADE BLOCKED: Risk rule violation");
      return false;
   }

   return true;
}

// ─── Open Buy Position ───────────────────────────────────────────────────────

/// Open a buy position with full safety checks
TradeResult OpenBuy(string symbol, double lots, int slPips, int tpPips,
                    int magicNumber, string comment = "")
{
   TradeResult result;
   result.success = false;
   result.ticket = -1;
   result.openPrice = 0;
   result.lots = lots;
   result.errorCode = 0;
   result.errorMessage = "";

   // Pre-trade checks
   if(!PreTradeCheck(symbol))
   {
      result.errorMessage = "Pre-trade check failed";
      return result;
   }

   // Validate symbol
   if(!SymbolIsValid(symbol))
   {
      result.errorMessage = "Invalid symbol: " + symbol;
      LogError("TRADE ERROR: " + result.errorMessage);
      return result;
   }

   // Calculate SL and TP prices
   double point = MarketInfo(symbol, MODE_POINT);
   double ask = MarketInfo(symbol, MODE_ASK);
   int digits = (int)MarketInfo(symbol, MODE_DIGITS);

   double slPrice = 0;
   double tpPrice = 0;

   if(slPips > 0)
   {
      // Adjust for 5-digit brokers
      double slPoints = slPips;
      if(digits == 3 || digits == 5)
         slPoints = slPips * 10;

      slPrice = NormalizeDouble(ask - slPoints * point, digits);
   }

   if(tpPips > 0)
   {
      double tpPoints = tpPips;
      if(digits == 3 || digits == 5)
         tpPoints = tpPips * 10;

      tpPrice = NormalizeDouble(ask + tpPoints * point, digits);
   }

   // Normalize lot size
   lots = NormalizeLotSize(symbol, lots);

   // Build order comment
   string orderComment = "EASaaS";
   if(comment != "")
      orderComment = comment;

   // Attempt order with retries
   for(int attempt = 0; attempt <= g_trade_retry_count; attempt++)
   {
      if(attempt > 0)
      {
         Sleep(g_trade_retry_delay);
         LogDebug(StringFormat("Buy retry %d/%d for %s", attempt, g_trade_retry_count, symbol));
      }

      // Refresh price
      ask = MarketInfo(symbol, MODE_ASK);
      if(slPips > 0) slPrice = NormalizeDouble(ask - slPips * (digits == 3 || digits == 5 ? 10 : 1) * point, digits);
      if(tpPips > 0) tpPrice = NormalizeDouble(ask + tpPips * (digits == 3 || digits == 5 ? 10 : 1) * point, digits);

      int ticket = OrderSend(symbol, OP_BUY, lots, ask, g_trade_max_slippage,
                             slPrice, tpPrice, orderComment, magicNumber, 0, clrGreen);

      if(ticket > 0)
      {
         result.success = true;
         result.ticket = ticket;
         result.openPrice = ask;
         result.lots = lots;

         LogTrade("BUY", symbol, lots, ask,
            StringFormat("ticket=%d sl=%.5f tp=%.5f", ticket, slPrice, tpPrice));
         return result;
      }

      int err = GetLastError();
      result.errorCode = err;
      result.errorMessage = TradeErrorDescription(err);

      LogError(StringFormat("BUY FAILED: %s %s lots=%.2f err=%d (%s)",
         symbol, symbol, lots, err, result.errorMessage));

      // Don't retry on these errors
      if(err == 134 /* NOT_ENOUGH_MONEY */ ||
         err == 4109 /* TRADE_NOT_ALLOWED */ ||
         err == 4108 /* INVALID_TRADE_VOLUME */ ||
         err == 147 /* TRADE_PROhibited_BY_SERVER */ ||
         err == 4111 /* SHORT_TRADES_NOT_ALLOWED */ ||
         err == 4110 /* LONG_TRADES_NOT_ALLOWED */ ||
         err == 131 /* INVALID_TRADE_VOLUME */ ||
         err == 130 /* INVALID_STOPS */ ||
         err == 6 /* NO_CONNECTION */)
      {
         break;
      }

      // Recheck pre-trade conditions on retry
      RefreshRates();
   }

   return result;
}

// ─── Open Sell Position ──────────────────────────────────────────────────────

/// Open a sell position with full safety checks
TradeResult OpenSell(string symbol, double lots, int slPips, int tpPips,
                     int magicNumber, string comment = "")
{
   TradeResult result;
   result.success = false;
   result.ticket = -1;
   result.openPrice = 0;
   result.lots = lots;
   result.errorCode = 0;
   result.errorMessage = "";

   // Pre-trade checks
   if(!PreTradeCheck(symbol))
   {
      result.errorMessage = "Pre-trade check failed";
      return result;
   }

   // Validate symbol
   if(!SymbolIsValid(symbol))
   {
      result.errorMessage = "Invalid symbol: " + symbol;
      LogError("TRADE ERROR: " + result.errorMessage);
      return result;
   }

   // Calculate SL and TP prices
   double point = MarketInfo(symbol, MODE_POINT);
   double bid = MarketInfo(symbol, MODE_BID);
   int digits = (int)MarketInfo(symbol, MODE_DIGITS);

   double slPrice = 0;
   double tpPrice = 0;

   if(slPips > 0)
   {
      double slPoints = slPips;
      if(digits == 3 || digits == 5)
         slPoints = slPips * 10;

      slPrice = NormalizeDouble(bid + slPoints * point, digits);
   }

   if(tpPips > 0)
   {
      double tpPoints = tpPips;
      if(digits == 3 || digits == 5)
         tpPoints = tpPips * 10;

      tpPrice = NormalizeDouble(bid - tpPoints * point, digits);
   }

   // Normalize lot size
   lots = NormalizeLotSize(symbol, lots);

   // Build order comment
   string orderComment = "EASaaS";
   if(comment != "")
      orderComment = comment;

   // Attempt order with retries
   for(int attempt = 0; attempt <= g_trade_retry_count; attempt++)
   {
      if(attempt > 0)
      {
         Sleep(g_trade_retry_delay);
         LogDebug(StringFormat("Sell retry %d/%d for %s", attempt, g_trade_retry_count, symbol));
      }

      // Refresh price
      bid = MarketInfo(symbol, MODE_BID);
      if(slPips > 0) slPrice = NormalizeDouble(bid + slPips * (digits == 3 || digits == 5 ? 10 : 1) * point, digits);
      if(tpPips > 0) tpPrice = NormalizeDouble(bid - tpPips * (digits == 3 || digits == 5 ? 10 : 1) * point, digits);

      int ticket = OrderSend(symbol, OP_SELL, lots, bid, g_trade_max_slippage,
                             slPrice, tpPrice, orderComment, magicNumber, 0, clrRed);

      if(ticket > 0)
      {
         result.success = true;
         result.ticket = ticket;
         result.openPrice = bid;
         result.lots = lots;

         LogTrade("SELL", symbol, lots, bid,
            StringFormat("ticket=%d sl=%.5f tp=%.5f", ticket, slPrice, tpPrice));
         return result;
      }

      int err = GetLastError();
      result.errorCode = err;
      result.errorMessage = TradeErrorDescription(err);

      LogError(StringFormat("SELL FAILED: %s lots=%.2f err=%d (%s)",
         symbol, lots, err, result.errorMessage));

      if(err == 134 || err == 4109 || err == 4108 || err == 147 ||
         err == 4111 || err == 4110 || err == 131 || err == 130 || err == 6)
      {
         break;
      }

      RefreshRates();
   }

   return result;
}

// ─── Close Position ───────────────────────────────────────────────────────────

/// Close a position by ticket with retry
bool ClosePosition(int ticket)
{
   for(int attempt = 0; attempt <= g_trade_retry_count; attempt++)
   {
      if(attempt > 0)
      {
         Sleep(g_trade_retry_delay);
         LogDebug(StringFormat("Close retry %d/%d ticket=%d", attempt, g_trade_retry_count, ticket));
      }

      if(!OrderSelect(ticket, SELECT_BY_TICKET))
      {
         int err = GetLastError();
         LogError(StringFormat("Close failed: cannot select ticket %d (err=%d)", ticket, err));
         return false;
      }

      // Check if already closed
      if(OrderCloseTime() > 0)
      {
         LogDebug("Order " + IntegerToString(ticket) + " already closed");
         return true;
      }

      double closePrice = 0;
      if(OrderType() == OP_BUY)
         closePrice = MarketInfo(OrderSymbol(), MODE_BID);
      else if(OrderType() == OP_SELL)
         closePrice = MarketInfo(OrderSymbol(), MODE_ASK);
      else
      {
         LogError("Cannot close pending order " + IntegerToString(ticket));
         return false;
      }

      bool closed = OrderClose(ticket, OrderLots(), closePrice, g_trade_max_slippage, clrYellow);

      if(closed)
      {
         LogTrade("CLOSE", OrderSymbol(), OrderLots(), closePrice,
            StringFormat("ticket=%d profit=%.2f", ticket, OrderProfit()));
         return true;
      }

      int err = GetLastError();
      LogError(StringFormat("Close failed: ticket=%d err=%d (%s)",
         ticket, err, TradeErrorDescription(err)));

      if(err == 4108 || err == 134)
         break; // Invalid ticket or not enough money — don't retry

      RefreshRates();
   }

   return false;
}

// ─── Close All Positions ─────────────────────────────────────────────────────

/// Close all positions with our magic number
int CloseAllPositions(int magicNumber)
{
   int closedCount = 0;

   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderMagicNumber() == magicNumber && OrderCloseTime() == 0)
         {
            if(ClosePosition(OrderTicket()))
               closedCount++;
         }
      }
   }

   if(closedCount > 0)
      LogInfo(StringFormat("Closed %d positions (magic=%d)", closedCount, magicNumber));

   return closedCount;
}

// ─── Modify Position ──────────────────────────────────────────────────────────

/// Modify SL/TP for an existing position
bool ModifyPosition(int ticket, double sl, double tp)
{
   for(int attempt = 0; attempt <= g_trade_retry_count; attempt++)
   {
      if(attempt > 0)
      {
         Sleep(g_trade_retry_delay);
         LogDebug(StringFormat("Modify retry %d/%d ticket=%d", attempt, g_trade_retry_count, ticket));
      }

      if(!OrderSelect(ticket, SELECT_BY_TICKET))
      {
         LogError("Modify: cannot select ticket " + IntegerToString(ticket));
         return false;
      }

      if(OrderCloseTime() > 0)
      {
         LogDebug("Order " + IntegerToString(ticket) + " already closed, cannot modify");
         return false;
      }

      // Normalize prices
      sl = NormalizeDouble(sl, (int)MarketInfo(OrderSymbol(), MODE_DIGITS));
      tp = NormalizeDouble(tp, (int)MarketInfo(OrderSymbol(), MODE_DIGITS));

      bool modified = OrderModify(ticket, OrderOpenPrice(), sl, tp, 0, clrBlue);

      if(modified)
      {
         LogInfo(StringFormat("MODIFY: ticket=%d sl=%.5f tp=%.5f", ticket, sl, tp));
         return true;
      }

      int err = GetLastError();
      LogError(StringFormat("Modify failed: ticket=%d err=%d (%s)", ticket, err, TradeErrorDescription(err)));

      if(err == 4108 || err == 1 || err == 130)
         break; // Invalid ticket, no change, or invalid stops

      RefreshRates();
   }

   return false;
}

// ─── Calculate Lot Size ──────────────────────────────────────────────────────

/// Calculate lot size based on risk percentage and stop loss
double CalculateLotSize(string symbol, double riskPercent, int slPips)
{
   // If fixed lot size is specified
   if(g_config.loaded && g_config.lotSize > 0)
      return NormalizeLotSize(symbol, g_config.lotSize);

   // Risk-based calculation
   double accountEquity = AccountEquity();
   double riskAmount = accountEquity * (riskPercent / 100.0);

   // Calculate pip value
   double point = MarketInfo(symbol, MODE_POINT);
   int digits = (int)MarketInfo(symbol, MODE_DIGITS);

   // Adjust for 5-digit brokers
   double pipValue = point;
   if(digits == 3 || digits == 5)
      pipValue = point * 10;

   // Calculate tick value
   double tickValue = MarketInfo(symbol, MODE_TICKVALUE);
   double tickSize = MarketInfo(symbol, MODE_TICKSIZE);

   double lotSize = 0;
   if(tickValue > 0 && pipValue > 0 && slPips > 0)
   {
      double slValue = slPips * pipValue;
      double slCostPerLot = (slValue / tickSize) * tickValue;

      if(slCostPerLot > 0)
         lotSize = riskAmount / slCostPerLot;
   }

   return NormalizeLotSize(symbol, lotSize);
}

// ─── Normalize Lot Size ───────────────────────────────────────────────────────

/// Normalize lot size to broker requirements
double NormalizeLotSize(string symbol, double lots)
{
   double minLot = MarketInfo(symbol, MODE_MINLOT);
   double maxLot = MarketInfo(symbol, MODE_MAXLOT);
   double lotStep = MarketInfo(symbol, MODE_LOTSTEP);

   // Ensure minimum lot
   if(lots < minLot)
      lots = minLot;

   // Ensure maximum lot
   if(lots > maxLot)
      lots = maxLot;

   // Round to lot step
   if(lotStep > 0)
   {
      int steps = (int)MathFloor(lots / lotStep);
      lots = steps * lotStep;
   }

   lots = NormalizeDouble(lots, 2);

   return lots;
}

// ─── Get Open Positions ───────────────────────────────────────────────────────

/// Count open positions with the specified magic number
int GetOpenPositions(int magicNumber)
{
   return CountPositionsByMagic(magicNumber);
}

/// Get total profit of open positions with specified magic number
double GetOpenPositionsProfit(int magicNumber)
{
   double totalProfit = 0;
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderMagicNumber() == magicNumber && OrderCloseTime() == 0)
         {
            totalProfit += OrderProfit() + OrderSwap() + OrderCommission();
         }
      }
   }
   return totalProfit;
}

// ─── Symbol Validation ────────────────────────────────────────────────────────

/// Check if a symbol is valid for trading
bool SymbolIsValid(string symbol)
{
   double bid = MarketInfo(symbol, MODE_BID);
   return (bid > 0);
}

// ─── Error Description ─────────────────────────────────────────────────────────

/// Get human-readable description for MQL4 trade error codes
string TradeErrorDescription(int errorCode)
{
   switch(errorCode)
   {
      case 0:    return "No error";
      case 1:    return "No change in parameters";
      case 2:    return "Common error";
      case 3:    return "Invalid trade parameters";
      case 4:    return "Trade server is busy";
      case 5:    return "Old version of client terminal";
      case 6:    return "No connection with trade server";
      case 7:    return "Not enough rights";
      case 8:    return "Too frequent requests";
      case 9:    return "Malfunctional trade operation";
      case 64:   return "Account disabled";
      case 65:   return "Invalid account";
      case 128:  return "Trade timeout";
      case 129:  return "Invalid price";
      case 130:  return "Invalid stops";
      case 131:  return "Invalid trade volume";
      case 132:  return "Market is closed";
      case 133:  return "Trade is disabled";
      case 134:  return "Not enough money";
      case 135:  return "Price changed";
      case 136:  return "Off quotes";
      case 137:  return "Broker is busy";
      case 138:  return "Requote";
      case 139:  return "Order is locked";
      case 140:  return "Buy orders only allowed";
      case 141:  return "Too many requests";
      case 145:  return "Modification denied (too close to market)";
      case 146:  return "Trade context is busy";
      case 147:  return "Trade prohibited by server";
      case 148:  return "Too many open/pending orders";
      case 149:  return "Hedging prohibited";
      case 150:  return "FIFO close only allowed";
      case 4108: return "Invalid ticket";
      case 4109: return "Trade is not allowed (check EA settings)";
      case 4110: return "Longs are not allowed";
      case 4111: return "Shorts are not allowed";
      case 4200: return "Object already exists";
      case 4201: return "Unknown object property";
      case 4202: return "Object does not exist";
      default:   return "Unknown error " + IntegerToString(errorCode);
   }
}

// ─── Set Trade Configuration ──────────────────────────────────────────────────

void SetTradeMagicNumber(int magic) { g_trade_magic_number = magic; }
void SetTradeMaxSlippage(int slip) { g_trade_max_slippage = slip; }
void SetTradeRetryCount(int retries) { g_trade_retry_count = retries; }
void SetTradeRetryDelay(int delayMs) { g_trade_retry_delay = delayMs; }