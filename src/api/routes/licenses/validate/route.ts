// ─── POST /api/licenses/validate ──────────────────────────────────────────────
// Validate a license key (EA endpoint — requires API key)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { validateLicenseMiddleware } from '../../../middleware/validateLicense';
import { validateLicense } from '../../../services/license.service';
import { eaRateLimiter } from '../../../middleware/rateLimit';

export async function POST(request: NextRequest) {
  // Rate limit check
  const rateLimitResult = await eaRateLimiter()(request);
  if (rateLimitResult) return rateLimitResult;

  // License/API key validation
  const authResult = await validateLicenseMiddleware(request);
  if ('status' in authResult) return authResult; // Error response

  try {
    const body = await request.json();
    const { accountNumber } = body;

    // Full validation with account check
    const result = await validateLicense(
      authResult.license.key,
      accountNumber
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('License validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
