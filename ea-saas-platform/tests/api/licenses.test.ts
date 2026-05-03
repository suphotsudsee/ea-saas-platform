// ─── Licenses API Tests ──────────────────────────────────────────────────────
// Covers license creation, validation, revocation, pause/resume, and key regeneration
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/api/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    license: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
    subscription: { findFirst: vi.fn() },
    strategy: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
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
    configVersion: (id: string) => `config:current:${id}`,
    heartbeatState: (lId: string, aId: string) => `heartbeat:${lId}:${aId}`,
    heartbeatStream: () => 'stream:heartbeat-persist',
    notificationStream: () => 'stream:notifications',
    tradeEventStream: () => 'stream:trade-events',
  },
  RedisTTL: {
    LICENSE_CACHE: 300,
    HEARTBEAT_STATE: 180,
  },
}));

vi.mock('../../src/api/middleware/adminOnly', () => ({
  adminOnlyMiddleware: vi.fn(),
  requireWriteAccess: vi.fn(),
}));

import { prisma } from '../../src/api/lib/prisma';
import { redis, RedisKeys } from '../../src/api/utils/redis';
import {
  createLicense,
  validateLicense,
  revokeLicense,
  pauseLicense,
  resumeLicense,
  extendLicense,
  regenerateLicenseKey,
  toggleKillSwitch,
  setGlobalKillSwitch,
  listUserLicenses,
  getLicenseDetail,
  generateLicenseKey,
  hashLicenseKey,
} from '../../src/api/services/license.service';

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockLicense = {
  id: 'lic_01',
  key: 'ea-550e8400-e29b-41d4-a716-446655440000',
  userId: 'user_01',
  subscriptionId: 'sub_01',
  strategyId: 'strat_01',
  status: 'ACTIVE',
  expiresAt: new Date('2026-12-31'),
  maxAccounts: 3,
  killSwitch: false,
  killSwitchReason: null,
  killSwitchAt: null,
  pausedAt: null,
  pausedReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUser = {
  id: 'user_01',
  email: 'trader@example.com',
  name: 'Test Trader',
  role: 'TRADER',
  status: 'ACTIVE',
};

const mockSubscription = {
  id: 'sub_01',
  userId: 'user_01',
  packageId: 'pkg_01',
  status: 'ACTIVE',
  currentPeriodStart: new Date(),
  currentPeriodEnd: new Date('2026-12-31'),
};

const mockStrategy = {
  id: 'strat_01',
  name: 'Scalper Pro',
  version: '2.0',
  defaultConfig: { lotSize: 0.1, stopLoss: 50 },
  riskConfig: { maxDrawdownPct: 20, maxDailyLossPct: 5 },
  isActive: true,
};

const mockLicenseWithRelations = {
  ...mockLicense,
  user: mockUser,
  subscription: mockSubscription,
  strategy: mockStrategy,
};

// ─── License Key Generation ──────────────────────────────────────────────────

describe('License Key Generation', () => {
  it('should generate a key with "ea-" prefix', () => {
    const key = generateLicenseKey();
    expect(key).toMatch(/^ea-/);
  });

  it('should generate unique keys on each call', () => {
    const key1 = generateLicenseKey();
    const key2 = generateLicenseKey();
    expect(key1).not.toBe(key2);
  });

  it('should produce consistent hash for the same key', () => {
    const key = 'ea-test-key-123';
    const hash1 = hashLicenseKey(key);
    const hash2 = hashLicenseKey(key);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different keys', () => {
    const hash1 = hashLicenseKey('ea-key-1');
    const hash2 = hashLicenseKey('ea-key-2');
    expect(hash1).not.toBe(hash2);
  });

  it('should produce a 64-character hex hash (SHA-256)', () => {
    const hash = hashLicenseKey('ea-test-key');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ─── Create License ──────────────────────────────────────────────────────────

describe('createLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a license and return it with the raw key', async () => {
    (prisma.license.create as any).mockResolvedValue(mockLicense);

    const result = await createLicense({
      userId: 'user_01',
      subscriptionId: 'sub_01',
      strategyId: 'strat_01',
      maxAccounts: 3,
      expiresAt: new Date('2026-12-31'),
    });

    expect(result.license).toEqual(mockLicense);
    expect(result.rawKey).toMatch(/^ea-/);
    expect(prisma.license.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_01',
          subscriptionId: 'sub_01',
          strategyId: 'strat_01',
          maxAccounts: 3,
          status: 'ACTIVE',
        }),
      })
    );
  });

  it('should retry on unique key collision (P2002)', async () => {
    const collisionError = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      meta: { target: ['key'] },
    });

    (prisma.license.create as any)
      .mockRejectedValueOnce(collisionError)
      .mockResolvedValueOnce(mockLicense);

    const result = await createLicense({
      userId: 'user_01',
      subscriptionId: 'sub_01',
      strategyId: 'strat_01',
      maxAccounts: 1,
      expiresAt: new Date('2026-12-31'),
    });

    expect(result.license).toEqual(mockLicense);
    expect(prisma.license.create).toHaveBeenCalledTimes(2);
  });

  it('should throw after max attempts on persistent key collision', async () => {
    const collisionError = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      meta: { target: ['key'] },
    });

    (prisma.license.create as any).mockRejectedValue(collisionError);

    await expect(
      createLicense({
        userId: 'user_01',
        subscriptionId: 'sub_01',
        strategyId: 'strat_01',
        maxAccounts: 1,
        expiresAt: new Date('2026-12-31'),
      })
    ).rejects.toThrow('Failed to generate unique license key');
  });

  it('should re-throw non-P2002 database errors', async () => {
    (prisma.license.create as any).mockRejectedValue(new Error('DB connection lost'));

    await expect(
      createLicense({
        userId: 'user_01',
        subscriptionId: 'sub_01',
        strategyId: 'strat_01',
        maxAccounts: 1,
        expiresAt: new Date('2026-12-31'),
      })
    ).rejects.toThrow('DB connection lost');
  });

  it('should re-throw P2002 errors for non-key fields', async () => {
    const otherUniqueError = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      meta: { target: ['subscriptionId'] },
    });

    (prisma.license.create as any).mockRejectedValue(otherUniqueError);

    await expect(
      createLicense({
        userId: 'user_01',
        subscriptionId: 'sub_01',
        strategyId: 'strat_01',
        maxAccounts: 1,
        expiresAt: new Date('2026-12-31'),
      })
    ).rejects.toThrow('Unique constraint failed');
  });
});

// ─── Validate License ────────────────────────────────────────────────────────

describe('validateLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null); // Cache miss by default
  });

  it('should return valid result for a valid, active license', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(mockLicenseWithRelations);

    const result = await validateLicense('ea-valid-key');

    expect(result.valid).toBe(true);
    expect(result.license).toBeDefined();
    expect(result.license?.id).toBe('lic_01');
    expect(result.strategy).toBeDefined();
    expect(result.configHash).toBeDefined();
  });

  it('should cache validation result in Redis', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(mockLicenseWithRelations);

    await validateLicense('ea-valid-key');

    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringContaining('license:validate:'),
      expect.any(Number),
      expect.any(String)
    );
  });

  it('should return cached result when available', async () => {
    const cachedResult = JSON.stringify({
      valid: true,
      license: { id: 'lic_01', key: 'ea-cached-key', status: 'ACTIVE' },
    });

    (redis.get as any).mockResolvedValue(cachedResult);

    const result = await validateLicense('ea-cached-key');

    expect(result.valid).toBe(true);
    expect(prisma.license.findUnique).not.toHaveBeenCalled();
  });

  it('should return INVALID_KEY for non-existent license', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(null);

    const result = await validateLicense('ea-nonexistent');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_KEY');
  });

  it('should return EXPIRED for expired license', async () => {
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicenseWithRelations,
      status: 'EXPIRED',
    });

    const result = await validateLicense('ea-expired-key');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('EXPIRED');
  });

  it('should return EXPIRED for license past expiresAt date', async () => {
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicenseWithRelations,
      expiresAt: new Date('2020-01-01'), // Past date
    });

    const result = await validateLicense('ea-past-expiry-key');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('EXPIRED');
  });

  it('should return REVOKED for revoked license', async () => {
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicenseWithRelations,
      status: 'REVOKED',
    });

    const result = await validateLicense('ea-revoked-key');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('REVOKED');
  });

  it('should return PAUSED for paused license', async () => {
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicenseWithRelations,
      status: 'PAUSED',
    });

    const result = await validateLicense('ea-paused-key');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('PAUSED');
  });

  it('should return ACCOUNT_MISMATCH for suspended user', async () => {
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicenseWithRelations,
      user: { ...mockUser, status: 'SUSPENDED' },
    });

    const result = await validateLicense('ea-suspended-user-key');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('ACCOUNT_MISMATCH');
  });

  it('should return ACCOUNT_MISMATCH for banned user', async () => {
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicenseWithRelations,
      user: { ...mockUser, status: 'BANNED' },
    });

    const result = await validateLicense('ea-banned-user-key');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('ACCOUNT_MISMATCH');
  });

  it('should return SUBSCRIPTION_INACTIVE for inactive subscription', async () => {
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicenseWithRelations,
      subscription: { ...mockSubscription, status: 'CANCELED' },
    });

    const result = await validateLicense('ea-inactive-sub-key');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('SUBSCRIPTION_INACTIVE');
  });

  it('should accept TRIAL subscription status', async () => {
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicenseWithRelations,
      subscription: { ...mockSubscription, status: 'TRIAL' },
    });

    const result = await validateLicense('ea-trial-key');

    expect(result.valid).toBe(true);
  });

  it('should return KILLED when license killSwitch is active', async () => {
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicenseWithRelations,
      killSwitch: true,
    });

    const result = await validateLicense('ea-killed-key');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('KILLED');
  });

  it('should return KILLED when Redis kill switch flag is set', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(mockLicenseWithRelations);
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('kill:')) return Promise.resolve('1');
      if (key.includes('license:validate:')) return Promise.resolve(null);
      return Promise.resolve(null);
    });

    const result = await validateLicense('ea-redis-killed-key');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('KILLED');
  });

  it('should return KILLED when global kill switch is active', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(mockLicenseWithRelations);
    (redis.get as any).mockImplementation((key: string) => {
      if (key === 'kill:global') return Promise.resolve('1');
      return Promise.resolve(null);
    });

    const result = await validateLicense('ea-global-kill-key');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('KILLED');
  });

  it('should check kill switch even on cached results', async () => {
    const cachedResult = JSON.stringify({
      valid: true,
      license: { id: 'lic_01', key: 'ea-cached-key', status: 'ACTIVE' },
    });

    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('license:validate:')) return Promise.resolve(cachedResult);
      if (key === 'kill:global') return Promise.resolve('1');
      if (key.includes('kill:')) return Promise.resolve(null);
      return Promise.resolve(null);
    });

    const result = await validateLicense('ea-cached-key');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('KILLED');
  });
});

// ─── Validate Account for License ────────────────────────────────────────────

describe('validateLicense with accountNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('should return valid when account is already linked', async () => {
    (prisma.license.findUnique as any).mockResolvedValueOnce({
      ...mockLicenseWithRelations,
      tradingAccounts: [{ id: 'acc_01', accountNumber: '123456', status: 'ACTIVE' }],
    });

    const result = await validateLicense('ea-key-with-account', '123456');

    expect(result.valid).toBe(true);
  });

  it('should return MAX_ACCOUNTS_REACHED when limit exceeded', async () => {
    (prisma.license.findUnique as any)
      .mockResolvedValueOnce(mockLicenseWithRelations) // First call for base validation
      .mockResolvedValueOnce({
        ...mockLicense,
        maxAccounts: 1,
        tradingAccounts: [{ id: 'acc_01', accountNumber: '999999', status: 'ACTIVE' }],
      });

    const result = await validateLicense('ea-maxed-key', '888888');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('MAX_ACCOUNTS_REACHED');
  });
});

// ─── Revoke License ──────────────────────────────────────────────────────────

describe('revokeLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update license status to REVOKED and set kill switch', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      status: 'REVOKED',
      killSwitch: true,
    });

    const result = await revokeLicense('lic_01', 'Violation of terms', 'admin_01');

    expect(result.status).toBe('REVOKED');
    expect(prisma.license.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REVOKED',
          killSwitch: true,
          killSwitchReason: 'Violation of terms',
        }),
      })
    );
    expect(redis.del).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('kill:'),
      '1'
    );
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});

// ─── Pause/Resume License ────────────────────────────────────────────────────

describe('pauseLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pause a license and create audit log', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      status: 'PAUSED',
      pausedAt: new Date(),
      pausedReason: 'Maintenance',
    });

    const result = await pauseLicense('lic_01', 'Maintenance', 'admin_01');

    expect(result.status).toBe('PAUSED');
    expect(redis.del).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'PAUSE_LICENSE',
        }),
      })
    );
  });
});

describe('resumeLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resume a paused license and create audit log', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      status: 'ACTIVE',
      pausedAt: null,
      pausedReason: null,
    });

    const result = await resumeLicense('lic_01', 'admin_01');

    expect(result.status).toBe('ACTIVE');
    expect(redis.del).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RESUME_LICENSE',
        }),
      })
    );
  });
});

// ─── Extend License ──────────────────────────────────────────────────────────

describe('extendLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extend license expiry and create audit log', async () => {
    const oldExpiry = new Date('2026-12-31');
    const newExpiry = new Date('2027-06-30');

    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      expiresAt: oldExpiry,
    });

    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      expiresAt: newExpiry,
    });

    const result = await extendLicense('lic_01', newExpiry, 'Extension purchased', 'admin_01');

    expect(result.expiresAt).toEqual(newExpiry);
    expect(redis.del).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'EXTEND_LICENSE',
        }),
      })
    );
  });

  it('should throw error if license not found', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(null);

    await expect(
      extendLicense('nonexistent', new Date(), 'reason', 'admin_01')
    ).rejects.toThrow('License not found');
  });
});

// ─── Regenerate License Key ──────────────────────────────────────────────────

describe('regenerateLicenseKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate new key and invalidate old cache', async () => {
    const oldLicense = { ...mockLicense, key: 'ea-old-key' };
    (prisma.license.findUnique as any).mockResolvedValue(oldLicense);

    const newLicense = { ...mockLicense, key: 'ea-new-key-12345' };
    (prisma.license.update as any).mockResolvedValue(newLicense);

    const result = await regenerateLicenseKey('lic_01', 'admin_01');

    expect(result.license).toEqual(newLicense);
    expect(result.rawKey).toMatch(/^ea-/);
    expect(redis.del).toHaveBeenCalledWith(
      expect.stringContaining('license:validate:ea-old-key')
    );
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('should throw error if license not found', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(null);

    await expect(
      regenerateLicenseKey('nonexistent', 'admin_01')
    ).rejects.toThrow('License not found');
  });
});

// ─── Kill Switch ──────────────────────────────────────────────────────────────

describe('toggleKillSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should activate kill switch and set Redis flag', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      killSwitch: true,
      killSwitchReason: 'Emergency stop',
    });

    const result = await toggleKillSwitch('lic_01', true, 'Emergency stop', 'admin_01');

    expect(result.killSwitch).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('kill:'),
      '1'
    );
    expect(redis.del).toHaveBeenCalled();
  });

  it('should deactivate kill switch and remove Redis flag', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      killSwitch: false,
    });

    const result = await toggleKillSwitch('lic_01', false, null, 'admin_01');

    expect(result.killSwitch).toBe(false);
    expect(redis.del).toHaveBeenCalledWith(
      expect.stringContaining('kill:')
    );
  });
});

// ─── Global Kill Switch ──────────────────────────────────────────────────────

describe('setGlobalKillSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should activate global kill switch and update all licenses', async () => {
    (prisma.license.updateMany as any).mockResolvedValue({ count: 5 });

    await setGlobalKillSwitch(true, 'admin_01', 'Security incident');

    expect(redis.set).toHaveBeenCalledWith('kill:global', '1');
    expect(prisma.license.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
        data: expect.objectContaining({
          killSwitch: true,
        }),
      })
    );
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('should deactivate global kill switch and clear all license kill switches', async () => {
    (prisma.license.updateMany as any).mockResolvedValue({ count: 5 });

    await setGlobalKillSwitch(false, 'admin_01', 'Issue resolved');

    expect(redis.del).toHaveBeenCalledWith('kill:global');
    expect(prisma.license.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { killSwitch: true },
        data: expect.objectContaining({
          killSwitch: false,
        }),
      })
    );
  });
});

// ─── List User Licenses ──────────────────────────────────────────────────────

describe('listUserLicenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all licenses for a user', async () => {
    const licenses = [mockLicense];
    (prisma.license.findMany as any).mockResolvedValue(licenses);

    const result = await listUserLicenses('user_01');

    expect(result).toEqual(licenses);
    expect(prisma.license.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_01' },
      })
    );
  });

  it('should return empty array for user with no licenses', async () => {
    (prisma.license.findMany as any).mockResolvedValue([]);

    const result = await listUserLicenses('user_no_licenses');

    expect(result).toEqual([]);
  });
});

// ─── Get License Detail ──────────────────────────────────────────────────────

describe('getLicenseDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return detailed license info for the owner', async () => {
    const detail = { ...mockLicense, strategy: mockStrategy, subscription: { package: { name: 'Pro' } } };
    (prisma.license.findFirst as any).mockResolvedValue(detail);

    const result = await getLicenseDetail('lic_01', 'user_01');

    expect(result).toBeDefined();
    expect(prisma.license.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lic_01', userId: 'user_01' },
      })
    );
  });

  it('should return null for license not owned by user', async () => {
    (prisma.license.findFirst as any).mockResolvedValue(null);

    const result = await getLicenseDetail('lic_01', 'other_user');

    expect(result).toBeNull();
  });
});