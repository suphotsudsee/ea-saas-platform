import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let conn: mysql.Connection | null = null;
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const role = searchParams.get('role') || 'SUPER_ADMIN';
    
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const raw = process.env.DATABASE_URL!;
    const url = new URL(raw);
    conn = await mysql.createConnection({
      host: url.hostname,
      port: Number(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.replace('/', ''),
    });

    const [rows] = await conn.execute(
      `SELECT id, email, role FROM users WHERE email = ?`, [email]
    ) as any;
    if (rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const [result] = await conn.execute(
      `UPDATE users SET role = ? WHERE email = ?`, [role, email]
    ) as any;

    return NextResponse.json({ 
      ok: true, 
      updated: result.affectedRows,
      email,
      role,
      before: rows[0].role
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
