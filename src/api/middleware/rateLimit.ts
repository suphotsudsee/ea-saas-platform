// ─── Rate Limit Middleware ─────────────────────────────────────────────────────
// Redis-based sliding window rate limiting for API endpoints
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../utils/redis';

interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;    // Max requests per window
  keyPrefix?: string;     // Redis key prefix
  identifierFn?: (req: NextRequest) => string; // Custom identifier function
}

const DEFAULT_EA_RPM = 60;
const DEFAULT_WEB_RPM = 120;
const DEFAULT_ADMIN_RPM = 300;

export function eaRateLimiter() {
  return rateLimit({
    windowMs: 60_000,
    maxRequests: parseInt(process.env.RATE_LIMIT_EA_RPM || String(DEFAULT_EA_RPM)),
    keyPrefix: 'rl:ea',
    identifierFn: (req) => req.headers.get('x-license-key') || req.headers.get('x-api-key') || 'unknown',
  });
}

export function webRateLimiter() {
  return rateLimit({
    windowMs: 60_000,
    maxRequests: parseInt(process.env.RATE_LIMIT_WEB_RPM || String(DEFAULT_WEB_RPM)),
    keyPrefix: 'rl:web',
    identifierFn: (req) => {
      // Use session token or IP as identifier
      const sessionToken = req.cookies.get('next-auth.session-token')?.value;
      if (sessionToken) return `session:${sessionToken.substring(0, 16)}`;
      return `ip:${req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'}`;
    },
  });
}

export function adminRateLimiter() {
  return rateLimit({
    windowMs: 60_000,
    maxRequests: DEFAULT_ADMIN_RPM,
    keyPrefix: 'rl:admin',
    identifierFn: (req) => {
      const sessionToken = req.cookies.get('next-auth.session-token')?.value;
      if (sessionToken) return `admin:${sessionToken.substring(0, 16)}`;
      return `admin-ip:${req.headers.get('x-forwarded-for') || 'unknown'}`;
    },
  });
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyPrefix = 'rl',
    identifierFn,
  } = options;

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const identifier = identifierFn ? identifierFn(request) : 'global';
    const key = `${keyPrefix}:${identifier}`;

    try {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis sorted set for sliding window
      const multi = redis.multi();
      
      // Remove old entries outside the window
      multi.zRemRangeByScore(key, 0, windowStart);
      
      // Add current request
      multi.zAdd(key, { score: now, value: `${now}:${Math.random().toString(36).slice(2)}` });
      
      // Count requests in window
      multi.zCard(key);
      
      // Set expiry on the key
      multi.pExpire(key, windowMs * 2);
      
      const results = await multi.exec();
      
      const requestCount = results[2] as number;
      const remaining = Math.max(0, maxRequests - requestCount);
      const resetTime = now + windowMs;

      // Set rate limit headers
      const headers = new Headers();
      headers.set('X-RateLimit-Limit', String(maxRequests));
      headers.set('X-RateLimit-Remaining', String(remaining));
      headers.set('X-RateLimit-Reset', String(Math.floor(resetTime / 1000)));

      if (requestCount > maxRequests) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil(windowMs / 1000),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(maxRequests),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.floor(resetTime / 1000)),
              'Retry-After': String(Math.ceil(windowMs / 1000)),
            },
          }
        );
      }

      return null; // Not rate limited
    } catch (error) {
      // If Redis is down, allow the request through (fail-open)
      console.error('Rate limit check failed, allowing request:', error);
      return null;
    }
  };
}

// Helper to add rate limit headers to successful responses
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetTime: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(resetTime / 1000)));
  return response;
}
