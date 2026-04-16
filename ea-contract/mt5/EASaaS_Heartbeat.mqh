//+------------------------------------------------------------------+
//| EASaaS_Heartbeat.mqh                                              |
//| EA SaaS Platform - Heartbeat System for MT5                      |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
#property strict
#include <EASaaS_Http.mqh>
#include <EASaaS_License.mqh>

int g_heartbeat_interval_sec = 60;
int g_heartbeat_timeout_ms = 8000;
datetime g_heartbeat_last_sent = 0;
int g_heartbeat_fail_count = 0;
int g_heartbeat_max_fail = 10;
bool g_heartbeat_started = false;

struct HeartbeatResult
{
   bool   success;
   bool   killSwitch;
   string killReason;
   bool   configUpdate;
   string configHash;
   string status;
   string rawResponse;
};

void StartHeartbeat(int intervalSec = 60)
{
   g_heartbeat_interval_sec = intervalSec;
   g_heartbeat_started = true;
   g_heartbeat_last_sent = 0;
   g_heartbeat_fail_count = 0;
   LogInfo("Heartbeat system started (interval: " + IntegerToString(intervalSec) + "s)");
}

void StopHeartbeat()
{
   g_heartbeat_started = false;
   LogInfo("Heartbeat system stopped");
}

bool IsHeartbeatDue()
{
   if(!g_heartbeat_started) return false;
   if(g_heartbeat_last_sent == 0) return true;
   long elapsed = (long)(TimeCurrent() - g_heartbeat_last_sent);
   return (elapsed >= g_heartbeat_interval_sec);
}

// Helper for MT5: count positions by magic number
int CountMyPositionsMT5(int magicNumber, string sym = "")
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0)
      {
         if(PositionGetInteger(POSITION_MAGIC) == magicNumber)
         {
            if(sym == "" || PositionGetString(POSITION_SYMBOL) == sym)
               count++;
         }
      }
   }
   return count;
}

HeartbeatResult SendHeartbeat(string serverUrl, long accountNumber)
{
   HeartbeatResult result;
   result.success = false;
   result.killSwitch = false;
   result.killReason = "";
   result.configUpdate = false;
   result.configHash = "";
   result.status = "";
   result.rawResponse = "";

   if(!g_heartbeat_started) return result;

   string url = serverUrl + "/api/ea/heartbeat";
   string body = "{";
   body += JsonField("accountNumber", IntegerToString(accountNumber)) + ",";
   body += JsonField("platform", "MT5") + ",";
   body += JsonField("eaVersion", "1.0.0") + ",";
   body += JsonFieldNum("equity", AccountInfoDouble(ACCOUNT_EQUITY)) + ",";
   body += JsonFieldNum("balance", AccountInfoDouble(ACCOUNT_BALANCE)) + ",";
   body += JsonFieldInt("openPositions", CountMyPositionsMT5(0)) + ",";  // 0 = count all for heartbeat
   // For margin level, need to calculate from margin and equity
   double margin = AccountInfoDouble(ACCOUNT_MARGIN);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double marginLevel = (margin > 0) ? (equity / margin * 100.0) : 0;
   body += JsonFieldNum("marginLevel", marginLevel) + ",";
   body += JsonField("serverTime", CurrentTimeISO8601());
   body += "}";

   LogTrace("Sending heartbeat: equity=" + DoubleToString(equity, 2) +
      " balance=" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2));

   HttpResponse resp = HttpPost(url, body, g_heartbeat_timeout_ms);

   g_heartbeat_last_sent = TimeCurrent();
   result.rawResponse = resp.body;

   if(!resp.success)
   {
      g_heartbeat_fail_count++;
      LogError("Heartbeat failed (" + IntegerToString(g_heartbeat_fail_count) + "/" +
         IntegerToString(g_heartbeat_max_fail) + "): " + resp.error);
      return result;
   }

   g_heartbeat_fail_count = 0;
   result.success = true;
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

   return result;
}

void SendFinalHeartbeat(string serverUrl, long accountNumber)
{
   LogInfo("Sending final heartbeat before shutdown...");
   bool wasStarted = g_heartbeat_started;
   g_heartbeat_started = true;
   HeartbeatResult result = SendHeartbeat(serverUrl, accountNumber);
   g_heartbeat_started = wasStarted;
   if(result.success)
      LogInfo("Final heartbeat sent successfully");
   else
      LogError("Final heartbeat failed");
}

void HandleHeartbeatResponse(HeartbeatResult &result, string serverUrl)
{
   if(result.killSwitch)
   {
      SetLicenseKilled(result.killReason);
      AcknowledgeKillSwitch(serverUrl, IntegerToString(result.killSwitch ? 1 : 0), result.killReason);
   }

   if(result.configUpdate && result.configHash != "")
   {
      LogInfo("Config update flagged by heartbeat. Hash: " + result.configHash);
   }
}

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
   LogError("Failed to acknowledge kill switch: " + resp.error);
   return false;
}

int GetHeartbeatFailCount() { return g_heartbeat_fail_count; }
long GetSecondsSinceLastHeartbeat()
{
   if(g_heartbeat_last_sent == 0) return -1;
   return (long)(TimeCurrent() - g_heartbeat_last_sent);
}
bool IsHeartbeatHealthy() { return g_heartbeat_fail_count < g_heartbeat_max_fail; }