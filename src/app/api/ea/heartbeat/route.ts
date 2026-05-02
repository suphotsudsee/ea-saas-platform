// ─── POST /api/ea/heartbeat ───────────────────────────────────────────────────
// EA endpoint: Report heartbeat and receive config/kill updates
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { validateLicenseMiddleware } from '../../../middleware/validateLicense';
import { processHeartbeat } from '../../../services/ea-contract.service';
import { eaRateLimiter } from '../../../middleware/rateLimit';
import { z } from 'zod';

const heartbeatSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  platform: z.enum(['MT4', 'MT5']),
  eaVersion: z.string().optional(),
  equity: z.number().optional(),
  balance: z.number().optional(),
  openPositions: z.number().int().min(0).optional(),
  marginLevel: z.number().optional(),
  serverTime: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResult = await eaRateLimiter()(request);
  if (rateLimitResult) return rateLimitResult;

  // License validation
  const authResult = await validateLicenseMiddleware(request);
  if ('status' in authResult) return authResult;

  try {
    const body = await request.json();
    const validated = heartbeatSchema.parse(body);

    const result = await processHeartbeat(
      {
        licenseKey: authResult.license.key,
        accountNumber: validated.accountNumber,
        platform: validated.platform,
        eaVersion: validated.eaVersion,
        equity: validated.equity,
        balance: validated.balance,
        openPositions: validated.openPositions,
        marginLevel: validated.marginLevel,
        serverTime: validated.serverTime,
      },
      authResult.license.id,
      authResult.license.userId
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('EA heartbeat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
