//+------------------------------------------------------------------+
//| EASaaS_License.mqh                                                |
//| EA SaaS Platform - License Management for MT5                    |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
#property strict
#include <EASaaS_Http.mqh>

// ─── License States ───────────────────────────────────────────────────────────
enum LICENSE_STATE
{
   LICENSE_UNKNOWN    = 0,
   LICENSE_VALIDATING = 1,
   LICENSE_ACTIVE     = 2,
   LICENSE_EXPIRED    = 3,
   LICENSE_REVOKED    = 4,
   LICENSE_KILLED     = 5,
   LICENSE_PAUSED     = 6,
   LICENSE_ERROR      = 7,
   LICENSE_INVALID    = 8
};

enum LICENSE_ERROR
{
   LIC_ERR_NONE              = 0,
   LIC_ERR_INVALID_KEY       = 1,
   LIC_ERR_EXPIRED           = 2,
   LIC_ERR_REVOKED           = 3,
   LIC_ERR_PAUSED            = 4,
   LIC_ERR_ACCOUNT_MISMATCH  = 5,
   LIC_ERR_MAX_ACCOUNTS      = 6,
   LIC_ERR_KILLED            = 7,
   LIC_ERR_SUBSCRIPTION      = 8,
   LIC_ERR_NETWORK           = 9,
   LIC_ERR_SERVER            = 10,
   LIC_ERR_PARSE             = 11
};

struct LicenseInfo
{
   LICENSE_STATE  state;
   LICENSE_ERROR  errorCode;
   string         licenseId;
   string         licenseKey;
   string         userId;
   string         strategyId;
   string         strategyName;
   string         strategyVersion;
   string         planName;
   datetime       expiresAt;
   int            maxAccounts;
   bool           killSwitch;
   string         killSwitchReason;
   string         configHash;
   datetime       lastValidatedAt;
   datetime       lastCheckedAt;
   int            retryCount;
   string         lastError;
};

LicenseInfo g_license;
int g_license_cache_ttl_sec = 300;
int g_license_max_retries = 5;
int g_license_retry_base_delay = 2000;

void LicenseInit()
{
   g_license.state = LICENSE_UNKNOWN;
   g_license.errorCode = LIC_ERR_NONE;
   g_license.licenseId = "";
   g_license.licenseKey = g_license_key;
   g_license.userId = "";
   g_license.strategyId = "";
   g_license.strategyName = "";
   g_license.strategyVersion = "";
   g_license.planName = "";
   g_license.expiresAt = 0;
   g_license.maxAccounts = 0;
   g_license.killSwitch = false;
   g_license.killSwitchReason = "";
   g_license.configHash = "";
   g_license.lastValidatedAt = 0;
   g_license.lastCheckedAt = 0;
   g_license.retryCount = 0;
   g_license.lastError = "";
   LogInfo("License module initialized");
}

bool ValidateLicense(string serverUrl, string accountNumber)
{
   g_license.state = LICENSE_VALIDATING;
   g_license.lastCheckedAt = TimeCurrent();

   string url = serverUrl + "/api/ea/validate-license";
   string body = "{" +
      JsonField("licenseKey", g_license_key) + "," +
      JsonField("accountNumber", accountNumber) +
   "}";

   LogInfo("Validating license: " + g_license_key + " account: " + accountNumber);

   HttpResponse resp = HttpPost(url, body);

   if(!resp.success)
   {
      g_license.retryCount++;
      g_license.state = LICENSE_ERROR;
      g_license.errorCode = LIC_ERR_NETWORK;
      g_license.lastError = "Network error: " + resp.error;
      LogError("License validation failed (network): " + resp.error);
      return false;
   }

   g_license.retryCount = 0;
   bool isValid = JsonGetBool(resp.body, "valid");

   if(isValid)
   {
      g_license.state = LICENSE_ACTIVE;
      g_license.errorCode = LIC_ERR_NONE;
      g_license.licenseId = JsonGetString(resp.body, "id");

      string licenseObj = JsonGetObject(resp.body, "license");
      if(licenseObj != "{}")
      {
         g_license.licenseId = JsonGetString(licenseObj, "id");
         g_license.userId = JsonGetString(licenseObj, "userId");
         g_license.strategyId = JsonGetString(licenseObj, "strategyId");
         g_license.expiresAt = StringToTime(JsonGetString(licenseObj, "expiresAt"));
         g_license.maxAccounts = JsonGetInt(licenseObj, "maxAccounts");
         g_license.killSwitch = JsonGetBool(licenseObj, "killSwitch");
      }

      string strategyObj = JsonGetObject(resp.body, "strategy");
      if(strategyObj != "{}")
      {
         g_license.strategyId = JsonGetString(strategyObj, "id");
         g_license.strategyName = JsonGetString(strategyObj, "name");
         g_license.strategyVersion = JsonGetString(strategyObj, "version");
      }

      g_license.configHash = JsonGetString(resp.body, "configHash");
      g_license.lastValidatedAt = TimeCurrent();

      LogInfo("License validated: strategy=" + g_license.strategyName +
         " expires=" + TimeToString(g_license.expiresAt));

      if(g_license.killSwitch)
      {
         g_license.state = LICENSE_KILLED;
         g_license.errorCode = LIC_ERR_KILLED;
         g_license.lastError = "Kill switch is active";
         LogError("License validated but kill switch is active");
         return false;
      }

      return true;
   }
   else
   {
      string errorCode = JsonGetString(resp.body, "error");
      string errorMsg = JsonGetString(resp.body, "message");

      if(errorCode == "INVALID_KEY") { g_license.state = LICENSE_INVALID; g_license.errorCode = LIC_ERR_INVALID_KEY; }
      else if(errorCode == "EXPIRED") { g_license.state = LICENSE_EXPIRED; g_license.errorCode = LIC_ERR_EXPIRED; }
      else if(errorCode == "REVOKED") { g_license.state = LICENSE_REVOKED; g_license.errorCode = LIC_ERR_REVOKED; }
      else if(errorCode == "PAUSED") { g_license.state = LICENSE_PAUSED; g_license.errorCode = LIC_ERR_PAUSED; }
      else if(errorCode == "ACCOUNT_MISMATCH") { g_license.state = LICENSE_INVALID; g_license.errorCode = LIC_ERR_ACCOUNT_MISMATCH; }
      else if(errorCode == "MAX_ACCOUNTS_REACHED") { g_license.state = LICENSE_INVALID; g_license.errorCode = LIC_ERR_MAX_ACCOUNTS; }
      else if(errorCode == "KILLED") { g_license.state = LICENSE_KILLED; g_license.errorCode = LIC_ERR_KILLED; }
      else if(errorCode == "SUBSCRIPTION_INACTIVE") { g_license.state = LICENSE_INVALID; g_license.errorCode = LIC_ERR_SUBSCRIPTION; }
      else { g_license.state = LICENSE_ERROR; g_license.errorCode = LIC_ERR_SERVER; }

      g_license.lastError = errorMsg != "" ? errorMsg : errorCode;
      LogError("License validation failed: " + errorCode + " - " + g_license.lastError);
      return false;
   }
}

bool ValidateLicenseWithRetry(string serverUrl, string accountNumber)
{
   int delay = g_license_retry_base_delay;
   for(int attempt = 0; attempt <= g_license_max_retries; attempt++)
   {
      if(attempt > 0)
      {
         LogInfo(StringFormat("License validation retry %d/%d in %d ms", attempt, g_license_max_retries, delay));
         Sleep(delay);
         delay = MathMin(delay * 2, 60000);
      }
      if(ValidateLicense(serverUrl, accountNumber))
         return true;
      if(g_license.errorCode != LIC_ERR_NETWORK && g_license.errorCode != LIC_ERR_SERVER)
         break;
      g_license.retryCount = attempt + 1;
   }
   LogError("License validation failed after " + IntegerToString(g_license_max_retries) + " retries");
   return false;
}

bool CheckLicenseValid()
{
   if(g_license.state != LICENSE_ACTIVE) return false;
   if(g_license.lastValidatedAt > 0)
   {
      long elapsed = (long)(TimeCurrent() - g_license.lastValidatedAt);
      if(elapsed > g_license_cache_ttl_sec) return false;
   }
   if(g_license.expiresAt > 0 && TimeCurrent() > g_license.expiresAt)
   {
      g_license.state = LICENSE_EXPIRED;
      g_license.errorCode = LIC_ERR_EXPIRED;
      g_license.lastError = "License has expired";
      return false;
   }
   return true;
}

LicenseInfo GetLicenseInfo() { return g_license; }

string GetLicenseStateString(LICENSE_STATE state)
{
   switch(state)
   {
      case LICENSE_UNKNOWN:    return "UNKNOWN";
      case LICENSE_VALIDATING: return "VALIDATING";
      case LICENSE_ACTIVE:     return "ACTIVE";
      case LICENSE_EXPIRED:    return "EXPIRED";
      case LICENSE_REVOKED:   return "REVOKED";
      case LICENSE_KILLED:    return "KILLED";
      case LICENSE_PAUSED:    return "PAUSED";
      case LICENSE_ERROR:     return "ERROR";
      case LICENSE_INVALID:   return "INVALID";
      default:                return "UNKNOWN";
   }
}

void SetLicenseKilled(string reason)
{
   g_license.state = LICENSE_KILLED;
   g_license.killSwitch = true;
   g_license.killSwitchReason = reason;
   g_license.errorCode = LIC_ERR_KILLED;
   g_license.lastError = "Kill switch: " + reason;
   LogError("Kill switch activated: " + reason);
}

bool LicenseNeedsRevalidation()
{
   if(g_license.state != LICENSE_ACTIVE) return true;
   if(g_license.lastValidatedAt == 0) return true;
   long elapsed = (long)(TimeCurrent() - g_license.lastValidatedAt);
   return (elapsed >= g_license_cache_ttl_sec);
}