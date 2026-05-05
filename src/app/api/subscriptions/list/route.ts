// ─── GET /api/subscriptions/list ────────────────────────────────────────────────
// Direct MySQL query — bypasses billing service entirely
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      // Fallback to JSON
      const { getAllPackages } = await import('@/lib/db');
      const all = await getAllPackages();
      const active = all.filter((p: any) => p.isActive === 1 || p.isActive === true);
      return NextResponse.json({ packages: active });
    }

    // MySQL direct query
    const mysql = await import('mysql2/promise');
    // Parse DATABASE_URL: mysql://user:pass@host:port/db
    const url = new URL(DATABASE_URL);
    const conn = await mysql.createConnection({
      host: url.hostname,
      port: parseInt(url.port || '3306'),
      user: url.username,
      password: url.password,
      database: url.pathname.replace('/', ''),
    });

    const [rows] = await conn.execute(
      'SELECT * FROM packages WHERE isActive = 1 ORDER BY sortOrder ASC'
    );
    await conn.end();

    return NextResponse.json({ packages: rows });
  } catch (error: any) {
    console.error('List packages error:', error);
    // Last resort — try JSON fallback
    try {
      const fs = await import('fs');
      const path = await import('path');
      const dataPath = path.join(process.cwd(), 'data', 'packages.json');
      if (fs.existsSync(dataPath)) {
        const raw = fs.readFileSync(dataPath, 'utf-8');
        const all = JSON.parse(raw);
        const active = all.filter((p: any) => p.isActive === 1 || p.isActive === true);
        return NextResponse.json({ packages: active });
      }
    } catch {}

    return NextResponse.json(
      { error: 'Failed to fetch packages', detail: error?.message },
      { status: 500 }
    );
  }
}
