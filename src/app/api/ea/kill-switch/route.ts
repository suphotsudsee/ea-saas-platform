// ─── POST /api/ea/kill-switch ─────────────────────────────────────────────────
// EA endpoint: Acknowledge kill switch received (MT5 shutdown confirmation).
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
    const rawText = await request.text();
    const cleaned = rawText.replace(/\0/g, '');
    body = JSON.parse(cleaned);
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const apiKey = request.headers.get('x-api-key') || body.apiKey || '';
  const licenseKey = request.headers.get('x-license-key') || body.licenseKey || '';
  const accountNumber = body.accountNumber || '';
  const acknowledged = body.acknowledged || 'true';
  const reason = body.reason || '';
  const timestamp = body.timestamp || '';

  if (!licenseKey || !accountNumber) {
    return NextResponse.json(
      { error: 'licenseKey and accountNumber are required' },
      { status: 400 }
    );
  }

  let conn: mysql.Connection | null = null;
  try {
    const config = getDbConfig();
    conn = await mysql.createConnection(config);

    // ─── Verify license exists ───
    const [licRows] = await conn.execute(
      `SELECT id FROM licenses WHERE \`key\` = ?`,
      [licenseKey]
    ) as any[];

    if (!licRows || licRows.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_KEY' },
        { status: 401 }
      );
    }

    const lic = licRows[0];

    // ─── Log kill switch acknowledgment ───
    // Update heartbeat to indicate killed status
    const heartbeatId = `hb_${licenseKey}_${accountNumber}`;
    await conn.execute(
      `INSERT INTO heartbeat_events (id, licenseId, accountNumber, platform, status, lastHeartbeatAt, createdAt, updatedAt)
       VALUES (?, ?, ?, 'MT5', 'KILLED', NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         status = 'KILLED',
         lastHeartbeatAt = NOW(),
         updatedAt = NOW()`,
      [heartbeatId, lic.id, accountNumber]
    );

    // ─── Log kill switch event ───
    try {
      await conn.execute(
        `INSERT INTO kill_switch_logs (id, licenseId, accountNumber, reason, acknowledged, timestamp, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [`ks_${Date.now()}_${accountNumber}`, lic.id, accountNumber, reason,
         acknowledged === 'true' ? 1 : 0, timestamp || new Date().toISOString()]
      );
    } catch (e) {
      // kill_switch_logs table may not exist yet — non-critical
      console.log('kill_switch_logs insert skipped (table may not exist):', e);
    }

    return NextResponse.json({
      status: 'acknowledged',
      message: 'Kill switch acknowledgment received',
    });
  } catch (error: any) {
    console.error('EA kill-switch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  } finally {
    if (conn) await conn.end();
  }
}
