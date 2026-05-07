// ─── POST /api/ea/trade-events ─────────────────────────────────────────────────
// EA endpoint: Report trade events (OPEN/CLOSE/TP/SL/MODIFY) to platform.
// Uses raw mysql2 — no Prisma/Redis middleware (standalone Docker safe).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

function getDbConfig() {
  let raw = process.env.DATABASE_URL!;
  if (raw.includes('mysql-database-')) {
    raw = raw.replace('mysql-database-', '');
  }
  try {
    const u = new URL(raw);
    return {
      host: u.hostname,
      port: parseInt(u.port || '3306'),
      user: u.username,
      password: u.password,
      database: u.pathname.replace('/', ''),
    };
  } catch {
    const value = raw.replace(/^mysql:\/\//, '');
    const at = value.lastIndexOf('@');
    const auth = at >= 0 ? value.slice(0, at) : '';
    const hostAndDb = at >= 0 ? value.slice(at + 1) : value;
    const colon = auth.indexOf(':');
    const user = colon >= 0 ? auth.slice(0, colon) : auth;
    const password = colon >= 0 ? auth.slice(colon + 1) : '';
    const slash = hostAndDb.indexOf('/');
    const hostPort = slash >= 0 ? hostAndDb.slice(0, slash) : hostAndDb;
    const database = slash >= 0 ? hostAndDb.slice(slash + 1).split('?')[0] : '';
    const [host, portText] = hostPort.split(':');
    return { host, port: portText ? Number(portText) : 3306, user, password, database };
  }
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const apiKey = request.headers.get('x-api-key') || body.apiKey || '';
  const licenseKey = request.headers.get('x-license-key') || body.licenseKey || '';
  const accountNumber = body.accountNumber || '';
  const platform = body.platform || 'MT5';
  const ticket = body.ticket || '';
  const symbol = body.symbol || '';
  const direction = body.direction || '';
  const eventType = body.eventType || '';
  const openPrice = parseFloat(body.openPrice) || 0;
  const closePrice = parseFloat(body.closePrice) || 0;
  const volume = parseFloat(body.volume) || 0;
  const openTime = body.openTime || '';
  const closeTime = body.closeTime || '';
  const profit = parseFloat(body.profit) || 0;
  const commission = parseFloat(body.commission) || 0;
  const swap = parseFloat(body.swap) || 0;
  const magicNumber = parseInt(body.magicNumber) || 0;
  const comment = body.comment || '';

  if (!licenseKey || !ticket || !eventType) {
    return NextResponse.json(
      { error: 'licenseKey, ticket, and eventType are required' },
      { status: 400 }
    );
  }

  let conn: mysql.Connection | null = null;
  try {
    const config = getDbConfig();
    conn = await mysql.createConnection(config);

    // ─── Verify license ───
    const [licRows] = await conn.execute(
      `SELECT id, status, expiresAt, killSwitch FROM licenses WHERE \`key\` = ?`,
      [licenseKey]
    ) as any[];

    if (!licRows || licRows.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_KEY', message: 'License key not found' },
        { status: 401 }
      );
    }

    const lic = licRows[0];
    if (lic.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'LICENSE_NOT_ACTIVE', message: `License status: ${lic.status}` },
        { status: 403 }
      );
    }
    if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'EXPIRED' }, { status: 403 });
    }

    // ─── Log trade event ───
    const eventId = `te_${Date.now()}_${ticket}`;
    try {
      await conn.execute(
        `INSERT INTO trade_events (id, licenseId, accountNumber, platform, ticket, symbol,
           direction, eventType, openPrice, closePrice, volume, openTime, closeTime,
           profit, commission, swap, magicNumber, comment, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECORDED', NOW(), NOW())`,
        [eventId, lic.id, accountNumber, platform, ticket, symbol,
         direction, eventType, openPrice, closePrice, volume, openTime, closeTime,
         profit, commission, swap, magicNumber, comment]
      );
    } catch (insertErr: any) {
      // Table might not exist or column mismatch — log and continue
      console.error('trade_events insert error (non-fatal):', insertErr.message);
      // Fallback: write to a generic event log
      try {
        await conn.execute(
          `INSERT INTO event_logs (id, type, payload, createdAt)
           VALUES (?, 'TRADE', ?, NOW())`,
          [eventId, JSON.stringify(body)]
        );
      } catch (e2) {
        // Silent — trade reporting is best-effort
      }
    }

    return NextResponse.json({
      status: 'recorded',
      eventId,
      eventType,
      ticket,
    }, { status: 201 });
  } catch (error: any) {
    console.error('EA trade-events error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  } finally {
    if (conn) await conn.end();
  }
}
