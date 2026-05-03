// ─── GET /api/payments/history ───────────────────────────────────────────────
// Get payment history for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/api/middleware/auth';
import { getPaymentHistory } from '@/api/services/usdt-payment.service';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

    const result = await getPaymentHistory(authResult.user.id, page, pageSize);

    return NextResponse.json({
      success: true,
      data: result.payments.map(p => ({
        id: p.id,
        amount: p.amountCents / 100,
        currency: p.currency,
        status: p.status,
        paymentMethod: p.paymentMethod,
        depositAddress: p.depositAddress,
        depositNetwork: p.depositNetwork,
        txHash: p.txHash,
        verifiedAt: p.verifiedAt,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
        description: p.description,
      })),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get payment history' },
      { status: 400 }
    );
  }
}