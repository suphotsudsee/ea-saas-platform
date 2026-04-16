// ─── Health Check Endpoint ─────────────────────────────────────────────────────
// GET /api/health — Returns system status for monitoring
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { prisma } from '../lib/prisma';
import { redis } from '../utils/redis';

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {};
  let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';

  // ─── Check Database ────────────────────────────────────────────────────
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    overallStatus = 'down';
  }

  // ─── Check Redis ───────────────────────────────────────────────────────
  try {
    const redisOk = await redis.ping();
    checks.redis = redisOk ? 'ok' : 'error';
    if (!redisOk && overallStatus !== 'down') {
      overallStatus = 'degraded';
    }
  } catch {
    checks.redis = 'error';
    if (overallStatus !== 'down') {
      overallStatus = 'degraded';
    }
  }

  const statusCode = overallStatus === 'down' ? 503 : 200;

  return NextResponse.json(
    {
      status: overallStatus,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: statusCode }
  );
}