import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const partial = url.searchParams.get('key') || '';
  const secret = request.headers.get('x-admin-secret') || url.searchParams.get('secret') || '';

  if (secret !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tradecandle',
    });

    const [rows] = await conn.execute(
      'SELECT id, `key`, status, userId, packageId, createdAt FROM licenses WHERE `key` LIKE ? LIMIT 5',
      [`%${partial}%`]
    );

    await conn.end();

    return NextResponse.json({
      found: (rows as any[]).length,
      licenses: rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
