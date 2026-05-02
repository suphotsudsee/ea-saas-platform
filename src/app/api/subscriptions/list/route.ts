// ─── GET /api/subscriptions/packages ──────────────────────────────────────────
// List all active subscription packages
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { listActivePackages } from '../../../services/billing.service';

export async function GET() {
  try {
    const packages = await listActivePackages();
    return NextResponse.json({ packages });
  } catch (error) {
    console.error('List packages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}
