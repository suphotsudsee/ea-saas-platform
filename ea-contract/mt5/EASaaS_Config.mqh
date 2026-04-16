//+------------------------------------------------------------------+
//| EASaaS_Config.mqh                                                 |
//| EA SaaS Platform - Configuration Management for MT5              |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
#property strict
#include <EASaaS_Http.mqh>
#include <EASaaS_Utils.mqh>

struct EAConfig
{
   double   lotSize;
   double   riskPercent;
   int      stopLossPips;
   int      takeProfitPips;
   int      trailingStopPips;
   int      maxSlippage;
   bool     tradeOnNewBar;
   string   comment;
   string   configHash;
   string   lastConfigHash;
   datetime loadedAt;
   bool     loaded;
   int      syncIntervalSec;
   datetime lastSyncAt;
};

EAConfig g_config;
string g_raw_config_json = "";
string g_raw_risk_config_json = "";

void ConfigInit()
{
   g_config.lotSize = 0.0;
   g_config.riskPercent = 1.0;
   g_config.stopLossPips = 50;
   g_config.takeProfitPips = 100;
   g_config.trailingStopPips = 0;
   g_config.maxSlippage = 10;
   g_config.tradeOnNewBar = true;
   g_config.comment = "EASaaS";
   g_config.configHash = "";
   g_config.lastConfigHash = "";
   g_config.loadedAt = 0;
   g_config.loaded = false;
   g_config.syncIntervalSec = 300;
   g_config.lastSyncAt = 0;
   g_raw_config_json = "";
   g_raw_risk_config_json = "";
   LogInfo("Config module initialized with defaults");
}

bool LoadConfig(string serverUrl)
{
   string url = serverUrl + "/api/ea/sync-config";
   HttpResponse resp = HttpGet(url);

   if(!resp.success)
   {
      LogError("Failed to load config: " + resp.error);
      return false;
   }

   g_raw_config_json = JsonGetObject(resp.body, "config");
   g_raw_risk_config_json = JsonGetObject(resp.body, "riskConfig");

   g_config.lastConfigHash = g_config.configHash;
   g_config.configHash = JsonGetString(resp.body, "configHash");

   if(g_raw_config_json != "{}")
   {
      if(JsonHasKey(g_raw_config_json, "lotSize"))
         g_config.lotSize = JsonGetNumber(g_raw_config_json, "lotSize");
      if(JsonHasKey(g_raw_config_json, "riskPercent"))
         g_config.riskPercent = JsonGetNumber(g_raw_config_json, "riskPercent");
      if(JsonHasKey(g_raw_config_json, "stopLossPips"))
         g_config.stopLossPips = JsonGetInt(g_raw_config_json, "stopLossPips");
      if(JsonHasKey(g_raw_config_json, "takeProfitPips"))
         g_config.takeProfitPips = JsonGetInt(g_raw_config_json, "takeProfitPips");
      if(JsonHasKey(g_raw_config_json, "trailingStopPips"))
         g_config.trailingStopPips = JsonGetInt(g_raw_config_json, "trailingStopPips");
      if(JsonHasKey(g_raw_config_json, "maxSlippage"))
         g_config.maxSlippage = JsonGetInt(g_raw_config_json, "maxSlippage");
      if(JsonHasKey(g_raw_config_json, "tradeOnNewBar"))
         g_config.tradeOnNewBar = JsonGetBool(g_raw_config_json, "tradeOnNewBar");
      if(JsonHasKey(g_raw_config_json, "comment"))
         g_config.comment = JsonGetString(g_raw_config_json, "comment");
      if(JsonHasKey(g_raw_config_json, "syncIntervalSec"))
         g_config.syncIntervalSec = JsonGetInt(g_raw_config_json, "syncIntervalSec");
   }

   g_config.loadedAt = TimeCurrent();
   g_config.loaded = true;
   g_config.lastSyncAt = TimeCurrent();

   if(JsonGetBool(resp.body, "killSwitch"))
   {
      string reason = JsonGetString(resp.body, "killSwitchReason");
      LogError("Kill switch active in config: " + reason);
      return false;
   }

   bool configChanged = (g_config.lastConfigHash != "" && g_config.lastConfigHash != g_config.configHash);
   if(configChanged)
      LogInfo("Config CHANGED! New hash: " + g_config.configHash);
   else
      LogDebug("Config loaded (unchanged): hash=" + g_config.configHash);

   return true;
}

bool AcknowledgeConfig(string serverUrl)
{
   if(g_config.configHash == "") return true;
   string url = serverUrl + "/api/ea/sync-config";
   string body = "{" + JsonField("configHash", g_config.configHash) + "," +
      JsonField("timestamp", CurrentTimeISO8601()) + "}";
   HttpResponse resp = HttpPost(url, body, 5000);
   if(resp.success)
   {
      LogInfo("Config acknowledged: " + g_config.configHash);
      return true;
   }
   LogError("Failed to acknowledge config: " + resp.error);
   return false;
}

string GetConfigValue(string key, string defaultValue = "")
{
   if(g_raw_config_json == "") return defaultValue;
   return JsonGetString(g_raw_config_json, key);
}

double GetConfigValueNum(string key, double defaultValue = 0)
{
   if(g_raw_config_json == "") return defaultValue;
   return JsonGetNumber(g_raw_config_json, key);
}

int GetConfigValueInt(string key, int defaultValue = 0)
{
   if(g_raw_config_json == "") return defaultValue;
   return JsonGetInt(g_raw_config_json, key);
}

bool GetConfigValueBool(string key, bool defaultValue = false)
{
   if(g_raw_config_json == "") return defaultValue;
   return JsonGetBool(g_raw_config_json, key);
}

void ApplyConfig(double &lotSize, double &riskPercent, int &stopLossPips,
                 int &takeProfitPips, int &trailingStopPips, int &maxSlippage)
{
   if(!g_config.loaded) return;
   lotSize = g_config.lotSize;
   riskPercent = g_config.riskPercent;
   stopLossPips = g_config.stopLossPips;
   takeProfitPips = g_config.takeProfitPips;
   trailingStopPips = g_config.trailingStopPips;
   maxSlippage = g_config.maxSlippage;
   LogInfo(StringFormat("Config applied: lot=%.2f risk=%.1f%% sl=%d tp=%d",
      lotSize, riskPercent, stopLossPips, takeProfitPips));
}

bool ConfigNeedsSync()
{
   if(!g_config.loaded) return true;
   if(g_config.lastSyncAt == 0) return true;
   long elapsed = (long)(TimeCurrent() - g_config.lastSyncAt);
   return (elapsed >= g_config.syncIntervalSec);
}

bool HasConfigChanged()
{
   return (g_config.lastConfigHash != "" && g_config.lastConfigHash != g_config.configHash);
}

string GetConfigHash() { return g_config.configHash; }

string GetConfigSummary()
{
   return StringFormat("lot:%.2f risk:%.1f%% sl:%d tp:%d hash:%s",
      g_config.lotSize, g_config.riskPercent, g_config.stopLossPips,
      g_config.takeProfitPips, g_config.configHash);
}