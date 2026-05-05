
import { NextResponse, NextRequest } from 'next/server';
import mysql from 'mysql2/promise';
import { SignJWT } from 'jose';

export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'tradecandle-admin-secret-2026'
);

export async function POST(request: NextRequest) {
  let conn: mysql.Connection | null = null;
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Connect via raw mysql2 (no Prisma)
    const raw = process.env.DATABASE_URL!;
    const url = new URL(raw);
    conn = await mysql.createConnection({
      host: url.hostname, port: Number(url.port) || 3306,
      user: url.username, password: url.password,
      database: url.pathname.replace('/', ''),
    });

    // Ensure admin_users table exists
    await conn.execute(`CREATE TABLE IF NOT EXISTS admin_users (
      id VARCHAR(191) NOT NULL PRIMARY KEY, email VARCHAR(191) NOT NULL UNIQUE,
      passwordHash VARCHAR(191) NOT NULL, name VARCHAR(191) NOT NULL,
      role VARCHAR(64) NOT NULL DEFAULT 'ADMIN', twoFactorEnabled BOOLEAN NOT NULL DEFAULT false,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    // Auto-create bootstrap admin if not exists
    const bcrypt = (await import('bcryptjs')).default;
    const adminHash = await bcrypt.hash('Admin@2026!Secure', 12);
    await conn.execute(`INSERT IGNORE INTO admin_users (id, email, passwordHash, name, role, twoFactorEnabled, createdAt, updatedAt)
      VALUES ('adm_bootstrap', 'admin@tradecandle.net', ?, 'Platform Admin', 'SUPER_ADMIN', 0, NOW(), NOW())`,
      [adminHash]);

    // Look up admin
    const [rows] = await conn.execute(
      'SELECT id, email, passwordHash, name, role FROM admin_users WHERE email = ?', [email]
    ) as any;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const admin = rows[0];
    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await new SignJWT({
      id: admin.id, email: admin.email, role: admin.role, actorType: 'admin',
    }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('24h').setIssuedAt().sign(JWT_SECRET);

    const response = NextResponse.json({
      message: 'Admin login successful',
      user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role, actorType: 'admin' },
    });
    response.cookies.set('session-token', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 86400, path: '/',
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
