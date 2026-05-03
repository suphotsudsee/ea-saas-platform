import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/api/middleware/auth';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payments = await prisma.payment.findMany({
      where: {
        userId: authResult.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        stripePaymentId: true,
        description: true,
        createdAt: true,
      },
      take: 20,
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Get subscription history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing history' },
      { status: 500 }
    );
  }
}
