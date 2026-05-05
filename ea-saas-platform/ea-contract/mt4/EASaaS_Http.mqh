//+------------------------------------------------------------------+
//| EASaaS_Http.mqh                                                   |
//| EA SaaS Platform - HTTP Utility Library for MT4                  |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
//| Provides:                                                         |
//|   - HttpGet(), HttpPost() with JSON support                       |
//|   - Request signing (HMAC-SHA256)                                |
//|   - Response parsing                                              |
//|   - Retry logic with exponential backoff                         |
//|   - Timeout handling                                              |
//|   - SSL/TLS support via WebRequest                                |
//+------------------------------------------------------------------+
#property strict
#include <EASaaS_Utils.mqh>

// ─── HTTP Response Structure ──────────────────────────────────────────────────
struct HttpResponse
{
   int      statusCode;     // HTTP status code (200, 401, 500, etc.)
   string   body;          // Response body as string
   string   headers;       // Response headers
   bool     success;       // Was the request successful (status 2xx)?
   string   error;         // Error message if request failed
};

// ─── HTTP Configuration ───────────────────────────────────────────────────────
// These can be overridden from the main EA

// Default timeout in milliseconds
int g_http_timeout_ms = 10000;

// Default number of retry attempts
int g_http_max_retries = 3;

// Default base delay for exponential backoff (milliseconds)
int g_http_base_delay_ms = 1000;

// API key for authentication
string g_api_key = "";

// License key for authentication
string g_license_key = "";

// HMAC signing secret (optional)
string g_hmac_secret = "";

// ─── Internal: Build Request Headers ─────────────────────────────────────────

/// Build the standard headers for API requests
string BuildHeaders(string method, string contentType = "application/json")
{
   string headers = "";
   headers += "Content-Type: " + contentType + "\r\n";
   headers += "X-API-Key: " + g_api_key + "\r\n";
   headers += "X-License-Key: " + g_license_key + "\r\n";
   headers += "Accept: application/json\r\n";

   // Add HMAC signature if secret is configured
   if(g_hmac_secret != "")
   {
      // Signature will be added after body is known, see SignRequest()
   }

   return headers;
}

/// Sign a request with HMAC-SHA256
string SignRequest(string method, string path, string body, string timestamp)
{
   if(g_hmac_secret == "") return "";

   string message = method + "\n" + path + "\n" + timestamp + "\n" + body;
   return HMAC_SHA256(g_hmac_secret, message);
}

// ─── HTTP GET ─────────────────────────────────────────────────────────────────

/// Perform an HTTP GET request with retry logic
HttpResponse HttpGet(string url, int timeoutMs = 0)
{
   HttpResponse response;
   response.statusCode = 0;
   response.body = "";
   response.headers = "";
   response.success = false;
   response.error = "";

   if(timeoutMs <= 0) timeoutMs = g_http_timeout_ms;

   string headers = BuildHeaders("GET");

   // Add timestamp header for HMAC
   string timestamp = IntegerToString(CurrentUnixTime());
   if(g_hmac_secret != "")
   {
      string path = ExtractPath(url);
      string signature = SignRequest("GET", path, "", timestamp);
      headers += "X-Timestamp: " + timestamp + "\r\n";
      headers += "X-Signature: " + signature + "\r\n";
   }

   int retryDelay = g_http_base_delay_ms;
   char postData[];
   char resultBody[];
   string resultHeaders;

   for(int attempt = 0; attempt <= g_http_max_retries; attempt++)
   {
      if(attempt > 0)
      {
         LogDebug(StringFormat("HTTP GET retry %d/%d after %d ms: %s",
            attempt, g_http_max_retries, retryDelay, url));

         Sleep(retryDelay);
         retryDelay = retryDelay * 2; // Exponential backoff
      }

      // Reset response and arrays
      response.statusCode = 0;
      response.body = "";
      response.headers = "";
      response.success = false;
      response.error = "";
      ArrayFree(postData);
      ArrayFree(resultBody);
      resultHeaders = "";

      // Make the WebRequest
      int res = WebRequest("GET", url, headers, timeoutMs, postData, resultBody, resultHeaders);

      if(res == -1)
      {
         int err = GetLastError();
         response.error = StringFormat("WebRequest failed: error %d", err);

         // Error 4060 = WebRequest not allowed in terminal settings
         if(err == 4060)
         {
            LogError("WebRequest is not allowed. Add the server URL to Tools > Options > Expert Advisors > Allow WebRequest");
            response.error = "WebRequest not allowed. Add server URL to MT4 whitelist.";
            break; // Don't retry this
         }

         // Error 4014 = Invalid parameters
         if(err == 4014)
         {
            response.error = "Invalid WebRequest parameters";
            break;
         }

         continue; // Retry on other errors
      }

      // Success - parse response
      response.statusCode = res;
      response.body = CharArrayToString(resultBody);
      response.headers = resultHeaders;

      response.success = (res >= 200 && res < 300);

      LogApi("GET", url, res, response.body);

      // Retry on server errors (5xx) or rate limiting (429)
      if(res >= 500 || res == 429 || res == 408)
      {
         // Check for Retry-After header
         if(StringFind(response.headers, "Retry-After") != -1)
         {
            int retryAfterPos = StringFind(response.headers, "Retry-After:");
            if(retryAfterPos != -1)
            {
               string retryAfterStr = StringSubstr(response.headers, retryAfterPos + 12);
               int spacePos = StringFind(retryAfterStr, "\r\n");
               if(spacePos > 0)
                  retryAfterStr = StringSubstr(retryAfterStr, 0, spacePos);
               int retryAfterSec = (int)StringToInteger(StrTrim(retryAfterStr));
               if(retryAfterSec > 0)
                  retryDelay = retryAfterSec * 1000;
            }
         }

         response.error = StringFormat("Server error: %d", res);
         continue;
      }

      // Don't retry on client errors (4xx) except 429/408
      if(res >= 400 && res < 500)
      {
         response.error = StringFormat("Client error: %d - %s", res,
            StringLen(response.body) > 200 ? StringSubstr(response.body, 0, 200) : response.body);
         break;
      }

      break; // Success
   }

   return response;
}

// ─── HTTP POST ────────────────────────────────────────────────────────────────

/// Perform an HTTP POST request with retry logic
HttpResponse HttpPost(string url, string jsonBody, int timeoutMs = 0)
{
   HttpResponse response;
   response.statusCode = 0;
   response.body = "";
   response.headers = "";
   response.success = false;
   response.error = "";

   if(timeoutMs <= 0) timeoutMs = g_http_timeout_ms;

   string headers = BuildHeaders("POST");

   // Add timestamp and HMAC signature
   string timestamp = IntegerToString(CurrentUnixTime());
   if(g_hmac_secret != "")
   {
      string path = ExtractPath(url);
      string signature = SignRequest("POST", path, jsonBody, timestamp);
      headers += "X-Timestamp: " + timestamp + "\r\n";
      headers += "X-Signature: " + signature + "\r\n";
   }

   // Convert JSON body to byte array
   char postData[];
   StringToCharArray(jsonBody, postData, 0, StringLen(jsonBody));

   int retryDelay = g_http_base_delay_ms;
   char resultBody[];
   string resultHeaders;

   for(int attempt = 0; attempt <= g_http_max_retries; attempt++)
   {
      if(attempt > 0)
      {
         LogDebug(StringFormat("HTTP POST retry %d/%d after %d ms: %s",
            attempt, g_http_max_retries, retryDelay, url));

         Sleep(retryDelay);
         retryDelay = retryDelay * 2;
      }

      // Reset response and arrays
      response.statusCode = 0;
      response.body = "";
      response.headers = "";
      response.success = false;
      response.error = "";
      ArrayFree(resultBody);
      resultHeaders = "";

      // Make the WebRequest
      int res = WebRequest("POST", url, headers, timeoutMs, postData, resultBody, resultHeaders);

      if(res == -1)
      {
         int err = GetLastError();
         response.error = StringFormat("WebRequest failed: error %d", err);

         if(err == 4060)
         {
            LogError("WebRequest is not allowed. Add the server URL to Tools > Options > Expert Advisors > Allow WebRequest");
            response.error = "WebRequest not allowed. Add server URL to MT4 whitelist.";
            break;
         }

         if(err == 4014)
         {
            response.error = "Invalid WebRequest parameters";
            break;
         }

         continue;
      }

      response.statusCode = res;
      response.body = CharArrayToString(resultBody);
      response.headers = resultHeaders;

      response.success = (res >= 200 && res < 300);

      LogApi("POST", url, res, response.body);

      // Retry on server errors or rate limiting
      if(res >= 500 || res == 429 || res == 408)
      {
         if(StringFind(response.headers, "Retry-After") != -1)
         {
            int retryAfterPos = StringFind(response.headers, "Retry-After:");
            if(retryAfterPos != -1)
            {
               string retryAfterStr = StringSubstr(response.headers, retryAfterPos + 12);
               int spacePos = StringFind(retryAfterStr, "\r\n");
               if(spacePos > 0)
                  retryAfterStr = StringSubstr(retryAfterStr, 0, spacePos);
               int retryAfterSec = (int)StringToInteger(StrTrim(retryAfterStr));
               if(retryAfterSec > 0)
                  retryDelay = retryAfterSec * 1000;
            }
         }

         response.error = StringFormat("Server error: %d", res);
         continue;
      }

      if(res >= 400 && res < 500)
      {
         response.error = StringFormat("Client error: %d - %s", res,
            StringLen(response.body) > 200 ? StringSubstr(response.body, 0, 200) : response.body);
         break;
      }

      break;
   }

   return response;
}

// ─── Helper: Extract URL Path ─────────────────────────────────────────────────

/// Extract the path component from a full URL
string ExtractPath(string url)
{
   // Remove protocol
   int protocolEnd = StringFind(url, "://");
   if(protocolEnd == -1) return url;

   string afterProtocol = StringSubstr(url, protocolEnd + 3);

   // Find the first slash after host
   int pathStart = StringFind(afterProtocol, "/");
   if(pathStart == -1) return "/";

   return StringSubstr(afterProtocol, pathStart);
}

// ─── JSON Body Builders ───────────────────────────────────────────────────────

/// Build a JSON key-value pair (string value)
string JsonField(string key, string value)
{
   return "\"" + JsonEscape(key) + "\":\"" + JsonEscape(value) + "\"";
}

/// Build a JSON key-value pair (numeric value)
string JsonFieldNum(string key, double value)
{
   return "\"" + JsonEscape(key) + "\":" + DoubleToString(value, 8);
}

/// Build a JSON key-value pair (integer value)
string JsonFieldInt(string key, int value)
{
   return "\"" + JsonEscape(key) + "\":" + IntegerToString(value);
}

/// Build a JSON key-value pair (boolean value)
string JsonFieldBool(string key, bool value)
{
   return "\"" + JsonEscape(key) + "\":" + (value ? "true" : "false");
}

// ─── HTTP Configuration ───────────────────────────────────────────────────────

/// Set the API key for authentication
void HttpSetApiKey(string apiKey)
{
   g_api_key = apiKey;
}

/// Set the license key for authentication
void HttpSetLicenseKey(string licenseKey)
{
   g_license_key = licenseKey;
}

/// Set the HMAC signing secret
void HttpSetHmacSecret(string secret)
{
   g_hmac_secret = secret;
}

/// Set HTTP timeout
void HttpSetTimeout(int timeoutMs)
{
   g_http_timeout_ms = timeoutMs;
}

/// Set retry count
void HttpSetMaxRetries(int retries)
{
   g_http_max_retries = retries;
}

/// Set base delay for exponential backoff
void HttpSetBaseDelay(int delayMs)
{
   g_http_base_delay_ms = delayMs;
}