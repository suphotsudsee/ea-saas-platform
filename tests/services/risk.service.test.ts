// ─── Risk Service Tests ──────────────────────────────────────────────────────
// Comprehensive tests for risk evaluation engine, breach processing, and dashboard
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/api/lib/prisma', () => ({
  prisma: {
    license: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    riskEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    tradeEvent: {
      findMany: vi.fn(),
    },
    tradingAccount: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    heartbeat: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../../src/api/utils/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    xadd: vi.fn().mockResolvedValue('1-0'),
  },
  RedisKeys: {
    licenseCache: (key: string) => `license:validate:${key}`,
    killSwitch: (id: string) => `kill:${id}`,
    globalKillSwitch: () => 'kill:global',
    notificationStream: () => 'stream:notifications',
  },
  RedisTTL: {},
}));

import { prisma } from '../../src/api/lib/prisma';
import { redis } from '../../src/api/utils/redis';
import {
  evaluateRiskOnHeartbeat,
  evaluateRiskOnMetrics,
  getRiskDashboard,
  resolveRiskEvent,
} from '../../src/api/services/risk.service';

// ─── Test Data ────────────────────────────────────────────────────────────────

const defaultRiskConfig = {
  maxDrawdownPct: 20,
  maxDailyLossPct: 5,
  maxConsecutiveLosses: 5,
  equityProtectionUsd: 1000,
  maxOpenPositions: 10,
  marginLevelPct: 50,
};

const mockLicense = {
  id: 'lic_01',
  key: 'ea-test-key',
  userId: 'user_01',
  subscriptionId: 'sub_01',
  strategyId: 'strat_01',
  status: 'ACTIVE',
  expiresAt: new Date('2027-12-31'),
  maxAccounts: 3,
  killSwitch: false,
  killSwitchReason: null,
  strategy: {
    id: 'strat_01',
    name: 'Scalper Pro',
    version: '2.0',
    defaultConfig: {},
    riskConfig: defaultRiskConfig,
  },
};

// ─── Max Open Positions Rule ──────────────────────────────────────────────────

describe('MAX_POSITIONS risk rule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger breach when open positions exceed threshold', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      openPositions: 15, // exceeds maxOpenPositions: 10
    });

    expect(result.breached).toBe(true);
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].ruleType).toBe('MAX_POSITIONS');
    expect(result.rules[0].action).toBe('KILL_EA');
  });

  it('should not trigger when positions are within limit', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      openPositions: 5,
    });

    const maxPositionsRule = result.rules.find(r => r.ruleType === 'MAX_POSITIONS');
    expect(maxPositionsRule).toBeUndefined();
  });

  it('should not trigger when maxPositions is not configured', async () => {
    const noPositionsConfig = { ...defaultRiskConfig };
    delete noPositionsConfig.maxOpenPositions;

    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(noPositionsConfig));
      return Promise.resolve(null);
    });

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      openPositions: 50,
    });

    const maxPositionsRule = result.rules.find(r => r.ruleType === 'MAX_POSITIONS');
    expect(maxPositionsRule).toBeUndefined();
  });
});

// ─── Equity Protection Rule ───────────────────────────────────────────────────

describe('EQUITY_PROTECTION risk rule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger breach when equity falls below threshold', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      equity: 500, // below equityProtectionUsd: 1000
      openPositions: 1,
    });

    expect(result.breached).toBe(true);
    const equityRule = result.rules.find(r => r.ruleType === 'EQUITY_PROTECTION');
    expect(equityRule).toBeDefined();
    expect(equityRule?.action).toBe('KILL_EA');
  });

  it('should not trigger when equity is above threshold', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      equity: 5000, // above equityProtectionUsd: 1000
      openPositions: 1,
    });

    const equityRule = result.rules.find(r => r.ruleType === 'EQUITY_PROTECTION');
    expect(equityRule).toBeUndefined();
  });

  it('should not trigger when equity is undefined', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      openPositions: 1,
      // equity undefined
    });

    const equityRule = result.rules.find(r => r.ruleType === 'EQUITY_PROTECTION');
    expect(equityRule).toBeUndefined();
  });
});

// ─── Margin Level Rule ──────────────────────────────────────────────────────

describe('MARGIN_LEVEL risk rule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger NOTIFY when margin level falls below threshold', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      marginLevel: 30, // below marginLevelPct: 50
      openPositions: 1,
    });

    const marginRule = result.rules.find(r => r.ruleType === 'MARGIN_LEVEL');
    expect(marginRule).toBeDefined();
    expect(marginRule?.action).toBe('NOTIFY');
  });

  it('should not trigger when margin level is above threshold', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      marginLevel: 80, // above marginLevelPct: 50
      openPositions: 1,
    });

    const marginRule = result.rules.find(r => r.ruleType === 'MARGIN_LEVEL');
    expect(marginRule).toBeUndefined();
  });

  it('should not trigger when margin level is undefined', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      openPositions: 1,
    });

    const marginRule = result.rules.find(r => r.ruleType === 'MARGIN_LEVEL');
    expect(marginRule).toBeUndefined();
  });
});

// ─── Max Drawdown Rule ───────────────────────────────────────────────────────

describe('MAX_DRAWDOWN risk rule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger KILL_EA when drawdown exceeds threshold from metrics', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    const result = await evaluateRiskOnMetrics({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      equity: 8000,
      balance: 10000,
      drawdownPct: 25, // exceeds maxDrawdownPct: 20
      openPositions: 3,
    });

    expect(result.breached).toBe(true);
    const drawdownRule = result.rules.find(r => r.ruleType === 'MAX_DRAWDOWN');
    expect(drawdownRule).toBeDefined();
    expect(drawdownRule?.action).toBe('KILL_EA');
    expect(drawdownRule?.threshold).toBe(20);
    expect(drawdownRule?.actual).toBe(25);
  });

  it('should not trigger when drawdown is within threshold', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    const result = await evaluateRiskOnMetrics({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      equity: 9500,
      balance: 10000,
      drawdownPct: 5, // within maxDrawdownPct: 20
      openPositions: 2,
    });

    const drawdownRule = result.rules.find(r => r.ruleType === 'MAX_DRAWDOWN');
    expect(drawdownRule).toBeUndefined();
  });

  it('should check drawdown from cached metrics in heartbeat', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      if (key.includes('metrics:latest:')) {
        return Promise.resolve(JSON.stringify({ drawdownPct: 25, equity: 8000, balance: 10000 }));
      }
      return Promise.resolve(null);
    });

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      openPositions: 2,
    });

    const drawdownRule = result.rules.find(r => r.ruleType === 'MAX_DRAWDOWN');
    expect(drawdownRule).toBeDefined();
  });
});

// ─── Daily Loss Rule ──────────────────────────────────────────────────────────

describe('DAILY_LOSS risk rule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger KILL_EA when daily loss exceeds percentage threshold', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    // Today's losing trades
    (prisma.tradeEvent.findMany as any).mockResolvedValue([
      { profit: -200 },
      { profit: -150 },
      { profit: -100 },
    ]);
    // Account balance from heartbeat
    (prisma.tradingAccount.findUnique as any).mockResolvedValue({
      id: 'acc_01',
      balance: 9000,
    });
    (prisma.heartbeat.findFirst as any).mockResolvedValue({
      balance: 9000,
    });

    // Total loss: -450, which is 5% of 9000 => triggers maxDailyLossPct: 5
    (prisma.riskEvent.create as any).mockResolvedValue({ id: 'evt_01' });
    (prisma.license.update as any).mockResolvedValue({ ...mockLicense, killSwitch: true });
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      openPositions: 2,
    });

    const dailyLossRule = result.rules.find(r => r.ruleType === 'DAILY_LOSS');
    expect(dailyLossRule).toBeDefined();
    expect(dailyLossRule?.action).toBe('KILL_EA');
  });
});

// ─── Consecutive Losses Rule ──────────────────────────────────────────────────

describe('CONSECUTIVE_LOSSES risk rule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger PAUSE_EA when consecutive losses exceed threshold', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    // 6 consecutive losses (exceeds maxConsecutiveLosses: 5)
    (prisma.tradeEvent.findMany as any).mockResolvedValue([
      { profit: -50 },
      { profit: -30 },
      { profit: -80 },
      { profit: -20 },
      { profit: -40 },
      { profit: -60 },
    ]);
    (prisma.riskEvent.create as any).mockResolvedValue({ id: 'evt_01' });
    (prisma.license.update as any).mockResolvedValue({ ...mockLicense, killSwitch: true });
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      openPositions: 2,
    });

    const consecutiveRule = result.rules.find(r => r.ruleType === 'CONSECUTIVE_LOSSES');
    expect(consecutiveRule).toBeDefined();
    expect(consecutiveRule?.action).toBe('PAUSE_EA');
  });

  it('should not trigger when losses are not consecutive', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    // Alternating wins and losses
    (prisma.tradeEvent.findMany as any).mockResolvedValue([
      { profit: -50 },
      { profit: 100 },  // Win breaks the streak
      { profit: -30 },
      { profit: -40 },
      { profit: -20 },
    ]);

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      openPositions: 2,
    });

    const consecutiveRule = result.rules.find(r => r.ruleType === 'CONSECUTIVE_LOSSES');
    expect(consecutiveRule).toBeUndefined();
  });
});

// ─── Multiple Breaches ────────────────────────────────────────────────────────

describe('multiple simultaneous breaches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should report all breached rules at once', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    (prisma.riskEvent.create as any).mockResolvedValue({ id: 'evt_01' });
    (prisma.license.update as any).mockResolvedValue({ ...mockLicense, killSwitch: true });
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    // Both equity below threshold AND too many positions
    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      equity: 500, // below equityProtectionUsd: 1000
      openPositions: 15, // exceeds maxOpenPositions: 10
      marginLevel: 30, // below marginLevelPct: 50
    });

    expect(result.breached).toBe(true);
    expect(result.rules.length).toBeGreaterThanOrEqual(2);

    const ruleTypes = result.rules.map(r => r.ruleType);
    expect(ruleTypes).toContain('MAX_POSITIONS');
    expect(ruleTypes).toContain('EQUITY_PROTECTION');
    expect(ruleTypes).toContain('MARGIN_LEVEL');
  });

  it('should not breach when all values are within limits', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    (prisma.tradeEvent.findMany as any).mockResolvedValue([]); // No losing trades

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      equity: 5000, // well above threshold
      openPositions: 3, // within limit
      marginLevel: 150, // well above threshold
      balance: 10000,
    });

    expect(result.breached).toBe(false);
    expect(result.rules).toHaveLength(0);
  });
});

// ─── Risk Config Loading ──────────────────────────────────────────────────────

describe('risk config loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use cached config from Redis when available', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });

    (prisma.riskEvent.create as any).mockResolvedValue({ id: 'evt_01' });
    (prisma.license.update as any).mockResolvedValue({ ...mockLicense, killSwitch: true });

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      equity: 500, // breach threshold
      openPositions: 1,
    });

    // Should not query Prisma for config when Redis cache hit
    expect(prisma.license.findUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lic_01' } })
    );
  });

  it('should fall back to database when Redis cache miss', async () => {
    (redis.get as any).mockResolvedValue(null); // Cache miss
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);
    (prisma.riskEvent.create as any).mockResolvedValue({ id: 'evt_01' });

    await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      openPositions: 1,
    });

    expect(prisma.license.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lic_01' },
      })
    );
  });

  it('should return empty config when license not found', async () => {
    (redis.get as any).mockResolvedValue(null); // Cache miss
    (prisma.license.findUnique as any).mockResolvedValue(null);

    const result = await evaluateRiskOnHeartbeat({
      licenseId: 'nonexistent',
      tradingAccountId: 'acc_01',
      openPositions: 50, // Would breach any rule, but no config means no rules
    });

    // No rules configured means no breaches
    expect(result.breached).toBe(false);
    expect(result.rules).toHaveLength(0);
  });
});

// ─── Process Risk Breaches ────────────────────────────────────────────────────

describe('processRiskBreaches (side effects)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set kill switch on license for KILL_EA action', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });
    (prisma.riskEvent.create as any).mockResolvedValue({ id: 'evt_01' });
    (prisma.license.update as any).mockResolvedValue({ ...mockLicense, killSwitch: true });
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      equity: 500, // Triggers equity protection
      openPositions: 1,
    });

    expect(prisma.license.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          killSwitch: true,
        }),
      })
    );
    expect(redis.set).toHaveBeenCalledWith(expect.stringContaining('kill:'), '1');
  });

  it('should queue notification for the user on breach', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });
    (prisma.riskEvent.create as any).mockResolvedValue({ id: 'evt_01' });
    (prisma.license.update as any).mockResolvedValue({ ...mockLicense, killSwitch: true });
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    await evaluateRiskOnHeartbeat({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      equity: 500,
      openPositions: 1,
    });

    expect(redis.xadd).toHaveBeenCalledWith(
      'stream:notifications',
      expect.objectContaining({
        type: 'RISK_ALERT',
      })
    );
  });
});

// ─── Metrics-based Risk Evaluation ───────────────────────────────────────────

describe('evaluateRiskOnMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger drawdown breach from metrics', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });
    (prisma.riskEvent.create as any).mockResolvedValue({ id: 'evt_01' });
    (prisma.license.update as any).mockResolvedValue({ ...mockLicense, killSwitch: true });
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const result = await evaluateRiskOnMetrics({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      equity: 7500,
      balance: 10000,
      drawdownPct: 25, // exceeds maxDrawdownPct: 20
      openPositions: 3,
    });

    expect(result.breached).toBe(true);
    const drawdownRule = result.rules.find(r => r.ruleType === 'MAX_DRAWDOWN');
    expect(drawdownRule).toBeDefined();
    expect(drawdownRule?.action).toBe('KILL_EA');
  });

  it('should trigger equity protection from metrics', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });
    (prisma.riskEvent.create as any).mockResolvedValue({ id: 'evt_01' });
    (prisma.license.update as any).mockResolvedValue({ ...mockLicense, killSwitch: true });
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const result = await evaluateRiskOnMetrics({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      equity: 500, // below equityProtectionUsd: 1000
      balance: 10000,
      drawdownPct: 5,
      openPositions: 2,
    });

    const equityRule = result.rules.find(r => r.ruleType === 'EQUITY_PROTECTION');
    expect(equityRule).toBeDefined();
  });

  it('should trigger margin level from metrics', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('risk:config:')) return Promise.resolve(JSON.stringify(defaultRiskConfig));
      return Promise.resolve(null);
    });
    (prisma.riskEvent.create as any).mockResolvedValue({ id: 'evt_01' });

    const result = await evaluateRiskOnMetrics({
      licenseId: 'lic_01',
      tradingAccountId: 'acc_01',
      equity: 5000,
      balance: 10000,
      drawdownPct: 5,
      openPositions: 3,
      marginLevel: 30, // below marginLevelPct: 50
    });

    const marginRule = result.rules.find(r => r.ruleType === 'MARGIN_LEVEL');
    expect(marginRule).toBeDefined();
    expect(marginRule?.action).toBe('NOTIFY');
  });
});

// ─── Risk Dashboard ───────────────────────────────────────────────────────────

describe('getRiskDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return recent risk events, killed licenses, and stale accounts', async () => {
    (prisma.riskEvent.findMany as any).mockResolvedValue([]);
    (prisma.license.findMany as any).mockResolvedValue([]);
    (prisma.tradingAccount.findMany as any).mockResolvedValue([]);

    const result = await getRiskDashboard();

    expect(result).toHaveProperty('recentRiskEvents');
    expect(result).toHaveProperty('killedLicenses');
    expect(result).toHaveProperty('staleAccounts');
  });

  it('should query unresolved risk events', async () => {
    (prisma.riskEvent.findMany as any).mockResolvedValue([]);
    (prisma.license.findMany as any).mockResolvedValue([]);
    (prisma.tradingAccount.findMany as any).mockResolvedValue([]);

    await getRiskDashboard();

    expect(prisma.riskEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { resolvedAt: null },
      })
    );
  });

  it('should query licenses with kill switch active', async () => {
    (prisma.riskEvent.findMany as any).mockResolvedValue([]);
    (prisma.license.findMany as any).mockResolvedValue([]);
    (prisma.tradingAccount.findMany as any).mockResolvedValue([]);

    await getRiskDashboard();

    expect(prisma.license.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { killSwitch: true },
      })
    );
  });
});

// ─── Resolve Risk Event ──────────────────────────────────────────────────────

describe('resolveRiskEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark risk event as resolved and create audit log', async () => {
    const resolvedEvent = {
      id: 'evt_01',
      ruleType: 'MAX_DRAWDOWN',
      resolvedAt: new Date(),
      resolvedBy: 'admin_01',
    };

    (prisma.riskEvent.update as any).mockResolvedValue(resolvedEvent);

    const result = await resolveRiskEvent('evt_01', 'admin_01');

    expect(result.resolvedAt).toBeDefined();
    expect(prisma.riskEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'evt_01' },
        data: {
          resolvedAt: expect.any(Date),
          resolvedBy: 'admin_01',
        },
      })
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'admin_01',
          action: 'RESOLVE_RISK_EVENT',
        }),
      })
    );
  });
});