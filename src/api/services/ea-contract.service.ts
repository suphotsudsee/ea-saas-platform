// ─── EA Contract Service ──────────────────────────────────────────────────────
// Handles all EA-backend interactions: heartbeat processing, config sync,
// kill switch acknowledgment, and trade event ingestion
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';
import { redis, RedisKeys, RedisTTL } from '../utils/redis';
import { evaluateRiskOnHeartbeat, evaluateRiskOnMetrics } from './risk.service';
import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeartbeatPayload {
  licenseKey: string;
  accountNumber: string;
  platform: 'MT4' | 'MT5';
  eaVersion?: string;
  equity?: number;
  balance?: number;
  openPositions?: number;
  marginLevel?: number;
  serverTime?: string;
}

interface HeartbeatResponse {
  status: 'ok' | 'killed' | 'config_update';
  configHash?: string;
  kill?: boolean;
  killReason?: string;
  message?: string;
}

interface TradeEventPayload {
  licenseKey: string;
  accountNumber: string;
  ticket: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  eventType: 'OPEN' | 'CLOSE' | 'MODIFY' | 'PARTIAL_CLOSE';
  openPrice?: number;
  closePrice?: number;
  volume: number;
  openTime?: string;
  closeTime?: string;
  profit?: number;
  commission?: number;
  swap?: number;
  magicNumber?: number;
  comment?: string;
}

interface MetricsPayload {
  licenseKey: string;
  accountNumber: string;
  equity: number;
  balance: number;
  marginLevel?: number;
  drawdownPct: number;
  openPositions: number;
  freeMargin?: number;
}

interface ConfigResponse {
  configHash: string;
  config: any;
  riskConfig: any;
  killSwitch: boolean;
  killSwitchReason?: string;
}

// ─── Process Heartbeat ────────────────────────────────────────────────────────

export async function processHeartbeat(
  payload: HeartbeatPayload,
  licenseId: string,
  userId: string
): Promise<HeartbeatResponse> {
  // 1. Find or auto-link trading account
  const tradingAccount = await findOrCreateTradingAccount(
    licenseId,
    userId,
    payload.accountNumber,
    payload.platform,
    payload.licenseKey
  );

  if (!tradingAccount) {
    return {
      status: 'killed',
      kill: true,
      message: 'Account not linked or max accounts reached',
    };
  }

  // 2. Store heartbeat in Redis (real-time state)
  const heartbeatKey = RedisKeys.heartbeatState(licenseId, tradingAccount.id);
  const heartbeatData = {
    licenseId,
    tradingAccountId: tradingAccount.id,
    accountNumber: payload.accountNumber,
    platform: payload.platform,
    eaVersion: payload.eaVersion || '',
    equity: String(payload.equity || ''),
    balance: String(payload.balance || ''),
    openPositions: String(payload.openPositions || 0),
    marginLevel: String(payload.marginLevel || ''),
    serverTime: payload.serverTime || '',
    receivedAt: new Date().toISOString(),
  };

  await redis.hset(heartbeatKey,
    'licenseId', heartbeatData.licenseId,
    'tradingAccountId', heartbeatData.tradingAccountId,
    'accountNumber', heartbeatData.accountNumber,
    'platform', heartbeatData.platform,
    'eaVersion', heartbeatData.eaVersion,
    'equity', heartbeatData.equity,
    'balance', heartbeatData.balance,
    'openPositions', heartbeatData.openPositions,
    'marginLevel', heartbeatData.marginLevel,
    'receivedAt', heartbeatData.receivedAt
  );
  await redis.expire(heartbeatKey, RedisTTL.HEARTBEAT_STATE);

  // 3. Push heartbeat to stream for async DB persist
  await redis.xadd(RedisKeys.heartbeatStream(), {
    licenseId,
    tradingAccountId: tradingAccount.id,
    accountNumber: payload.accountNumber,
    platform: payload.platform,
    eaVersion: payload.eaVersion || '',
    equity: String(payload.equity || ''),
    balance: String(payload.balance || ''),
    openPositions: String(payload.openPositions || 0),
    marginLevel: String(payload.marginLevel || ''),
    receivedAt: new Date().toISOString(),
  });

  // 4. Update trading account last heartbeat
  await prisma.tradingAccount.update({
    where: { id: tradingAccount.id },
    data: {
      lastHeartbeatAt: new Date(),
      status: 'ACTIVE',
    },
  });

  // 5. Check kill switch (Redis first for speed, then DB)
  const globalKill = await redis.get(RedisKeys.globalKillSwitch());
  const licenseKill = await redis.get(RedisKeys.killSwitch(licenseId));

  if (globalKill === '1' || licenseKill === '1') {
    const license = await prisma.license.findUnique({ where: { id: licenseId } });
    return {
      status: 'killed',
      kill: true,
      killReason: license?.killSwitchReason || 'Kill switch activated',
    };
  }

  // 6. Get current config hash to check if update is needed
  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    include: { strategy: true },
  });

  const currentConfigHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(license?.strategy.defaultConfig || {}))
    .digest('hex');

  // Check if config version in Redis matches
  const cachedConfigHash = await redis.get(RedisKeys.configVersion(license?.strategyId || ''));
  const configUpdateAvailable = cachedConfigHash && cachedConfigHash !== currentConfigHash;

  // 7. Evaluate risk rules
  const riskResult = await evaluateRiskOnHeartbeat({
    licenseId,
    tradingAccountId: tradingAccount.id,
    equity: payload.equity,
    balance: payload.balance,
    openPositions: payload.openPositions || 0,
    marginLevel: payload.marginLevel,
  });

  if (riskResult.breached) {
    // Risk breach — check if any KILL action was taken
    const killBreaches = riskResult.rules.filter((r) => r.action === 'KILL_EA' || r.action === 'PAUSE_EA');
    if (killBreaches.length > 0) {
      return {
        status: 'killed',
        kill: true,
        killReason: `Risk rule breached: ${killBreaches.map((b) => b.ruleType).join(', ')}`,
      };
    }
  }

  return {
    status: configUpdateAvailable ? 'config_update' : 'ok',
    configHash: configUpdateAvailable ? cachedConfigHash! : currentConfigHash,
    kill: false,
    message: configUpdateAvailable ? 'Configuration update available' : undefined,
  };
}

// ─── Find or Create Trading Account ──────────────────────────────────────────

async function findOrCreateTradingAccount(
  licenseId: string,
  userId: string,
  accountNumber: string,
  platform: string,
  licenseKey: string
) {
  // Check if account is already linked
  let tradingAccount = await prisma.tradingAccount.findFirst({
    where: {
      accountNumber,
      platform: platform as any,
      license: { key: licenseKey },
      status: { not: 'UNLINKED' },
    },
  });

  if (tradingAccount) {
    return tradingAccount;
  }

  // Check if user has auto-link enabled and account limit
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    include: { tradingAccounts: { where: { status: { not: 'UNLINKED' } } } },
  });

  if (!license || !user) return null;

  // Check max accounts limit
  if (license.tradingAccounts.length >= license.maxAccounts) {
    return null; // Max accounts reached
  }

  // Auto-link if enabled
  if (user.autoLinkAccounts) {
    // Get broker name from the platform (EA can provide it separately)
    const brokerName = `Broker-${platform}`;

    try {
      tradingAccount = await prisma.tradingAccount.create({
        data: {
          userId,
          licenseId,
          accountNumber,
          brokerName,
          platform: platform as any,
          status: 'ACTIVE',
          lastHeartbeatAt: new Date(),
        },
      });

      // Notify user about new account
      await redis.xadd(RedisKeys.notificationStream(), {
        userId,
        type: 'ACCOUNT_LINKED',
        title: 'Trading Account Linked',
        message: `Account ${accountNumber} (${platform}) has been automatically linked to your license.`,
      });

      return tradingAccount;
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint — account already exists for another license/broker combo
        return null;
      }
      throw error;
    }
  }

  return null;
}

// ─── Get Current Config ───────────────────────────────────────────────────────

export async function getEAConfig(licenseId: string): Promise<ConfigResponse> {
  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    include: { strategy: true },
  });

  if (!license) throw new Error('License not found');

  const config = license.strategy.defaultConfig as any;
  const riskConfig = license.strategy.riskConfig as any;

  const configHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(config))
    .digest('hex');

  // Update Redis config version
  await redis.set(RedisKeys.configVersion(license.strategyId), configHash);

  return {
    configHash,
    config,
    riskConfig,
    killSwitch: license.killSwitch,
    killSwitchReason: license.killSwitchReason || undefined,
  };
}

// ─── Acknowledge Config ──────────────────────────────────────────────────────

export async function acknowledgeConfig(licenseId: string, configHash: string) {
  // Store acknowledgment in Redis
  const ackKey = `config:ack:${licenseId}`;
  await redis.setex(ackKey, 86400, JSON.stringify({
    configHash,
    acknowledgedAt: new Date().toISOString(),
  }));

  return { acknowledged: true };
}

// ─── Acknowledge Kill Switch ──────────────────────────────────────────────────

export async function acknowledgeKillSwitch(licenseId: string, tradingAccountId: string) {
  // Create audit entry
  await prisma.auditLog.create({
    data: {
      actorId: null,
      actorType: 'ea',
      action: 'KILL_SWITCH_ACKNOWLEDGED',
      resourceType: 'license',
      resourceId: licenseId,
      newValue: { tradingAccountId, acknowledgedAt: new Date().toISOString() },
    },
  });

  return { acknowledged: true };
}

// ─── Process Trade Event ──────────────────────────────────────────────────────

export async function processTradeEvent(
  payload: TradeEventPayload,
  licenseId: string
) {
  // Find trading account
  const tradingAccount = await prisma.tradingAccount.findFirst({
    where: {
      accountNumber: payload.accountNumber,
      licenseId,
      status: { not: 'UNLINKED' },
    },
  });

  if (!tradingAccount) {
    throw new Error('Trading account not found or not linked to this license');
  }

  // Check idempotency — same ticket + license should not be processed twice
  const existing = await prisma.tradeEvent.findUnique({
    where: {
      licenseId_ticket: {
        licenseId,
        ticket: payload.ticket,
      },
    },
  });

  if (existing) {
    return { status: 'duplicate', eventId: existing.id };
  }

  // Push to stream for async processing (fast response for EA)
  await redis.xadd(RedisKeys.tradeEventStream(), {
    licenseId,
    tradingAccountId: tradingAccount.id,
    ticket: payload.ticket,
    symbol: payload.symbol,
    direction: payload.direction,
    eventType: payload.eventType,
    openPrice: String(payload.openPrice || ''),
    closePrice: String(payload.closePrice || ''),
    volume: String(payload.volume),
    openTime: payload.openTime || '',
    closeTime: payload.closeTime || '',
    profit: String(payload.profit || ''),
    commission: String(payload.commission || '0'),
    swap: String(payload.swap || '0'),
    magicNumber: String(payload.magicNumber || ''),
    comment: payload.comment || '',
    receivedAt: new Date().toISOString(),
  });

  // Also persist directly for reliability
  const tradeEvent = await prisma.tradeEvent.create({
    data: {
      licenseId,
      tradingAccountId: tradingAccount.id,
      ticket: payload.ticket,
      symbol: payload.symbol,
      direction: payload.direction as any,
      eventType: payload.eventType as any,
      openPrice: payload.openPrice,
      closePrice: payload.closePrice,
      volume: payload.volume,
      openTime: payload.openTime ? new Date(payload.openTime) : null,
      closeTime: payload.closeTime ? new Date(payload.closeTime) : null,
      profit: payload.profit,
      commission: payload.commission || 0,
      swap: payload.swap || 0,
      magicNumber: payload.magicNumber,
      comment: payload.comment,
    },
  });

  return { status: 'created', eventId: tradeEvent.id };
}

// ─── Process Batch Trade Events ───────────────────────────────────────────────

export async function processBatchTradeEvents(
  events: TradeEventPayload[],
  licenseId: string
) {
  const results = [];
  for (const event of events) {
    try {
      const result = await processTradeEvent(event, licenseId);
      results.push(result);
    } catch (error: any) {
      results.push({ status: 'error', error: error.message, ticket: event.ticket });
    }
  }
  return results;
}

// ─── Process Metrics ──────────────────────────────────────────────────────────

export async function processMetrics(
  payload: MetricsPayload,
  licenseId: string
) {
  const tradingAccount = await prisma.tradingAccount.findFirst({
    where: {
      accountNumber: payload.accountNumber,
      licenseId,
      status: { not: 'UNLINKED' },
    },
  });

  if (!tradingAccount) {
    throw new Error('Trading account not found or not linked to this license');
  }

  // Store metrics in database
  const metric = await prisma.metric.create({
    data: {
      licenseId,
      tradingAccountId: tradingAccount.id,
      equity: payload.equity,
      balance: payload.balance,
      marginLevel: payload.marginLevel,
      drawdownPct: payload.drawdownPct,
      openPositions: payload.openPositions,
      freeMargin: payload.freeMargin,
    },
  });

  // Cache latest metrics in Redis for quick access
  const metricsKey = `metrics:latest:${tradingAccount.id}`;
  await redis.setex(metricsKey, 3600, JSON.stringify({
    equity: payload.equity,
    balance: payload.balance,
    drawdownPct: payload.drawdownPct,
    openPositions: payload.openPositions,
    marginLevel: payload.marginLevel,
    recordedAt: new Date().toISOString(),
  }));

  // Evaluate risk rules on metrics
  await evaluateRiskOnMetrics({
    licenseId,
    tradingAccountId: tradingAccount.id,
    equity: payload.equity,
    balance: payload.balance,
    drawdownPct: payload.drawdownPct,
    openPositions: payload.openPositions,
    marginLevel: payload.marginLevel,
    freeMargin: payload.freeMargin,
  });

  return { status: 'accepted', metricId: metric.id };
}
