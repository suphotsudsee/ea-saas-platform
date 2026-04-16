//+------------------------------------------------------------------+
//| EASaaS_License.mqh                                                |
//| EA SaaS Platform - License Management for MT4                    |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
//| Provides:                                                         |
//|   - ValidateLicense() — Call API, check response, cache result   |
//|   - CheckLicenseValid() — Quick check using cached state          |
//|   - GetLicenseInfo() — Return license details                     |
//|   - License state machine:                                        |
//|       UNKNOWN → VALIDATING → ACTIVE → EXPIRED/REVOKED/KILLED     |
//|   - Auto-retry on network failure with backoff                    |
//+------------------------------------------------------------------+
#property strict
#include <EASaaS_Http.mqh>

// ─── License States ───────────────────────────────────────────────────────────
enum LICENSE_STATE
{
   LICENSE_UNKNOWN    = 0,   // Initial state, not yet validated
   LICENSE_VALIDATING = 1,   // Validation in progress
   LICENSE_ACTIVE     = 2,   // License is valid and active
   LICENSE_EXPIRED    = 3,   // License has expired
   LICENSE_REVOKED    = 4,   // License has been revoked by admin
   LICENSE_KILLED     = 5,   // Kill switch is active
   LICENSE_PAUSED     = 6,   // License is paused
   LICENSE_ERROR      = 7,   // Network or other error
   LICENSE_INVALID    = 8    // License key is invalid
};

// ─── License Error Codes ─────────────────────────────────────────────────────
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

// ─── License Info Structure ───────────────────────────────────────────────────
struct LicenseInfo
{
   LICENSE_STATE  state;              // Current license state
   LICENSE_ERROR  errorCode;          // Last error code
   string         licenseId;          // License ID from server
   string         licenseKey;         // License key
   string         userId;             // User ID
   string         strategyId;         // Strategy ID
   string         strategyName;       // Strategy name
   string         strategyVersion;    // Strategy version
   string         planName;           // Subscription plan name
   datetime       expiresAt;          // License expiry time
   int            maxAccounts;        // Max trading accounts allowed
   bool           killSwitch;         // Kill switch status
   string         killSwitchReason;  // Reason for kill switch
   string         configHash;         // Current config hash
   datetime       lastValidatedAt;    // When last validated successfully
   datetime       lastCheckedAt;      // When last checked (any result)
   int            retryCount;         // Number of consecutive failures
   string         lastError;          // Human-readable error message
};

// ─── Global License State ─────────────────────────────────────────────────────
LicenseInfo g_license;

// Validation cache duration in seconds (5 minutes default, matches server Redis TTL)
int g_license_cache_ttl_sec = 300;

// Maximum validation retry attempts
int g_license_max_retries = 5;

// Base delay between retries (ms)
int g_license_retry_base_delay = 2000;

// ─── Initialize License State ─────────────────────────────────────────────────

/// Initialize the license module with defaults
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

// ─── Validate License ────────────────────────────────────────────────────────

/// Validate license with the SaaS backend.
/// Returns true if license is valid, false otherwise.
/// Updates g_license with results.
bool ValidateLicense(string serverUrl, string accountNumber)
{
   g_license.state = LICENSE_VALIDATING;
   g_license.lastCheckedAt = TimeCurrent();

   string url = serverUrl + "/api/ea/validate-license";

   // Build request body
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

      LogError("License validation failed (network): " + resp.error +
         " (retry " + IntegerToString(g_license.retryCount) + "/" +
         IntegerToString(g_license_max_retries) + ")");

      return false;
   }

   // Parse response
   g_license.retryCount = 0; // Reset on successful response

   bool isValid = JsonGetBool(resp.body, "valid");

   if(isValid)
   {
      g_license.state = LICENSE_ACTIVE;
      g_license.errorCode = LIC_ERR_NONE;
      g_license.licenseId = JsonGetString(resp.body, "id");

      // Parse nested license object
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

      // Parse strategy info
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
         " expires=" + TimeToString(g_license.expiresAt) +
         " maxAccounts=" + IntegerToString(g_license.maxAccounts));

      // Double-check kill switch
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
      // Parse error code
      string errorCode = JsonGetString(resp.body, "error");
      string errorMsg = JsonGetString(resp.body, "message");

      if(errorCode == "INVALID_KEY")
      {
         g_license.state = LICENSE_INVALID;
         g_license.errorCode = LIC_ERR_INVALID_KEY;
      }
      else if(errorCode == "EXPIRED")
      {
         g_license.state = LICENSE_EXPIRED;
         g_license.errorCode = LIC_ERR_EXPIRED;
      }
      else if(errorCode == "REVOKED")
      {
         g_license.state = LICENSE_REVOKED;
         g_license.errorCode = LIC_ERR_REVOKED;
      }
      else if(errorCode == "PAUSED")
      {
         g_license.state = LICENSE_PAUSED;
         g_license.errorCode = LIC_ERR_PAUSED;
      }
      else if(errorCode == "ACCOUNT_MISMATCH")
      {
         g_license.state = LICENSE_INVALID;
         g_license.errorCode = LIC_ERR_ACCOUNT_MISMATCH;
      }
      else if(errorCode == "MAX_ACCOUNTS_REACHED")
      {
         g_license.state = LICENSE_INVALID;
         g_license.errorCode = LIC_ERR_MAX_ACCOUNTS;
      }
      else if(errorCode == "KILLED")
      {
         g_license.state = LICENSE_KILLED;
         g_license.errorCode = LIC_ERR_KILLED;
      }
      else if(errorCode == "SUBSCRIPTION_INACTIVE")
      {
         g_license.state = LICENSE_INVALID;
         g_license.errorCode = LIC_ERR_SUBSCRIPTION;
      }
      else
      {
         g_license.state = LICENSE_ERROR;
         g_license.errorCode = LIC_ERR_SERVER;
      }

      g_license.lastError = errorMsg != "" ? errorMsg : errorCode;

      LogError("License validation failed: " + errorCode + " - " + g_license.lastError);
      return false;
   }
}

// ─── Validate License with Retry ──────────────────────────────────────────────

/// Validate license with automatic retry on network failure
/// Uses exponential backoff between attempts
bool ValidateLicenseWithRetry(string serverUrl, string accountNumber)
{
   int delay = g_license_retry_base_delay;

   for(int attempt = 0; attempt <= g_license_max_retries; attempt++)
   {
      if(attempt > 0)
      {
         LogInfo(StringFormat("License validation retry %d/%d in %d ms",
            attempt, g_license_max_retries, delay));
         Sleep(delay);
         delay = MathMin(delay * 2, 60000); // Cap at 60 seconds
      }

      if(ValidateLicense(serverUrl, accountNumber))
         return true;

      // Only retry on network errors
      if(g_license.errorCode != LIC_ERR_NETWORK && g_license.errorCode != LIC_ERR_SERVER)
         break; // Don't retry on auth/validation errors

      g_license.retryCount = attempt + 1;
   }

   LogError("License validation failed after " + IntegerToString(g_license_max_retries) + " retries");
   return false;
}

// ─── Quick License Check ──────────────────────────────────────────────────────

/// Quick check using cached state — no network call
/// Returns true if license is active and not expired
bool CheckLicenseValid()
{
   if(g_license.state != LICENSE_ACTIVE)
      return false;

   // Check if cached validation is still fresh
   if(g_license.lastValidatedAt > 0)
   {
      int elapsed = (int)(TimeCurrent() - g_license.lastValidatedAt);
      if(elapsed > g_license_cache_ttl_sec)
      {
         LogDebug("License cache expired (" + IntegerToString(elapsed) + "s old), revalidation needed");
         return false; // Cache expired, need to revalidate
      }
   }

   // Check if license has expired (time-based check)
   if(g_license.expiresAt > 0 && TimeCurrent() > g_license.expiresAt)
   {
      g_license.state = LICENSE_EXPIRED;
      g_license.errorCode = LIC_ERR_EXPIRED;
      g_license.lastError = "License has expired (time check)";
      LogWarn("License expired by time check: " + TimeToString(g_license.expiresAt));
      return false;
   }

   return true;
}

// ─── Get License Info ──────────────────────────────────────────────────────────

/// Get current license information
LicenseInfo GetLicenseInfo()
{
   return g_license;
}

/// Get human-readable license state string
string GetLicenseStateString(LICENSE_STATE state)
{
   switch(state)
   {
      case LICENSE_UNKNOWN:    return "UNKNOWN";
      case LICENSE_VALIDATING: return "VALIDATING";
      case LICENSE_ACTIVE:     return "ACTIVE";
      case LICENSE_EXPIRED:    return "EXPIRED";
      case LICENSE_REVOKED:    return "REVOKED";
      case LICENSE_KILLED:     return "KILLED";
      case LICENSE_PAUSED:     return "PAUSED";
      case LICENSE_ERROR:      return "ERROR";
      case LICENSE_INVALID:    return "INVALID";
      default:                 return "UNKNOWN";
   }
}

/// Get human-readable error code string
string GetLicenseErrorString(LICENSE_ERROR err)
{
   switch(err)
   {
      case LIC_ERR_NONE:             return "None";
      case LIC_ERR_INVALID_KEY:      return "Invalid License Key";
      case LIC_ERR_EXPIRED:          return "License Expired";
      case LIC_ERR_REVOKED:         return "License Revoked";
      case LIC_ERR_PAUSED:          return "License Paused";
      case LIC_ERR_ACCOUNT_MISMATCH:return "Account Mismatch";
      case LIC_ERR_MAX_ACCOUNTS:     return "Max Accounts Reached";
      case LIC_ERR_KILLED:          return "Kill Switch Active";
      case LIC_ERR_SUBSCRIPTION:    return "Subscription Inactive";
      case LIC_ERR_NETWORK:         return "Network Error";
      case LIC_ERR_SERVER:          return "Server Error";
      case LIC_ERR_PARSE:           return "Parse Error";
      default:                       return "Unknown Error";
   }
}

// ─── Set Kill Switch State ────────────────────────────────────────────────────

/// Mark license as killed (typically from heartbeat response)
void SetLicenseKilled(string reason)
{
   g_license.state = LICENSE_KILLED;
   g_license.killSwitch = true;
   g_license.killSwitchReason = reason;
   g_license.errorCode = LIC_ERR_KILLED;
   g_license.lastError = "Kill switch: " + reason;
   LogError("Kill switch activated: " + reason);
}

// ─── Revalidation Timer ───────────────────────────────────────────────────────

/// Check if license needs revalidation based on cache TTL
bool LicenseNeedsRevalidation()
{
   if(g_license.state != LICENSE_ACTIVE)
      return true;

   if(g_license.lastValidatedAt == 0)
      return true;

   int elapsed = (int)(TimeCurrent() - g_license.lastValidatedAt);
   return (elapsed >= g_license_cache_ttl_sec);
}