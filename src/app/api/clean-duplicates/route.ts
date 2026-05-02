import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

function getConnectionConfig() {
  const raw = process.env.DATABASE_URL!;
  try { new URL(raw); return raw; } catch { /* parse */ }
  const value = raw.replace(/^mysql:\/\//, '');
  const at = value.lastIndexOf('@');
  const auth = at >= 0 ? value.slice(0, at) : '';
  const hostAndDb = at >= 0 ? value.slice(at + 1) : value;
  const colon = auth.indexOf(':');
  const user = colon >= 0 ? auth.slice(0, colon) : auth;
  const password = colon >= 0 ? auth.slice(colon + 1) : '';
  const slash = hostAndDb.indexOf('/');
  const hostPort = slash >= 0 ? hostAndDb.slice(0, slash) : hostAndDb;
  const [host, portText] = hostPort.split(':');
  const database = (slash >= 0 ? hostAndDb.slice(slash + 1) : '').split('?')[0];
  return { host, port: portText ? Number(portText) : 3306, user, password, database };
}

export async function GET() {
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(getConnectionConfig() as any);
    
    // Only disable the stale db.ts seed duplicate (id='starter', isTrial=1)
    await conn.execute("UPDATE packages SET isActive = 0 WHERE id = 'starter' AND isTrial = 1");
    
    // Ensure all proper packages are active
    await conn.execute("UPDATE packages SET isActive = 1 WHERE id IN ('pkg_trial_30d','pkg_starter','pkg_pro','pkg_elite')");
    
    return NextResponse.json({ ok: true, message: 'Cleaned — only stale "starter" trial duplicate disabled' });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
