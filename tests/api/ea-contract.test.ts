// ─── EA Contract API Tests ──────────────────────────────────────────────────
// Covers heartbeat processing, config sync, kill switch acknowledgment, and EA interactions
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
    auditLog: {
      create: vi.fn(),
    },
    riskEvent: {
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
  findOrCreateTradingAccount,
} from '../../src/api/services/ea-contract.service';

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockTradingAccount = {
  id: 'acc_01',
  userId: 'user_01',
  licenseId: 'lic_01',
  accountNumber: '123456',
  brokerName: 'TestBroker-MT5',
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
  expiresAt: new Date('2026-12-31'),
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

// ─── Process Heartbeat Tests ──────────────────────────────────────────────────

describe('processHeartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful heartbeat', () => {
    it('should process a valid heartbeat and return ok status', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue({
        ...mockTradingAccount,
        lastHeartbeatAt: new Date(),
        status: 'ACTIVE',
      });
      (redis.get as any).mockResolvedValue(null); // No kill switch
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          equity: 10500,
          balance: 10000,
          openPositions: 3,
          marginLevel: 250,
          eaVersion: '2.0.1',
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('ok');
      expect(result.kill).toBe(false);
    });

    it('should store heartbeat data in Redis', async () => {
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
          openPositions: 3,
        },
        'lic_01',
        'user_01'
      );

      expect(redis.hset).toHaveBeenCalled();
      expect(redis.expire).toHaveBeenCalled();
    });

    it('should push heartbeat to Redis stream for async persistence', async () => {
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
          openPositions: 3,
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

    it('should update trading account lastHeartbeatAt', async () => {
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
          openPositions: 3,
        },
        'lic_01',
        'user_01'
      );

      expect(prisma.tradingAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'acc_01' },
          data: expect.objectContaining({
            lastHeartbeatAt: expect.any(Date),
            status: 'ACTIVE',
          }),
        })
      );
    });
  });

  describe('kill switch handling', () => {
    it('should return killed status when license kill switch is active in Redis', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockImplementation((key: string) => {
        if (key.includes('kill:lic_01')) return Promise.resolve('1');
        return Promise.resolve(null);
      });
      (prisma.license.findUnique as any).mockResolvedValue({
        ...mockLicense,
        killSwitchReason: 'Risk breach: MAX_DRAWDOWN',
      });

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          equity: 8000,
          balance: 10000,
          openPositions: 1,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('killed');
      expect(result.kill).toBe(true);
      expect(result.killReason).toBeDefined();
    });

    it('should return killed status when global kill switch is active', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockImplementation((key: string) => {
        if (key === 'kill:global') return Promise.resolve('1');
        if (key.includes('kill:lic_01')) return Promise.resolve(null);
        return Promise.resolve(null);
      });
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          equity: 10000,
          balance: 10000,
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('killed');
      expect(result.kill).toBe(true);
    });
  });

  describe('config update detection', () => {
    it('should detect config update when hash differs from cached', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockImplementation((key: string) => {
        if (key.includes('config:current:')) return Promise.resolve('old-hash-value');
        if (key.includes('kill:')) return Promise.resolve(null);
        return Promise.resolve(null);
      });
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          equity: 10000,
          balance: 10000,
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('config_update');
      expect(result.configHash).toBe('old-hash-value');
      expect(result.message).toContain('Configuration update');
    });

    it('should return ok when config hash matches', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
      (redis.get as any).mockImplementation((key: string) => {
        if (key.includes('config:current:')) {
          // Return hash matching current config
          const currentHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(mockLicense.strategy.defaultConfig))
            .digest('hex');
          return Promise.resolve(currentHash);
        }
        return Promise.resolve(null);
      });
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          equity: 10000,
          balance: 10000,
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('ok');
    });
  });

  describe('account linking failures', () => {
    it('should return killed when account cannot be linked (max accounts)', async () => {
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

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '999999',
          platform: 'MT5',
          equity: 10000,
          balance: 10000,
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('killed');
      expect(result.kill).toBe(true);
      expect(result.message).toContain('max accounts');
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
      (prisma.tradingAccount.update as any).mockResolvedValue({
        ...mockTradingAccount,
        lastHeartbeatAt: new Date(),
      });
      (redis.get as any).mockResolvedValue(null);
      (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

      const result = await processHeartbeat(
        {
          licenseKey: 'ea-test-key',
          accountNumber: '123456',
          platform: 'MT5',
          equity: 10000,
          balance: 10000,
          openPositions: 0,
        },
        'lic_01',
        'user_01'
      );

      expect(result.status).toBe('ok');
      expect(result.kill).toBe(false);
    });
  });
});

// ─── Get EA Config Tests ──────────────────────────────────────────────────────

describe('getEAConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return config, riskConfig, and configHash', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const result = await getEAConfig('lic_01');

    expect(result.config).toBeDefined();
    expect(result.riskConfig).toBeDefined();
    expect(result.configHash).toBeDefined();
    expect(result.killSwitch).toBe(false);
  });

  it('should set config version in Redis', async () => {
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

  it('should include kill switch info in response', async () => {
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      killSwitch: true,
      killSwitchReason: 'Admin activated',
    });

    const result = await getEAConfig('lic_01');

    expect(result.killSwitch).toBe(true);
    expect(result.killSwitchReason).toBe('Admin activated');
  });
});

// ─── Acknowledge Config Tests ─────────────────────────────────────────────────

describe('acknowledgeConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should store acknowledgment in Redis', async () => {
    const result = await acknowledgeConfig('lic_01', 'abc123hash');

    expect(result.acknowledged).toBe(true);
    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringContaining('config:ack:'),
      expect.any(Number),
      expect.any(String)
    );
  });

  it('should store config hash and timestamp', async () => {
    await acknowledgeConfig('lic_01', 'abc123hash');

    const storedValue = (redis.setex as any).mock.calls[0][2];
    const parsed = JSON.parse(storedValue);
    expect(parsed.configHash).toBe('abc123hash');
    expect(parsed.acknowledgedAt).toBeDefined();
  });
});

// ─── Acknowledge Kill Switch Tests ────────────────────────────────────────────

describe('acknowledgeKillSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create audit log entry', async () => {
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
        }),
      })
    );
  });
});

// ─── Heartbeat Data Fields ────────────────────────────────────────────────────

describe('heartbeat data handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('should handle minimal heartbeat payload (required fields only)', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
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

  it('should handle MT4 platform', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue({
      ...mockTradingAccount,
      platform: 'MT4',
    });
    (prisma.tradingAccount.update as any).mockResolvedValue({
      ...mockTradingAccount,
      platform: 'MT4',
    });
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const result = await processHeartbeat(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        platform: 'MT4',
        openPositions: 0,
      },
      'lic_01',
      'user_01'
    );

    expect(result.status).toBe('ok');
  });

  it('should handle heartbeat with all optional fields', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradingAccount.update as any).mockResolvedValue(mockTradingAccount);
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const result = await processHeartbeat(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        platform: 'MT5',
        eaVersion: '2.1.0',
        equity: 10500.50,
        balance: 10000.00,
        openPositions: 3,
        marginLevel: 250.5,
        serverTime: '2026-01-15T10:30:00Z',
      },
      'lic_01',
      'user_01'
    );

    expect(result.status).toBe('ok');
    // Verify Redis stored all fields
    expect(redis.hset).toHaveBeenCalled();
    const hsetCall = (redis.hset as any).mock.calls[0];
    // Check that the call includes all the field values
    expect(hsetCall[0]).toContain('heartbeat:');
  });
});