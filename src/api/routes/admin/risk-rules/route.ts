// ─── GET/PATCH /api/admin/risk-rules ─────────────────────────────────────────
// View and update risk rules (admin only)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { adminOnlyMiddleware, requireWriteAccess } from '../../../middleware/adminOnly';
import { getRiskDashboard, resolveRiskEvent } from '../../../services/risk.service';
import { setGlobalKillSwitch } from '../../../services/license.service';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';

// ─── GET: Risk dashboard data ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  try {
    const dashboard = await getRiskDashboard();

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Risk dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risk dashboard' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Risk actions ───────────────────────────────────────────────────

const riskActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('resolve_event'),
    riskEventId: z.string(),
  }),
  z.object({
    action: z.literal('global_kill_switch'),
    activate: z.boolean(),
    reason: z.string().min(1),
  }),
  z.object({
    action: z.literal('update_risk_config'),
    strategyId: z.string(),
    riskConfig: z.record(z.any()),
  }),
]);

export async function PATCH(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  if (!requireWriteAccess(authResult.admin.role)) {
    return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = riskActionSchema.parse(body);

    let result;

    switch (validated.action) {
      case 'resolve_event':
        result = await resolveRiskEvent(validated.riskEventId, authResult.admin.id);
        break;

      case 'global_kill_switch':
        await setGlobalKillSwitch(validated.activate, authResult.admin.id, validated.reason);
        result = { globalKillSwitch: validated.activate };
        break;

      case 'update_risk_config':
        // Update strategy risk config
        const strategy = await prisma.strategy.findUnique({
          where: { id: validated.strategyId },
        });

        if (!strategy) {
          return NextResponse.json(
            { error: 'Strategy not found' },
            { status: 404 }
          );
        }

        result = await prisma.strategy.update({
          where: { id: validated.strategyId },
          data: { riskConfig: validated.riskConfig },
        });

        // Invalidate risk config cache
        const { redis } = await import('../../../utils/redis');
        await redis.del(`risk:config:${validated.strategyId}`);

        await prisma.auditLog.create({
          data: {
            actorId: authResult.admin.id,
            actorType: 'admin',
            action: 'UPDATE_RISK_CONFIG',
            resourceType: 'strategy',
            resourceId: validated.strategyId,
            newValue: validated.riskConfig,
          },
        });
        break;
    }

    return NextResponse.json({ message: `Risk action '${validated.action}' completed`, result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Risk action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform risk action' },
      { status: 500 }
    );
  }
}
