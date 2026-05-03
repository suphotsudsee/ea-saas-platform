//+------------------------------------------------------------------+
//| EASaaS_Http.mqh                                                   |
//| EA SaaS Platform - HTTP Utility Library for MT5                  |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
//| MQL5 HTTP client using WebRequest with JSON, HMAC signing,       |
//| retry logic, exponential backoff, and timeout handling            |
//+------------------------------------------------------------------+
#property strict

#ifndef EASAAS_HTTP_MQH
#define EASAAS_HTTP_MQH

#include "EASaaS_Utils.mqh"

// ─── HTTP Response Structure ──────────────────────────────────────────────────
struct HttpResponse
{
   int      statusCode;
   string   body;
   string   headers;
   bool     success;
   string   error;
};

// ─── HTTP Configuration ───────────────────────────────────────────────────────
int g_http_timeout_ms = 10000;
int g_http_max_retries = 3;
int g_http_base_delay_ms = 1000;

string g_api_key = "";
string g_license_key = "";
string g_hmac_secret = "";

// ─── Build Headers ─────────────────────────────────────────────────────────────

string BuildHeaders(string method, string contentType = "application/json")
{
   string headers = "";
   headers += "Content-Type: " + contentType + "\r\n";
   headers += "X-API-Key: " + g_api_key + "\r\n";
   headers += "X-License-Key: " + g_license_key + "\r\n";
   headers += "Accept: application/json\r\n";
   return headers;
}

string SignRequest(string method, string path, string body, string timestamp)
{
   if(g_hmac_secret == "") return "";
   string message = method + "\n" + path + "\n" + timestamp + "\n" + body;
   return HMAC_SHA256(g_hmac_secret, message);
}

string ExtractPath(string url)
{
   int protocolEnd = StringFind(url, "://");
   if(protocolEnd == -1) return url;
   string afterProtocol = StringSubstr(url, protocolEnd + 3);
   int pathStart = StringFind(afterProtocol, "/");
   if(pathStart == -1) return "/";
   return StringSubstr(afterProtocol, pathStart);
}

string AppendAuthToUrl(string url)
{
   string separator = (StringFind(url, "?") == -1) ? "?" : "&";
   return url +
      separator + "apiKey=" + g_api_key +
      "&licenseKey=" + g_license_key;
}

string InjectAuthIntoJsonBody(string jsonBody)
{
   if(jsonBody == "" || jsonBody == "{}")
   {
      return "{" +
         JsonField("apiKey", g_api_key) + "," +
         JsonField("licenseKey", g_license_key) +
      "}";
   }

   if(StringLen(jsonBody) < 1 || StringSubstr(jsonBody, StringLen(jsonBody) - 1) != "}")
      return jsonBody;

   return StringSubstr(jsonBody, 0, StringLen(jsonBody) - 1) +
      "," + JsonField("apiKey", g_api_key) +
      "," + JsonField("licenseKey", g_license_key) +
      "}";
}

// ─── HTTP GET ─────────────────────────────────────────────────────────────────

HttpResponse HttpGet(string url, int timeoutMs = 0)
{
   HttpResponse response;
   response.statusCode = 0;
   response.body = "";
   response.headers = "";
   response.success = false;
   response.error = "";

   if(timeoutMs <= 0) timeoutMs = g_http_timeout_ms;

   url = AppendAuthToUrl(url);

   string headers = BuildHeaders("GET");

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
         LogDebug(StringFormat("HTTP GET retry %d/%d after %d ms: %s", attempt, g_http_max_retries, retryDelay, url));
         Sleep(retryDelay);
         retryDelay = retryDelay * 2;
      }

      response.statusCode = 0;
      response.body = "";
      response.headers = "";
      response.success = false;
      response.error = "";
      ArrayFree(postData);
      ArrayFree(resultBody);
      resultHeaders = "";

      int res = WebRequest("GET", url, "", "", timeoutMs, postData, 0, resultBody, resultHeaders);

      if(res == -1)
      {
         int err = GetLastError();
         response.error = StringFormat("WebRequest failed: error %d", err);
         if(err == 4060)
         {
            LogError("WebRequest not allowed. Add server URL to MT5 whitelist.");
            response.error = "WebRequest not allowed. Add server URL to MT5 whitelist.";
            break;
         }
         continue;
      }

      response.statusCode = res;
      response.body = CharArrayToString(resultBody);
      response.headers = resultHeaders;

      response.success = (res >= 200 && res < 300);
      LogApi("GET", url, res, response.body);

      if(res >= 500 || res == 429 || res == 408)
      {
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

// ─── HTTP POST ────────────────────────────────────────────────────────────────

HttpResponse HttpPost(string url, string jsonBody, int timeoutMs = 0)
{
   HttpResponse response;
   response.statusCode = 0;
   response.body = "";
   response.headers = "";
   response.success = false;
   response.error = "";

   if(timeoutMs <= 0) timeoutMs = g_http_timeout_ms;

   jsonBody = InjectAuthIntoJsonBody(jsonBody);

   string headers = BuildHeaders("POST");

   string timestamp = IntegerToString(CurrentUnixTime());
   if(g_hmac_secret != "")
   {
      string path = ExtractPath(url);
      string signature = SignRequest("POST", path, jsonBody, timestamp);
      headers += "X-Timestamp: " + timestamp + "\r\n";
      headers += "X-Signature: " + signature + "\r\n";
   }

   char postData[];
   StringToCharArray(jsonBody, postData, 0, StringLen(jsonBody));

   int retryDelay = g_http_base_delay_ms;
   char resultBody[];
   string resultHeaders;

   for(int attempt = 0; attempt <= g_http_max_retries; attempt++)
   {
      if(attempt > 0)
      {
         LogDebug(StringFormat("HTTP POST retry %d/%d after %d ms: %s", attempt, g_http_max_retries, retryDelay, url));
         Sleep(retryDelay);
         retryDelay = retryDelay * 2;
      }

      response.statusCode = 0;
      response.body = "";
      response.headers = "";
      response.success = false;
      response.error = "";
      ArrayFree(resultBody);
      resultHeaders = "";

      int postDataSize = ArraySize(postData);
      if(postDataSize > 0)
         postDataSize--;

      int res = WebRequest("POST", url, "", "", timeoutMs, postData, postDataSize, resultBody, resultHeaders);

      if(res == -1)
      {
         int err = GetLastError();
         response.error = StringFormat("WebRequest failed: error %d", err);
         if(err == 4060)
         {
            LogError("WebRequest not allowed. Add server URL to MT5 whitelist.");
            response.error = "WebRequest not allowed.";
            break;
         }
         continue;
      }

      response.statusCode = res;
      response.body = CharArrayToString(resultBody);
      response.headers = resultHeaders;

      response.success = (res >= 200 && res < 300);
      LogApi("POST", url, res, response.body);

      if(res >= 500 || res == 429 || res == 408)
      {
         response.error = StringFormat("Server error: %d", res);
         continue;
      }

      if(res >= 400 && res < 500)
      {
         response.error = StringFormat("Client error: %d", res);
         break;
      }

      break;
   }

   return response;
}

// ─── JSON Body Builders ────────────────────────────────────────────────────────

string JsonField(string key, string value)
{
   return "\"" + JsonEscape(key) + "\":\"" + JsonEscape(value) + "\"";
}

string JsonFieldNum(string key, double value)
{
   return "\"" + JsonEscape(key) + "\":" + DoubleToString(value, 8);
}

string JsonFieldInt(string key, int value)
{
   return "\"" + JsonEscape(key) + "\":" + IntegerToString(value);
}

string JsonFieldBool(string key, bool value)
{
   return "\"" + JsonEscape(key) + "\":" + (value ? "true" : "false");
}

// ─── HTTP Configuration ───────────────────────────────────────────────────────

void HttpSetApiKey(string apiKey) { g_api_key = apiKey; }
void HttpSetLicenseKey(string licenseKey) { g_license_key = licenseKey; }
void HttpSetHmacSecret(string secret) { g_hmac_secret = secret; }
void HttpSetTimeout(int timeoutMs) { g_http_timeout_ms = timeoutMs; }
void HttpSetMaxRetries(int retries) { g_http_max_retries = retries; }
void HttpSetBaseDelay(int delayMs) { g_http_base_delay_ms = delayMs; }


#endif // EASAAS_HTTP_MQH
