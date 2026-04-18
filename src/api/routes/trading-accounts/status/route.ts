// ─── GET /api/trading-accounts/status ─────────────────────────────────────────
// Get status of all trading accounts including heartbeat status
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../middleware/auth';
import { prisma } from '../../../lib/prisma';
import { redis, RedisKeys } from '../../../utils/redis';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accounts = await prisma.tradingAccount.findMany({
      where: {
        userId: authResult.user.id,
        status: { not: 'UNLINKED' },
      },
      include: {
        license: {
          select: {
            id: true,
            key: true,
            killSwitch: true,
            strategy: { select: { name: true, version: true } },
          },
        },
      },
    });

    const staleThresholdMs = 3 * parseInt(process.env.HEARTBEAT_INTERVAL_SEC || '60') * 1000;
    const offlineThresholdMs = 10 * 60 * 1000; // 10 minutes

    const accountStatuses = await Promise.all(
      accounts.map(async (account) => {
        // Check Redis for latest heartbeat data
        const heartbeatKey = RedisKeys.heartbeatState(account.licenseId, account.id);
        const heartbeatData = await redis.hgetall(heartbeatKey);

        let status: 'online' | 'stale' | 'offline' = 'offline';
        let lastHeartbeat: Date | null = account.lastHeartbeatAt;
        let equity: number | null = null;
        let balance: number | null = null;
        let openPositions: number | null = null;

        if (heartbeatData && Object.keys(heartbeatData).length > 0) {
          equity = heartbeatData.equity ? parseFloat(heartbeatData.equity) : null;
          balance = heartbeatData.balance ? parseFloat(heartbeatData.balance) : null;
          openPositions = heartbeatData.openPositions ? parseInt(heartbeatData.openPositions) : null;
          lastHeartbeat = heartbeatData.receivedAt ? new Date(heartbeatData.receivedAt) : account.lastHeartbeatAt;
        }

        const now = Date.now();
        if (lastHeartbeat) {
          const timeSinceLastHeartbeat = now - lastHeartbeat.getTime();
          if (timeSinceLastHeartbeat < staleThresholdMs) {
            status = 'online';
          } else if (timeSinceLastHeartbeat < offlineThresholdMs) {
            status = 'stale';
          }
        }

        return {
          id: account.id,
          accountNumber: account.accountNumber,
          brokerName: account.brokerName,
          platform: account.platform,
          status,
          lastHeartbeat,
          equity,
          balance,
          openPositions,
          killSwitch: account.license.killSwitch,
          strategy: account.license.strategy,
        };
      })
    );

    return NextResponse.json({ accounts: accountStatuses });
  } catch (error) {
    console.error('Account status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account statuses' },
      { status: 500 }
    );
  }
}
