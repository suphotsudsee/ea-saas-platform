// ─── License Service Tests ──────────────────────────────────────────────────
// Comprehensive tests for license creation, validation, revocation, and management
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/api/lib/prisma', () => ({
  prisma: {
    license: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
    strategy: {
      findUnique: vi.fn(),
    },
    tradingAccount: {
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
    configVersion: (id: string) => `config:current:${id}`,
    heartbeatState: (lId: string, aId: string) => `heartbeat:${lId}:${aId}`,
    notificationStream: () => 'stream:notifications',
    tradeEventStream: () => 'stream:trade-events',
  },
  RedisTTL: {
    LICENSE_CACHE: 300,
    HEARTBEAT_STATE: 180,
  },
}));

import { prisma } from '../../src/api/lib/prisma';
import { redis, RedisKeys, RedisTTL } from '../../src/api/utils/redis';
import {
  generateLicenseKey,
  hashLicenseKey,
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
} from '../../src/api/services/license.service';

// ─── Test Data ────────────────────────────────────────────────────────────────

const activeLicense = {
  id: 'lic_01',
  key: 'ea-550e8400-e29b-41d4-a716-446655440000',
  userId: 'user_01',
  subscriptionId: 'sub_01',
  strategyId: 'strat_01',
  status: 'ACTIVE',
  expiresAt: new Date('2027-12-31'),
  maxAccounts: 3,
  killSwitch: false,
  killSwitchReason: null,
  killSwitchAt: null,
  pausedAt: null,
  pausedReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const strategy = {
  id: 'strat_01',
  name: 'Scalper Pro',
  version: '2.0',
  defaultConfig: { lotSize: 0.1, stopLoss: 50, takeProfit: 100 },
  riskConfig: { maxDrawdownPct: 20, maxDailyLossPct: 5 },
  isActive: true,
};

const subscription = {
  id: 'sub_01',
  userId: 'user_01',
  packageId: 'pkg_01',
  status: 'ACTIVE',
  currentPeriodStart: new Date(),
  currentPeriodEnd: new Date('2027-12-31'),
};

const user = {
  id: 'user_01',
  email: 'trader@example.com',
  name: 'Test Trader',
  role: 'TRADER',
  status: 'ACTIVE',
};

const fullLicense = {
  ...activeLicense,
  user,
  subscription,
  strategy,
  tradingAccounts: [],
};

// ─── License Key Generation Tests ─────────────────────────────────────────────

describe('License Key Generation', () => {
  it('should generate keys with "ea-" prefix', () => {
    const key = generateLicenseKey();
    expect(key).toMatch(/^ea-/);
  });

  it('should generate unique keys', () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateLicenseKey()));
    expect(keys.size).toBe(100);
  });

  it('should generate keys of sufficient length', () => {
    const key = generateLicenseKey();
    // "ea-" + UUID = at least 39 chars
    expect(key.length).toBeGreaterThan(36);
  });

  it('should hash keys consistently', () => {
    const key = 'ea-test-key-123';
    const hash1 = hashLicenseKey(key);
    const hash2 = hashLicenseKey(key);
    expect(hash1).toBe(hash2);
  });

  it('should produce SHA-256 hex hashes', () => {
    const key = 'ea-test-key-123';
    const hash = hashLicenseKey(key);
    // Verify it matches manual SHA-256
    const expected = crypto.createHash('sha256').update(key).digest('hex');
    expect(hash).toBe(expected);
  });

  it('should produce different hashes for different keys', () => {
    expect(hashLicenseKey('key1')).not.toBe(hashLicenseKey('key2'));
  });
});

// ─── Create License Tests ────────────────────────────────────────────────────

describe('createLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a license with ACTIVE status', async () => {
    (prisma.license.create as any).mockResolvedValue(activeLicense);

    const result = await createLicense({
      userId: 'user_01',
      subscriptionId: 'sub_01',
      strategyId: 'strat_01',
      maxAccounts: 3,
      expiresAt: new Date('2027-12-31'),
    });

    expect(result.license).toEqual(activeLicense);
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

  it('should retry on key collision up to 5 times', async () => {
    const collisionError = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
      meta: { target: ['key'] },
    });

    (prisma.license.create as any)
      .mockRejectedValueOnce(collisionError)
      .mockRejectedValueOnce(collisionError)
      .mockResolvedValueOnce(activeLicense);

    const result = await createLicense({
      userId: 'user_01',
      subscriptionId: 'sub_01',
      strategyId: 'strat_01',
      maxAccounts: 3,
      expiresAt: new Date('2027-12-31'),
    });

    expect(result.license).toEqual(activeLicense);
    expect(prisma.license.create).toHaveBeenCalledTimes(3);
  });

  it('should throw after 5 key collisions', async () => {
    const collisionError = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
      meta: { target: ['key'] },
    });

    (prisma.license.create as any).mockRejectedValue(collisionError);

    await expect(
      createLicense({
        userId: 'user_01',
        subscriptionId: 'sub_01',
        strategyId: 'strat_01',
        maxAccounts: 3,
        expiresAt: new Date('2027-12-31'),
      })
    ).rejects.toThrow('Failed to generate unique license key');
  });

  it('should not retry on non-collision database errors', async () => {
    (prisma.license.create as any).mockRejectedValue(new Error('Connection refused'));

    await expect(
      createLicense({
        userId: 'user_01',
        subscriptionId: 'sub_01',
        strategyId: 'strat_01',
        maxAccounts: 3,
        expiresAt: new Date('2027-12-31'),
      })
    ).rejects.toThrow('Connection refused');

    expect(prisma.license.create).toHaveBeenCalledTimes(1);
  });
});

// ─── Validate License Tests ──────────────────────────────────────────────────

describe('validateLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  describe('valid license scenarios', () => {
    it('should validate an active license with active subscription', async () => {
      (prisma.license.findUnique as any).mockResolvedValue(fullLicense);

      const result = await validateLicense('ea-test-key');

      expect(result.valid).toBe(true);
      expect(result.license).toBeDefined();
      expect(result.license?.id).toBe('lic_01');
      expect(result.strategy).toBeDefined();
      expect(result.strategy?.name).toBe('Scalper Pro');
      expect(result.configHash).toBeDefined();
    });

    it('should validate a license with TRIAL subscription', async () => {
      (prisma.license.findUnique as any).mockResolvedValue({
        ...fullLicense,
        subscription: { ...subscription, status: 'TRIAL' },
      });

      const result = await validateLicense('ea-test-key');
      expect(result.valid).toBe(true);
    });

    it('should cache validation result in Redis', async () => {
      (prisma.license.findUnique as any).mockResolvedValue(fullLicense);

      await validateLicense('ea-test-key');

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('license:validate:'),
        RedisTTL.LICENSE_CACHE,
        expect.any(String)
      );
    });

    it('should return cached result on subsequent calls', async () => {
      const cachedResult = JSON.stringify({
        valid: true,
        license: { id: 'lic_01', key: 'ea-test-key', status: 'ACTIVE' },
      });
      (redis.get as any).mockResolvedValue(cachedResult);

      const result = await validateLicense('ea-test-key');

      expect(result.valid).toBe(true);
      expect(prisma.license.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('invalid license scenarios', () => {
    it('should reject non-existent license key', async () => {
      (prisma.license.findUnique as any).mockResolvedValue(null);

      const result = await validateLicense('nonexistent-key');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_KEY');
    });

    it('should reject expired license by status', async () => {
      (prisma.license.findUnique as any).mockResolvedValue({
        ...fullLicense,
        status: 'EXPIRED',
      });

      const result = await validateLicense('ea-expired');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('EXPIRED');
    });

    it('should reject license past expiration date', async () => {
      (prisma.license.findUnique as any).mockResolvedValue({
        ...fullLicense,
        expiresAt: new Date('2020-01-01'),
      });

      const result = await validateLicense('ea-past-expiry');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('EXPIRED');
    });

    it('should reject revoked license', async () => {
      (prisma.license.findUnique as any).mockResolvedValue({
        ...fullLicense,
        status: 'REVOKED',
      });

      const result = await validateLicense('ea-revoked');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('REVOKED');
    });

    it('should reject paused license', async () => {
      (prisma.license.findUnique as any).mockResolvedValue({
        ...fullLicense,
        status: 'PAUSED',
      });

      const result = await validateLicense('ea-paused');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PAUSED');
    });

    it('should reject license for suspended user', async () => {
      (prisma.license.findUnique as any).mockResolvedValue({
        ...fullLicense,
        user: { ...user, status: 'SUSPENDED' },
      });

      const result = await validateLicense('ea-suspended');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('ACCOUNT_MISMATCH');
    });

    it('should reject license for banned user', async () => {
      (prisma.license.findUnique as any).mockResolvedValue({
        ...fullLicense,
        user: { ...user, status: 'BANNED' },
      });

      const result = await validateLicense('ea-banned');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('ACCOUNT_MISMATCH');
    });

    it('should reject license with inactive subscription', async () => {
      (prisma.license.findUnique as any).mockResolvedValue({
        ...fullLicense,
        subscription: { ...subscription, status: 'CANCELED' },
      });

      const result = await validateLicense('ea-inactive-sub');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('SUBSCRIPTION_INACTIVE');
    });

    it('should reject license with expired subscription', async () => {
      (prisma.license.findUnique as any).mockResolvedValue({
        ...fullLicense,
        subscription: { ...subscription, status: 'EXPIRED' },
      });

      const result = await validateLicense('ea-expired-sub');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('SUBSCRIPTION_INACTIVE');
    });
  });

  describe('kill switch scenarios', () => {
    it('should reject license with killSwitch in database', async () => {
      (prisma.license.findUnique as any).mockResolvedValue({
        ...fullLicense,
        killSwitch: true,
      });

      const result = await validateLicense('ea-killed');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('KILLED');
    });

    it('should reject license with kill switch flag in Redis', async () => {
      (prisma.license.findUnique as any).mockResolvedValue(fullLicense);
      (redis.get as any).mockImplementation((key: string) => {
        if (key.includes('kill:lic_01')) return Promise.resolve('1');
        return Promise.resolve(null);
      });

      const result = await validateLicense('ea-redis-killed');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('KILLED');
    });

    it('should reject license with global kill switch', async () => {
      (prisma.license.findUnique as any).mockResolvedValue(fullLicense);
      (redis.get as any).mockImplementation((key: string) => {
        if (key === 'kill:global') return Promise.resolve('1');
        return Promise.resolve(null);
      });

      const result = await validateLicense('ea-global-kill');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('KILLED');
    });

    it('should check kill switch on cached results', async () => {
      const cachedResult = JSON.stringify({
        valid: true,
        license: { id: 'lic_01', key: 'ea-cached', status: 'ACTIVE' },
      });
      (redis.get as any).mockImplementation((key: string) => {
        if (key.includes('license:validate:')) return Promise.resolve(cachedResult);
        if (key.includes('kill:')) return Promise.resolve('1');
        return Promise.resolve(null);
      });

      const result = await validateLicense('ea-cached');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('KILLED');
    });
  });

  describe('account validation', () => {
    it('should accept already-linked account', async () => {
      (prisma.license.findUnique as any)
        .mockResolvedValueOnce(fullLicense) // First call: base validation
        .mockResolvedValueOnce({
          ...activeLicense,
          tradingAccounts: [{ id: 'acc_01', accountNumber: '123456', status: 'ACTIVE' }],
        }); // Second call: account validation

      const result = await validateLicense('ea-test-key', '123456');
      expect(result.valid).toBe(true);
    });

    it('should reject when max accounts reached', async () => {
      (prisma.license.findUnique as any)
        .mockResolvedValueOnce(fullLicense)
        .mockResolvedValueOnce({
          ...activeLicense,
          maxAccounts: 1,
          tradingAccounts: [{ id: 'acc_01', accountNumber: '999999', status: 'ACTIVE' }],
        });

      const result = await validateLicense('ea-test-key', '888888');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MAX_ACCOUNTS_REACHED');
    });
  });

  describe('config hash', () => {
    it('should compute SHA-256 hash of strategy config', async () => {
      (prisma.license.findUnique as any).mockResolvedValue(fullLicense);

      const result = await validateLicense('ea-test-key');

      const expectedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(strategy.defaultConfig))
        .digest('hex');

      expect(result.configHash).toBe(expectedHash);
    });
  });
});

// ─── Revoke License Tests ────────────────────────────────────────────────────

describe('revokeLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update license to REVOKED status', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...activeLicense,
      status: 'REVOKED',
      killSwitch: true,
      killSwitchReason: 'Terms violation',
    });

    const result = await revokeLicense('lic_01', 'Terms violation', 'admin_01');

    expect(result.status).toBe('REVOKED');
    expect(prisma.license.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REVOKED',
          killSwitch: true,
          killSwitchReason: 'Terms violation',
        }),
      })
    );
  });

  it('should invalidate Redis cache on revocation', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...activeLicense,
      status: 'REVOKED',
    });

    await revokeLicense('lic_01', 'Violation', 'admin_01');

    expect(redis.del).toHaveBeenCalledWith(
      expect.stringContaining('license:validate:')
    );
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('kill:'),
      '1'
    );
  });

  it('should create audit log entry', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...activeLicense,
      status: 'REVOKED',
    });

    await revokeLicense('lic_01', 'Violation', 'admin_01');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'admin_01',
          actorType: 'admin',
          action: 'REVOKE_LICENSE',
        }),
      })
    );
  });
});

// ─── Pause/Resume Tests ──────────────────────────────────────────────────────

describe('pauseLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update license to PAUSED status with reason', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...activeLicense,
      status: 'PAUSED',
      pausedAt: new Date(),
      pausedReason: 'Scheduled maintenance',
    });

    const result = await pauseLicense('lic_01', 'Scheduled maintenance', 'admin_01');

    expect(result.status).toBe('PAUSED');
    expect(prisma.license.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PAUSED',
          pausedReason: 'Scheduled maintenance',
        }),
      })
    );
  });

  it('should invalidate Redis cache on pause', async () => {
    (prisma.license.update as any).mockResolvedValue({ ...activeLicense, status: 'PAUSED' });

    await pauseLicense('lic_01', 'Maintenance', 'admin_01');

    expect(redis.del).toHaveBeenCalled();
  });
});

describe('resumeLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update license back to ACTIVE status', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...activeLicense,
      status: 'ACTIVE',
      pausedAt: null,
      pausedReason: null,
    });

    const result = await resumeLicense('lic_01', 'admin_01');

    expect(result.status).toBe('ACTIVE');
    expect(prisma.license.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ACTIVE',
          pausedAt: null,
          pausedReason: null,
        }),
      })
    );
  });

  it('should invalidate Redis cache on resume', async () => {
    (prisma.license.update as any).mockResolvedValue(activeLicense);

    await resumeLicense('lic_01', 'admin_01');

    expect(redis.del).toHaveBeenCalled();
  });
});

// ─── Extend License Tests ────────────────────────────────────────────────────

describe('extendLicense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update the expiresAt date', async () => {
    const oldExpiry = new Date('2026-12-31');
    const newExpiry = new Date('2027-06-30');

    (prisma.license.findUnique as any).mockResolvedValue({
      ...activeLicense,
      expiresAt: oldExpiry,
    });
    (prisma.license.update as any).mockResolvedValue({
      ...activeLicense,
      expiresAt: newExpiry,
    });

    const result = await extendLicense('lic_01', newExpiry, 'Extension purchased', 'admin_01');

    expect(result.expiresAt).toEqual(newExpiry);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'EXTEND_LICENSE',
          oldValue: { expiresAt: oldExpiry.toISOString() },
          newValue: { expiresAt: newExpiry.toISOString(), reason: 'Extension purchased' },
        }),
      })
    );
  });

  it('should throw for non-existent license', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(null);

    await expect(
      extendLicense('nonexistent', new Date(), 'reason', 'admin_01')
    ).rejects.toThrow('License not found');
  });
});

// ─── Regenerate Key Tests ────────────────────────────────────────────────────

describe('regenerateLicenseKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate new key and invalidate old cache', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(activeLicense);
    (prisma.license.update as any).mockResolvedValue({
      ...activeLicense,
      key: 'ea-new-generated-key',
    });

    const result = await regenerateLicenseKey('lic_01', 'admin_01');

    expect(result.rawKey).toMatch(/^ea-/);
    expect(redis.del).toHaveBeenCalledWith(
      expect.stringContaining('license:validate:')
    );
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('should throw for non-existent license', async () => {
    (prisma.license.findUnique as any).mockResolvedValue(null);

    await expect(
      regenerateLicenseKey('nonexistent', 'admin_01')
    ).rejects.toThrow('License not found');
  });
});

// ─── Kill Switch Tests ────────────────────────────────────────────────────────

describe('toggleKillSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should activate kill switch with Redis flag', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...activeLicense,
      killSwitch: true,
      killSwitchReason: 'Emergency',
    });

    const result = await toggleKillSwitch('lic_01', true, 'Emergency', 'admin_01');

    expect(result.killSwitch).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(expect.stringContaining('kill:'), '1');
    expect(redis.del).toHaveBeenCalled(); // Cache invalidation
  });

  it('should deactivate kill switch and remove Redis flag', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...activeLicense,
      killSwitch: false,
    });

    const result = await toggleKillSwitch('lic_01', false, null, 'admin_01');

    expect(result.killSwitch).toBe(false);
    expect(redis.del).toHaveBeenCalledWith(expect.stringContaining('kill:'));
    expect(redis.del).toHaveBeenCalledWith(expect.stringContaining('license:validate:'));
  });
});

// ─── Global Kill Switch Tests ────────────────────────────────────────────────

describe('setGlobalKillSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should activate global kill switch and update all active licenses', async () => {
    (prisma.license.updateMany as any).mockResolvedValue({ count: 10 });

    await setGlobalKillSwitch(true, 'admin_01', 'Security incident');

    expect(redis.set).toHaveBeenCalledWith('kill:global', '1');
    expect(prisma.license.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
        data: expect.objectContaining({ killSwitch: true }),
      })
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'GLOBAL_KILL_SWITCH_ACTIVATE',
        }),
      })
    );
  });

  it('should deactivate global kill switch and clear all license kill switches', async () => {
    (prisma.license.updateMany as any).mockResolvedValue({ count: 10 });

    await setGlobalKillSwitch(false, 'admin_01', 'Issue resolved');

    expect(redis.del).toHaveBeenCalledWith('kill:global');
    expect(prisma.license.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { killSwitch: true },
        data: expect.objectContaining({ killSwitch: false }),
      })
    );
  });
});

// ─── List/Get License Tests ──────────────────────────────────────────────────

describe('listUserLicenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return licenses with strategy and account details', async () => {
    (prisma.license.findMany as any).mockResolvedValue([{
      ...activeLicense,
      strategy: { id: 'strat_01', name: 'Scalper', version: '2.0' },
      subscription: { id: 'sub_01', status: 'ACTIVE', package: { name: 'Pro' } },
      tradingAccounts: [],
    }]);

    const result = await listUserLicenses('user_01');

    expect(result).toHaveLength(1);
    expect(result[0].strategy.name).toBe('Scalper');
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

describe('getLicenseDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should only return license belonging to the user', async () => {
    (prisma.license.findFirst as any).mockResolvedValue(null);

    const result = await getLicenseDetail('lic_01', 'different_user');
    expect(result).toBeNull();
  });

  it('should return full detail including heartbeats and risk events', async () => {
    (prisma.license.findFirst as any).mockResolvedValue({
      ...activeLicense,
      strategy,
      subscription: { ...subscription, package: { name: 'Pro' } },
      heartbeats: [],
      riskEvents: [],
    });

    const result = await getLicenseDetail('lic_01', 'user_01');
    expect(result).toBeDefined();
    expect(result.strategy).toBeDefined();
  });
});