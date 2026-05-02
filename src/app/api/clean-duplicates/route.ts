import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

function getConnectionConfig() {
  const raw = process.env.DATABASE_URL!;
  try {
    new URL(raw);
    return raw;
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
    const databaseAndQuery = slash >= 0 ? hostAndDb.slice(slash + 1) : '';
    const [host, portText] = hostPort.split(':');
    const database = databaseAndQuery.split('?')[0];
    return { host, port: portText ? Number(portText) : 3306, user, password, database };
  }
}

export async function GET() {
  let conn: mysql.Connection | null = null;
  try {
    const config = getConnectionConfig();
    conn = await mysql.createConnection(config as any);
    
    // Disable stale package 'starter' (inserted by old db.ts seed)
    const [r1] = await conn.execute("UPDATE packages SET isActive = 0 WHERE id = 'starter'");
    const [r2] = await conn.execute("UPDATE packages SET isActive = 0 WHERE id = 'pkg_starter'");
    
    // Count active packages
    const [active] = await conn.execute("SELECT COUNT(*) as cnt FROM packages WHERE isActive = 1");
    
    return NextResponse.json({
      ok: true,
      message: 'Duplicate packages disabled',
      activeCount: (active as any)[0]?.cnt || 0,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
