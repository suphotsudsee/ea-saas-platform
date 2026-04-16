// ─── Trade Events API Tests ──────────────────────────────────────────────────
// Covers trade event creation, idempotency, batch processing, and metrics
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/api/lib/prisma', () => ({
  prisma: {
    tradingAccount: {
      findFirst: vi.fn(),
    },
    tradeEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    license: {
      findUnique: vi.fn(),
    },
    metric: {
      create: vi.fn(),
    },
    user: {
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
    tradeEventStream: () => 'stream:trade-events',
    notificationStream: () => 'stream:notifications',
  },
  RedisTTL: {},
}));

vi.mock('../../src/api/services/risk.service', () => ({
  evaluateRiskOnHeartbeat: vi.fn().mockResolvedValue({ breached: false, rules: [] }),
  evaluateRiskOnMetrics: vi.fn().mockResolvedValue({ breached: false, rules: [] }),
}));

import { prisma } from '../../src/api/lib/prisma';
import { redis } from '../../src/api/utils/redis';
import { processTradeEvent, processBatchTradeEvents, processMetrics } from '../../src/api/services/ea-contract.service';

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockTradingAccount = {
  id: 'acc_01',
  userId: 'user_01',
  licenseId: 'lic_01',
  accountNumber: '123456',
  brokerName: 'TestBroker',
  platform: 'MT5',
  status: 'ACTIVE',
};

const mockTradeEventPayload = {
  licenseKey: 'ea-test-key',
  accountNumber: '123456',
  ticket: 'TICK001',
  symbol: 'EURUSD',
  direction: 'BUY' as const,
  eventType: 'OPEN' as const,
  openPrice: 1.0850,
  volume: 0.1,
  openTime: '2026-01-15T10:00:00Z',
  profit: undefined,
  commission: 0.5,
  swap: 0,
  magicNumber: 12345,
  comment: 'Test trade',
};

const mockCreatedTradeEvent = {
  id: 'evt_01',
  licenseId: 'lic_01',
  tradingAccountId: 'acc_01',
  ticket: 'TICK001',
  symbol: 'EURUSD',
  direction: 'BUY',
  eventType: 'OPEN',
  openPrice: 1.0850,
  volume: 0.1,
  profit: null,
  commission: 0.5,
  swap: 0,
  magicNumber: 12345,
  comment: 'Test trade',
  createdAt: new Date(),
};

// ─── Process Trade Event ──────────────────────────────────────────────────────

describe('processTradeEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful trade event creation', () => {
    it('should create a trade event and push to stream', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradeEvent.findUnique as any).mockResolvedValue(null); // No duplicate
      (prisma.tradeEvent.create as any).mockResolvedValue(mockCreatedTradeEvent);

      const result = await processTradeEvent(mockTradeEventPayload, 'lic_01');

      expect(result.status).toBe('created');
      expect(result.eventId).toBe('evt_01');
      expect(prisma.tradeEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            licenseId: 'lic_01',
            tradingAccountId: 'acc_01',
            ticket: 'TICK001',
            symbol: 'EURUSD',
            direction: 'BUY',
            eventType: 'OPEN',
          }),
        })
      );
      expect(redis.xadd).toHaveBeenCalledWith(
        'stream:trade-events',
        expect.objectContaining({
          ticket: 'TICK001',
          symbol: 'EURUSD',
        })
      );
    });

    it('should handle CLOSE trade events with profit', async () => {
      const closePayload = {
        ...mockTradeEventPayload,
        eventType: 'CLOSE' as const,
        closePrice: 1.0900,
        profit: 50.0,
        closeTime: '2026-01-15T12:00:00Z',
      };

      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
      (prisma.tradeEvent.create as any).mockResolvedValue({
        ...mockCreatedTradeEvent,
        eventType: 'CLOSE',
        closePrice: 1.0900,
        profit: 50.0,
      });

      const result = await processTradeEvent(closePayload, 'lic_01');

      expect(result.status).toBe('created');
    });

    it('should handle MODIFY trade events', async () => {
      const modifyPayload = {
        ...mockTradeEventPayload,
        eventType: 'MODIFY' as const,
        ticket: 'TICK001',
      };

      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
      (prisma.tradeEvent.create as any).mockResolvedValue({
        ...mockCreatedTradeEvent,
        eventType: 'MODIFY',
      });

      const result = await processTradeEvent(modifyPayload, 'lic_01');
      expect(result.status).toBe('created');
    });

    it('should handle PARTIAL_CLOSE trade events', async () => {
      const partialClosePayload = {
        ...mockTradeEventPayload,
        eventType: 'PARTIAL_CLOSE' as const,
        volume: 0.05,
        profit: 25.0,
      };

      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
      (prisma.tradeEvent.create as any).mockResolvedValue({
        ...mockCreatedTradeEvent,
        eventType: 'PARTIAL_CLOSE',
      });

      const result = await processTradeEvent(partialClosePayload, 'lic_01');
      expect(result.status).toBe('created');
    });
  });

  describe('idempotency', () => {
    it('should return duplicate status for already-processed ticket', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradeEvent.findUnique as any).mockResolvedValue(mockCreatedTradeEvent);

      const result = await processTradeEvent(mockTradeEventPayload, 'lic_01');

      expect(result.status).toBe('duplicate');
      expect(result.eventId).toBe('evt_01');
      expect(prisma.tradeEvent.create).not.toHaveBeenCalled();
    });

    it('should check idempotency by licenseId + ticket', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradeEvent.findUnique as any).mockResolvedValue(mockCreatedTradeEvent);

      await processTradeEvent(mockTradeEventPayload, 'lic_01');

      expect(prisma.tradeEvent.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            licenseId_ticket: {
              licenseId: 'lic_01',
              ticket: 'TICK001',
            },
          },
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw error for unlinked trading account', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue(null);

      await expect(
        processTradeEvent(mockTradeEventPayload, 'lic_01')
      ).rejects.toThrow('Trading account not found or not linked');
    });

    it('should throw error for UNLINKED account status', async () => {
      (prisma.tradingAccount.findFirst as any).mockResolvedValue({
        ...mockTradingAccount,
        status: 'UNLINKED',
      });

      await expect(
        processTradeEvent(mockTradeEventPayload, 'lic_01')
      ).rejects.toThrow('Trading account not found or not linked');
    });

    it('should handle SELL direction trades', async () => {
      const sellPayload = {
        ...mockTradeEventPayload,
        direction: 'SELL' as const,
      };

      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
      (prisma.tradeEvent.create as any).mockResolvedValue({
        ...mockCreatedTradeEvent,
        direction: 'SELL',
      });

      const result = await processTradeEvent(sellPayload, 'lic_01');
      expect(result.status).toBe('created');
    });

    it('should handle trades with optional fields', async () => {
      const minimalPayload = {
        licenseKey: 'ea-test-key',
        accountNumber: '123456',
        ticket: 'TICK002',
        symbol: 'GBPUSD',
        direction: 'BUY' as const,
        eventType: 'OPEN' as const,
        volume: 0.5,
      };

      (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
      (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
      (prisma.tradeEvent.create as any).mockResolvedValue({
        id: 'evt_02',
        ticket: 'TICK002',
      });

      const result = await processTradeEvent(minimalPayload, 'lic_01');
      expect(result.status).toBe('created');
    });
  });
});

// ─── Batch Trade Events ──────────────────────────────────────────────────────

describe('processBatchTradeEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process multiple trade events', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
    (prisma.tradeEvent.create as any)
      .mockResolvedValueOnce({ id: 'evt_01' })
      .mockResolvedValueOnce({ id: 'evt_02' });

    const events = [
      { ...mockTradeEventPayload, ticket: 'TICK001' },
      { ...mockTradeEventPayload, ticket: 'TICK002' },
    ];

    const results = await processBatchTradeEvents(events, 'lic_01');

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('created');
    expect(results[1].status).toBe('created');
  });

  it('should handle partial failures in batch', async () => {
    (prisma.tradingAccount.findFirst as any)
      .mockResolvedValueOnce(mockTradingAccount)
      .mockResolvedValueOnce(null); // Second event fails

    (prisma.tradeEvent.findUnique as any).mockResolvedValue(null);
    (prisma.tradeEvent.create as any).mockResolvedValue({ id: 'evt_01' });

    const events = [
      { ...mockTradeEventPayload, ticket: 'TICK001' },
      { ...mockTradeEventPayload, ticket: 'TICK002' },
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

  it('should handle duplicates in batch', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.tradeEvent.findUnique as any)
      .mockResolvedValueOnce(null) // First is new
      .mockResolvedValueOnce({ id: 'evt_01' }); // Second is duplicate

    (prisma.tradeEvent.create as any).mockResolvedValue({ id: 'evt_02' });

    const events = [
      { ...mockTradeEventPayload, ticket: 'TICK001' },
      { ...mockTradeEventPayload, ticket: 'TICK001' }, // Duplicate
    ];

    const results = await processBatchTradeEvents(events, 'lic_01');

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('created');
    expect(results[1].status).toBe('duplicate');
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

    const metricsPayload = {
      licenseKey: 'ea-test-key',
      accountNumber: '123456',
      equity: 10000,
      balance: 10500,
      drawdownPct: 5.0,
      openPositions: 2,
      marginLevel: 200,
      freeMargin: 500,
    };

    const result = await processMetrics(metricsPayload, 'lic_01');

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

    const metricsPayload = {
      licenseKey: 'ea-test-key',
      accountNumber: '123456',
      equity: 10000,
      balance: 10500,
      drawdownPct: 5.0,
      openPositions: 2,
    };

    await processMetrics(metricsPayload, 'lic_01');

    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringContaining('metrics:latest:'),
      3600,
      expect.any(String)
    );
  });

  it('should throw error for unlinked trading account', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(null);

    const metricsPayload = {
      licenseKey: 'ea-test-key',
      accountNumber: '999999',
      equity: 10000,
      balance: 10500,
      drawdownPct: 5.0,
      openPositions: 2,
    };

    await expect(
      processMetrics(metricsPayload, 'lic_01')
    ).rejects.toThrow('Trading account not found or not linked');
  });

  it('should handle metrics with optional marginLevel and freeMargin', async () => {
    (prisma.tradingAccount.findFirst as any).mockResolvedValue(mockTradingAccount);
    (prisma.metric.create as any).mockResolvedValue({ id: 'metric_02' });

    const metricsPayload = {
      licenseKey: 'ea-test-key',
      accountNumber: '123456',
      equity: 10000,
      balance: 10500,
      drawdownPct: 3.5,
      openPositions: 1,
    };

    const result = await processMetrics(metricsPayload, 'lic_01');
    expect(result.status).toBe('accepted');
  });
});