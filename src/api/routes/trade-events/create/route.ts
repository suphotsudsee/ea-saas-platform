// ─── POST /api/trade-events/create ─────────────────────────────────────────────
// Create a single trade event (EA endpoint)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { validateLicenseMiddleware } from '../../middleware/validateLicense';
import { processTradeEvent } from '../../services/ea-contract.service';
import { eaRateLimiter } from '../../middleware/rateLimit';
import { z } from 'zod';

const tradeEventSchema = z.object({
  accountNumber: z.string().min(1),
  ticket: z.string().min(1),
  symbol: z.string().min(1),
  direction: z.enum(['BUY', 'SELL']),
  eventType: z.enum(['OPEN', 'CLOSE', 'MODIFY', 'PARTIAL_CLOSE']),
  openPrice: z.number().optional(),
  closePrice: z.number().optional(),
  volume: z.number().positive(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  profit: z.number().optional(),
  commission: z.number().optional(),
  swap: z.number().optional(),
  magicNumber: z.number().int().optional(),
  comment: z.string().optional(),
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
    const validated = tradeEventSchema.parse(body);

    const result = await processTradeEvent(
      {
        licenseKey: authResult.license.key,
        ...validated,
      },
      authResult.license.id
    );

    const statusCode = result.status === 'duplicate' ? 200 : 201;
    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Create trade event error:', error);
    return NextResponse.json(
      { error: 'Failed to process trade event' },
      { status: 500 }
    );
  }
}