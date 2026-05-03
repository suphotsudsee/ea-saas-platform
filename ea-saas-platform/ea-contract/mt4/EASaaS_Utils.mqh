//+------------------------------------------------------------------+
//| EASaaS_Utils.mqh                                                  |
//| EA SaaS Platform - Utility Functions for MT4                     |
//| Version: 1.0.0                                                    |
//+------------------------------------------------------------------+
//| Provides:                                                         |
//|   - Simple JSON parser (MQL4-compatible)                          |
//|   - Base64 encoding/decoding                                      |
//|   - HMAC-SHA256 signing                                            |
//|   - String helpers                                                 |
//|   - Time conversion                                                |
//|   - Logging helpers with levels                                    |
//+------------------------------------------------------------------+
#property strict

// ─── Log Levels ──────────────────────────────────────────────────────────────
enum LOG_LEVEL
{
   LOG_TRACE = 0,    // Verbose debugging
   LOG_DEBUG = 1,    // Debug information
   LOG_INFO  = 2,    // General information
   LOG_WARN  = 3,    // Warnings
   LOG_ERROR = 4,    // Errors
   LOG_NONE  = 5     // Disable all logging
};

// Global log level — configurable from EA inputs
extern LOG_LEVEL g_log_level = LOG_INFO;

// ─── Simple JSON Value Types ─────────────────────────────────────────────────
enum JSON_TYPE
{
   JSON_NULL    = 0,
   JSON_BOOL    = 1,
   JSON_NUMBER  = 2,
   JSON_STRING  = 3,
   JSON_OBJECT  = 4,
   JSON_ARRAY   = 5
};

// ─── Simple JSON Value Structure ─────────────────────────────────────────────
struct JsonValue
{
   JSON_TYPE  type;
   string     strVal;      // Used for STRING and serialized number/bool
   double     numVal;      // Used for NUMBER
   bool       boolVal;     // Used for BOOL
};

// ─── Simple JSON Parser ──────────────────────────────────────────────────────
// Minimal JSON parser that extracts values by key path.
// Handles nested objects with dot notation: "data.license.status"

/// Extract a string value from JSON by key
string JsonGetString(string json, string key)
{
   string searchKey = "\"" + key + "\"";
   int keyPos = StringFind(json, searchKey);
   if(keyPos == -1) return "";

   // Find the colon after the key
   int colonPos = StringFind(json, ":", keyPos);
   if(colonPos == -1) return "";

   // Skip whitespace after colon
   int valueStart = colonPos + 1;
   while(valueStart < StringLen(json) && StringGetCharacter(json, valueStart) == ' ')
      valueStart++;

   if(valueStart >= StringLen(json)) return "";

   // Check value type
   int ch = StringGetCharacter(json, valueStart);

   // String value
   if(ch == '"')
   {
      int endQuote = StringFind(json, "\"", valueStart + 1);
      if(endQuote == -1) return "";
      return StringSubstr(json, valueStart + 1, endQuote - valueStart - 1);
   }

   // Boolean
   if(ch == 't') return "true";
   if(ch == 'f') return "false";

   // Null
   if(ch == 'n') return "null";

   // Number — find end of number
   int numEnd = valueStart;
   while(numEnd < StringLen(json))
   {
      ch = StringGetCharacter(json, numEnd);
      if((ch >= '0' && ch <= '9') || ch == '-' || ch == '.' || ch == 'e' || ch == 'E' || ch == '+')
         numEnd++;
      else
         break;
   }

   return StringSubstr(json, valueStart, numEnd - valueStart);
}

/// Extract a number value from JSON by key
double JsonGetNumber(string json, string key)
{
   string val = JsonGetString(json, key);
   if(val == "" || val == "null") return 0;
   return StringToDouble(val);
}

/// Extract a boolean value from JSON by key
bool JsonGetBool(string json, string key)
{
   string val = JsonGetString(json, key);
   return (val == "true" || val == "1");
}

/// Extract an integer value from JSON by key
int JsonGetInt(string json, string key)
{
   return (int)JsonGetNumber(json, key);
}

/// Check if a key exists in JSON
bool JsonHasKey(string json, string key)
{
   return (StringFind(json, "\"" + key + "\"") != -1);
}

/// Extract a nested object substring from JSON
// Finds the value portion of a key that is an object {...}
string JsonGetObject(string json, string key)
{
   string searchKey = "\"" + key + "\"";
   int keyPos = StringFind(json, searchKey);
   if(keyPos == -1) return "{}";

   int colonPos = StringFind(json, ":", keyPos);
   if(colonPos == -1) return "{}";

   int valueStart = colonPos + 1;
   while(valueStart < StringLen(json) && StringGetCharacter(json, valueStart) == ' ')
      valueStart++;

   if(valueStart >= StringLen(json)) return "{}";

   int ch = StringGetCharacter(json, valueStart);
   if(ch != '{') return "{}";

   // Find matching closing brace
   int depth = 0;
   int i = valueStart;
   while(i < StringLen(json))
   {
      ch = StringGetCharacter(json, i);
      if(ch == '{') depth++;
      else if(ch == '}') {
         depth--;
         if(depth == 0) {
            return StringSubstr(json, valueStart, i - valueStart + 1);
         }
      }
      i++;
   }

   return "{}";
}

/// Extract an array substring from JSON
string JsonGetArray(string json, string key)
{
   string searchKey = "\"" + key + "\"";
   int keyPos = StringFind(json, searchKey);
   if(keyPos == -1) return "[]";

   int colonPos = StringFind(json, ":", keyPos);
   if(colonPos == -1) return "[]";

   int valueStart = colonPos + 1;
   while(valueStart < StringLen(json) && StringGetCharacter(json, valueStart) == ' ')
      valueStart++;

   if(valueStart >= StringLen(json)) return "[]";

   int ch = StringGetCharacter(json, valueStart);
   if(ch != '[') return "[]";

   int depth = 0;
   int i = valueStart;
   while(i < StringLen(json))
   {
      ch = StringGetCharacter(json, i);
      if(ch == '[') depth++;
      else if(ch == ']') {
         depth--;
         if(depth == 0) {
            return StringSubstr(json, valueStart, i - valueStart + 1);
         }
      }
      i++;
   }

   return "[]";
}

// ─── Base64 Encoding/Decoding ─────────────────────────────────────────────────

// Base64 character set
string BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/// Encode a string to Base64
string Base64Encode(string input)
{
   string result = "";
   int len = StringLen(input);
   int i = 0;

   while(i < len)
   {
      int b0 = StringGetCharacter(input, i);
      int b1 = (i + 1 < len) ? StringGetCharacter(input, i + 1) : 0;
      int b2 = (i + 2 < len) ? StringGetCharacter(input, i + 2) : 0;

      int triple = (b0 << 16) | (b1 << 8) | b2;

      result += StringGetCharacter(BASE64_CHARS, (triple >> 18) & 0x3F);
      result += StringGetCharacter(BASE64_CHARS, (triple >> 12) & 0x3F);

      if(i + 1 < len)
         result += StringGetCharacter(BASE64_CHARS, (triple >> 6) & 0x3F);
      else
         result += "=";

      if(i + 2 < len)
         result += StringGetCharacter(BASE64_CHARS, triple & 0x3F);
      else
         result += "=";

      i += 3;
   }

   return result;
}

/// Decode a Base64 string
string Base64Decode(string input)
{
   string result = "";
   int len = StringLen(input);

   // Build lookup table
   int lookup[128];
   ArrayInitialize(lookup, -1);
   for(int c = 0; c < 64; c++)
   {
      int ch = StringGetCharacter(BASE64_CHARS, c);
      if(ch >= 0 && ch < 128)
         lookup[ch] = c;
   }

   int i = 0;
   while(i < len)
   {
      int b0 = (i < len && StringGetCharacter(input, i) != '=') ? lookup[StringGetCharacter(input, i) & 0x7F] : 0;
      i++;
      int b1 = (i < len && StringGetCharacter(input, i) != '=') ? lookup[StringGetCharacter(input, i) & 0x7F] : 0;
      i++;
      int b2 = (i < len && StringGetCharacter(input, i) != '=') ? lookup[StringGetCharacter(input, i) & 0x7F] : 0;
      i++;
      int b3 = (i < len && StringGetCharacter(input, i) != '=') ? lookup[StringGetCharacter(input, i) & 0x7F] : 0;
      i++;

      int triple = (b0 << 18) | (b1 << 12) | (b2 << 6) | b3;

      result += CharToStr((triple >> 16) & 0xFF);
      if(b2 != -1) result += CharToStr((triple >> 8) & 0xFF);
      if(b3 != -1) result += CharToStr(triple & 0xFF);
   }

   return result;
}

// ─── HMAC-SHA256 Signing ──────────────────────────────────────────────────────

// SHA-256 constants
int SHA256_K[64] = {
   0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
   0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
   0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
   0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
   0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
   0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
   0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
   0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
   0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
   0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
   0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
   0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
   0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
   0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
   0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
   0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
};

int SHA256_H0[8] = { 0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19 };

// Right rotate for 32-bit unsigned int
uint ROTR(uint x, int n) { return (x >> n) | (x << (32 - n)); }

/// Compute SHA-256 hash of a byte array, return as hex string
string SHA256(uchar &data[])
{
   // Pad message
   int msgLen = ArraySize(data);
   int bitLen = msgLen * 8;

   // Calculate padded length (must be multiple of 64 bytes, with room for 9-byte suffix minimum)
   int paddedLen = msgLen + 1;
   while(paddedLen % 64 != 56) paddedLen++;
   paddedLen += 8;

   uchar padded[];
   ArrayResize(padded, paddedLen);
   ArrayInitialize(padded, 0);

   // Copy original data
   for(int i = 0; i < msgLen; i++)
      padded[i] = data[i];

   // Append 0x80
   padded[msgLen] = 0x80;

   // Append length in bits as 64-bit big-endian
   padded[paddedLen - 4] = (uchar)(bitLen & 0xFF);
   padded[paddedLen - 5] = (uchar)((bitLen >> 8) & 0xFF);
   padded[paddedLen - 6] = (uchar)((bitLen >> 16) & 0xFF);
   padded[paddedLen - 7] = (uchar)((bitLen >> 24) & 0xFF);
   // Upper 32 bits of length are 0 for messages < 2^32 bits

   // Initialize hash values
   uint h[8];
   for(int i = 0; i < 8; i++)
      h[i] = (uint)SHA256_H0[i];

   // Process each 64-byte block
   for(int block = 0; block < paddedLen; block += 64)
   {
      uint w[64];

      // First 16 words from block
      for(int i = 0; i < 16; i++)
      {
         w[i] = ((uint)padded[block + i*4] << 24) |
                ((uint)padded[block + i*4 + 1] << 16) |
                ((uint)padded[block + i*4 + 2] << 8) |
                ((uint)padded[block + i*4 + 3]);
      }

      // Extend to 64 words
      for(int i = 16; i < 64; i++)
      {
         uint s0 = ROTR(w[i-15], 7) ^ ROTR(w[i-15], 18) ^ (w[i-15] >> 3);
         uint s1 = ROTR(w[i-2], 17) ^ ROTR(w[i-2], 19) ^ (w[i-2] >> 10);
         w[i] = w[i-16] + s0 + w[i-7] + s1;
      }

      // Working variables
      uint a = h[0], b = h[1], c = h[2], d = h[3];
      uint e = h[4], f = h[5], g = h[6], hh = h[7];

      // Compression
      for(int i = 0; i < 64; i++)
      {
         uint S1 = ROTR(e, 6) ^ ROTR(e, 11) ^ ROTR(e, 25);
         uint ch = (e & f) ^ ((~e) & g);
         uint temp1 = hh + S1 + ch + (uint)SHA256_K[i] + w[i];
         uint S0 = ROTR(a, 2) ^ ROTR(a, 13) ^ ROTR(a, 22);
         uint maj = (a & b) ^ (a & c) ^ (b & c);
         uint temp2 = S0 + maj;

         hh = g; g = f; f = e; e = d + temp1;
         d = c; c = b; b = a; a = temp1 + temp2;
      }

      h[0] += a; h[1] += b; h[2] += c; h[3] += d;
      h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
   }

   // Convert to hex string
   string hex = "0123456789abcdef";
   string result = "";
   for(int i = 0; i < 8; i++)
   {
      result += StringGetCharacter(hex, (h[i] >> 28) & 0xF);
      result += StringGetCharacter(hex, (h[i] >> 24) & 0xF);
      result += StringGetCharacter(hex, (h[i] >> 20) & 0xF);
      result += StringGetCharacter(hex, (h[i] >> 16) & 0xF);
      result += StringGetCharacter(hex, (h[i] >> 12) & 0xF);
      result += StringGetCharacter(hex, (h[i] >> 8) & 0xF);
      result += StringGetCharacter(hex, (h[i] >> 4) & 0xF);
      result += StringGetCharacter(hex, h[i] & 0xF);
   }

   return result;
}

/// Compute SHA-256 hash of a string
string SHA256String(string input)
{
   uchar data[];
   StringToCharArray(input, data, 0, StringLen(input));
   return SHA256(data);
}

/// Compute HMAC-SHA256
string HMAC_SHA256(string key, string message)
{
   // Convert key and message to byte arrays
   uchar keyBytes[];
   uchar msgBytes[];
   StringToCharArray(key, keyBytes, 0, StringLen(key));
   StringToCharArray(message, msgBytes, 0, StringLen(message));

   int keyLen = ArraySize(keyBytes);
   int blockSize = 64; // SHA-256 block size

   // If key is longer than block size, hash it
   uchar keyPad[];
   if(keyLen > blockSize)
   {
      string keyHash = SHA256(keyBytes);
      // Use the hash as key (simplified - hex string to bytes)
      ArrayResize(keyPad, 32);
      for(int i = 0; i < 32; i++)
      {
         string hexByte = StringSubstr(keyHash, i*2, 2);
         keyPad[i] = (uchar)StringToInteger("0x" + hexByte);
      }
      keyLen = 32;
   }
   else
   {
      ArrayResize(keyPad, keyLen);
      for(int i = 0; i < keyLen; i++)
         keyPad[i] = keyBytes[i];
   }

   // Pad key to block size
   uchar ipad[];
   uchar opad[];
   ArrayResize(ipad, blockSize);
   ArrayResize(opad, blockSize);

   for(int i = 0; i < blockSize; i++)
   {
      uchar k = (i < keyLen) ? keyPad[i] : 0;
      ipad[i] = k ^ 0x36;
      opad[i] = k ^ 0x5C;
   }

   // Inner hash: SHA256(ipad + message)
   uchar innerData[];
   ArrayResize(innerData, blockSize + ArraySize(msgBytes));
   for(int i = 0; i < blockSize; i++)
      innerData[i] = ipad[i];
   for(int i = 0; i < ArraySize(msgBytes); i++)
      innerData[blockSize + i] = msgBytes[i];

   string innerHash = SHA256(innerData);

   // Convert inner hash hex to bytes
   uchar innerHashBytes[];
   ArrayResize(innerHashBytes, 32);
   for(int i = 0; i < 32; i++)
   {
      string hexByte = StringSubstr(innerHash, i*2, 2);
      innerHashBytes[i] = (uchar)StringToInteger("0x" + hexByte);
   }

   // Outer hash: SHA256(opad + innerHash)
   uchar outerData[];
   ArrayResize(outerData, blockSize + 32);
   for(int i = 0; i < blockSize; i++)
      outerData[i] = opad[i];
   for(int i = 0; i < 32; i++)
      outerData[blockSize + i] = innerHashBytes[i];

   return SHA256(outerData);
}

// ─── String Helpers ───────────────────────────────────────────────────────────

/// Trim whitespace from both ends of a string
string StrTrim(string str)
{
   int start = 0;
   int end = StringLen(str) - 1;

   while(start <= end && (StringGetCharacter(str, start) == ' '  ||
                          StringGetCharacter(str, start) == '\t' ||
                          StringGetCharacter(str, start) == '\n' ||
                          StringGetCharacter(str, start) == '\r'))
      start++;

   while(end >= start && (StringGetCharacter(str, end) == ' '  ||
                          StringGetCharacter(str, end) == '\t' ||
                          StringGetCharacter(str, end) == '\n' ||
                          StringGetCharacter(str, end) == '\r'))
      end--;

   if(start > end) return "";
   return StringSubstr(str, start, end - start + 1);
}

/// Replace all occurrences of a substring
string StrReplace(string str, string find, string replace)
{
   string result = str;
   int pos = StringFind(result, find);
   while(pos != -1)
   {
      result = StringSubstr(result, 0, pos) + replace + StringSubstr(result, pos + StringLen(find));
      pos = StringFind(result, find, pos + StringLen(replace));
   }
   return result;
}

/// Escape a string for JSON (handles quotes, backslash, newline, etc.)
string JsonEscape(string str)
{
   string result = str;
   result = StrReplace(result, "\\", "\\\\");
   result = StrReplace(result, "\"", "\\\"");
   result = StrReplace(result, "\n", "\\n");
   result = StrReplace(result, "\r", "\\r");
   result = StrReplace(result, "\t", "\\t");
   return result;
}

/// Convert integer to hex string
string IntToHex(int value)
{
   string hex = "0123456789abcdef";
   string result = "";
   for(int i = 7; i >= 0; i--)
   {
      int nibble = (value >> (i * 4)) & 0xF;
      result += StringGetCharacter(hex, nibble);
   }
   return result;
}

// ─── Time Conversion ─────────────────────────────────────────────────────────

/// Convert datetime to ISO 8601 string (UTC)
string TimeToISO8601(datetime dt)
{
   return TimeToString(dt, TIME_DATE|TIME_SECONDS) + "Z";
}

/// Get current UTC time as ISO 8601
string CurrentTimeISO8601()
{
   return TimeToISO8601(TimeCurrent());
}

/// Get current timestamp in seconds (Unix epoch)
int CurrentUnixTime()
{
   return (int)(TimeCurrent() - D'1970.01.01 00:00:00');
}

/// Get current UTC hour (0-23)
int CurrentUTCHour()
{
   return TimeHour(TimeGMT());
}

/// Get current UTC day of week (0=Sunday, 6=Saturday)
int CurrentUTCDayOfWeek()
{
   return TimeDayOfWeek(TimeGMT());
}

/// Convert milliseconds to readable duration
string MsToDuration(int ms)
{
   int seconds = ms / 1000;
   int minutes = seconds / 60;
   int hours = minutes / 60;

   if(hours > 0)
      return IntegerToString(hours) + "h " + IntegerToString(minutes % 60) + "m";
   if(minutes > 0)
      return IntegerToString(minutes) + "m " + IntegerToString(seconds % 60) + "s";
   return IntegerToString(seconds) + "s";
}

// ─── Logging Helpers ──────────────────────────────────────────────────────────

/// Log a message at the specified level
void LogMsg(LOG_LEVEL level, string message)
{
   if(level < g_log_level) return;

   string levelStr = "";
   switch(level)
   {
      case LOG_TRACE: levelStr = "TRACE"; break;
      case LOG_DEBUG: levelStr = "DEBUG"; break;
      case LOG_INFO:  levelStr = "INFO "; break;
      case LOG_WARN:  levelStr = "WARN "; break;
      case LOG_ERROR: levelStr = "ERROR"; break;
      default: return;
   }

   string timestamp = TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS);
   string logLine = "[" + timestamp + "] [" + levelStr + "] " + message;

   Print(logLine);

   // Also write to file for persistence
   int handle = FileOpen("EASaaS_log.txt", FILE_WRITE|FILE_READ|FILE_TXT|FILE_COMMON);
   if(handle != INVALID_HANDLE)
   {
      FileSeek(handle, 0, SEEK_END);
      FileWrite(handle, logLine);
      FileClose(handle);
   }
}

void LogTrace(string message) { LogMsg(LOG_TRACE, message); }
void LogDebug(string message) { LogMsg(LOG_DEBUG, message); }
void LogInfo(string message)  { LogMsg(LOG_INFO, message); }
void LogWarn(string message)  { LogMsg(LOG_WARN, message); }
void LogError(string message) { LogMsg(LOG_ERROR, message); }

/// Log a trade action
void LogTrade(string action, string symbol, double lots, double price, string extra = "")
{
   string msg = StringFormat("TRADE %s %s %.2f lots @ %.5f %s",
      action, symbol, lots, price, extra);
   LogInfo(msg);
}

/// Log API request/response
void LogApi(string method, string endpoint, int statusCode, string response = "")
{
   string msg = StringFormat("API %s %s -> %d", method, endpoint, statusCode);
   if(response != "")
      msg += " | " + (StringLen(response) > 200 ? StringSubstr(response, 0, 200) + "..." : response);
   LogDebug(msg);
}