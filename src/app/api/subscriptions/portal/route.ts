import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/api/middleware/auth';
import { createCustomerPortalSession } from '@/api/services/billing.service';
import { z } from 'zod';

const portalSchema = z.object({
  returnUrl: z.string().url('Invalid return URL'),
});

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = portalSchema.parse(body);

    const result = await createCustomerPortalSession(authResult.user.id, validated.returnUrl);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('STRIPE_SECRET_KEY is not configured')) {
      return NextResponse.json(
        { error: 'Stripe customer portal is not configured. Set a real STRIPE_SECRET_KEY in .env.' },
        { status: 503 }
      );
    }

    console.error('Customer portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
}
