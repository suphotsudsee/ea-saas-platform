import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

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

export async function GET() {
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(getDbConfig());

    // Fix: update existing UNLINKED record to LINKED, or insert if missing
    const result = await conn.execute(
      `INSERT INTO trading_accounts (id, accountNumber, brokerName, platform, licenseId, status, userId, createdAt, updatedAt)
       VALUES ('ta_415609557', '415609557', 'Exness', 'MT5', 'lic_30247197871f06f483943e0e', 'LINKED', 'usr_db75c85fa5e51fd640b71843', NOW(), NOW())
       ON DUPLICATE KEY UPDATE status = 'LINKED', licenseId = VALUES(licenseId), userId = VALUES(userId), updatedAt = NOW()`
    );
    
    // Also delete the demo account
    await conn.execute(
      `DELETE FROM trading_accounts WHERE accountNumber = '12345678' AND licenseId = 'lic_30247197871f06f483943e0e'`
    );

    const [rows] = await conn.execute(
      `SELECT * FROM trading_accounts WHERE licenseId = 'lic_30247197871f06f483943e0e'`
    );

    return NextResponse.json({ ok: true, accounts: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
