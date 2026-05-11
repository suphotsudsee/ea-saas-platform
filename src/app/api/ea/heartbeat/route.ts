// ─── POST /api/ea/heartbeat ───────────────────────────────────────────────────
// EA endpoint: Report heartbeat status (equity/balance/positions).
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
  const platform = body.platform || 'MT5';
  const eaVersion = body.eaVersion || '';
  const equity = parseFloat(body.equity) || 0;
  const balance = parseFloat(body.balance) || 0;
  const openPositions = parseInt(body.openPositions) || 0;
  const marginLevel = parseFloat(body.marginLevel) || 0;
  const serverTime = body.serverTime || '';

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

    // ─── Verify license ───
    const [licRows] = await conn.execute(
      `SELECT id, userId, status, expiresAt, killSwitch, killSwitchReason, strategyId
       FROM licenses WHERE \`key\` = ?`,
      [licenseKey]
    ) as any[];

    if (!licRows || licRows.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_KEY', message: 'License key not found' },
        { status: 401 }
      );
    }

    const lic = licRows[0];
    if (lic.status === 'EXPIRED' || (lic.expiresAt && new Date(lic.expiresAt) < new Date())) {
      return NextResponse.json({ error: 'EXPIRED' }, { status: 403 });
    }
    if (lic.status === 'REVOKED') {
      return NextResponse.json({ error: 'REVOKED' }, { status: 403 });
    }
    if (lic.status === 'PAUSED') {
      return NextResponse.json({ error: 'PAUSED' }, { status: 403 });
    }

    // ─── Upsert heartbeat event ───
    const heartbeatId = `hb_${licenseKey}_${accountNumber}`;
    await conn.execute(
      `INSERT INTO heartbeat_events (id, licenseId, accountNumber, platform, eaVersion,
         equity, balance, openPositions, marginLevel, lastHeartbeatAt, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'ALIVE', NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         eaVersion = VALUES(eaVersion),
         equity = VALUES(equity),
         balance = VALUES(balance),
         openPositions = VALUES(openPositions),
         marginLevel = VALUES(marginLevel),
         lastHeartbeatAt = NOW(),
         status = 'ALIVE',
         updatedAt = NOW()`,
      [heartbeatId, lic.id, accountNumber, platform, eaVersion,
       equity, balance, openPositions, marginLevel]
    );

    // ─── Auto-link trading account if not already linked ───
    try {
      const taId = `ta_${accountNumber}`;
      await conn.execute(
        `INSERT IGNORE INTO trading_accounts (id, accountNumber, brokerName, platform, licenseId, status, userId, createdAt, updatedAt)
         VALUES (?, ?, 'Exness', 'MT5', ?, 'LINKED', ?, NOW(), NOW())`,
        [taId, accountNumber, lic.id, lic.userId]
      );
    } catch (linkErr: any) {
      // Best-effort — heartbeat still succeeded
      console.error('Auto-link trading account failed:', linkErr.message);
    }

    // ─── Check kill switch ───
    let kill = false;
    let killReason = '';
    if (lic.killSwitch) {
      kill = true;
      killReason = lic.killSwitchReason || 'Kill switch active';
    }

    // ─── Get current config hash (from strategy) ───
    const [stratRows] = await conn.execute(
      `SELECT configHash FROM strategies WHERE id = ?`,
      [lic.strategyId]
    ) as any[];
    const configHash = (stratRows && stratRows.length > 0) ? (stratRows[0].configHash || '') : '';

    return NextResponse.json({
      status: kill ? 'kill' : 'ok',
      kill,
      killReason,
      configHash,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('EA heartbeat error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  } finally {
    if (conn) await conn.end();
  }
}
