// ─── GET /api/trade-events/stats ───────────────────────────────────────────────
// Get trade statistics for the authenticated user
// Uses raw mysql2 — no Prisma dependency (standalone Docker safe)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../middleware/auth';
import mysql from 'mysql2/promise';

function getDbConfig() {
  let raw = process.env.DATABASE_URL!;
  if (raw.includes('mysql-database-')) raw = raw.replace('mysql-database-', '');
  try {
    const u = new URL(raw);
    return { host: u.hostname, port: parseInt(u.port || '3306'), user: u.username, password: u.password, database: u.pathname.replace('/', '') };
  } catch {
    const value = raw.replace(/^mysql:\/\//, '');
    const at = value.lastIndexOf('@');
    const auth = at >= 0 ? value.slice(0, at) : '';
    const hostAndDb = at >= 0 ? value.slice(at + 1) : value;
    const [user, password] = auth.split(':');
    const [hostPort, db] = hostAndDb.split('/');
    const [host, portText] = hostPort.split(':');
    return { host, port: portText ? Number(portText) : 3306, user, password, database: db?.split('?')[0] || 'default' };
  }
}

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);
  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const licenseId = searchParams.get('licenseId');
  const accountNumber = searchParams.get('accountNumber');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(getDbConfig());

    const conditions: string[] = ['l.userId = ?'];
    const params: any[] = [authResult.user.id];

    if (licenseId) { conditions.push('te.licenseId = ?'); params.push(licenseId); }
    if (accountNumber) { conditions.push('te.accountNumber = ?'); params.push(accountNumber); }
    if (startDate) { conditions.push('te.createdAt >= ?'); params.push(startDate); }
    if (endDate) { conditions.push('te.createdAt <= ?'); params.push(endDate); }

    const where = conditions.join(' AND ');

    // Closed trades (TP / SL / CLOSE events)
    const [closedRows] = await conn.execute(
      `SELECT te.profit, te.commission, te.swap, te.volume, te.symbol,
              te.direction, te.openTime, te.closeTime, te.eventType
       FROM trade_events te
       INNER JOIN licenses l ON l.id = te.licenseId
       WHERE ${where} AND te.eventType IN ('CLOSE', 'TP', 'SL')`,
      params
    ) as any[];

    const trades = closedRows.map((r: any) => ({
      ...r,
      profit: Number(r.profit || 0),
      commission: Number(r.commission || 0),
      swap: Number(r.swap || 0),
      volume: Number(r.volume || 0),
    }));

    const totalTrades = trades.length;
    const winningTrades = trades.filter((t: any) => t.profit > 0).length;
    const losingTrades = trades.filter((t: any) => t.profit < 0).length;
    const totalPnl = trades.reduce((sum: number, t: any) => sum + t.profit, 0);
    const totalCommission = trades.reduce((sum: number, t: any) => sum + t.commission, 0);
    const totalSwap = trades.reduce((sum: number, t: any) => sum + t.swap, 0);
    const totalVolume = trades.reduce((sum: number, t: any) => sum + t.volume, 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const durations = trades
      .filter((t: any) => t.openTime && t.closeTime)
      .map((t: any) => new Date(t.closeTime).getTime() - new Date(t.openTime).getTime());
    const avgDurationMs = durations.length > 0
      ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
      : 0;

    const pnlBySymbol: Record<string, number> = {};
    trades.forEach((t: any) => {
      if (!pnlBySymbol[t.symbol]) pnlBySymbol[t.symbol] = 0;
      pnlBySymbol[t.symbol] += t.profit;
    });

    return NextResponse.json({
      stats: {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate: Math.round(winRate * 100) / 100,
        totalPnl: Math.round(totalPnl * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        totalSwap: Math.round(totalSwap * 100) / 100,
        netPnl: Math.round((totalPnl + totalCommission + totalSwap) * 100) / 100,
        totalVolume: Math.round(totalVolume * 100) / 100,
        avgTradeDurationMs: Math.round(avgDurationMs),
        pnlBySymbol,
      },
    });
  } catch (error: any) {
    console.error('Trade stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch trade statistics', detail: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
