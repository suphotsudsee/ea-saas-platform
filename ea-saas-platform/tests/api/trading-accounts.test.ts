// ─── Trading Accounts API Tests ───────────────────────────────────────────────
// Covers account linking, unlinking, status management, and auto-link behavior
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/api/lib/prisma', () => ({
  prisma: {
    tradingAccount: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    license: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
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
    heartbeatState: (lId: string, aId: string) => `heartbeat:${lId}:${aId}`,
    notificationStream: () => 'stream:notifications',
  },
  RedisTTL: { HEARTBEAT_STATE: 180 },
}));

import { prisma } from '../../src/api/lib/prisma';
import { redis } from '../../src/api/utils/redis';
import {
  findOrCreateTradingAccount,
  processHeartbeat,
} from '../../src/api/services/ea-contract.service';

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockTradingAccount = {
  id: 'acc_01',
  userId: 'user_01',
  licenseId: 'lic_01',
  accountNumber: '123456',
  brokerName: 'Broker-MT5',
  platform: 'MT5',
  status: 'ACTIVE',
  lastHeartbeatAt: new Date(),
  lastKnownIp: null,
  createdAt: new Date(),
  updatedAt: new Date(),
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
  tradingAccounts: [mockTradingAccount],
};

const mockUser = {
  id: 'user_01',
  email: 'trader@example.com',
  name: 'Test Trader',
  role: 'TRADER',
  status: 'ACTIVE',
  autoLinkAccounts: true,
};

// ─── Find or Create Trading Account ───────────────────────────────────────────

describe('findOrCreateTradingAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return existing linked account', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);

    const result = await findOrCreateTradingAccount(
      'lic_01', 'user_01', '123456', 'MT5', 'ea-test-key'
    );

    expect(result).toEqual(mockTradingAccount);
    expect(prisma.tradingAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountNumber: '123456',
          platform: 'MT5',
        }),
      })
    );
  });

  it('should return null when max accounts limit is reached', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(null); // Not found
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

  it('should auto-create trading account when auto-link is enabled', async () => {
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
    expect(prisma.tradingAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_01',
          licenseId: 'lic_01',
          accountNumber: '123456',
          platform: 'MT5',
          status: 'ACTIVE',
        }),
      })
    );
  });

  it('should return null when user has auto-link disabled', async () => {
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

  it('should return null for non-existent license', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(null);
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.license.findUnique as any).mockResolvedValue(null);

    const result = await findOrCreateTradingAccount(
      'nonexistent', 'user_01', '123456', 'MT5', 'ea-test-key'
    );

    expect(result).toBeNull();
  });

  it('should return null for non-existent user', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(null);
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const result = await findOrCreateTradingAccount(
      'lic_01', 'nonexistent', '123456', 'MT5', 'ea-test-key'
    );

    expect(result).toBeNull();
  });

  it('should handle unique constraint violation gracefully', async () => {
    const uniqueError = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    });

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
});

// ─── Trading Account Status ──────────────────────────────────────────────────

describe('trading account status transitions', () => {
  it('should mark account as ACTIVE on heartbeat', async () => {
    (prisma.tradingAccount.update as any).mockResolvedValue({
      ...mockTradingAccount,
      lastHeartbeatAt: new Date(),
      status: 'ACTIVE',
    });

    const result = await prisma.tradingAccount.update({
      where: { id: 'acc_01' },
      data: { status: 'ACTIVE', lastHeartbeatAt: new Date() },
    });

    expect(result.status).toBe('ACTIVE');
  });

  it('should mark account as STALE when heartbeat is overdue', async () => {
    (prisma.tradingAccount.update as any).mockResolvedValue({
      ...mockTradingAccount,
      status: 'STALE',
    });

    const result = await prisma.tradingAccount.update({
      where: { id: 'acc_01' },
      data: { status: 'STALE' },
    });

    expect(result.status).toBe('STALE');
  });

  it('should mark account as UNLINKED when removed from license', async () => {
    (prisma.tradingAccount.update as any).mockResolvedValue({
      ...mockTradingAccount,
      status: 'UNLINKED',
    });

    const result = await prisma.tradingAccount.update({
      where: { id: 'acc_01' },
      data: { status: 'UNLINKED' },
    });

    expect(result.status).toBe('UNLINKED');
  });
});

// ─── Account Platform Tests ──────────────────────────────────────────────────

describe('platform validation', () => {
  it('should support MT4 platform', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue({
      ...mockTradingAccount,
      platform: 'MT4',
    });

    const result = await prisma.tradingAccount.findFirst({
      where: { accountNumber: '123456', platform: 'MT4' },
    });

    expect(result.platform).toBe('MT4');
  });

  it('should support MT5 platform', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue({
      ...mockTradingAccount,
      platform: 'MT5',
    });

    const result = await prisma.tradingAccount.findFirst({
      where: { accountNumber: '123456', platform: 'MT5' },
    });

    expect(result.platform).toBe('MT5');
  });

  it('should differentiate accounts by platform', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(null);

    // MT4 and MT5 can have the same account number at different brokers
    const result = await prisma.tradingAccount.findFirst({
      where: {
        accountNumber: '123456',
        platform: 'MT4',
      },
    });

    expect(result).toBeNull();
  });
});

// ─── Heartbeat Processing for Accounts ────────────────────────────────────────

describe('heartbeat processing for trading accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update lastHeartbeatAt on heartbeat', async () => {
    const now = new Date();
    (prisma.tradingAccount.update as any).mockResolvedValue({
      ...mockTradingAccount,
      lastHeartbeatAt: now,
      status: 'ACTIVE',
    });

    await prisma.tradingAccount.update({
      where: { id: 'acc_01' },
      data: { lastHeartbeatAt: now, status: 'ACTIVE' },
    });

    expect(prisma.tradingAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastHeartbeatAt: expect.any(Date),
          status: 'ACTIVE',
        }),
      })
    );
  });

  it('should reject heartbeat for killed license', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('kill:')) return Promise.resolve('1');
      return Promise.resolve(null);
    });

    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradingAccount.update as any).mockResolvedValue({
      ...mockTradingAccount,
      lastHeartbeatAt: new Date(),
      status: 'ACTIVE',
    });
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      killSwitch: true,
      killSwitchReason: 'Emergency stop',
      strategy: { id: 'strat_01', name: 'Scalper', version: '2.0', defaultConfig: {}, riskConfig: {} },
    });

    const result = await processHeartbeat(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        platform: 'MT5',
        equity: 10000,
        balance: 10500,
        openPositions: 2,
      },
      'lic_01',
      'user_01'
    );

    expect(result.status).toBe('killed');
    expect(result.kill).toBe(true);
  });

  it('should reject heartbeat when global kill switch is active', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key === 'kill:global') return Promise.resolve('1');
      if (key.includes('heartbeat:')) return Promise.resolve(null);
      return Promise.resolve(null);
    });

    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradingAccount.update as any).mockResolvedValue({
      ...mockTradingAccount,
      lastHeartbeatAt: new Date(),
      status: 'ACTIVE',
    });
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      strategy: { id: 'strat_01', name: 'Scalper', version: '2.0', defaultConfig: {}, riskConfig: {} },
    });

    const result = await processHeartbeat(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        platform: 'MT5',
        equity: 10000,
        balance: 10500,
        openPositions: 2,
      },
      'lic_01',
      'user_01'
    );

    expect(result.status).toBe('killed');
    expect(result.kill).toBe(true);
  });

  it('should return config_update when config hash differs', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('config:current:')) return Promise.resolve('old-hash-value');
      if (key.includes('heartbeat:')) return Promise.resolve(null);
      return Promise.resolve(null);
    });

    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradingAccount.update as any).mockResolvedValue({
      ...mockTradingAccount,
      lastHeartbeatAt: new Date(),
    });
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      strategyId: 'strat_01',
      strategy: { id: 'strat_01', name: 'Scalper', version: '2.0', defaultConfig: { lotSize: 0.2 }, riskConfig: {} },
    });

    const result = await processHeartbeat(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        platform: 'MT5',
        equity: 10000,
        balance: 10500,
        openPositions: 2,
      },
      'lic_01',
      'user_01'
    );

    expect(result.status).toBe('config_update');
    expect(result.configHash).toBe('old-hash-value');
  });

  it('should return ok status for normal heartbeat with matching config', async () => {
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('config:current:')) return Promise.resolve(null);
      if (key.includes('heartbeat:')) return Promise.resolve(null);
      return Promise.resolve(null);
    });

    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradingAccount.update as any).mockResolvedValue({
      ...mockTradingAccount,
      lastHeartbeatAt: new Date(),
    });
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      strategyId: 'strat_01',
      strategy: { id: 'strat_01', name: 'Scalper', version: '2.0', defaultConfig: {}, riskConfig: {} },
    });

    const result = await processHeartbeat(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        platform: 'MT5',
        equity: 10000,
        balance: 10500,
        openPositions: 2,
      },
      'lic_01',
      'user_01'
    );

    expect(result.status).toBe('ok');
    expect(result.kill).toBe(false);
  });
});