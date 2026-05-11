import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../../api/middleware/auth';
import { getConnectionConfig } from '../../../../api/lib/db';
import mysql from 'mysql2/promise';

interface LicenseDetail {
  id: string;
  key: string;
  status: string;
  expiresAt: string;
  maxAccounts: number;
  killSwitch: boolean;
  killSwitchReason: string | null;
  strategy: { name: string; version: string; description: string | null };
  subscription: { status: string; package: { name: string; maxAccounts: number } };
  tradingAccounts: Array<{
    id: string;
    accountNumber: string;
    brokerName: string;
    platform: string;
    status: string;
    lastHeartbeatAt: string | null;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conn = await mysql.createConnection(getConnectionConfig());
  try {
    // Get license with strategy, subscription, and package info
    const [licenses] = await conn.execute<any[]>(
      `SELECT 
        l.id, l.key, l.status, l.expiresAt, l.maxAccounts, 
        l.killSwitch, l.killSwitchReason,
        s.id as strategyId, s.name as strategyName, s.version as strategyVersion, s.description as strategyDesc,
        sub.id as subId, sub.status as subStatus,
        p.name as packageName, p.maxAccounts as packageMaxAccounts
      FROM licenses l
      LEFT JOIN strategies s ON l.strategyId = s.id
      LEFT JOIN subscriptions sub ON l.subscriptionId = sub.id
      LEFT JOIN packages p ON sub.packageId = p.id
      WHERE l.id = ? AND l.userId = ?`,
      [params.id, authResult.user.id]
    );

    if (!licenses || licenses.length === 0) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    const row = licenses[0];

    // Get linked trading accounts with heartbeat status
    const [accounts] = await conn.execute<any[]>(
      `SELECT ta.id, ta.accountNumber, ta.brokerName, ta.platform, ta.status,
              hb.lastHeartbeatAt
       FROM trading_accounts ta
       LEFT JOIN heartbeat_events hb ON hb.licenseId = ta.licenseId AND hb.accountNumber = ta.accountNumber AND hb.status = 'ALIVE'
       WHERE ta.licenseId = ? AND ta.status != 'UNLINKED'`,
      [params.id]
    );

    const license: LicenseDetail = {
      id: row.id,
      key: row.key,
      status: row.status,
      expiresAt: row.expiresAt instanceof Date ? row.expiresAt.toISOString() : String(row.expiresAt),
      maxAccounts: row.maxAccounts,
      killSwitch: row.killSwitch === 1 || row.killSwitch === true,
      killSwitchReason: row.killSwitchReason || null,
      strategy: {
        name: row.strategyName || 'TradeCandle',
        version: row.strategyVersion || '12.0.0',
        description: row.strategyDesc || null,
      },
      subscription: {
        status: row.subStatus || 'ACTIVE',
        package: {
          name: row.packageName || 'Standard',
          maxAccounts: row.packageMaxAccounts || 1,
        },
      },
      tradingAccounts: (accounts || []).map((a: any) => ({
        id: a.id,
        accountNumber: a.accountNumber,
        brokerName: a.brokerName || 'Unknown',
        platform: a.platform || 'MT5',
        status: a.status || 'ACTIVE',
        lastHeartbeatAt: a.lastHeartbeatAt
          ? (a.lastHeartbeatAt instanceof Date ? a.lastHeartbeatAt.toISOString() : String(a.lastHeartbeatAt))
          : null,
      })),
    };

    return NextResponse.json({ license });
  } catch (error) {
    console.error('Get license detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch license detail' },
      { status: 500 }
    );
  } finally {
    await conn.end();
  }
}
