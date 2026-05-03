// ─── EA Contract Service Tests ──────────────────────────────────────────────
// Comprehensive tests for heartbeat processing, config sync, kill switch ack, 
// trade events, and metrics processing
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/api/lib/prisma', () => ({
  prisma: {
    tradingAccount: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    license: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    tradeEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    metric: {
      create: vi.fn(),
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
    hset: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(true),
    xadd: vi.fn().mockResolvedValue('1-0'),
  },
  RedisKeys: {
    heartbeatState: (lId: string, aId: string) => `heartbeat:${lId}:${aId}`,
    heartbeatStream: () => 'stream:heartbeat-persist',
    killSwitch: (id: string) => `kill:${id}`,
    globalKillSwitch: () => 'kill:global',
    configVersion: (id: string) => `config:current:${id}`,
    notificationStream: () => 'stream:notifications',
    tradeEventStream: () => 'stream:trade-events',
  },
  RedisTTL: {
    HEARTBEAT_STATE: 180,
  },
}));

vi.mock('../../src/api/services/risk.service', () => ({
  evaluateRiskOnHeartbeat: vi.fn().mockResolvedValue({ breached: false, rules: [] }),
  evaluateRiskOnMetrics: vi.fn().mockResolvedValue({ breached: false, rules: [] }),
}));

import { prisma } from '../../src/api/lib/prisma';
import { redis } from '../../src/api/utils/redis';
import {
  processHeartbeat,
  getEAConfig,
  acknowledgeConfig,
  acknowledgeKillSwitch,
  processTradeEvent,
  processBatchTradeEvents,
  processMetrics,
  findOrCreateTradingAccount,
} from '../../src/api/services/ea-contract.service';

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockTradingAccount = {
  id: 'acc_01',
  userId: 'user_01',
  licenseId: 'lic_01',
  accountNumber: '123456',
  brokerName: 'TestBroker',
  platform: 'MT5',
  status: 'ACTIVE',
  lastHeartbeatAt: new Date(),
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
    defaultConfig: { lotSize: 0.1, stopLoss: 50, takeProfit: 100 },
    riskConfig: { maxDrawdownPct: 20, maxDailyLossPct: 5 },
  },
};

const mockUser = {
  id: 'user_01',
  email: 'trader@example.com',
  name: 'Test Trader',
  autoLinkAccounts: true,
};

// ─── Heartbeat Processing ─────────────────────────────────────────────────────

describe('processHeartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful heartbeat', () => {
    it('should return ok status for valid heartbeat with matching config', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue({
        ...mockTradingAccount,
        lastHeartbeatAt: new Date(),
        status: 'ACTIVE',
      });
      (redis.get as any).mockResolvedValue(null);
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          equity: 10000,
          balance: 10500,
          openPositions: 3,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('ok');
      expect(result.kill).toBe(false);
      expect(result.configHash).toBeDefined();
    });

    it('should store heartbeat data in Redis hash', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockResolvedValue(null);
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          equity: 10500,
          balance: 10000,
          openPositions: 2,
          marginLevel: 200,
          eaVersion: '2.0.1',
          serverTime: '2026-01-15T10:30:00Z',
        },
        'lic_01',
        'user_01'
      );

      expect(redis.hset).toHaveBeenCalledWith(
        expect.stringContaining('heartbeat:'),
        expect.any(String), // licenseId
        expect.any(String), // tradingAccountId
        '123456', // accountNumber
        expect.any(String),
        'MT5', // platform
        expect.any(String),
        '10500', // equity
        '10000', // balance
        '2', // openPositions
        '200', // marginLevel
        expect.any(String)
      );
      expect(redis.expire).toHaveBeenCalled();
    });

    it('should push heartbeat to Redis stream for async DB persist', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockResolvedValue(null);
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          openPositions: 2,
        },
        'lic_01',
        'user_01'
      );

      expect(redis.xadd).toHaveBeenCalledWith(
        'stream:heartbeat-persist',
        expect.objectContaining({
          licenseId: 'lic_01',
          accountNumber: '123456',
        })
      );
    });

    it('should update trading account status to ACTIVE', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockResolvedValue(null);
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(prisma.tradingAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'acc_01' },
          data: expect.objectContaining({
            status: 'ACTIVE',
            lastHeartbeatAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('kill switch handling in heartbeat', () => {
    it('should return killed when license kill switch is active in Redis', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockImplementation((key: string) => {
        if (key.includes('kill:lic_01')) return Promise.resolve('1');
        return Promise.resolve(null);
      });
      (prisma.license.findUnique as any).mockResolvedValue({
        ...mockLicense,
        killSwitchReason: 'Risk breach',
      });

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('killed');
      expect(result.kill).toBe(true);
      expect(result.killReason).toContain('Risk breach');
    });

    it('should return killed when global kill switch is active', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockImplementation((key: string) => {
        if (key === 'kill:global') return Promise.resolve('1');
        return Promise.resolve(null);
      });
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('killed');
      expect(result.kill).toBe(true);
    });

    it('should check Redis kill flags before database', async () => {
      // This tests that the heartbeat checks Redis first for speed
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockImplementation((key: string) => {
        if (key.includes('kill:')) return Promise.resolve('1');
        return Promise.resolve(null);
      });
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('killed');
    });
  });

  describe('config update detection', () => {
    it('should return config_update when config hash differs from cached', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockImplementation((key: string) => {
        if (key.includes('config:current:')) return Promise.resolve('old-hash');
        return Promise.resolve(null);
      });
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('config_update');
      expect(result.configHash).toBe('old-hash');
      expect(result.message).toContain('Configuration update');
    });

    it('should return ok when config hash matches cached', async () => {
      const currentHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(mockLicense.strategy.defaultConfig))
        .digest('hex');

      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockImplementation((key: string) => {
        if (key.includes('config:current:')) return Promise.resolve(currentHash);
        return Promise.resolve(null);
      });
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('ok');
    });
  });

  describe('risk evaluation on heartbeat', () => {
    it('should evaluate risk rules on each heartbeat', async () => {
      const { evaluateRiskOnHeartbeat } = await import('../../src/api/services/risk.service');

      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockResolvedValue(null);
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(evaluateRiskOnHeartbeat).toHaveBeenCalled();
    });

    it('should return killed when risk evaluation triggers KILL_EA', async () => {
      const { evaluateRiskOnHeartbeat } = await import('../../src/api/services/risk.service');
      (evaluateRiskOnHeartbeat as any).mockResolvedValueOnce({
        breached: true,
        rules: [{ ruleType: 'EQUITY_PROTECTION', threshold: 1000, actual: 500, action: 'KILL_EA' }],
      });

      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockResolvedValue(null);
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          equity: 500,
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('killed');
      expect(result.kill).toBe(true);
      expect(result.killReason).toContain('EQUITY_PROTECTION');
    });

    it('should return killed when risk evaluation triggers PAUSE_EA', async () => {
      const { evaluateRiskOnHeartbeat } = await import('../../src/api/services/risk.service');
      (evaluateRiskOnHeartbeat as any).mockResolvedValueOnce({
        breached: true,
        rules: [{ ruleType: 'CONSECUTIVE_LOSSES', threshold: 5, actual: 7, action: 'PAUSE_EA' }],
      });

      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockResolvedValue(null);
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('killed');
      expect(result.kill).toBe(true);
    });
  });
});

// ─── Find or Create Trading Account ────────────────────────────────────────────

describe('findOrCreateTradingAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return existing account if already linked', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);

    const result = await findOrCreateTradingAccount(
      'lic_01', 'user_01', '123456', 'MT5', 'ea-test-key'
    );

    expect(result).toEqual(mockTradingAccount);
    expect(prisma.tradingAccount.create).not.toHaveBeenCalled();
  });

  it('should return null when max accounts reached', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(null);
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      tradingAccounts: [
        { id: 'acc_01', status: 'ACTIVE' },
        { id: 'acc_02', status: 'ACTIVE' },
        { id: 'acc_03', status: 'ACTIVE' },
      ],
      maxAccounts: 3,
    });

    const result = await findOrCreateTradingAccount(
      'lic_01', 'user_01', '999999', 'MT5', 'ea-test-key'
    );

    expect(result).toBeNull();
  });

  it('should auto-link account when auto-link is enabled', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(null);
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      tradingAccounts: [],
      maxAccounts: 3,
    });
    (prisma.tradingAccount.create as any).mockResolvedValue(mockTradingAccount);

    const result = await findOrCreateTradingAccount(
      'lic_01', 'user_01', '123456', 'MT5', 'ea-test-key'
    );

    expect(result).toEqual(mockTradingAccount);
    expect(prisma.tradingAccount.create).toHaveBeenCalled();
    expect(redis.xadd).toHaveBeenCalledWith(
      'stream:notifications',
      expect.objectContaining({
        type: 'ACCOUNT_LINKED',
      })
    );
  });

  it('should not auto-link when user has auto-link disabled', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(null);
    (prisma.user.findUnique as any).mockResolvedValue({ ...mockUser, autoLinkAccounts: false });
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      tradingAccounts: [],
    });

    const result = await findOrCreateTradingAccount(
      'lic_01', 'user_01', '999999', 'MT5', 'ea-test-key'
    );

    expect(result).toBeNull();
  });

  it('should handle unique constraint violation gracefully', async () => {
    const uniqueError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(null);
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      tradingAccounts: [],
      maxAccounts: 3,
    });
    (prisma.tradingAccount.create as any).mockRejectedValue(uniqueError);

    const result = await findOrCreateTradingAccount(
      'lic_01', 'user_01', '123456', 'MT5', 'ea-test-key'
    );

    expect(result).toBeNull();
  });

  it('should exclude UNLINKED accounts from active count', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(null);
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      tradingAccounts: [
        { id: 'acc_01', status: 'ACTIVE' },
        { id: 'acc_02', status: 'UNLINKED' }, // Should not count
      ],
      maxAccounts: 2,
    });
    (prisma.tradingAccount.create as any).mockResolvedValue(mockTradingAccount);

    const result = await findOrCreateTradingAccount(
      'lic_01', 'user_01', '999999', 'MT5', 'ea-test-key'
    );

    // Only 1 active account, max is 2, so should auto-link
    expect(result).toEqual(mockTradingAccount);
  });
});

// ─── Get EA Config ────────────────────────────────────────────────────────────

describe('getEAConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return config, riskConfig, and hash for a license', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const result = await getEAConfig('lic_01');

    expect(result.config).toEqual(mockLicense.strategy.defaultConfig);
    expect(result.riskConfig).toEqual(mockLicense.strategy.riskConfig);
    expect(result.configHash).toBeDefined();
    expect(result.killSwitch).toBe(false);
  });

  it('should compute correct SHA-256 config hash', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const result = await getEAConfig('lic_01');

    const expectedHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(mockLicense.strategy.defaultConfig))
      .digest('hex');

    expect(result.configHash).toBe(expectedHash);
  });

  it('should store config hash in Redis', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    await getEAConfig('lic_01');

    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('config:current:'),
      expect.any(String)
    );
  });

  it('should throw error for non-existent license', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(null);

    await expect(getEAConfig('nonexistent')).rejects.toThrow('License not found');
  });

  it('should include kill switch info when active', async () => {
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      killSwitch: true,
      killSwitchReason: 'Admin override',
    });

    const result = await getEAConfig('lic_01');

    expect(result.killSwitch).toBe(true);
    expect(result.killSwitchReason).toBe('Admin override');
  });
});

// ─── Acknowledge Config ──────────────────────────────────────────────────────

describe('acknowledgeConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should store acknowledgment in Redis with 24h TTL', async () => {
    const result = await acknowledgeConfig('lic_01', 'abc123hash');

    expect(result.acknowledged).toBe(true);
    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringContaining('config:ack:'),
      86400, // 24 hours
      expect.any(String)
    );
  });

  it('should store config hash and timestamp in the acknowledgment', async () => {
    await acknowledgeConfig('lic_01', 'abc123hash');

    const storedData = JSON.parse((redis.setex as any).mock.calls[0][2]);
    expect(storedData.configHash).toBe('abc123hash');
    expect(storedData.acknowledgedAt).toBeDefined();
  });
});

// ─── Acknowledge Kill Switch ───────────────────────────────────────────────────

describe('acknowledgeKillSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create audit log for kill switch acknowledgment', async () => {
    (prisma.auditLog.create as any).mockResolvedValue({ id: 'audit_01' });

    const result = await acknowledgeKillSwitch('lic_01', 'acc_01');

    expect(result.acknowledged).toBe(true);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'lic_01',
          actorType: 'ea',
          action: 'KILL_SWITCH_ACKNOWLEDGED',
          resourceType: 'license',
          resourceId: 'lic_01',
          newValue: expect.objectContaining({
            tradingAccountId: 'acc_01',
          }),
        }),
      })
    );
  });
});

// ─── Process Trade Event ──────────────────────────────────────────────────────

describe('processTradeEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new trade event', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
    (prisma.tradeEvent.create as any).mockResolvedValue({
      id: 'evt_01',
      ticket: 'TICK001',
      symbol: 'EURUSD',
      direction: 'BUY',
      eventType: 'OPEN',
    });

    const result = await processTradeEvent(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        ticket: 'TICK001',
        symbol: 'EURUSD',
        direction: 'BUY',
        eventType: 'OPEN',
        volume: 0.1,
      },
      'lic_01'
    );

    expect(result.status).toBe('created');
    expect(result.eventId).toBe('evt_01');
  });

  it('should push trade event to Redis stream', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
    (prisma.tradeEvent.create as any).mockResolvedValue({ id: 'evt_01' });

    await processTradeEvent(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        ticket: 'TICK001',
        symbol: 'EURUSD',
        direction: 'BUY',
        eventType: 'OPEN',
        volume: 0.1,
      },
      'lic_01'
    );

    expect(redis.xadd).toHaveBeenCalledWith(
      'stream:trade-events',
      expect.objectContaining({
        licenseId: 'lic_01',
        ticket: 'TICK001',
        symbol: 'EURUSD',
      })
    );
  });

  it('should return duplicate for already processed ticket', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradeEvent.findUnique as any).mockResolvedValue({
      id: 'evt_existing',
      ticket: 'TICK001',
    });

    const result = await processTradeEvent(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        ticket: 'TICK001',
        symbol: 'EURUSD',
        direction: 'BUY',
        eventType: 'OPEN',
        volume: 0.1,
      },
      'lic_01'
    );

    expect(result.status).toBe('duplicate');
    expect(result.eventId).toBe('evt_existing');
    expect(prisma.tradeEvent.create).not.toHaveBeenCalled();
  });

  it('should throw for unlinked trading account', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(null);

    await expect(
      processTradeEvent(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '999999',
          ticket: 'TICK001',
          symbol: 'EURUSD',
          direction: 'BUY',
          eventType: 'OPEN',
          volume: 0.1,
        },
        'lic_01'
      )
    ).rejects.toThrow('Trading account not found or not linked');
  });

  it('should handle trade event with all optional fields', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
    (prisma.tradeEvent.create as any).mockResolvedValue({ id: 'evt_01' });

    const result = await processTradeEvent(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        ticket: 'TICK002',
        symbol: 'GBPUSD',
        direction: 'SELL',
        eventType: 'CLOSE',
        openPrice: 1.2650,
        closePrice: 1.2600,
        volume: 0.5,
        openTime: '2026-01-15T10:00:00Z',
        closeTime: '2026-01-15T12:00:00Z',
        profit: 250.0,
        commission: 1.5,
        swap: 0.5,
        magicNumber: 12345,
        comment: 'Manual close',
      },
      'lic_01'
    );

    expect(result.status).toBe('created');
  });
});

// ─── Batch Trade Events ───────────────────────────────────────────────────────

describe('processBatchTradeEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process multiple events and return results', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
    (prisma.tradeEvent.create as any)
      .mockResolvedValueOnce({ id: 'evt_01' })
      .mockResolvedValueOnce({ id: 'evt_02' });

    const events = [
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        ticket: 'TICK001',
        symbol: 'EURUSD',
        direction: 'BUY' as const,
        eventType: 'OPEN' as const,
        volume: 0.1,
      },
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        ticket: 'TICK002',
        symbol: 'GBPUSD',
        direction: 'SELL' as const,
        eventType: 'OPEN' as const,
        volume: 0.2,
      },
    ];

    const results = await processBatchTradeEvents(events, 'lic_01');

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('created');
    expect(results[1].status).toBe('created');
  });

  it('should handle errors in batch gracefully', async () => {
    (prisma.tradingAccount.findFirst as any)
      .mockResolvedValueOnce(mockTradingAccount)
      .mockResolvedValueOnce(null); // Second event fails

    (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
    (prisma.tradeEvent.create as any).mockResolvedValue({ id: 'evt_01' });

    const events = [
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        ticket: 'TICK001',
        symbol: 'EURUSD',
        direction: 'BUY' as const,
        eventType: 'OPEN' as const,
        volume: 0.1,
      },
      {
        licenseKey: 'ea-test-key',
        accountNumber: '999999', // Non-existent account
        ticket: 'TICK002',
        symbol: 'GBPUSD',
        direction: 'SELL' as const,
        eventType: 'OPEN' as const,
        volume: 0.2,
      },
    ];

    const results = await processBatchTradeEvents(events, 'lic_01');

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('created');
    expect(results[1].status).toBe('error');
  });

  it('should handle empty batch', async () => {
    const results = await processBatchTradeEvents([], 'lic_01');
    expect(results).toHaveLength(0);
  });
});

// ─── Process Metrics ──────────────────────────────────────────────────────────

describe('processMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept metrics and store in database', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.metric.create as any).mockResolvedValue({ id: 'metric_01' });

    const result = await processMetrics(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        equity: 10000,
        balance: 10500,
        drawdownPct: 5.0,
        openPositions: 2,
        marginLevel: 200,
        freeMargin: 500,
      },
      'lic_01'
    );

    expect(result.status).toBe('accepted');
    expect(result.metricId).toBe('metric_01');
    expect(prisma.metric.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          licenseId: 'lic_01',
          tradingAccountId: 'acc_01',
          equity: 10000,
          balance: 10500,
          drawdownPct: 5.0,
        }),
      })
    );
  });

  it('should cache latest metrics in Redis', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.metric.create as any).mockResolvedValue({ id: 'metric_01' });

    await processMetrics(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        equity: 10000,
        balance: 10500,
        drawdownPct: 5.0,
        openPositions: 2,
      },
      'lic_01'
    );

    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringContaining('metrics:latest:'),
      3600,
      expect.any(String)
    );
  });

  it('should throw for unlinked trading account', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(null);

    await expect(
      processMetrics(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '999999',
          equity: 10000,
          balance: 10500,
          drawdownPct: 5.0,
          openPositions: 2,
        },
        'lic_01'
      )
    ).rejects.toThrow('Trading account not found or not linked');
  });

  it('should call risk evaluation on metrics', async () => {
    const { evaluateRiskOnMetrics } = await import('../../src/api/services/risk.service');

    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.metric.create as any).mockResolvedValue({ id: 'metric_01' });

    await processMetrics(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        equity: 10000,
        balance: 10500,
        drawdownPct: 5.0,
        openPositions: 2,
      },
      'lic_01'
    );

    expect(evaluateRiskOnMetrics).toHaveBeenCalled();
  });
});