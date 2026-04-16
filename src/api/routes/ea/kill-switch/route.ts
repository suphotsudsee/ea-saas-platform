// ─── POST /api/ea/kill-switch ──────────────────────────────────────────────────
// EA endpoint: Acknowledge kill switch received
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { validateLicenseMiddleware } from '../../middleware/validateLicense';
import { acknowledgeKillSwitch } from '../../services/ea-contract.service';
import { eaRateLimiter } from '../../middleware/rateLimit';

export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResult = await eaRateLimiter()(request);
  if (rateLimitResult) return rateLimitResult;

  // License validation
  const authResult = await validateLicenseMiddleware(request);
  if ('status' in authResult) return authResult;

  try {
    const body = await request.json();
    const { accountNumber } = body;

    // Find trading account for this license
    const { prisma } = await import('../../lib/prisma');
    const tradingAccount = await prisma.tradingAccount.findFirst({
      where: {
        accountNumber: accountNumber || '',
        licenseId: authResult.license.id,
        status: { not: 'UNLINKED' },
      },
    });

    const result = await acknowledgeKillSwitch(
      authResult.license.id,
      tradingAccount?.id || ''
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('EA kill switch ack error:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge kill switch' },
      { status: 500 }
    );
  }
}