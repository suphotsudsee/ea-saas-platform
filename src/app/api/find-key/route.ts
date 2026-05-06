import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const partial = url.searchParams.get('key') || '';

  if (!partial || partial.length < 4) {
    return NextResponse.json({ error: 'Need at least 4 chars of key' }, { status: 400 });
  }

  try {
    // Try parsing DATABASE_URL directly
    const dbUrl = process.env.DATABASE_URL || '';
    let config: any;

    if (dbUrl) {
      const u = new URL(dbUrl.replace('mysql-database-', ''));
      config = {
        host: u.hostname,
        port: parseInt(u.port || '3306'),
        user: u.username,
        password: u.password,
        database: u.pathname.replace('/', ''),
      };
    } else {
      config = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tradecandle',
      };
    }

    const conn = await mysql.createConnection(config);
    const [rows] = await conn.execute('SELECT `key` FROM licenses WHERE `key` LIKE ? LIMIT 3', [`%${partial}%`]);
    await conn.end();

    const keys = (rows as any[]).map(r => r.key);

    return NextResponse.json({ found: keys.length, keys });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'DB error' }, { status: 500 });
  }
}
