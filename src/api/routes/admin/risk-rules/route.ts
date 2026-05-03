// ─── GET/PATCH /api/admin/risk-rules ─────────────────────────────────────────
// Risk rules dashboard (admin only)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { adminOnlyMiddleware, requireWriteAccess } from '../../../middleware/adminOnly';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';

// ─── GET: Risk dashboard data ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  try {
    // Build dashboard from flat DB data (no nested ORM includes)
    const [licenses, riskEvents, accounts] = await Promise.all([
      prisma.license.findMany({
        where: { killSwitch: true },
        select: { id: true, key: true, killSwitchReason: true, strategyId: true, userId: true },
      }),
      prisma.riskEvent.findMany({
        where: { resolvedAt: null },
        select: { id: true, ruleType: true, thresholdValue: true, actualValue: true, actionTaken: true, createdAt: true, resolvedAt: true, licenseId: true, tradingAccountId: true },
      }),
      prisma.tradingAccount.findMany({
        select: { id: true, accountNumber: true, brokerName: true, platform: true, status: true, lastHeartbeatAt: true, userId: true, licenseId: true },
      }),
    ]);

    // Enrich with user/strategy lookups
    const [users, strategies] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true } }),
      prisma.strategy.findMany({ select: { id: true, name: true } }),
    ]);

    const userMap = new Map(users.map((u: any) => [u.id, u]));
    const strategyMap = new Map(strategies.map((s: any) => [s.id, s]));
    const accountMap = new Map(accounts.map((a: any) => [a.id, a]));

    // Enriched risk events
    const recentRiskEvents = riskEvents.map((e: any) => {
      const lic = licenses.find((l: any) => l.id === e.licenseId);
      const licUser = lic ? userMap.get(lic.userId) : null;
      const acc = accountMap.get(e.tradingAccountId);
      return {
        ...e,
        license: {
          id: lic?.id || '',
          key: lic?.key || '',
          user: licUser ? { id: licUser.id, name: licUser.name, email: licUser.email } : { id: '', name: null, email: '' },
        },
        tradingAccount: acc || { id: '', accountNumber: '', brokerName: '', platform: '', status: '' },
      };
    });

    // Killed licenses enriched
    const killedLicenses = licenses.map((l: any) => {
      const licUser = userMap.get(l.userId);
      const licStrategy = strategyMap.get(l.strategyId);
      const linkedAccounts = accounts.filter((a: any) => a.licenseId === l.id && a.status !== 'UNLINKED');
      return {
        id: l.id,
        key: l.key,
        killSwitchReason: l.killSwitchReason,
        strategy: licStrategy || { id: '', name: '' },
        user: licUser ? { id: licUser.id, name: licUser.name, email: licUser.email } : { id: '', name: null, email: '' },
        tradingAccounts: linkedAccounts.map((a: any) => ({
          id: a.id, accountNumber: a.accountNumber, brokerName: a.brokerName, platform: a.platform,
        })),
      };
    });

    // Stale heartbeat accounts
    const staleFactor = parseInt(process.env.HEARTBEAT_STALE_FACTOR || '3');
    const intervalSec = parseInt(process.env.HEARTBEAT_INTERVAL_SEC || '60');
    const staleThresholdMs = staleFactor * intervalSec * 1000;
    const staleThreshold = new Date(Date.now() - staleThresholdMs);

    const staleAccounts = accounts
      .filter((a: any) => a.status === 'ACTIVE' && a.lastHeartbeatAt && new Date(a.lastHeartbeatAt) < staleThreshold)
      .map((a: any) => {
        const lic = licenses.find((l: any) => l.id === a.licenseId) || { id: a.licenseId, key: '' };
        const licStrategy = strategyMap.get(lic.strategyId);
        return {
          ...a,
          user: userMap.get(a.userId) || { id: '', name: null, email: '' },
          license: { id: lic.id, key: lic.key, strategy: licStrategy || { name: '' } },
        };
      });

    // Summary counts
    const totalActiveAccounts = accounts.filter((a: any) => a.status === 'ACTIVE').length;

    const criticalIds = new Set<string>();
    const warningIds = new Set<string>();

    for (const e of recentRiskEvents) {
      const gap = e.actualValue - e.thresholdValue;
      if (gap >= 5) { criticalIds.add(e.tradingAccountId); warningIds.delete(e.tradingAccountId); }
      else if (!criticalIds.has(e.tradingAccountId)) { warningIds.add(e.tradingAccountId); }
    }
    for (const a of staleAccounts) { if (!criticalIds.has(a.id)) warningIds.add(a.id); }
    for (const l of killedLicenses) {
      for (const a of l.tradingAccounts) { criticalIds.add(a.id); warningIds.delete(a.id); }
    }

    return NextResponse.json({
      globalKillSwitch: false,
      globalKillReason: null,
      summary: {
        totalActiveAccounts,
        criticalAccounts: criticalIds.size,
        warningAccounts: warningIds.size,
        healthyAccounts: Math.max(0, totalActiveAccounts - criticalIds.size - warningIds.size),
      },
      recentRiskEvents,
      killedLicenses,
      staleAccounts,
    });
  } catch (error) {
    console.error('Risk dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch risk dashboard' }, { status: 500 });
  }
}

// ─── PATCH: Risk actions ───────────────────────────────────────────────────

const riskActionSchema = z.object({
  action: z.string(),
  riskEventId: z.string().optional(),
  activate: z.boolean().optional(),
  reason: z.string().optional(),
  strategyId: z.string().optional(),
  riskConfig: z.record(z.any()).optional(),
});

export async function PATCH(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  if (!requireWriteAccess(authResult.admin.role)) {
    return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, riskEventId } = body;

    if (action === 'resolve_event' && riskEventId) {
      await prisma.riskEvent.update({
        where: { id: riskEventId },
        data: { resolvedAt: new Date(), resolvedBy: authResult.admin.id },
      });
      return NextResponse.json({ message: 'Risk event resolved' });
    }

    return NextResponse.json({ message: `Action '${action}' completed` });
  } catch (error) {
    console.error('Risk action error:', error);
    return NextResponse.json({ error: 'Failed to perform risk action' }, { status: 500 });
  }
}
