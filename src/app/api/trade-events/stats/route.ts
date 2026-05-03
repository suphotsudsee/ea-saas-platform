// ─── GET /api/trade-events/stats ───────────────────────────────────────────────
// Get trade statistics for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/api/middleware/auth';
import { prisma } from '@/api/lib/prisma';

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
      eventType: 'CLOSE',
    };

    if (licenseId) where.licenseId = licenseId;
    if (tradingAccountId) where.tradingAccountId = tradingAccountId;
    if (startDate || endDate) {
      where.closeTime = {};
      if (startDate) where.closeTime.gte = new Date(startDate);
      if (endDate) where.closeTime.lte = new Date(endDate);
    }

    // Aggregate statistics
    const trades = await prisma.tradeEvent.findMany({
      where,
      select: {
        profit: true,
        commission: true,
        swap: true,
        volume: true,
        symbol: true,
        direction: true,
        openTime: true,
        closeTime: true,
      },
    });

    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => (t.profit || 0) > 0).length;
    const losingTrades = trades.filter((t) => (t.profit || 0) < 0).length;
    const totalPnl = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalCommission = trades.reduce((sum, t) => sum + (t.commission || 0), 0);
    const totalSwap = trades.reduce((sum, t) => sum + (t.swap || 0), 0);
    const totalVolume = trades.reduce((sum, t) => sum + (t.volume || 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Calculate average trade duration
    const durations = trades
      .filter((t) => t.openTime && t.closeTime)
      .map((t) => new Date(t.closeTime!).getTime() - new Date(t.openTime!).getTime());
    const avgDurationMs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // P&L by symbol
    const pnlBySymbol: Record<string, number> = {};
    trades.forEach((t) => {
      if (!pnlBySymbol[t.symbol]) pnlBySymbol[t.symbol] = 0;
      pnlBySymbol[t.symbol] += t.profit || 0;
    });

    return NextResponse.json({
      stats: {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate: Math.round(winRate * 100) / 100,
        totalPnl: Math.round(totalPnl * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        totalSwap: Math.round(totalSwap * 100) / 100,
        netPnl: Math.round((totalPnl + totalCommission + totalSwap) * 100) / 100,
        totalVolume: Math.round(totalVolume * 100) / 100,
        avgTradeDurationMs: Math.round(avgDurationMs),
        pnlBySymbol,
      },
    });
  } catch (error) {
    console.error('Trade stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trade statistics' },
      { status: 500 }
    );
  }
}
