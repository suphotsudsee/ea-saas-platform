// ─── Redis Utilities ──────────────────────────────────────────────────────────
// Redis client singleton and helper functions for caching, rate limiting,
// session storage, and streaming operations
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'redis';

// ─── Redis Client Singleton ──────────────────────────────────────────────────

let redisClient: ReturnType<typeof createClient> | null = null;

export function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis: Max reconnection attempts reached');
            return new Error('Redis: Max reconnection attempts reached');
          }
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          const delay = Math.min(retries * 100, 3000);
          console.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
          return delay;
        },
        connectTimeout: 5000,
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis: Connected');
    });

    redisClient.on('disconnect', () => {
      console.warn('Redis: Disconnected');
    });
  }

  return redisClient;
}

// Eager connection helper — call at app startup
export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  if (!client.isOpen) {
    await client.connect();
  }
}

async function ensureRedisConnected(): Promise<ReturnType<typeof createClient> | null> {
  const client = getRedisClient();

  if (client.isOpen) {
    return client;
  }

  try {
    await client.connect();
    return client;
  } catch {
    return null;
  }
}

// Exported convenience instance
// Note: Must call connectRedis() before using this in request handlers
// In Next.js, this is typically done in instrumentation.ts or a layout effect
export const redis = {
  get: async (key: string): Promise<string | null> => {
    const client = await ensureRedisConnected();
    if (!client) return null;
    try {
      return await client.get(key);
    } catch {
      return null;
    }
  },

  set: async (key: string, value: string): Promise<string | null> => {
    const client = await ensureRedisConnected();
    if (!client) return null;
    try {
      return await client.set(key, value);
    } catch {
      return null;
    }
  },

  setex: async (key: string, seconds: number, value: string): Promise<string | null> => {
    const client = await ensureRedisConnected();
    if (!client) return null;
    try {
      return await client.setEx(key, seconds, value);
    } catch {
      return null;
    }
  },

  del: async (...keys: string[]): Promise<number> => {
    const client = await ensureRedisConnected();
    if (!client) return 0;
    try {
      return await client.del(keys);
    } catch {
      return 0;
    }
  },

  exists: async (key: string): Promise<number> => {
    const client = await ensureRedisConnected();
    if (!client) return 0;
    try {
      return await client.exists(key);
    } catch {
      return 0;
    }
  },

  incr: async (key: string): Promise<number> => {
    const client = await ensureRedisConnected();
    if (!client) return 0;
    try {
      return await client.incr(key);
    } catch {
      return 0;
    }
  },

  expire: async (key: string, seconds: number): Promise<boolean> => {
    const client = await ensureRedisConnected();
    if (!client) return false;
    try {
      return await client.expire(key, seconds);
    } catch {
      return false;
    }
  },

  ttl: async (key: string): Promise<number> => {
    const client = await ensureRedisConnected();
    if (!client) return -2;
    try {
      return await client.ttl(key);
    } catch {
      return -2;
    }
  },

  hset: async (key: string, ...fieldValues: (string | number)[]): Promise<number> => {
    const client = await ensureRedisConnected();
    if (!client) return 0;
    try {
      const data: Record<string, string | number> = {};
      for (let i = 0; i < fieldValues.length; i += 2) {
        data[String(fieldValues[i])] = fieldValues[i + 1];
      }
      return await client.hSet(key, data);
    } catch {
      return 0;
    }
  },

  hget: async (key: string, field: string): Promise<string | undefined> => {
    const client = await ensureRedisConnected();
    if (!client) return undefined;
    try {
      return await client.hGet(key, field) ?? undefined;
    } catch {
      return undefined;
    }
  },

  hgetall: async (key: string): Promise<Record<string, string>> => {
    const client = await ensureRedisConnected();
    if (!client) return {};
    try {
      return await client.hGetAll(key);
    } catch {
      return {};
    }
  },

  zadd: async (key: string, ...members: { score: number; member: string }[]): Promise<number> => {
    const client = await ensureRedisConnected();
    if (!client) return 0;
    try {
      return await client.zAdd(
        key,
        members.map(({ score, member }) => ({ score, value: member }))
      );
    } catch {
      return 0;
    }
  },

  zremrangebyscore: async (key: string, min: number, max: number): Promise<number> => {
    const client = await ensureRedisConnected();
    if (!client) return 0;
    try {
      return await client.zRemRangeByScore(key, min, max);
    } catch {
      return 0;
    }
  },

  zcard: async (key: string): Promise<number> => {
    const client = await ensureRedisConnected();
    if (!client) return 0;
    try {
      return await client.zCard(key);
    } catch {
      return 0;
    }
  },

  pexpire: async (key: string, milliseconds: number): Promise<boolean> => {
    const client = await ensureRedisConnected();
    if (!client) return false;
    try {
      return await client.pExpire(key, milliseconds);
    } catch {
      return false;
    }
  },

  // ─── Stream Operations (for background job processing) ───────────────────

  xadd: async (key: string, fields: Record<string, string>, id = '*'): Promise<string | null> => {
    const client = await ensureRedisConnected();
    if (!client) return null;
    try {
      return await client.xAdd(key, id, fields);
    } catch {
      return null;
    }
  },

  xread: async (key: string, count: number, lastId = '0'): Promise<Array<{ id: string; fields: Record<string, string> }> | null> => {
    const client = await ensureRedisConnected();
    if (!client) return null;
    try {
      const results = await client.xRead(
        { key, id: lastId },
        { COUNT: count }
      );
      if (!results || results.length === 0) return null;
      const stream = results[0];
      if (!stream || !stream.messages) return null;
      return stream.messages.map((msg) => ({
        id: msg.id,
        fields: msg.message as Record<string, string>,
      }));
    } catch {
      return null;
    }
  },

  xack: async (key: string, group: string, ...ids: string[]): Promise<number> => {
    const client = await ensureRedisConnected();
    if (!client) return 0;
    try {
      return await client.xAck(key, group, ids);
    } catch {
      return 0;
    }
  },

  // ─── Multi/Transaction ─────────────────────────────────────────────────

  multi: () => {
    const client = getRedisClient();
    return client.multi();
  },

  // ─── Health Check ──────────────────────────────────────────────────────

  ping: async (): Promise<boolean> => {
    const client = await ensureRedisConnected();
    if (!client) return false;
    try {
      const result = await client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  },
};

// ─── Key Helpers ──────────────────────────────────────────────────────────────

export const RedisKeys = {
  // License validation cache: license:{key} → validation result
  licenseCache: (licenseKey: string) => `license:validate:${licenseKey}`,
  
  // Config cache: config:{strategyId}:{hash} → config JSON
  configCache: (strategyId: string, hash: string) => `config:${strategyId}:${hash}`,
  
  // Current config version: config:current:{strategyId} → hash
  configVersion: (strategyId: string) => `config:current:${strategyId}`,
  
  // Heartbeat state: heartbeat:{licenseId}:{accountId} → heartbeat data
  heartbeatState: (licenseId: string, accountId: string) => `heartbeat:${licenseId}:${accountId}`,
  
  // Rate limiting: ratelimit:{prefix}:{identifier} → sorted set
  rateLimit: (prefix: string, identifier: string) => `rl:${prefix}:${identifier}`,
  
  // Kill switch: kill:{licenseId} → "1" or "0"
  killSwitch: (licenseId: string) => `kill:${licenseId}`,
  
  // Global kill switch
  globalKillSwitch: () => 'kill:global',
  
  // Session store
  session: (sessionId: string) => `session:${sessionId}`,
  
  // Trade event stream
  tradeEventStream: () => 'stream:trade-events',
  
  // Heartbeat persist stream
  heartbeatStream: () => 'stream:heartbeat-persist',
  
  // Notification stream
  notificationStream: () => 'stream:notifications',
};

// ─── TTL Constants (seconds) ──────────────────────────────────────────────────

export const RedisTTL = {
  LICENSE_CACHE: parseInt(process.env.LICENSE_CACHE_TTL_SEC || '300'),     // 5 minutes
  CONFIG_CACHE: 3600,                                                        // 1 hour
  HEARTBEAT_STATE: parseInt(process.env.HEARTBEAT_STALE_FACTOR || '3') * 
                    parseInt(process.env.HEARTBEAT_INTERVAL_SEC || '60'),   // 3x heartbeat interval
  RATE_LIMIT: 120,                                                          // 2 minutes
  SESSION: 86400,                                                           // 24 hours
};
