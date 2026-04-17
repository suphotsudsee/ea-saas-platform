// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Get current authenticated user info
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../middleware/auth';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  return NextResponse.json({
    user: authResult.user,
  });
}
