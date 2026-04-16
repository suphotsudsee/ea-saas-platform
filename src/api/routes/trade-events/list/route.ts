// ─── GET /api/trade-events ─────────────────────────────────────────────────────
// List trade events for the authenticated user with filters and pagination
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const symbol = searchParams.get('symbol');
    const direction = searchParams.get('direction');
    const eventType = searchParams.get('eventType');
    const licenseId = searchParams.get('licenseId');
    const tradingAccountId = searchParams.get('tradingAccountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause — only user's trades
    const where: any = {
      license: { userId: authResult.user.id },
    };

    if (symbol) where.symbol = symbol;
    if (direction) where.direction = direction;
    if (eventType) where.eventType = eventType;
    if (licenseId) where.licenseId = licenseId;
    if (tradingAccountId) where.tradingAccountId = tradingAccountId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [trades, total] = await Promise.all([
      prisma.tradeEvent.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          tradingAccount: { select: { accountNumber: true, brokerName: true, platform: true } },
          license: { select: { strategy: { select: { name: true } } } },
        },
      }),
      prisma.tradeEvent.count({ where }),
    ]);

    return NextResponse.json({
      trades,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('List trade events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trade events' },
      { status: 500 }
    );
  }
}