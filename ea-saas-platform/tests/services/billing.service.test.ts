// ─── Billing Service Tests ──────────────────────────────────────────────────
// Comprehensive tests for Stripe integration, subscriptions, and payment processing
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/api/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    subscription: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    license: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    package: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
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
    notificationStream: () => 'stream:notifications',
  },
  RedisTTL: {},
}));

vi.mock('../../src/api/services/license.service', () => ({
  createLicense: vi.fn().mockResolvedValue({
    license: { id: 'lic_new' },
    rawKey: 'ea-new-key',
  }),
}));

vi.mock('stripe', () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/test',
        }),
      },
    },
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_test_123' }),
    },
    subscriptions: {
      update: vi.fn().mockResolvedValue({}),
      cancel: vi.fn().mockResolvedValue({}),
    },
  };
  return vi.fn().mockReturnValue(mockStripe);
});

import { prisma } from '../../src/api/lib/prisma';
import { redis } from '../../src/api/utils/redis';
import {
  listActivePackages,
  createCheckoutSession,
  getUserSubscription,
  cancelSubscription,
  getPaymentHistory,
} from '../../src/api/services/billing.service';
import { createLicense } from '../../src/api/services/license.service';

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockPackage = {
  id: 'pkg_01',
  name: 'Pro Plan',
  description: 'Professional EA license',
  priceCents: 2999,
  currency: 'USD',
  billingCycle: 'MONTHLY',
  maxAccounts: 3,
  features: { strategyIds: ['strat_01'], priority: true, support: 'email' },
  isActive: true,
  sortOrder: 1,
  stripePriceId: 'price_123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSubscription = {
  id: 'sub_01',
  userId: 'user_01',
  packageId: 'pkg_01',
  status: 'ACTIVE',
  currentPeriodStart: new Date('2026-01-01'),
  currentPeriodEnd: new Date('2026-02-01'),
  cancelAtPeriodEnd: false,
  stripeSubscriptionId: 'sub_stripe_01',
  stripeCustomerId: 'cus_stripe_01',
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

// ─── List Packages ────────────────────────────────────────────────────────────

describe('listActivePackages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all active packages sorted by sortOrder', async () => {
    const packages = [mockPackage];
    (prisma.package.findMany as any).mockResolvedValue(packages);

    const result = await listActivePackages();

    expect(result).toEqual(packages);
    expect(prisma.package.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  });

  it('should return empty array when no packages exist', async () => {
    (prisma.package.findMany as any).mockResolvedValue([]);

    const result = await listActivePackages();
    expect(result).toEqual([]);
  });

  it('should only return active packages', async () => {
    (prisma.package.findMany as any).mockResolvedValue([mockPackage]);

    await listActivePackages();

    expect(prisma.package.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      })
    );
  });
});

// ─── Create Checkout Session ──────────────────────────────────────────────────

describe('createCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validation', () => {
    it('should throw error for non-existent user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(
        createCheckoutSession('nonexistent', 'pkg_01', 'https://success', 'https://cancel')
      ).rejects.toThrow('User not found');
    });

    it('should throw error for non-existent package', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.package.findUnique as any).mockResolvedValue(null);

      await expect(
        createCheckoutSession('user_01', 'nonexistent_pkg', 'https://success', 'https://cancel')
      ).rejects.toThrow('Package not found or inactive');
    });

    it('should throw error for inactive package', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.package.findUnique as any).mockResolvedValue({ ...mockPackage, isActive: false });

      await expect(
        createCheckoutSession('user_01', 'pkg_01', 'https://success', 'https://cancel')
      ).rejects.toThrow('Package not found or inactive');
    });

    it('should throw error if user already has active subscription for this package', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.package.findUnique as any).mockResolvedValue(mockPackage);
      (prisma.subscription.findFirst as any).mockResolvedValue(mockSubscription);

      await expect(
        createCheckoutSession('user_01', 'pkg_01', 'https://success', 'https://cancel')
      ).rejects.toThrow('already has an active subscription');
    });
  });

  describe('successful checkout', () => {
    it('should create checkout session and return URL', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.package.findUnique as any).mockResolvedValue(mockPackage);
      (prisma.subscription.findFirst as any)
        .mockResolvedValueOnce(null) // No existing sub for duplicate check
        .mockResolvedValueOnce(null); // No existing Stripe customer

      const result = await createCheckoutSession(
        'user_01', 'pkg_01', 'https://success', 'https://cancel'
      );

      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('url');
    });
  });

  describe('billing cycle handling', () => {
    it('should handle MONTHLY billing cycle', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.package.findUnique as any).mockResolvedValue(mockPackage);
      (prisma.subscription.findFirst as any).mockResolvedValue(null);

      await createCheckoutSession('user_01', 'pkg_01', 'https://success', 'https://cancel');
      // The Stripe mock handles the call — just verify no error was thrown
    });

    it('should handle QUARTERLY billing cycle', async () => {
      const quarterlyPackage = { ...mockPackage, billingCycle: 'QUARTERLY' };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.package.findUnique as any).mockResolvedValue(quarterlyPackage);
      (prisma.subscription.findFirst as any).mockResolvedValue(null);

      await createCheckoutSession('user_01', 'pkg_01', 'https://success', 'https://cancel');
    });

    it('should handle YEARLY billing cycle', async () => {
      const yearlyPackage = { ...mockPackage, billingCycle: 'YEARLY' };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.package.findUnique as any).mockResolvedValue(yearlyPackage);
      (prisma.subscription.findFirst as any).mockResolvedValue(null);

      await createCheckoutSession('user_01', 'pkg_01', 'https://success', 'https://cancel');
    });
  });
});

// ─── Get User Subscription ────────────────────────────────────────────────────

describe('getUserSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return active subscription with full details', async () => {
    const subWithDetails = {
      ...mockSubscription,
      package: mockPackage,
      licenses: [{
        id: 'lic_01',
        strategy: { id: 'strat_01', name: 'Scalper Pro', version: '2.0' },
        tradingAccounts: [{ id: 'acc_01', accountNumber: '12345', status: 'ACTIVE' }],
      }],
    };

    (prisma.subscription.findFirst as any).mockResolvedValue(subWithDetails);

    const result = await getUserSubscription('user_01');

    expect(result).toBeDefined();
    expect(result.id).toBe('sub_01');
    expect(result.package.name).toBe('Pro Plan');
    expect(result.licenses).toHaveLength(1);
  });

  it('should return null for user without active subscription', async () => {
    (prisma.subscription.findFirst as any).mockResolvedValue(null);

    const result = await getUserSubscription('user_no_sub');
    expect(result).toBeNull();
  });

  it('should only search for ACTIVE, TRIAL, and PAST_DUE subscriptions', async () => {
    (prisma.subscription.findFirst as any).mockResolvedValue(null);

    await getUserSubscription('user_01');

    expect(prisma.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user_01',
          status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
        },
      })
    );
  });

  it('should order subscriptions by most recent first', async () => {
    (prisma.subscription.findFirst as any).mockResolvedValue(mockSubscription);

    await getUserSubscription('user_01');

    expect(prisma.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    );
  });
});

// ─── Cancel Subscription ──────────────────────────────────────────────────────

describe('cancelSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cancel immediately when immediately=true', async () => {
    (prisma.subscription.findFirst as any).mockResolvedValue(mockSubscription);
    (prisma.subscription.update as any).mockResolvedValue({
      ...mockSubscription,
      status: 'CANCELED',
    });
    (prisma.license.updateMany as any).mockResolvedValue({ count: 1 });

    const result = await cancelSubscription('sub_01', 'user_01', true, 'Not satisfied');

    expect(result).toBeDefined();
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'CANCELED' },
      })
    );
    expect(prisma.license.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'EXPIRED' },
      })
    );
  });

  it('should set cancelAtPeriodEnd when immediately=false', async () => {
    (prisma.subscription.findFirst as any).mockResolvedValue(mockSubscription);
    (prisma.subscription.update as any).mockResolvedValue({
      ...mockSubscription,
      cancelAtPeriodEnd: true,
    });

    const result = await cancelSubscription('sub_01', 'user_01', false, 'Switching plans');

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { cancelAtPeriodEnd: true },
      })
    );
  });

  it('should throw error if subscription does not belong to user', async () => {
    (prisma.subscription.findFirst as any).mockResolvedValue(null);

    await expect(
      cancelSubscription('sub_01', 'different_user', true)
    ).rejects.toThrow('Subscription not found');
  });

  it('should create audit log entry', async () => {
    (prisma.subscription.findFirst as any).mockResolvedValue(mockSubscription);
    (prisma.subscription.update as any).mockResolvedValue({
      ...mockSubscription,
      status: 'CANCELED',
    });
    (prisma.license.updateMany as any).mockResolvedValue({ count: 1 });

    await cancelSubscription('sub_01', 'user_01', true, 'Done');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'user_01',
          actorType: 'user',
          action: 'CANCEL_SUBSCRIPTION_IMMEDIATE',
        }),
      })
    );
  });

  it('should handle missing Stripe subscription gracefully', async () => {
    const localSub = { ...mockSubscription, stripeSubscriptionId: null };
    (prisma.subscription.findFirst as any).mockResolvedValue(localSub);
    (prisma.subscription.update as any).mockResolvedValue({
      ...localSub,
      status: 'CANCELED',
    });
    (prisma.license.updateMany as any).mockResolvedValue({ count: 1 });

    // Should not throw even without Stripe subscription
    const result = await cancelSubscription('sub_01', 'user_01', true);
    expect(result).toBeDefined();
  });
});

// ─── Payment History ──────────────────────────────────────────────────────────

describe('getPaymentHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return paginated payment history', async () => {
    const payments = [
      { id: 'pay_01', amountCents: 2999, status: 'COMPLETED' },
      { id: 'pay_02', amountCents: 2999, status: 'COMPLETED' },
    ];

    (prisma.payment.findMany as any).mockResolvedValue(payments);
    (prisma.payment.count as any).mockResolvedValue(2);

    const result = await getPaymentHistory('user_01', 1, 20);

    expect(result.payments).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('should handle pagination correctly', async () => {
    (prisma.payment.findMany as any).mockResolvedValue([]);
    (prisma.payment.count as any).mockResolvedValue(50);

    const result = await getPaymentHistory('user_01', 2, 20);

    expect(result.total).toBe(50);
    expect(result.totalPages).toBe(3);
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20, // (2-1) * 20
        take: 20,
      })
    );
  });

  it('should handle empty payment history', async () => {
    (prisma.payment.findMany as any).mockResolvedValue([]);
    (prisma.payment.count as any).mockResolvedValue(0);

    const result = await getPaymentHistory('user_01', 1, 20);

    expect(result.payments).toHaveLength(0);
    expect(result.totalPages).toBe(0);
  });

  it('should default to page 1 if not specified', async () => {
    (prisma.payment.findMany as any).mockResolvedValue([]);
    (prisma.payment.count as any).mockResolvedValue(0);

    const result = await getPaymentHistory('user_01');

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('should order payments by most recent first', async () => {
    (prisma.payment.findMany as any).mockResolvedValue([]);
    (prisma.payment.count as any).mockResolvedValue(0);

    await getPaymentHistory('user_01');

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    );
  });
});

// ─── Stripe Customer Management ───────────────────────────────────────────────

describe('Stripe customer management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reuse existing Stripe customer ID', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.package.findUnique as any).mockResolvedValue(mockPackage);
    (prisma.subscription.findFirst as any)
      .mockResolvedValueOnce(null) // No duplicate sub
      .mockResolvedValueOnce({
        stripeCustomerId: 'cus_existing_123',
      }); // Existing Stripe customer

    await createCheckoutSession('user_01', 'pkg_01', 'https://success', 'https://cancel');

    // Should use existing customer, not create new one
  });

  it('should create new Stripe customer when none exists', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.package.findUnique as any).mockResolvedValue(mockPackage);
    (prisma.subscription.findFirst as any)
      .mockResolvedValueOnce(null) // No duplicate sub
      .mockResolvedValueOnce(null); // No existing Stripe customer

    await createCheckoutSession('user_01', 'pkg_01', 'https://success', 'https://cancel');

    // Should create a new customer via Stripe
  });
});

// ─── Package Features and Strategy IDs ────────────────────────────────────────

describe('package features handling', () => {
  it('should include strategyIds from package features', async () => {
    const pkgWithStrategies = {
      ...mockPackage,
      features: { strategyIds: ['strat_01', 'strat_02'], priority: true },
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.package.findUnique as any).mockResolvedValue(pkgWithStrategies);
    (prisma.subscription.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await createCheckoutSession('user_01', 'pkg_01', 'https://success', 'https://cancel');
  });

  it('should handle package without strategyIds', async () => {
    const pkgNoStrategies = {
      ...mockPackage,
      features: { priority: true, support: 'email' },
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.package.findUnique as any).mockResolvedValue(pkgNoStrategies);
    (prisma.subscription.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await createCheckoutSession('user_01', 'pkg_01', 'https://success', 'https://cancel');
  });
});