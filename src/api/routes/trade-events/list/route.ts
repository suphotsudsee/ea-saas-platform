// ─── GET /api/trade-events/list ────────────────────────────────────────────────
// List trade events for the authenticated user with filters and pagination
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
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const symbol = searchParams.get('symbol');
  const direction = searchParams.get('direction');
  const eventType = searchParams.get('eventType');
  const licenseId = searchParams.get('licenseId');
  const accountNumber = searchParams.get('accountNumber');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(getDbConfig());

    const conditions: string[] = ['l.userId = ?'];
    const params: any[] = [authResult.user.id];

    if (symbol) { conditions.push('te.symbol = ?'); params.push(symbol); }
    if (direction) { conditions.push('te.direction = ?'); params.push(direction); }
    if (eventType) { conditions.push('te.eventType = ?'); params.push(eventType); }
    if (licenseId) { conditions.push('te.licenseId = ?'); params.push(licenseId); }
    if (startDate) { conditions.push('te.createdAt >= ?'); params.push(startDate); }
    if (endDate) { conditions.push('te.createdAt <= ?'); params.push(endDate); }

    const where = conditions.join(' AND ');
    const allowedSort = ['createdAt', 'ticket', 'symbol', 'profit', 'eventType'];
    const sortCol = allowedSort.includes(sortBy) ? `te.${sortBy}` : 'te.createdAt';
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const offset = (page - 1) * pageSize;

    const [rows] = await conn.execute(
      `SELECT te.*,
              st.name as strategyName, st.version as strategyVersion
       FROM trade_events te
       INNER JOIN licenses l ON l.id = te.licenseId
       LEFT JOIN strategies st ON st.id = l.strategyId
       WHERE ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    const [countRows] = await conn.execute(
      `SELECT COUNT(*) as total FROM trade_events te INNER JOIN licenses l ON l.id = te.licenseId WHERE ${where}`,
      params
    );
    const total = (countRows as any[])[0]?.total || 0;

    const trades = (rows as any[]).map(r => ({
      ...r,
      profit: Number(r.profit),
      commission: Number(r.commission),
      swap: Number(r.swap),
      openPrice: Number(r.openPrice),
      closePrice: Number(r.closePrice),
      volume: Number(r.volume),
      brokerName: r.brokerName || 'Exness',
      platform: r.accountPlatform || r.platform || 'MT5',
      strategy: { name: r.strategyName || 'TradeCandle', version: r.strategyVersion || '12.0.0' },
    }));

    return NextResponse.json({
      trades,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    console.error('List trade events error:', error);
    return NextResponse.json({ error: 'Failed to fetch trade events', detail: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
