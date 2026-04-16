//+------------------------------------------------------------------+
//| EASaaS_Heartbeat.mqh                                              |
//| EA SaaS Platform - Heartbeat System for MT4                      |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
//| Provides:                                                         |
//|   - StartHeartbeat() — Begin periodic heartbeat                   |
//|   - SendHeartbeat() — Send heartbeat with account info            |
//|   - HandleHeartbeatResponse() — Process kill switch, config       |
//|   - Heartbeat interval configurable                               |
//+------------------------------------------------------------------+
#property strict
#include <EASaaS_Http.mqh>
#include <EASaaS_License.mqh>

// ─── Heartbeat Configuration ──────────────────────────────────────────────────
int g_heartbeat_interval_sec = 60;    // Default: 60 seconds
int g_heartbeat_timeout_ms = 8000;     // Timeout for heartbeat requests

// ─── Heartbeat State ─────────────────────────────────────────────────────────
datetime g_heartbeat_last_sent = 0;    // Last time heartbeat was sent
int g_heartbeat_fail_count = 0;       // Consecutive failure count
int g_heartbeat_max_fail = 10;        // Max failures before alerting
bool g_heartbeat_started = false;     // Whether heartbeat system is active

// ─── Heartbeat Result ─────────────────────────────────────────────────────────
struct HeartbeatResult
{
   bool   success;           // Was heartbeat accepted
   bool   killSwitch;       // Kill switch active?
   string killReason;        // Reason for kill switch
   bool   configUpdate;     // Config update available?
   string configHash;       // Current config hash from server
   string status;           // "ok", "killed", "config_update"
   string rawResponse;      // Raw JSON response
};

// ─── Start Heartbeat ──────────────────────────────────────────────────────────

/// Initialize and start the heartbeat system
void StartHeartbeat(int intervalSec = 60)
{
   g_heartbeat_interval_sec = intervalSec;
   g_heartbeat_started = true;
   g_heartbeat_last_sent = 0;
   g_heartbeat_fail_count = 0;

   LogInfo("Heartbeat system started (interval: " + IntegerToString(intervalSec) + "s)");
}

// ─── Stop Heartbeat ───────────────────────────────────────────────────────────

/// Stop the heartbeat system
void StopHeartbeat()
{
   g_heartbeat_started = false;
   LogInfo("Heartbeat system stopped");
}

// ─── Is Heartbeat Due ─────────────────────────────────────────────────────────

/// Check if it's time to send a heartbeat
bool IsHeartbeatDue()
{
   if(!g_heartbeat_started) return false;

   if(g_heartbeat_last_sent == 0) return true;

   int elapsed = (int)(TimeCurrent() - g_heartbeat_last_sent);
   return (elapsed >= g_heartbeat_interval_sec);
}

// ─── Send Heartbeat ──────────────────────────────────────────────────────────

/// Send a heartbeat to the SaaS backend
HeartbeatResult SendHeartbeat(string serverUrl, string accountNumber)
{
   HeartbeatResult result;
   result.success = false;
   result.killSwitch = false;
   result.killReason = "";
   result.configUpdate = false;
   result.configHash = "";
   result.status = "";
   result.rawResponse = "";

   if(!g_heartbeat_started)
   {
      LogDebug("Heartbeat not started, skipping");
      return result;
   }

   string url = serverUrl + "/api/ea/heartbeat";

   // Build heartbeat payload matching server schema
   string body = "{";
   body += JsonField("accountNumber", accountNumber) + ",";
   body += JsonField("platform", "MT4") + ",";
   body += JsonField("eaVersion", "1.0.0") + ",";
   body += JsonFieldNum("equity", AccountEquity()) + ",";
   body += JsonFieldNum("balance", AccountBalance()) + ",";
   body += JsonFieldInt("openPositions", CountMyPositions()) + ",";
   body += JsonFieldNum("marginLevel", AccountMargin() > 0 ? (AccountEquity() / AccountMargin() * 100) : 0) + ",";
   body += JsonField("serverTime", CurrentTimeISO8601());
   body += "}";

   LogTrace("Sending heartbeat: equity=" + DoubleToString(AccountEquity(), 2) +
      " balance=" + DoubleToString(AccountBalance(), 2) +
      " positions=" + IntegerToString(CountMyPositions()));

   HttpResponse resp = HttpPost(url, body, g_heartbeat_timeout_ms);

   g_heartbeat_last_sent = TimeCurrent();
   result.rawResponse = resp.body;

   if(!resp.success)
   {
      g_heartbeat_fail_count++;
      LogError("Heartbeat failed (" + IntegerToString(g_heartbeat_fail_count) + "/" +
         IntegerToString(g_heartbeat_max_fail) + "): " + resp.error);

      if(g_heartbeat_fail_count >= g_heartbeat_max_fail)
      {
         LogError("Heartbeat failure threshold reached! Check network connection.");
      }

      return result;
   }

   // Success
   g_heartbeat_fail_count = 0;
   result.success = true;

   // Parse response
   result.status = JsonGetString(resp.body, "status");
   result.killSwitch = JsonGetBool(resp.body, "kill");
   result.killReason = JsonGetString(resp.body, "killReason");
   result.configHash = JsonGetString(resp.body, "configHash");

   if(result.killSwitch)
   {
      LogError("KILL SWITCH received from heartbeat! Reason: " + result.killReason);
      SetLicenseKilled(result.killReason);
   }

   if(result.status == "config_update")
   {
      result.configUpdate = true;
      LogInfo("Config update available (hash: " + result.configHash + ")");
   }

   LogTrace("Heartbeat OK: status=" + result.status +
      " kill=" + (result.killSwitch ? "YES" : "no") +
      " config=" + (result.configUpdate ? "UPDATE" : "same"));

   return result;
}

// ─── Send Final Heartbeat ────────────────────────────────────────────────────

/// Send a final heartbeat on EA shutdown
void SendFinalHeartbeat(string serverUrl, string accountNumber)
{
   LogInfo("Sending final heartbeat before shutdown...");

   // Temporarily allow sending even if not "started"
   bool wasStarted = g_heartbeat_started;
   g_heartbeat_started = true;

   HeartbeatResult result = SendHeartbeat(serverUrl, accountNumber);

   g_heartbeat_started = wasStarted;

   if(result.success)
      LogInfo("Final heartbeat sent successfully");
   else
      LogError("Final heartbeat failed: " + result.rawResponse);
}

// ─── Handle Heartbeat Response ────────────────────────────────────────────────

/// Process heartbeat response — check kill switch, config updates
/// This should be called after every heartbeat to react to server directives
void HandleHeartbeatResponse(HeartbeatResult &result, string serverUrl)
{
   // Handle kill switch
   if(result.killSwitch)
   {
      SetLicenseKilled(result.killReason);

      // Acknowledge kill switch to server
      AcknowledgeKillSwitch(serverUrl, IntegerToString(AccountNumber()), result.killReason);
   }

   // Handle config update
   if(result.configUpdate && result.configHash != "")
   {
      // Signal that config needs to be reloaded (handled by main EA loop)
      LogInfo("Config update flagged by heartbeat. Hash: " + result.configHash);
   }
}

// ─── Acknowledge Kill Switch ──────────────────────────────────────────────────

/// Acknowledge kill switch receipt to the server
bool AcknowledgeKillSwitch(string serverUrl, string accountNumber, string reason)
{
   string url = serverUrl + "/api/ea/kill-switch";

   string body = "{";
   body += JsonField("accountNumber", accountNumber) + ",";
   body += JsonField("acknowledged", "true") + ",";
   body += JsonField("reason", reason) + ",";
   body += JsonField("timestamp", CurrentTimeISO8601());
   body += "}";

   HttpResponse resp = HttpPost(url, body, 5000);

   if(resp.success)
   {
      LogInfo("Kill switch acknowledged by server");
      return true;
   }
   else
   {
      LogError("Failed to acknowledge kill switch: " + resp.error);
      return false;
   }
}

// ─── Helper: Count My Positions ───────────────────────────────────────────────

/// Count open positions with our magic number
int CountMyPositions(int magicNumber = 0)
{
   int count = 0;
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(magicNumber == 0 || OrderMagicNumber() == magicNumber)
         {
            if(OrderCloseTime() == 0) // Still open
               count++;
         }
      }
   }
   return count;
}

// ─── Heartbeat Status ─────────────────────────────────────────────────────────

/// Get the number of consecutive heartbeat failures
int GetHeartbeatFailCount()
{
   return g_heartbeat_fail_count;
}

/// Get seconds since last heartbeat
int GetSecondsSinceLastHeartbeat()
{
   if(g_heartbeat_last_sent == 0) return -1;
   return (int)(TimeCurrent() - g_heartbeat_last_sent);
}

/// Check if heartbeat system is healthy (fewer than max failures)
bool IsHeartbeatHealthy()
{
   return g_heartbeat_fail_count < g_heartbeat_max_fail;
}