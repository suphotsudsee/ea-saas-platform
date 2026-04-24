// ─── Risk Service ─────────────────────────────────────────────────────────────
// Risk rules engine: evaluates heartbeats, metrics, and trade events
// against configured risk thresholds and triggers actions on breaches
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';
import { redis, RedisKeys } from '../utils/redis';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskConfig {
  maxDrawdownPct?: number;
  maxDailyLossPct?: number;
  maxConsecutiveLosses?: number;
  equityProtectionUsd?: number;
  maxOpenPositions?: number;
  marginLevelPct?: number;
  spreadFilter?: Record<string, number>;
  sessionFilter?: {
    enabled: boolean;
    sessions: Array<{ name: string; startHour: number; endHour: number }>;
  };
}

interface HeartbeatData {
  licenseId: string;
  tradingAccountId: string;
  equity?: number;
  balance?: number;
  openPositions: number;
  marginLevel?: number;
}

interface MetricsData {
  licenseId: string;
  tradingAccountId: string;
  equity: number;
  balance: number;
  drawdownPct: number;
  openPositions: number;
  marginLevel?: number;
  freeMargin?: number;
}

interface RiskEvaluationResult {
  breached: boolean;
  rules: Array<{
    ruleType: string;
    threshold: number;
    actual: number;
    action: string;
  }>;
}

// ─── Risk Evaluation ──────────────────────────────────────────────────────────

/**
 * Evaluate all risk rules against current heartbeat data.
 * Returns which rules are breached and what actions should be taken.
 */
export async function evaluateRiskOnHeartbeat(
  heartbeat: HeartbeatData
): Promise<RiskEvaluationResult> {
  const riskConfig = await getRiskConfig(heartbeat.licenseId);
  const breaches: RiskEvaluationResult['rules'] = [];

  // ─── Max Open Positions ──────────────────────────────────────────────
  if (riskConfig.maxOpenPositions !== undefined && heartbeat.openPositions > riskConfig.maxOpenPositions) {
    breaches.push({
      ruleType: 'MAX_POSITIONS',
      threshold: riskConfig.maxOpenPositions,
      actual: heartbeat.openPositions,
      action: 'KILL_EA',
    });
  }

  // ─── Equity Protection ───────────────────────────────────────────────
  if (riskConfig.equityProtectionUsd !== undefined && heartbeat.equity !== undefined) {
    if (heartbeat.equity < riskConfig.equityProtectionUsd) {
      breaches.push({
        ruleType: 'EQUITY_PROTECTION',
        threshold: riskConfig.equityProtectionUsd,
        actual: heartbeat.equity,
        action: 'KILL_EA',
      });
    }
  }

  // ─── Margin Level ────────────────────────────────────────────────────
  if (riskConfig.marginLevelPct !== undefined && heartbeat.marginLevel !== undefined) {
    if (heartbeat.marginLevel < riskConfig.marginLevelPct) {
      breaches.push({
        ruleType: 'MARGIN_LEVEL',
        threshold: riskConfig.marginLevelPct,
        actual: heartbeat.marginLevel,
        action: 'NOTIFY',
      });
    }
  }

  // ─── Drawdown (from latest metrics) ──────────────────────────────────
  if (riskConfig.maxDrawdownPct !== undefined) {
    const metricsKey = `metrics:latest:${heartbeat.tradingAccountId}`;
    const latestMetrics = await redis.get(metricsKey);
    if (latestMetrics) {
      const metrics = JSON.parse(latestMetrics);
      if (metrics.drawdownPct >= riskConfig.maxDrawdownPct) {
        breaches.push({
          ruleType: 'MAX_DRAWDOWN',
          threshold: riskConfig.maxDrawdownPct,
          actual: metrics.drawdownPct,
          action: 'KILL_EA',
        });
      }
    }
  }

  // ─── Daily Loss ──────────────────────────────────────────────────────
  if (riskConfig.maxDailyLossPct !== undefined) {
    const dailyLoss = await calculateDailyLoss(heartbeat.tradingAccountId, heartbeat.licenseId);
    if (dailyLoss.pct !== null && dailyLoss.pct <= -riskConfig.maxDailyLossPct) {
      breaches.push({
        ruleType: 'DAILY_LOSS',
        threshold: riskConfig.maxDailyLossPct,
        actual: Math.abs(dailyLoss.pct),
        action: 'KILL_EA',
      });
    }
  }

  // ─── Consecutive Losses ──────────────────────────────────────────────
  if (riskConfig.maxConsecutiveLosses !== undefined) {
    const consecutiveLosses = await getConsecutiveLosses(heartbeat.tradingAccountId, heartbeat.licenseId);
    if (consecutiveLosses >= riskConfig.maxConsecutiveLosses) {
      breaches.push({
        ruleType: 'CONSECUTIVE_LOSSES',
        threshold: riskConfig.maxConsecutiveLosses,
        actual: consecutiveLosses,
        action: 'PAUSE_EA',
      });
    }
  }

  // ─── Process Breaches ─────────────────────────────────────────────────
  if (breaches.length > 0) {
    await processRiskBreaches(heartbeat.licenseId, heartbeat.tradingAccountId, breaches);
  }

  return {
    breached: breaches.length > 0,
    rules: breaches,
  };
}

/**
 * Evaluate risk rules against metrics data
 */
export async function evaluateRiskOnMetrics(metrics: MetricsData): Promise<RiskEvaluationResult> {
  const riskConfig = await getRiskConfig(metrics.licenseId);
  const breaches: RiskEvaluationResult['rules'] = [];

  // ─── Max Drawdown ────────────────────────────────────────────────────
  if (riskConfig.maxDrawdownPct !== undefined && metrics.drawdownPct >= riskConfig.maxDrawdownPct) {
    breaches.push({
      ruleType: 'MAX_DRAWDOWN',
      threshold: riskConfig.maxDrawdownPct,
      actual: metrics.drawdownPct,
      action: 'KILL_EA',
    });
  }

  // ─── Equity Protection ───────────────────────────────────────────────
  if (riskConfig.equityProtectionUsd !== undefined && metrics.equity < riskConfig.equityProtectionUsd) {
    breaches.push({
      ruleType: 'EQUITY_PROTECTION',
      threshold: riskConfig.equityProtectionUsd,
      actual: metrics.equity,
      action: 'KILL_EA',
    });
  }

  // ─── Margin Level ────────────────────────────────────────────────────
  if (riskConfig.marginLevelPct !== undefined && metrics.marginLevel !== undefined) {
    if (metrics.marginLevel < riskConfig.marginLevelPct) {
      breaches.push({
        ruleType: 'MARGIN_LEVEL',
        threshold: riskConfig.marginLevelPct,
        actual: metrics.marginLevel,
        action: 'NOTIFY',
      });
    }
  }

  if (breaches.length > 0) {
    await processRiskBreaches(metrics.licenseId, metrics.tradingAccountId, breaches);
  }

  return {
    breached: breaches.length > 0,
    rules: breaches,
  };
}

// ─── Process Breaches ─────────────────────────────────────────────────────────

async function processRiskBreaches(
  licenseId: string,
  tradingAccountId: string,
  breaches: RiskEvaluationResult['rules']
): Promise<void> {
  for (const breach of breaches) {
    // Create risk event in database
    await prisma.riskEvent.create({
      data: {
        licenseId,
        tradingAccountId,
        ruleType: breach.ruleType as any,
        thresholdValue: breach.threshold,
        actualValue: breach.actual,
        actionTaken: breach.action,
      },
    });

    // If action is KILL_EA, set kill switch
    if (breach.action === 'KILL_EA') {
      await prisma.license.update({
        where: { id: licenseId },
        data: {
          killSwitch: true,
          killSwitchReason: `Risk rule breached: ${breach.ruleType}`,
          killSwitchAt: new Date(),
        },
      });

      // Set in Redis for fast lookup
      await redis.set(RedisKeys.killSwitch(licenseId), '1');

      // Invalidate license cache
      const license = await prisma.license.findUnique({ where: { id: licenseId } });
      if (license) {
        await redis.del(RedisKeys.licenseCache(license.key));
      }
    }

    // If action is PAUSE_EA, set kill switch (same as kill for now — EA stops opening new trades)
    if (breach.action === 'PAUSE_EA') {
      await prisma.license.update({
        where: { id: licenseId },
        data: {
          killSwitch: true,
          killSwitchReason: `Risk rule breached: ${breach.ruleType}`,
          killSwitchAt: new Date(),
        },
      });

      await redis.set(RedisKeys.killSwitch(licenseId), '1');

      const license = await prisma.license.findUnique({ where: { id: licenseId } });
      if (license) {
        await redis.del(RedisKeys.licenseCache(license.key));
      }
    }

    // Queue notification
    const license = await prisma.license.findUnique({
      where: { id: licenseId },
      select: { userId: true },
    });

    if (license) {
      await redis.xadd(RedisKeys.notificationStream(), {
        userId: license.userId,
        type: 'RISK_ALERT',
        title: `Risk Alert: ${breach.ruleType.replace(/_/g, ' ')}`,
        message: `Threshold: ${breach.threshold}, Actual: ${breach.actual}. Action: ${breach.action}`,
        licenseId,
      });
    }
  }
}

// ─── Get Risk Config ──────────────────────────────────────────────────────────

async function getRiskConfig(licenseId: string): Promise<RiskConfig> {
  // Check Redis cache first
  const cacheKey = `risk:config:${licenseId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Get license's strategy risk config
  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    include: { strategy: true },
  });

  if (!license || !license.strategy) {
    return {};
  }

  // Parse the risk config from strategy
  const baseConfig = license.strategy.riskConfig as RiskConfig;

  // Cache for 10 minutes
  await redis.setex(cacheKey, 600, JSON.stringify(baseConfig));

  return baseConfig;
}

// ─── Calculate Daily Loss ─────────────────────────────────────────────────────

async function calculateDailyLoss(
  tradingAccountId: string,
  licenseId: string
): Promise<{ amount: number; pct: number | null }> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const trades = await prisma.tradeEvent.findMany({
    where: {
      tradingAccountId,
      licenseId,
      eventType: 'CLOSE',
      closeTime: { gte: todayStart },
    },
    select: { profit: true },
  });

  const totalPnl = trades.reduce((sum, t) => sum + (t.profit || 0), 0);

  // Get starting equity for percentage calculation
  const account = await prisma.tradingAccount.findUnique({
    where: { id: tradingAccountId },
  });

  let pct: number | null = null;
  if (account) {
    const latestHeartbeat = await prisma.heartbeat.findFirst({
      where: { tradingAccountId },
      orderBy: { receivedAt: 'desc' },
      select: { balance: true },
    });

    if (latestHeartbeat?.balance && latestHeartbeat.balance > 0) {
      pct = (totalPnl / latestHeartbeat.balance) * 100;
    }
  }

  return { amount: totalPnl, pct };
}

// ─── Get Consecutive Losses ───────────────────────────────────────────────────

async function getConsecutiveLosses(tradingAccountId: string, licenseId: string): Promise<number> {
  const recentTrades = await prisma.tradeEvent.findMany({
    where: {
      tradingAccountId,
      licenseId,
      eventType: 'CLOSE',
      profit: { not: null },
    },
    orderBy: { closeTime: 'desc' },
    take: 20, // Check last 20 trades for consecutive losses
    select: { profit: true },
  });

  let consecutiveLosses = 0;
  for (const trade of recentTrades) {
    if ((trade.profit || 0) < 0) {
      consecutiveLosses++;
    } else {
      break;
    }
  }

  return consecutiveLosses;
}

// ─── Get Risk Dashboard Data ─────────────────────────────────────────────────

export async function getRiskDashboard() {
  const globalKillValue = await redis.get(RedisKeys.globalKillSwitch());
  const globalKillSwitch = globalKillValue === '1';
  const latestGlobalKillAudit = await prisma.auditLog.findFirst({
    where: {
      resourceType: 'system',
      resourceId: 'global',
      action: {
        in: ['GLOBAL_KILL_SWITCH_ACTIVATE', 'GLOBAL_KILL_SWITCH_DEACTIVATE'],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get accounts near drawdown limits
  const recentRiskEvents = await prisma.riskEvent.findMany({
    where: { resolvedAt: null },
    include: {
      license: {
        select: {
          id: true,
          key: true,
          userId: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      tradingAccount: {
        select: { id: true, accountNumber: true, brokerName: true, platform: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Get licenses with kill switch active
  const killedLicenses = await prisma.license.findMany({
    where: { killSwitch: true },
    include: {
      user: { select: { id: true, name: true, email: true } },
      strategy: { select: { id: true, name: true } },
      tradingAccounts: {
        where: { status: { not: 'UNLINKED' } },
        select: { id: true, accountNumber: true, brokerName: true, platform: true },
      },
    },
  });

  // Get stale heartbeats (no heartbeat for > 3x interval)
  const staleThresholdMs = parseInt(process.env.HEARTBEAT_STALE_FACTOR || '3') *
                            parseInt(process.env.HEARTBEAT_INTERVAL_SEC || '60') * 1000;
  const staleThreshold = new Date(Date.now() - staleThresholdMs);

  const staleAccounts = await prisma.tradingAccount.findMany({
    where: {
      status: 'ACTIVE',
      lastHeartbeatAt: { lt: staleThreshold },
    },
    include: {
      license: {
        select: { id: true, key: true, strategy: { select: { name: true } } },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const totalActiveAccounts = await prisma.tradingAccount.count({
    where: {
      status: 'ACTIVE',
    },
  });

  const criticalAccountIds = new Set<string>();
  const warningAccountIds = new Set<string>();

  for (const event of recentRiskEvents) {
    const gap = event.actualValue - event.thresholdValue;
    if (gap >= 5) {
      criticalAccountIds.add(event.tradingAccount.id);
      warningAccountIds.delete(event.tradingAccount.id);
    } else if (!criticalAccountIds.has(event.tradingAccount.id)) {
      warningAccountIds.add(event.tradingAccount.id);
    }
  }

  for (const account of staleAccounts) {
    if (!criticalAccountIds.has(account.id)) {
      warningAccountIds.add(account.id);
    }
  }

  for (const license of killedLicenses) {
    for (const account of license.tradingAccounts) {
      criticalAccountIds.add(account.id);
      warningAccountIds.delete(account.id);
    }
  }

  const criticalAccounts = criticalAccountIds.size;
  const warningAccounts = warningAccountIds.size;
  const healthyAccounts = Math.max(0, totalActiveAccounts - criticalAccounts - warningAccounts);

  return {
    globalKillSwitch,
    globalKillReason:
      globalKillSwitch && latestGlobalKillAudit?.action === 'GLOBAL_KILL_SWITCH_ACTIVATE'
        ? ((latestGlobalKillAudit.newValue as { reason?: string } | null)?.reason || null)
        : null,
    summary: {
      totalActiveAccounts,
      criticalAccounts,
      warningAccounts,
      healthyAccounts,
    },
    recentRiskEvents,
    killedLicenses,
    staleAccounts,
  };
}

// ─── Resolve Risk Event ───────────────────────────────────────────────────────

export async function resolveRiskEvent(riskEventId: string, adminId: string) {
  const riskEvent = await prisma.riskEvent.update({
    where: { id: riskEventId },
    data: {
      resolvedAt: new Date(),
      resolvedBy: adminId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'admin',
      action: 'RESOLVE_RISK_EVENT',
      resourceType: 'risk_event',
      resourceId: riskEventId,
    },
  });

  return riskEvent;
}
