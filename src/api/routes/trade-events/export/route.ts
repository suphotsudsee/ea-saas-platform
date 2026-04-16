// ─── GET /api/trade-events/export ──────────────────────────────────────────────
// Export trade events as CSV
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
    const licenseId = searchParams.get('licenseId');
    const tradingAccountId = searchParams.get('tradingAccountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      license: { userId: authResult.user.id },
    };

    if (licenseId) where.licenseId = licenseId;
    if (tradingAccountId) where.tradingAccountId = tradingAccountId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const trades = await prisma.tradeEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000, // Limit exports to 10k rows
      include: {
        tradingAccount: { select: { accountNumber: true, platform: true } },
      },
    });

    // Build CSV
    const headers = [
      'Ticket', 'Symbol', 'Direction', 'EventType', 'OpenPrice', 'ClosePrice',
      'Volume', 'OpenTime', 'CloseTime', 'Profit', 'Commission', 'Swap',
      'MagicNumber', 'Comment', 'Account', 'Platform', 'CreatedAt',
    ];

    const rows = trades.map((t) => [
      t.ticket,
      t.symbol,
      t.direction,
      t.eventType,
      t.openPrice ?? '',
      t.closePrice ?? '',
      t.volume,
      t.openTime ? new Date(t.openTime).toISOString() : '',
      t.closeTime ? new Date(t.closeTime).toISOString() : '',
      t.profit ?? '',
      t.commission ?? '',
      t.swap ?? '',
      t.magicNumber ?? '',
      t.comment ?? '',
      t.tradingAccount.accountNumber,
      t.tradingAccount.platform,
      new Date(t.createdAt).toISOString(),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="trade-events-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export trade events' },
      { status: 500 }
    );
  }
}