// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
// Admin dashboard with aggregate stats
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { adminOnlyMiddleware } from '../../middleware/adminOnly';
import { prisma } from '../../lib/prisma';
import { redis } from '../../utils/redis';

export async function GET(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  try {
    // Run all queries in parallel for performance
    const [
      totalUsers,
      activeUsers,
      totalSubscriptions,
      activeSubscriptions,
      totalLicenses,
      activeLicenses,
      totalTradingAccounts,
      activeTradingAccounts,
      totalTrades,
      totalRevenue,
      killedLicenses,
      recentRiskEvents,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.license.count(),
      prisma.license.count({ where: { status: 'ACTIVE' } }),
      prisma.tradingAccount.count({ where: { status: { not: 'UNLINKED' } } }),
      prisma.tradingAccount.count({ where: { status: 'ACTIVE' } }),
      prisma.tradeEvent.count({ where: { eventType: 'CLOSE' } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amountCents: true },
      }),
      prisma.license.count({ where: { killSwitch: true } }),
      prisma.riskEvent.count({ where: { resolvedAt: null } }),
    ]);

    // Check global kill switch
    const globalKillSwitch = await redis.get('kill:global');

    // Get recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSignups = await prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // Get MRR (monthly recurring revenue)
    const activeMonthlySubscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { package: true },
    });

    const mrr = activeMonthlySubscriptions.reduce((sum, sub) => {
      const priceCents = sub.package.priceCents;
      if (sub.package.billingCycle === 'MONTHLY') return sum + priceCents;
      if (sub.package.billingCycle === 'QUARTERLY') return sum + Math.round(priceCents / 3);
      if (sub.package.billingCycle === 'YEARLY') return sum + Math.round(priceCents / 12);
      return sum;
    }, 0);

    return NextResponse.json({
      overview: {
        totalUsers,
        activeUsers,
        totalSubscriptions,
        activeSubscriptions,
        totalLicenses,
        activeLicenses,
        totalTradingAccounts,
        activeTradingAccounts,
        totalTrades,
        totalRevenueCents: totalRevenue._sum.amountCents || 0,
        killedLicenses,
        unresolvedRiskEvents: recentRiskEvents,
        globalKillSwitch: globalKillSwitch === '1',
      },
      growth: {
        recentSignups,
        mrrCents: mrr,
        arrCents: mrr * 12,
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}