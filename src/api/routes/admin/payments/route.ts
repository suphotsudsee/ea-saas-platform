// ─── GET /api/admin/payments ─────────────────────────────────────────────────
// List all payments across all users (admin only)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { adminOnlyMiddleware } from '../../../middleware/adminOnly';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        select: {
          id: true,
          userId: true,
          amountCents: true,
          currency: true,
          status: true,
          paymentMethod: true,
          depositAddress: true,
          depositNetwork: true,
          txHash: true,
          fromAddress: true,
          confirmations: true,
          verifiedAt: true,
          expiresAt: true,
          description: true,
          createdAt: true,
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payment.count({ where }),
    ]);

    // Calculate summary stats
    const [totalCompleted, totalPendingPayments] = await Promise.all([
      prisma.payment.count({ where: { status: 'COMPLETED' } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
    ]);

    const revenueResult = await prisma.payment.count({
      where: { status: 'COMPLETED' },
    });

    return NextResponse.json({
      payments: payments.map((p: any) => ({
        ...p,
        amount: p.amountCents / 100,
      })),
      summary: {
        totalPayments: total,
        completedPayments: totalCompleted,
        pendingPayments: totalPendingPayments,
      },
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('Admin payments error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
