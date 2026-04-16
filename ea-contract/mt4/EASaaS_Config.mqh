//+------------------------------------------------------------------+
//| EASaaS_Config.mqh                                                 |
//| EA SaaS Platform - Configuration Management for MT4              |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
//| Provides:                                                         |
//|   - LoadConfig() — Fetch config from /api/ea/sync-config         |
//|   - GetConfigValue() — Get specific config parameter             |
//|   - ApplyConfig() — Apply config to EA inputs                    |
//|   - Config version tracking                                       |
//|   - Config change detection                                       |
//+------------------------------------------------------------------+
#property strict
#include <EASaaS_Http.mqh>
#include <EASaaS_Utils.mqh>

// ─── Config Structure ─────────────────────────────────────────────────────────
struct EAConfig
{
   // Strategy parameters
   double   lotSize;              // Fixed lot size (0 = use risk-based)
   double   riskPercent;          // Risk percentage per trade (e.g., 1.0)
   int      stopLossPips;         // Stop loss in pips
   int      takeProfitPips;       // Take profit in pips
   int      trailingStopPips;     // Trailing stop in pips (0 = disabled)
   int      maxSlippage;          // Maximum slippage in points
   bool     tradeOnNewBar;        // Only trade on new bar
   string   comment;             // Order comment prefix

   // Config metadata
   string   configHash;          // Current config hash
   string   lastConfigHash;      // Previous config hash (for change detection)
   datetime loadedAt;            // When config was last loaded
   bool     loaded;              // Whether config has been loaded
   int      syncIntervalSec;     // How often to sync config (seconds)
   datetime lastSyncAt;          // Last sync time
};

// ─── Global Config ────────────────────────────────────────────────────────────
EAConfig g_config;

// ─── Raw config JSON storage ──────────────────────────────────────────────────
string g_raw_config_json = "";
string g_raw_risk_config_json = "";

// ─── Initialize Config ─────────────────────────────────────────────────────────

/// Initialize config with defaults
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
   g_config.syncIntervalSec = 300; // 5 minutes
   g_config.lastSyncAt = 0;

   g_raw_config_json = "";
   g_raw_risk_config_json = "";

   LogInfo("Config module initialized with defaults");
}

// ─── Load Config from API ─────────────────────────────────────────────────────

/// Fetch configuration from the SaaS backend
bool LoadConfig(string serverUrl)
{
   string url = serverUrl + "/api/ea/sync-config";

   HttpResponse resp = HttpGet(url);

   if(!resp.success)
   {
      LogError("Failed to load config: " + resp.error);
      return false;
   }

   // Store raw JSON for later value extraction
   g_raw_config_json = JsonGetObject(resp.body, "config");
   g_raw_risk_config_json = JsonGetObject(resp.body, "riskConfig");

   // Parse config values
   g_config.lastConfigHash = g_config.configHash;
   g_config.configHash = JsonGetString(resp.body, "configHash");

   // Update strategy parameters from config
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

   // Check for kill switch in config response
   if(JsonGetBool(resp.body, "killSwitch"))
   {
      string reason = JsonGetString(resp.body, "killSwitchReason");
      LogError("Kill switch active in config: " + reason);
      return false;
   }

   // Detect config changes
   bool configChanged = (g_config.lastConfigHash != "" && g_config.lastConfigHash != g_config.configHash);
   if(configChanged)
   {
      LogInfo("Config CHANGED! Old hash: " + g_config.lastConfigHash + " New hash: " + g_config.configHash);
   }
   else
   {
      LogDebug("Config loaded (unchanged): hash=" + g_config.configHash);
   }

   return true;
}

// ─── Acknowledge Config ───────────────────────────────────────────────────────

/// Acknowledge config receipt to the server
bool AcknowledgeConfig(string serverUrl)
{
   if(g_config.configHash == "")
   {
      LogDebug("No config hash to acknowledge");
      return true;
   }

   string url = serverUrl + "/api/ea/sync-config";

   string body = "{" +
      JsonField("configHash", g_config.configHash) + "," +
      JsonField("timestamp", CurrentTimeISO8601()) +
   "}";

   HttpResponse resp = HttpPost(url, body, 5000);

   if(resp.success)
   {
      LogInfo("Config acknowledged: " + g_config.configHash);
      return true;
   }
   else
   {
      LogError("Failed to acknowledge config: " + resp.error);
      return false;
   }
}

// ─── Get Config Value ─────────────────────────────────────────────────────────

/// Get a specific config value from the raw config JSON
string GetConfigValue(string key, string defaultValue = "")
{
   if(g_raw_config_json == "") return defaultValue;
   return JsonGetString(g_raw_config_json, key);
}

/// Get a numeric config value
double GetConfigValueNum(string key, double defaultValue = 0)
{
   if(g_raw_config_json == "") return defaultValue;
   return JsonGetNumber(g_raw_config_json, key);
}

/// Get an integer config value
int GetConfigValueInt(string key, int defaultValue = 0)
{
   if(g_raw_config_json == "") return defaultValue;
   return JsonGetInt(g_raw_config_json, key);
}

/// Get a boolean config value
bool GetConfigValueBool(string key, bool defaultValue = false)
{
   if(g_raw_config_json == "") return defaultValue;
   return JsonGetBool(g_raw_config_json, key);
}

// ─── Apply Config ─────────────────────────────────────────────────────────────

/// Apply loaded config values to EA input variables
/// This is called when config changes are detected
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

   LogInfo(StringFormat("Config applied: lot=%.2f risk=%.1f%% sl=%d tp=%d trail=%d slip=%d",
      lotSize, riskPercent, stopLossPips, takeProfitPips, trailingStopPips, maxSlippage));
}

// ─── Config Version Tracking ──────────────────────────────────────────────────

/// Check if config needs to be re-synced
bool ConfigNeedsSync()
{
   if(!g_config.loaded) return true;

   if(g_config.lastSyncAt == 0) return true;

   int elapsed = (int)(TimeCurrent() - g_config.lastSyncAt);
   return (elapsed >= g_config.syncIntervalSec);
}

/// Check if the config has changed since last load
bool HasConfigChanged()
{
   return (g_config.lastConfigHash != "" && g_config.lastConfigHash != g_config.configHash);
}

/// Get current config hash
string GetConfigHash()
{
   return g_config.configHash;
}

/// Get config summary string
string GetConfigSummary()
{
   return StringFormat("lot:%.2f risk:%.1f%% sl:%d tp:%d hash:%s",
      g_config.lotSize, g_config.riskPercent, g_config.stopLossPips,
      g_config.takeProfitPips, g_config.configHash);
}