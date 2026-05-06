// ─── GET /api/licenses ─────────────────────────────────────────────────────────
// List all licenses for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../middleware/auth';
import { listUserLicenses } from '../../../services/license.service';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const licenses = await listUserLicenses(authResult.user.id);
    
    return NextResponse.json({ licenses });
  } catch (error) {
    console.error('List licenses error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch licenses' },
      { status: 500 }
    );
  }
}
