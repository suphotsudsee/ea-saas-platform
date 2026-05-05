//+------------------------------------------------------------------+
//| EASaaS_Utils.mqh                                                 |
//| EA SaaS Platform - Utility Functions for MT5                     |
//+------------------------------------------------------------------+
#property strict

#ifndef EASAAS_UTILS_MQH
#define EASAAS_UTILS_MQH


enum LOG_LEVEL
{
   LOG_TRACE = 0,
   LOG_DEBUG = 1,
   LOG_INFO  = 2,
   LOG_WARN  = 3,
   LOG_ERROR = 4,
   LOG_NONE  = 5
};

LOG_LEVEL g_log_level = LOG_INFO;

string JsonGetString(string json, string key)
{
   string searchKey = "\"" + key + "\"";
   int keyPos = StringFind(json, searchKey);
   if(keyPos == -1)
      return "";

   int colonPos = StringFind(json, ":", keyPos);
   if(colonPos == -1)
      return "";

   int valueStart = colonPos + 1;
   while(valueStart < StringLen(json) && StringGetCharacter(json, valueStart) == ' ')
      valueStart++;

   if(valueStart >= StringLen(json))
      return "";

   int ch = StringGetCharacter(json, valueStart);

   if(ch == '"')
   {
      int endQuote = StringFind(json, "\"", valueStart + 1);
      if(endQuote == -1)
         return "";
      return StringSubstr(json, valueStart + 1, endQuote - valueStart - 1);
   }

   if(ch == 't')
      return "true";
   if(ch == 'f')
      return "false";
   if(ch == 'n')
      return "null";

   int valueEnd = valueStart;
   while(valueEnd < StringLen(json))
   {
      ch = StringGetCharacter(json, valueEnd);
      if((ch >= '0' && ch <= '9') || ch == '-' || ch == '+' || ch == '.' || ch == 'e' || ch == 'E')
         valueEnd++;
      else
         break;
   }

   return StringSubstr(json, valueStart, valueEnd - valueStart);
}

double JsonGetNumber(string json, string key)
{
   string value = JsonGetString(json, key);
   if(value == "" || value == "null")
      return 0.0;
   return StringToDouble(value);
}

int JsonGetInt(string json, string key)
{
   return (int)JsonGetNumber(json, key);
}

bool JsonGetBool(string json, string key)
{
   string value = JsonGetString(json, key);
   return value == "true" || value == "1";
}

bool JsonHasKey(string json, string key)
{
   return StringFind(json, "\"" + key + "\"") != -1;
}

string JsonGetObject(string json, string key)
{
   string searchKey = "\"" + key + "\"";
   int keyPos = StringFind(json, searchKey);
   if(keyPos == -1)
      return "{}";

   int colonPos = StringFind(json, ":", keyPos);
   if(colonPos == -1)
      return "{}";

   int valueStart = colonPos + 1;
   while(valueStart < StringLen(json) && StringGetCharacter(json, valueStart) == ' ')
      valueStart++;

   if(valueStart >= StringLen(json))
      return "{}";

   if(StringGetCharacter(json, valueStart) != '{')
      return "{}";

   int depth = 0;
   for(int i = valueStart; i < StringLen(json); i++)
   {
      int ch = StringGetCharacter(json, i);
      if(ch == '{')
         depth++;
      else if(ch == '}')
      {
         depth--;
         if(depth == 0)
            return StringSubstr(json, valueStart, i - valueStart + 1);
      }
   }

   return "{}";
}

string JsonGetArray(string json, string key)
{
   string searchKey = "\"" + key + "\"";
   int keyPos = StringFind(json, searchKey);
   if(keyPos == -1)
      return "[]";

   int colonPos = StringFind(json, ":", keyPos);
   if(colonPos == -1)
      return "[]";

   int valueStart = colonPos + 1;
   while(valueStart < StringLen(json) && StringGetCharacter(json, valueStart) == ' ')
      valueStart++;

   if(valueStart >= StringLen(json))
      return "[]";

   if(StringGetCharacter(json, valueStart) != '[')
      return "[]";

   int depth = 0;
   for(int i = valueStart; i < StringLen(json); i++)
   {
      int ch = StringGetCharacter(json, i);
      if(ch == '[')
         depth++;
      else if(ch == ']')
      {
         depth--;
         if(depth == 0)
            return StringSubstr(json, valueStart, i - valueStart + 1);
      }
   }

   return "[]";
}

uint SHA256_K[64] =
{
   0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,
   0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
   0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,
   0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
   0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,
   0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
   0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,
   0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
   0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,
   0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
   0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,
   0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
   0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,
   0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
   0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,
   0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
};

uint SHA256_H0[8] =
{
   0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
   0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
};

uint ROTR(uint x, int n)
{
   return (x >> n) | (x << (32 - n));
}

void StringToBytes(string str, uchar &arr[])
{
   int len = StringLen(str);
   ArrayResize(arr, len);
   for(int i = 0; i < len; i++)
      arr[i] = (uchar)StringGetCharacter(str, i);
}

void HexStringToBytes(string hex, uchar &arr[])
{
   int count = (int)StringLen(hex) / 2;
   ArrayResize(arr, count);
   for(int i = 0; i < count; i++)
   {
      string hexByte = StringSubstr(hex, i * 2, 2);
      arr[i] = (uchar)StringToInteger("0x" + hexByte);
   }
}

string SHA256(uchar &data[])
{
   int msgLen = ArraySize(data);
   ulong bitLen = (ulong)msgLen * 8;

   int paddedLen = msgLen + 1;
   while((paddedLen % 64) != 56)
      paddedLen++;
   paddedLen += 8;

   uchar padded[];
   ArrayResize(padded, paddedLen);
   ArrayInitialize(padded, 0);

   for(int i = 0; i < msgLen; i++)
      padded[i] = data[i];
   padded[msgLen] = 0x80;

   for(int i = 0; i < 8; i++)
      padded[paddedLen - 1 - i] = (uchar)((bitLen >> (8 * i)) & 0xFF);

   uint h[8];
   for(int i = 0; i < 8; i++)
      h[i] = SHA256_H0[i];

   for(int offset = 0; offset < paddedLen; offset += 64)
   {
      uint w[64];
      ArrayInitialize(w, 0);

      for(int i = 0; i < 16; i++)
      {
         int j = offset + (i * 4);
         w[i] = ((uint)padded[j] << 24) |
                ((uint)padded[j + 1] << 16) |
                ((uint)padded[j + 2] << 8) |
                (uint)padded[j + 3];
      }

      for(int i = 16; i < 64; i++)
      {
         uint s0 = ROTR(w[i - 15], 7) ^ ROTR(w[i - 15], 18) ^ (w[i - 15] >> 3);
         uint s1 = ROTR(w[i - 2], 17) ^ ROTR(w[i - 2], 19) ^ (w[i - 2] >> 10);
         w[i] = w[i - 16] + s0 + w[i - 7] + s1;
      }

      uint a = h[0];
      uint b = h[1];
      uint c = h[2];
      uint d = h[3];
      uint e = h[4];
      uint f = h[5];
      uint g = h[6];
      uint hh = h[7];

      for(int i = 0; i < 64; i++)
      {
         uint S1 = ROTR(e, 6) ^ ROTR(e, 11) ^ ROTR(e, 25);
         uint ch = (e & f) ^ ((~e) & g);
         uint temp1 = hh + S1 + ch + SHA256_K[i] + w[i];
         uint S0 = ROTR(a, 2) ^ ROTR(a, 13) ^ ROTR(a, 22);
         uint maj = (a & b) ^ (a & c) ^ (b & c);
         uint temp2 = S0 + maj;

         hh = g;
         g = f;
         f = e;
         e = d + temp1;
         d = c;
         c = b;
         b = a;
         a = temp1 + temp2;
      }

      h[0] += a;
      h[1] += b;
      h[2] += c;
      h[3] += d;
      h[4] += e;
      h[5] += f;
      h[6] += g;
      h[7] += hh;
   }

   string hexChars = "0123456789abcdef";
   string result = "";
   for(int i = 0; i < 8; i++)
   {
      result += ShortToString(StringGetCharacter(hexChars, (int)((h[i] >> 28) & 0xF)));
      result += ShortToString(StringGetCharacter(hexChars, (int)((h[i] >> 24) & 0xF)));
      result += ShortToString(StringGetCharacter(hexChars, (int)((h[i] >> 20) & 0xF)));
      result += ShortToString(StringGetCharacter(hexChars, (int)((h[i] >> 16) & 0xF)));
      result += ShortToString(StringGetCharacter(hexChars, (int)((h[i] >> 12) & 0xF)));
      result += ShortToString(StringGetCharacter(hexChars, (int)((h[i] >> 8) & 0xF)));
      result += ShortToString(StringGetCharacter(hexChars, (int)((h[i] >> 4) & 0xF)));
      result += ShortToString(StringGetCharacter(hexChars, (int)(h[i] & 0xF)));
   }

   return result;
}

string HMAC_SHA256(string key, string message)
{
   uchar keyBytes[];
   uchar msgBytes[];
   StringToBytes(key, keyBytes);
   StringToBytes(message, msgBytes);

   int blockSize = 64;
   uchar workingKey[];

   if(ArraySize(keyBytes) > blockSize)
   {
      string keyHash = SHA256(keyBytes);
      HexStringToBytes(keyHash, workingKey);
   }
   else
   {
      ArrayResize(workingKey, ArraySize(keyBytes));
      for(int i = 0; i < ArraySize(keyBytes); i++)
         workingKey[i] = keyBytes[i];
   }

   uchar ipad[];
   uchar opad[];
   ArrayResize(ipad, blockSize);
   ArrayResize(opad, blockSize);

   for(int i = 0; i < blockSize; i++)
   {
      uchar keyByte = 0;
      if(i < ArraySize(workingKey))
         keyByte = workingKey[i];
      ipad[i] = keyByte ^ 0x36;
      opad[i] = keyByte ^ 0x5C;
   }

   uchar innerData[];
   ArrayResize(innerData, blockSize + ArraySize(msgBytes));
   for(int i = 0; i < blockSize; i++)
      innerData[i] = ipad[i];
   for(int i = 0; i < ArraySize(msgBytes); i++)
      innerData[blockSize + i] = msgBytes[i];

   string innerHash = SHA256(innerData);
   uchar innerHashBytes[];
   HexStringToBytes(innerHash, innerHashBytes);

   uchar outerData[];
   ArrayResize(outerData, blockSize + ArraySize(innerHashBytes));
   for(int i = 0; i < blockSize; i++)
      outerData[i] = opad[i];
   for(int i = 0; i < ArraySize(innerHashBytes); i++)
      outerData[blockSize + i] = innerHashBytes[i];

   return SHA256(outerData);
}

string StrTrim(string str)
{
   int start = 0;
   int end = (int)StringLen(str) - 1;

   while(start <= end)
   {
      int ch = StringGetCharacter(str, start);
      if(ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r')
         start++;
      else
         break;
   }

   while(end >= start)
   {
      int ch = StringGetCharacter(str, end);
      if(ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r')
         end--;
      else
         break;
   }

   if(start > end)
      return "";
   return StringSubstr(str, start, end - start + 1);
}

string StrReplace(string str, string find, string replace)
{
   string result = str;
   int pos = StringFind(result, find);
   while(pos != -1)
   {
      result = StringSubstr(result, 0, pos) + replace + StringSubstr(result, pos + (int)StringLen(find));
      pos = StringFind(result, find, pos + (int)StringLen(replace));
   }
   return result;
}

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

string TimeToISO8601(datetime dt)
{
   MqlDateTime parts;
   TimeToStruct(dt, parts);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
      parts.year, parts.mon, parts.day, parts.hour, parts.min, parts.sec);
}

string CurrentTimeISO8601()
{
   return TimeToISO8601(TimeCurrent());
}

long CurrentUnixTime()
{
   return (long)(TimeCurrent() - D'1970.01.01 00:00:00');
}

int CurrentUTCHour()
{
   MqlDateTime parts;
   TimeToStruct(TimeGMT(), parts);
   return parts.hour;
}

void LogMsg(LOG_LEVEL level, string message)
{
   if(level < g_log_level)
      return;

   string levelStr = "";
   if(level == LOG_TRACE) levelStr = "TRACE";
   else if(level == LOG_DEBUG) levelStr = "DEBUG";
   else if(level == LOG_INFO) levelStr = "INFO";
   else if(level == LOG_WARN) levelStr = "WARN";
   else if(level == LOG_ERROR) levelStr = "ERROR";
   else return;

   string logLine = "[" + TimeToString(TimeCurrent(), TIME_DATE | TIME_SECONDS) + "] [" + levelStr + "] " + message;
   Print(logLine);

   int handle = FileOpen("EASaaS_log.txt", FILE_TXT | FILE_READ | FILE_WRITE | FILE_COMMON);
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

void LogTrade(string action, string symbol, double lots, double price, string extra = "")
{
   string msg = StringFormat("TRADE %s %s %.2f lots @ %.5f %s", action, symbol, lots, price, extra);
   LogInfo(msg);
}

void LogApi(string method, string endpoint, int statusCode, string response = "")
{
   string msg = StringFormat("API %s %s -> %d", method, endpoint, statusCode);
   if(response != "")
   {
      if(StringLen(response) > 200)
         msg += " | " + StringSubstr(response, 0, 200) + "...";
      else
         msg += " | " + response;
   }
   LogDebug(msg);
}


#endif // EASAAS_UTILS_MQH
