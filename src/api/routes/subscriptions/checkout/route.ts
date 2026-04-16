// ─── POST /api/subscriptions/checkout ─────────────────────────────────────────
// Create a Stripe checkout session for subscription purchase
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../middleware/auth';
import { createCheckoutSession } from '../../services/billing.service';
import { z } from 'zod';

const checkoutSchema = z.object({
  packageId: z.string().min(1, 'Package ID is required'),
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
});

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = checkoutSchema.parse(body);

    const result = await createCheckoutSession(
      authResult.user.id,
      validated.packageId,
      validated.successUrl,
      validated.cancelUrl
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('already has an active subscription')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}