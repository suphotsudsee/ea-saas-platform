// ─── Full Flow Integration Tests ─────────────────────────────────────────────
// End-to-end flows: signup → subscription → license → heartbeat → risk events
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────
// Integration tests mock at the service boundary to test full flows

vi.mock('../../src/api/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    license: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    package: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    strategy: {
      findUnique: vi.fn(),
    },
    tradingAccount: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    tradeEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    riskEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    metric: {
      create: vi.fn(),
    },
    heartbeat: {
      findFirst: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
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
    exists: vi.fn().mockResolvedValue(0),
    incr: vi.fn().mockResolvedValue(1),
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
    rateLimit: (prefix: string, id: string) => `rl:${prefix}:${id}`,
  },
  RedisTTL: {
    LICENSE_CACHE: 300,
    HEARTBEAT_STATE: 180,
  },
}));

vi.mock('../../src/api/services/risk.service', () => ({
  evaluateRiskOnHeartbeat: vi.fn().mockResolvedValue({ breached: false, rules: [] }),
  evaluateRiskOnMetrics: vi.fn().mockResolvedValue({ breached: false, rules: [] }),
}));

vi.mock('stripe', () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: 'cs_test_integration',
          url: 'https://checkout.stripe.com/integration-test',
        }),
      },
    },
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_integration_test' }),
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
import { createLicense, validateLicense, revokeLicense, toggleKillSwitch } from '../../src/api/services/license.service';
import {
  createCheckoutSession,
  cancelSubscription,
  getUserSubscription,
} from '../../src/api/services/billing.service';
import {
  processHeartbeat,
  processTradeEvent,
  processMetrics,
  getEAConfig,
} from '../../src/api/services/ea-contract.service';

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user_integration',
  email: 'integration@example.com',
  name: 'Integration Tester',
  role: 'TRADER',
  status: 'ACTIVE',
  autoLinkAccounts: true,
};

const mockPackage = {
  id: 'pkg_integration',
  name: 'Pro Plan',
  priceCents: 4999,
  currency: 'USD',
  billingCycle: 'MONTHLY',
  maxAccounts: 3,
  features: { strategyIds: ['strat_integration'], priority: true },
  isActive: true,
  stripePriceId: 'price_integration',
};

const mockStrategy = {
  id: 'strat_integration',
  name: 'Integration Test Strategy',
  version: '1.0',
  defaultConfig: { lotSize: 0.1, stopLoss: 50 },
  riskConfig: { maxDrawdownPct: 20, maxDailyLossPct: 5, maxConsecutiveLosses: 5 },
  isActive: true,
};

const mockSubscription = {
  id: 'sub_integration',
  userId: 'user_integration',
  packageId: 'pkg_integration',
  status: 'ACTIVE',
  currentPeriodStart: new Date('2026-01-01'),
  currentPeriodEnd: new Date('2026-02-01'),
  stripeSubscriptionId: 'sub_stripe_integration',
  stripeCustomerId: 'cus_stripe_integration',
};

const mockLicense = {
  id: 'lic_integration',
  key: 'ea-integration-test-key',
  userId: 'user_integration',
  subscriptionId: 'sub_integration',
  strategyId: 'strat_integration',
  status: 'ACTIVE',
  expiresAt: new Date('2027-12-31'),
  maxAccounts: 3,
  killSwitch: false,
  killSwitchReason: null,
  user: mockUser,
  subscription: mockSubscription,
  strategy: mockStrategy,
  tradingAccounts: [],
};

const mockTradingAccount = {
  id: 'acc_integration',
  userId: 'user_integration',
  licenseId: 'lic_integration',
  accountNumber: '999999',
  brokerName: 'IntegrationBroker',
  platform: 'MT5',
  status: 'ACTIVE',
  lastHeartbeatAt: new Date(),
};

// ─── Full User Journey: Signup → License → Heartbeat ──────────────────────────

describe('Full User Journey: Signup to Trading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('should complete the full user journey from subscription to heartbeat', async () => {
    // Step 1: User creates checkout session
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.package.findUnique as any).mockResolvedValue(mockPackage);
    (prisma.subscription.findFirst as any).mockResolvedValue(null);

    const checkoutResult = await createCheckoutSession(
      'user_integration',
      'pkg_integration',
      'https://app.example.com/success',
      'https://app.example.com/cancel'
    );

    expect(checkoutResult).toHaveProperty('sessionId');
    expect(checkoutResult).toHaveProperty('url');

    // Step 2: Create license (simulating post-checkout flow)
    (prisma.license.create as any).mockResolvedValue({
      ...mockLicense,
      tradingAccounts: undefined,
    });

    const licenseResult = await createLicense({
      userId: 'user_integration',
      subscriptionId: 'sub_integration',
      strategyId: 'strat_integration',
      maxAccounts: 3,
      expiresAt: new Date('2027-12-31'),
    });

    expect(licenseResult.license).toBeDefined();
    expect(licenseResult.rawKey).toMatch(/^ea-/);

    // Step 3: Validate the license
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const validationResult = await validateLicense(licenseResult.rawKey);

    expect(validationResult.valid).toBe(true);
    expect(validationResult.license).toBeDefined();
    expect(validationResult.strategy).toBeDefined();

    // Step 4: EA sends heartbeat
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(null); // New account
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
      status: 'ACTIVE',
    });
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const heartbeatResult = await processHeartbeat(
      {
        licenseKey: licenseResult.rawKey,
        accountNumber: '999999',
        platform: 'MT5',
        equity: 10000,
        balance: 10500,
        openPositions: 2,
        marginLevel: 200,
      },
      'lic_integration',
      'user_integration'
    );

    expect(heartbeatResult.status).toBe('ok');
    expect(heartbeatResult.kill).toBe(false);

    // Step 5: EA gets config
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const configResult = await getEAConfig('lic_integration');

    expect(configResult.config).toBeDefined();
    expect(configResult.riskConfig).toBeDefined();
    expect(configResult.configHash).toBeDefined();

    // Step 6: EA sends trade event
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
    (prisma.tradeEvent.create as any).mockResolvedValue({
      id: 'evt_integration',
      ticket: 'TRADE001',
    });

    const tradeResult = await processTradeEvent(
      {
        licenseKey: licenseResult.rawKey,
        accountNumber: '999999',
        ticket: 'TRADE001',
        symbol: 'EURUSD',
        direction: 'BUY',
        eventType: 'OPEN',
        volume: 0.1,
        openPrice: 1.0850,
      },
      'lic_integration'
    );

    expect(tradeResult.status).toBe('created');

    // Step 7: EA sends metrics
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.metric.create as any).mockResolvedValue({ id: 'metric_integration' });

    const metricsResult = await processMetrics(
      {
        licenseKey: licenseResult.rawKey,
        accountNumber: '999999',
        equity: 10000,
        balance: 10500,
        drawdownPct: 5.0,
        openPositions: 2,
      },
      'lic_integration'
    );

    expect(metricsResult.status).toBe('accepted');
  });
});

// ─── Risk Breach Flow ──────────────────────────────────────────────────────────

describe('Risk Breach Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('should trigger kill switch when risk rules are breached', async () => {
    // License initially valid
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const validationResult = await validateLicense('ea-test-key');
    expect(validationResult.valid).toBe(true);

    // Admin activates kill switch
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      killSwitch: true,
      killSwitchReason: 'Risk breach: MAX_DRAWDOWN',
    });

    const killResult = await toggleKillSwitch('lic_integration', true, 'Risk breach: MAX_DRAWDOWN', 'admin_01');

    expect(killResult.killSwitch).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(expect.stringContaining('kill:'), '1');

    // License validation should now fail
    (redis.get as any).mockImplementation((key: string) => {
      if (key.includes('kill:')) return Promise.resolve('1');
      return Promise.resolve(null);
    });
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      killSwitch: true,
      killSwitchReason: 'Risk breach: MAX_DRAWDOWN',
    });

    const revokedValidation = await validateLicense('ea-test-key');
    expect(revokedValidation.valid).toBe(false);
    expect(revokedValidation.error).toBe('KILLED');
  });

  it('should revoke license for severe violations and invalidate all caches', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      status: 'REVOKED',
      killSwitch: true,
    });

    const result = await revokeLicense('lic_integration', 'Fraud detected', 'admin_01');

    expect(result.status).toBe('REVOKED');
    expect(redis.del).toHaveBeenCalled(); // Cache invalidated
    expect(redis.set).toHaveBeenCalledWith(expect.stringContaining('kill:'), '1');
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});

// ─── Subscription Lifecycle ───────────────────────────────────────────────────

describe('Subscription Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle subscription creation → payment → cancellation flow', async () => {
    // Step 1: Get active subscription
    (prisma.subscription.findFirst as any).mockResolvedValue({
      ...mockSubscription,
      package: mockPackage,
      licenses: [],
    });

    const subscription = await getUserSubscription('user_integration');
    expect(subscription).toBeDefined();
    expect(subscription?.status).toBe('ACTIVE');

    // Step 2: Cancel subscription at period end
    (prisma.subscription.findFirst as any).mockResolvedValue(mockSubscription);
    (prisma.subscription.update as any).mockResolvedValue({
      ...mockSubscription,
      cancelAtPeriodEnd: true,
    });

    const cancelResult = await cancelSubscription('sub_integration', 'user_integration', false, 'Too expensive');

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { cancelAtPeriodEnd: true },
      })
    );

    // Step 3: Cancel immediately
    (prisma.subscription.findFirst as any).mockResolvedValue(mockSubscription);
    (prisma.subscription.update as any).mockResolvedValue({
      ...mockSubscription,
      status: 'CANCELED',
    });
    (prisma.license.updateMany as any).mockResolvedValue({ count: 1 });

    await cancelSubscription('sub_integration', 'user_integration', true, 'Done');

    expect(prisma.license.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'EXPIRED' },
      })
    );
  });
});

// ─── License Validation Edge Cases ────────────────────────────────────────────

describe('License Validation Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('should handle cache miss → database query → cache write flow', async () => {
    // First call: cache miss
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const result1 = await validateLicense('ea-integration-key');
    expect(result1.valid).toBe(true);
    expect(prisma.license.findUnique).toHaveBeenCalledTimes(1);
    expect(redis.setex).toHaveBeenCalled(); // Cache written

    // Second call: would hit cache (in real Redis, but mock returns null so DB hit)
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    const result2 = await validateLicense('ea-integration-key');
    expect(result2.valid).toBe(true);
  });

  it('should handle global kill switch override', async () => {
    // License is valid
    (prisma.license.findUnique as any).mockResolvedValue(mockLicense);

    // But global kill switch is active
    (redis.get as any).mockImplementation((key: string) => {
      if (key === 'kill:global') return Promise.resolve('1');
      if (key.includes('license:validate:')) return Promise.resolve(null);
      return Promise.resolve(null);
    });

    const result = await validateLicense('ea-integration-key');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('KILLED');
    expect(result.message).toContain('Kill switch');
  });

  it('should handle subscription status transitions affecting license validity', async () => {
    // ACTIVE subscription → valid license
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      subscription: { ...mockSubscription, status: 'ACTIVE' },
    });

    const activeResult = await validateLicense('ea-test-key');
    expect(activeResult.valid).toBe(true);

    // PAST_DUE subscription → valid license (still allowed)
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      subscription: { ...mockSubscription, status: 'PAST_DUE' },
    });

    const pastDueResult = await validateLicense('ea-test-key');
    expect(pastDueResult.valid).toBe(true);

    // CANCELED subscription → invalid license
    (prisma.license.findUnique as any).mockResolvedValue({
      ...mockLicense,
      subscription: { ...mockSubscription, status: 'CANCELED' },
    });

    const canceledResult = await validateLicense('ea-test-key');
    expect(canceledResult.valid).toBe(false);
    expect(canceledResult.error).toBe('SUBSCRIPTION_INACTIVE');
  });
});

// ─── Multi-Account License Testing ────────────────────────────────────────────

describe('Multi-Account License', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('should allow up to maxAccounts linked accounts', async () => {
    const twoAccountsLicense = {
      ...mockLicense,
      tradingAccounts: [
        { id: 'acc_01', accountNumber: '111111', status: 'ACTIVE' },
        { id: 'acc_02', accountNumber: '222222', status: 'ACTIVE' },
      ],
      maxAccounts: 3,
    };

    // Third account should be allowed (below max)
    (prisma.license.findUnique as any)
      .mockResolvedValueOnce(twoAccountsLicense) // Base validation
      .mockResolvedValueOnce(twoAccountsLicense); // Account check

    const result = await validateLicense('ea-test-key', '333333');
    expect(result.valid).toBe(true);
  });

  it('should reject account when maxAccounts reached', async () => {
    const fullLicense = {
      ...mockLicense,
      tradingAccounts: [
        { id: 'acc_01', accountNumber: '111111', status: 'ACTIVE' },
        { id: 'acc_02', accountNumber: '222222', status: 'ACTIVE' },
        { id: 'acc_03', accountNumber: '333333', status: 'ACTIVE' },
      ],
      maxAccounts: 3,
    };

    (prisma.license.findUnique as any)
      .mockResolvedValueOnce(fullLicense) // Base validation
      .mockResolvedValueOnce(fullLicense); // Account check

    const result = await validateLicense('ea-test-key', '444444');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('MAX_ACCOUNTS_REACHED');
  });

  it('should exclude UNLINKED accounts from the count', async () => {
    const licenseWithUnlinked = {
      ...mockLicense,
      tradingAccounts: [
        { id: 'acc_01', accountNumber: '111111', status: 'ACTIVE' },
        { id: 'acc_02', accountNumber: '222222', status: 'UNLINKED' },
      ],
      maxAccounts: 2,
    };

    // Only 1 active account, so a new one should be allowed
    (prisma.license.findUnique as any)
      .mockResolvedValueOnce(licenseWithUnlinked)
      .mockResolvedValueOnce(licenseWithUnlinked);

    const result = await validateLicense('ea-test-key', '333333');
    expect(result.valid).toBe(true);
  });
});

// ─── Trade Event Idempotency ──────────────────────────────────────────────────

describe('Trade Event Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return duplicate status for already processed trade', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradeEvent.findUnique as any).mockResolvedValue({
      id: 'evt_existing',
      ticket: 'TRADE001',
    });

    const result = await processTradeEvent(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '999999',
        ticket: 'TRADE001',
        symbol: 'EURUSD',
        direction: 'BUY',
        eventType: 'OPEN',
        volume: 0.1,
      },
      'lic_integration'
    );

    expect(result.status).toBe('duplicate');
    expect(result.eventId).toBe('evt_existing');
    expect(prisma.tradeEvent.create).not.toHaveBeenCalled();
  });

  it('should create new event for unique ticket', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
    (prisma.tradeEvent.create as any).mockResolvedValue({
      id: 'evt_new',
      ticket: 'TRADE002',
    });

    const result = await processTradeEvent(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '999999',
        ticket: 'TRADE002',
        symbol: 'GBPUSD',
        direction: 'SELL',
        eventType: 'OPEN',
        volume: 0.2,
      },
      'lic_integration'
    );

    expect(result.status).toBe('created');
    expect(result.eventId).toBe('evt_new');
    expect(prisma.tradeEvent.create).toHaveBeenCalled();
  });
});

// ─── Metrics and Risk Integration ──────────────────────────────────────────────

describe('Metrics and Risk Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger risk evaluation when metrics are submitted', async () => {
    const { evaluateRiskOnMetrics } = await import('../../src/api/services/risk.service');

    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.metric.create as any).mockResolvedValue({ id: 'metric_01' });

    await processMetrics(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '999999',
        equity: 10000,
        balance: 10500,
        drawdownPct: 5.0,
        openPositions: 2,
      },
      'lic_integration'
    );

    expect(evaluateRiskOnMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        licenseId: 'lic_integration',
        equity: 10000,
        drawdownPct: 5.0,
      })
    );
  });

  it('should cache metrics in Redis for later risk evaluation', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.metric.create as any).mockResolvedValue({ id: 'metric_01' });

    await processMetrics(
      {
        licenseKey: 'ea-test-key',
        accountNumber: '999999',
        equity: 10000,
        balance: 10500,
        drawdownPct: 5.0,
        openPositions: 2,
      },
      'lic_integration'
    );

    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringContaining('metrics:latest:'),
      3600,
      expect.any(String)
    );

    // Verify cached data includes drawdownPct
    const cachedData = JSON.parse((redis.setex as any).mock.calls[0][2]);
    expect(cachedData.drawdownPct).toBe(5.0);
  });
});

// ─── Audit Trail ──────────────────────────────────────────────────────────────

describe('Audit Trail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create audit log entries for admin actions', async () => {
    // Revoke license
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      status: 'REVOKED',
      killSwitch: true,
    });

    await revokeLicense('lic_integration', 'Violation', 'admin_01');

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

  it('should create audit log for kill switch toggle', async () => {
    (prisma.license.update as any).mockResolvedValue({
      ...mockLicense,
      killSwitch: true,
    });

    await toggleKillSwitch('lic_integration', true, 'Emergency', 'admin_01');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ACTIVATE_KILL_SWITCH',
        }),
      })
    );
  });
});