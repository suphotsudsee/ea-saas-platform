// ─── GET /api/packages/list ─────────────────────────────────────────────────
// List all subscription packages for registration page
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getAllPackages } from '../../../lib/db';

export async function GET() {
  try {
    const packages = await getAllPackages();
    const active = packages.filter((p: any) => p.isActive === 1 || p.isActive === true);
    return NextResponse.json({ packages: active });
  } catch (error) {
    console.error('List packages error:', error);
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}
