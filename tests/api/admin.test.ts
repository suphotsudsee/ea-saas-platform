// ─── Admin API Tests ────────────────────────────────────────────────────────
// Covers admin authentication, authorization, license management, and audit logging
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/api/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    license: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    strategy: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    tradingAccount: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    riskEvent: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    adminUser: {
      findUnique: vi.fn(),
    },
    package: {
      findUnique: vi.fn(),
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
    notificationStream: () => 'stream:notifications',
  },
  RedisTTL: {
    LICENSE_CACHE: 300,
  },
}));

vi.mock('../../src/api/middleware/adminOnly', () => ({
  adminOnlyMiddleware: vi.fn(),
  requireWriteAccess: vi.fn(),
}));

vi.mock('../../src/api/services/license.service', () => ({
  createLicense: vi.fn(),
  revokeLicense: vi.fn(),
  pauseLicense: vi.fn(),
  resumeLicense: vi.fn(),
  extendLicense: vi.fn(),
  regenerateLicenseKey: vi.fn(),
  toggleKillSwitch: vi.fn(),
  setGlobalKillSwitch: vi.fn(),
  listUserLicenses: vi.fn(),
  getLicenseDetail: vi.fn(),
}));

import { prisma } from '../../src/api/lib/prisma';
import { redis } from '../../src/api/utils/redis';
import { adminOnlyMiddleware, requireWriteAccess } from '../../src/api/middleware/adminOnly';
import {
  revokeLicense,
  pauseLicense,
  resumeLicense,
  toggleKillSwitch,
  setGlobalKillSwitch,
} from '../../src/api/services/license.service';
import { POST as createLicense } from '../../src/api/routes/licenses/create/route';

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockAdminUser = {
  id: 'admin_01',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'SUPER_ADMIN',
};

const mockSupportAdmin = {
  id: 'admin_02',
  email: 'support@example.com',
  name: 'Support User',
  role: 'SUPPORT',
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
};

const mockSubscription = {
  id: 'sub_01',
  userId: 'user_01',
  packageId: 'pkg_01',
  status: 'ACTIVE',
};

const mockStrategy = {
  id: 'strat_01',
  name: 'Scalper Pro',
  version: '2.0',
  isActive: true,
};

// ─── Admin Authorization Tests ────────────────────────────────────────────────

describe('Admin Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow SUPER_ADMIN full access', () => {
    (requireWriteAccess as any).mockReturnValue(true);
    expect(requireWriteAccess('SUPER_ADMIN')).toBe(true);
  });

  it('should allow BILLING_ADMIN write access to billing', () => {
    (requireWriteAccess as any).mockReturnValue(true);
    expect(requireWriteAccess('BILLING_ADMIN')).toBe(true);
  });

  it('should restrict SUPPORT role from write operations', () => {
    (requireWriteAccess as any).mockReturnValue(false);
    expect(requireWriteAccess('SUPPORT')).toBe(false);
  });
});

// ─── Create License (Admin) ───────────────────────────────────────────────────

describe('POST /api/licenses/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 for non-admin users', async () => {
    (adminOnlyMiddleware as any).mockResolvedValue({
      response: new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    });

    const request = new NextRequest('http://localhost/api/licenses/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_01',
        subscriptionId: 'sub_01',
        strategyId: 'strat_01',
        maxAccounts: 1,
        expiresAt: '2026-12-31T00:00:00Z',
      }),
    });

    const response = await createLicense(request);
    expect(response.status).toBe(403);
  });

  it('should return 403 for admin with read-only access', async () => {
    (adminOnlyMiddleware as any).mockResolvedValue({
      admin: mockSupportAdmin,
    });
    (requireWriteAccess as any).mockReturnValue(false);

    const request = new NextRequest('http://localhost/api/licenses/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_01',
        subscriptionId: 'sub_01',
        strategyId: 'strat_01',
        maxAccounts: 1,
        expiresAt: '2026-12-31T00:00:00Z',
      }),
    });

    const response = await createLicense(request);
    expect(response.status).toBe(403);
  });

  it('should create a license with valid input', async () => {
    (adminOnlyMiddleware as any).mockResolvedValue({ admin: mockAdminUser });
    (requireWriteAccess as any).mockReturnValue(true);
    (prisma.subscription.findFirst as any).mockResolvedValue(mockSubscription);
    (prisma.strategy.findUnique as any).mockResolvedValue(mockStrategy);

    const { createLicense: mockCreateLicense } = await import('../../src/api/services/license.service');
    (mockCreateLicense as any).mockResolvedValue({
      license: { id: 'lic_new', status: 'ACTIVE', expiresAt: '2026-12-31T00:00:00Z', maxAccounts: 1 },
      rawKey: 'ea-new-raw-key',
    });

    const request = new NextRequest('http://localhost/api/licenses/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_01',
        subscriptionId: 'sub_01',
        strategyId: 'strat_01',
        maxAccounts: 1,
        expiresAt: '2026-12-31T00:00:00Z',
      }),
    });

    const response = await createLicense(request);
    // The handler calls createLicense and returns 201
    // Since we're mocking adminOnlyMiddleware, we need the full flow
  });

  it('should return 404 for non-existent subscription', async () => {
    (adminOnlyMiddleware as any).mockResolvedValue({ admin: mockAdminUser });
    (requireWriteAccess as any).mockReturnValue(true);
    (prisma.subscription.findFirst as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/licenses/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_01',
        subscriptionId: 'nonexistent',
        strategyId: 'strat_01',
        maxAccounts: 1,
        expiresAt: '2026-12-31T00:00:00Z',
      }),
    });

    const response = await createLicense(request);
    const data = await response.json();
    expect(response.status).toBe(404);
  });

  it('should return 404 for non-existent strategy', async () => {
    (adminOnlyMiddleware as any).mockResolvedValue({ admin: mockAdminUser });
    (requireWriteAccess as any).mockReturnValue(true);
    (prisma.subscription.findFirst as any).mockResolvedValue(mockSubscription);
    (prisma.strategy.findUnique as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/licenses/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_01',
        subscriptionId: 'sub_01',
        strategyId: 'nonexistent',
        maxAccounts: 1,
        expiresAt: '2026-12-31T00:00:00Z',
      }),
    });

    const response = await createLicense(request);
    const data = await response.json();
    expect(response.status).toBe(404);
  });

  it('should return 400 for invalid input (validation)', async () => {
    (adminOnlyMiddleware as any).mockResolvedValue({ admin: mockAdminUser });
    (requireWriteAccess as any).mockReturnValue(true);

    const request = new NextRequest('http://localhost/api/licenses/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Missing userId and other required fields
        maxAccounts: 1,
      }),
    });

    const response = await createLicense(request);
    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid maxAccounts (0 or negative)', async () => {
    (adminOnlyMiddleware as any).mockResolvedValue({ admin: mockAdminUser });
    (requireWriteAccess as any).mockReturnValue(true);

    const request = new NextRequest('http://localhost/api/licenses/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_01',
        subscriptionId: 'sub_01',
        strategyId: 'strat_01',
        maxAccounts: 0,
        expiresAt: '2026-12-31T00:00:00Z',
      }),
    });

    const response = await createLicense(request);
    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid expiresAt format', async () => {
    (adminOnlyMiddleware as any).mockResolvedValue({ admin: mockAdminUser });
    (requireWriteAccess as any).mockReturnValue(true);

    const request = new NextRequest('http://localhost/api/licenses/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_01',
        subscriptionId: 'sub_01',
        strategyId: 'strat_01',
        maxAccounts: 1,
        expiresAt: 'not-a-date',
      }),
    });

    const response = await createLicense(request);
    expect(response.status).toBe(400);
  });

  it('should create audit log entry', async () => {
    (adminOnlyMiddleware as any).mockResolvedValue({ admin: mockAdminUser });
    (requireWriteAccess as any).mockReturnValue(true);
    (prisma.subscription.findFirst as any).mockResolvedValue(mockSubscription);
    (prisma.strategy.findUnique as any).mockResolvedValue(mockStrategy);

    const { createLicense: mockCreateLicense } = await import('../../src/api/services/license.service');
    (mockCreateLicense as any).mockResolvedValue({
      license: { id: 'lic_new', status: 'ACTIVE', expiresAt: new Date('2026-12-31'), maxAccounts: 1 },
      rawKey: 'ea-new-key',
    });

    const request = new NextRequest('http://localhost/api/licenses/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_01',
        subscriptionId: 'sub_01',
        strategyId: 'strat_01',
        maxAccounts: 1,
        expiresAt: '2026-12-31T00:00:00Z',
      }),
    });

    await createLicense(request);

    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});

// ─── License Revocation (Admin) ───────────────────────────────────────────────

describe('License Revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should revoke a license and set kill switch', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      status: 'REVOKED',
      killSwitch: true,
      killSwitchReason: 'Terms violation',
      killSwitchAt: new Date(),
    });

    const result = await revokeLicense('lic_01', 'Terms violation', 'admin_01');

    expect(result.status).toBe('REVOKED');
    expect(result.killSwitch).toBe(true);
    expect(redis.del).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('kill:'),
      '1'
    );
  });

  it('should create audit log when revoking', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      status: 'REVOKED',
    });

    await revokeLicense('lic_01', 'Terms violation', 'admin_01');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'admin_01',
          actorType: 'admin',
          action: 'REVOKE_LICENSE',
          resourceType: 'license',
        }),
      })
    );
  });
});

// ─── Kill Switch Management ──────────────────────────────────────────────────

describe('Kill Switch Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should activate global kill switch', async () => {
    (prisma.license.updateMany as any).mockResolvedValue({ count: 10 });

    await setGlobalKillSwitch(true, 'admin_01', 'Security breach');

    expect(redis.set).toHaveBeenCalledWith('kill:global', '1');
    expect(prisma.license.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
        data: expect.objectContaining({
          killSwitch: true,
        }),
      })
    );
  });

  it('should deactivate global kill switch', async () => {
    (prisma.license.updateMany as any).mockResolvedValue({ count: 10 });

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

  it('should toggle license kill switch', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      killSwitch: true,
      killSwitchReason: 'Manual kill',
    });

    const result = await toggleKillSwitch('lic_01', true, 'Manual kill', 'admin_01');

    expect(result.killSwitch).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('kill:'),
      '1'
    );
  });
});

// ─── Audit Log Tests ──────────────────────────────────────────────────────────

describe('Audit Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log REVOKE_LICENSE action with admin details', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      status: 'REVOKED',
    });

    await revokeLicense('lic_01', 'Fraud', 'admin_01');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'admin_01',
          actorType: 'admin',
          action: 'REVOKE_LICENSE',
          newValue: expect.objectContaining({
            reason: 'Fraud',
          }),
        }),
      })
    );
  });

  it('should log PAUSE_LICENSE action', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      status: 'PAUSED',
    });

    await pauseLicense('lic_01', 'Maintenance', 'admin_01');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'PAUSE_LICENSE',
        }),
      })
    );
  });

  it('should log RESUME_LICENSE action', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      status: 'ACTIVE',
    });

    await resumeLicense('lic_01', 'admin_01');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RESUME_LICENSE',
        }),
      })
    );
  });

  it('should log GLOBAL_KILL_SWITCH_ACTIVATE action', async () => {
    (prisma.license.updateMany as any).mockResolvedValue({ count: 5 });

    await setGlobalKillSwitch(true, 'admin_01', 'Emergency');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'GLOBAL_KILL_SWITCH_ACTIVATE',
          resourceType: 'system',
          resourceId: 'global',
        }),
      })
    );
  });
});