import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { authMiddleware } from '@/api/middleware/auth';

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
    const [hostPort, database] = hostAndDb.split('/');
    const [host, portText] = hostPort.split(':');
    return { host, port: portText ? Number(portText) : 3306, user, password, database: database?.split('?')[0] || 'default' };
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request);
  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { licenseId, accountNumber, brokerName } = body;
  if (!licenseId || !accountNumber) {
    return NextResponse.json({ error: 'licenseId and accountNumber required' }, { status: 400 });
  }

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(getDbConfig());
    
    // Verify license belongs to user
    const [licRows] = await conn.execute(
      'SELECT id, userId, maxAccounts FROM licenses WHERE id = ? AND userId = ?',
      [licenseId, authResult.user.id]
    ) as any[];
    
    if (!licRows || licRows.length === 0) {
      return NextResponse.json({ error: 'License not found or not yours' }, { status: 404 });
    }

    const lic = licRows[0];
    
    // Check account limit
    const [existing] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM trading_accounts WHERE licenseId = ? AND status != 'UNLINKED'",
      [licenseId]
    ) as any[];
    
    if (existing[0].cnt >= (lic.maxAccounts || 1)) {
      return NextResponse.json({ error: 'Max accounts reached', current: existing[0].cnt, max: lic.maxAccounts }, { status: 403 });
    }

    // Insert trading account
    const taId = `ta_${accountNumber}`;
    try {
      await conn.execute(
        `INSERT INTO trading_accounts (id, accountNumber, brokerName, platform, licenseId, status, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, 'MT5', ?, 'LINKED', ?, NOW(), NOW())`,
        [taId, String(accountNumber), brokerName || 'Exness', licenseId, authResult.user.id]
      );
      return NextResponse.json({ ok: true, id: taId, accountNumber, licenseId });
    } catch (e: any) {
      // If duplicate, it already exists
      if (e.code === 'ER_DUP_ENTRY' || e.errno === 1062) {
        return NextResponse.json({ ok: true, id: taId, accountNumber, licenseId, note: 'already exists' });
      }
      return NextResponse.json({ error: 'Insert failed', detail: e.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error', detail: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
