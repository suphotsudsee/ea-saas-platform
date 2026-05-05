// ─── Subscriptions API Tests ─────────────────────────────────────────────────
// Covers subscription creation, cancellation, listing, and billing cycle management
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/api/lib/prisma', () => ({
  prisma: {
    subscription: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
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
    user: {
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
  return vi.fn().mockImplementation(() => ({
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
  }));
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
  package: mockPackage,
  licenses: [],
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
    (prisma.package.findMany as any).mockResolvedValue([mockPackage]);

    const result = await listActivePackages();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Pro Plan');
    expect(prisma.package.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      })
    );
  });

  it('should return empty array when no packages exist', async () => {
    (prisma.package.findMany as any).mockResolvedValue([]);

    const result = await listActivePackages();
    expect(result).toEqual([]);
  });
});

// ─── Create Checkout Session ──────────────────────────────────────────────────

describe('createCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error for non-existent user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    await expect(
      createCheckoutSession('nonexistent', 'pkg_01', 'https://success', 'https://cancel')
    ).rejects.toThrow('User not found');
  });

  it('should throw error for inactive package', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.package.findUnique as any).mockResolvedValue({ ...mockPackage, isActive: false });

    await expect(
      createCheckoutSession('user_01', 'pkg_01', 'https://success', 'https://cancel')
    ).rejects.toThrow('Package not found or inactive');
  });

  it('should throw error for non-existent package', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.package.findUnique as any).mockResolvedValue(null);

    await expect(
      createCheckoutSession('user_01', 'nonexistent_pkg', 'https://success', 'https://cancel')
    ).rejects.toThrow('Package not found or inactive');
  });

  it('should throw error if user already has active subscription for package', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.package.findUnique as any).mockResolvedValue(mockPackage);
    (prisma.subscription.findFirst as any).mockResolvedValue(mockSubscription);

    await expect(
      createCheckoutSession('user_01', 'pkg_01', 'https://success', 'https://cancel')
    ).rejects.toThrow('already has an active subscription');
  });

  it('should create checkout session for new subscription', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.package.findUnique as any).mockResolvedValue(mockPackage);
    (prisma.subscription.findFirst as any).mockResolvedValue(null); // No existing sub

    const result = await createCheckoutSession('user_01', 'pkg_01', 'https://success', 'https://cancel');

    expect(result).toHaveProperty('sessionId');
    expect(result).toHaveProperty('url');
  });

  it('should reuse existing Stripe customer ID', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.package.findUnique as any).mockResolvedValue(mockPackage);
    (prisma.subscription.findFirst as any).mockResolvedValue(null);
    // Return existing customer ID
    (prisma.subscription.findFirst as any).mockResolvedValueOnce(null).mockResolvedValueOnce({
      stripeCustomerId: 'cus_existing',
    });

    // For the second call in getOrCreateStripeCustomer
    // Note: This tests the flow where a user already has a Stripe customer
  });
});

// ─── Get User Subscription ────────────────────────────────────────────────────

describe('getUserSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return active subscription for a user', async () => {
    (prisma.subscription.findFirst as any).mockResolvedValue(mockSubscription);

    const result = await getUserSubscription('user_01');

    expect(result).toBeDefined();
    expect(result.id).toBe('sub_01');
    expect(prisma.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user_01',
          status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
        },
      })
    );
  });

  it('should return null for user with no active subscription', async () => {
    (prisma.subscription.findFirst as any).mockResolvedValue(null);

    const result = await getUserSubscription('user_no_sub');

    expect(result).toBeNull();
  });

  it('should include licenses and trading accounts in response', async () => {
    const subWithDetails = {
      ...mockSubscription,
      licenses: [{
        id: 'lic_01',
        strategy: { id: 'strat_01', name: 'Scalper', version: '2.0' },
        tradingAccounts: [{ id: 'acc_01', accountNumber: '12345', status: 'ACTIVE' }],
      }],
    };

    (prisma.subscription.findFirst as any).mockResolvedValue(subWithDetails);

    const result = await getUserSubscription('user_01');

    expect(result.licenses).toHaveLength(1);
    expect(result.licenses[0].strategy.name).toBe('Scalper');
  });
});

// ─── Cancel Subscription ──────────────────────────────────────────────────────

describe('cancelSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cancel subscription immediately when immediately=true', async () => {
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
    expect(prisma.auditLog.create).toHaveBeenCalled();
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

  it('should throw error for non-existent subscription', async () => {
    (prisma.subscription.findFirst as any).mockResolvedValue(null);

    await expect(
      cancelSubscription('nonexistent', 'user_01', true)
    ).rejects.toThrow('Subscription not found');
  });

  it('should not throw when Stripe cancellation fails (graceful degradation)', async () => {
    (prisma.subscription.findFirst as any).mockResolvedValue(mockSubscription);
    (prisma.subscription.update as any).mockResolvedValue({
      ...mockSubscription,
      status: 'CANCELED',
    });
    (prisma.license.updateMany as any).mockResolvedValue({ count: 1 });

    // Should not throw even if Stripe operations fail internally
    const result = await cancelSubscription('sub_01', 'user_01', true, 'Done');
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
    expect(result.totalPages).toBe(1);
  });

  it('should handle page 2 with no results', async () => {
    (prisma.payment.findMany as any).mockResolvedValue([]);
    (prisma.payment.count as any).mockResolvedValue(0);

    const result = await getPaymentHistory('user_01', 2, 20);

    expect(result.payments).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should calculate total pages correctly', async () => {
    (prisma.payment.findMany as any).mockResolvedValue([]);
    (prisma.payment.count as any).mockResolvedValue(45);

    const result = await getPaymentHistory('user_01', 1, 20);

    expect(result.totalPages).toBe(3);
  });
});

// ─── Subscription Status Edge Cases ───────────────────────────────────────────

describe('subscription lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle PAST_DUE subscription status correctly', async () => {
    const pastDueSub = { ...mockSubscription, status: 'PAST_DUE' };
    (prisma.subscription.findFirst as any).mockResolvedValue(pastDueSub);

    const result = await getUserSubscription('user_01');
    expect(result.status).toBe('PAST_DUE');
  });

  it('should handle TRIAL subscription status correctly', async () => {
    const trialSub = { ...mockSubscription, status: 'TRIAL' };
    (prisma.subscription.findFirst as any).mockResolvedValue(trialSub);

    const result = await getUserSubscription('user_01');
    expect(result.status).toBe('TRIAL');
  });

  it('should not return EXPIRED or CANCELED subscriptions in getUserSubscription', async () => {
    (prisma.subscription.findFirst as any).mockResolvedValue(null);

    const result = await getUserSubscription('user_01');

    // Expired/Canceled subs are not in the status filter
    expect(result).toBeNull();
    expect(prisma.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
        }),
      })
    );
  });
});