import { Prisma, PrismaClient, UserRole, UserStatus, BillingCycle, AdminRole, SubscriptionStatus } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Create Default Admin User ───────────────────────────────────────────
  const adminPasswordHash = await hashPassword('Admin@2026!Secure');
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@ea-saas.com' },
    update: {
      passwordHash: adminPasswordHash,
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
      twoFactorEnabled: false,
    },
    create: {
      email: 'admin@ea-saas.com',
      passwordHash: adminPasswordHash,
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
      twoFactorEnabled: false,
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // ─── Create Demo Trader User ──────────────────────────────────────────────
  const traderPasswordHash = await hashPassword('Trader@2026!Demo');
  const trader = await prisma.user.upsert({
    where: { email: 'trader@demo.com' },
    update: {
      passwordHash: traderPasswordHash,
      name: 'Demo Trader',
      timezone: 'UTC',
      role: UserRole.TRADER,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
      autoLinkAccounts: true,
    },
    create: {
      email: 'trader@demo.com',
      passwordHash: traderPasswordHash,
      name: 'Demo Trader',
      timezone: 'UTC',
      role: UserRole.TRADER,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
      autoLinkAccounts: true,
    },
  });
  console.log(`✅ Demo trader created: ${trader.email}`);

  // ─── Create Strategy: TradeCandle v12 ────────────────────────────────────
  // This is the real EA — XAUUSD 3-Wave Cashout + PA/SMC + Time Filter
  const tradecandleV12 = await prisma.strategy.upsert({
    where: { name: 'TradeCandle Gold Scalper' },
    update: {
      version: '12.0.0',
      description: 'XAUUSD M5 auto-trading EA — 3-Wave Cashout + PA/SMC Confluence + Time Filter. Backtested 1yr +$5,171 PF 1.18 WR 74%.',
      defaultConfig: {
        symbol: 'XAUUSDm',
        timeframe: 'M5',
        lotSize: 0.03,
        slAtrMult: 2.0,
        tpRatio: 2.0,
        wave1TPPct: 40.0,
        wave2TPPct: 75.0,
        beActivatePct: 35.0,
        beLevelPct: 10.0,
        trailStartPct: 45.0,
        trailStepPips: 5,
        trailDistancePips: 8,
        emaFast: 9,
        emaSlow: 21,
        htfPeriod: 'H4',
        rsiPeriod: 14,
        rsiOverbought: 70,
        rsiOversold: 30,
        rsiSellBlock: 25,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
        atrPeriod: 14,
        magicNumber: 234000,
        maxSlippage: 30,
        tradeOnNewBar: true,
        cooldownBars: 5,
        minATR: 6.0,
        sidewaysMaxGap: 0.04,
        useTimeFilter: true,
        blockHours: [
          { start: 9, end: 11 },
          { start: 12, end: 14 },
          { start: 17, end: 19 },
          { start: 5, end: 6 },
        ],
        skipMonday: false,
        usePA: true,
        paTimeframe: 'H1',
        paLookback: 100,
        paMinConfluence: 2,
        swingBars: 5,
        obMinBodyPct: 0.5,
        fvgMinPips: 5,
        liqSweepPips: 3,
        sdMinMovePct: 0.4,
      },
      riskConfig: {
        maxDrawdownPct: 15,
        maxDailyLossPct: 3,
        maxConsecutiveLosses: 5,
        equityProtectionUsd: 500,
        maxOpenPositions: 3,
        marginLevelPct: 150,
        spreadFilter: { default: 3.0, XAUUSD: 5.0 },
        sessionFilter: {
          enabled: true,
          sessions: [
            { name: 'London', startHour: 8, endHour: 12 },
            { name: 'New York', startHour: 14, endHour: 17 },
          ],
        },
      },
      isActive: true,
    },
    create: {
      name: 'TradeCandle Gold Scalper',
      description: 'XAUUSD M5 auto-trading EA — 3-Wave Cashout + PA/SMC Confluence + Time Filter. Backtested 1yr +$5,171 PF 1.18 WR 74%.',
      version: '12.0.0',
      defaultConfig: {
        symbol: 'XAUUSDm',
        timeframe: 'M5',
        lotSize: 0.03,
        slAtrMult: 2.0,
        tpRatio: 2.0,
        wave1TPPct: 40.0,
        wave2TPPct: 75.0,
        beActivatePct: 35.0,
        beLevelPct: 10.0,
        trailStartPct: 45.0,
        trailStepPips: 5,
        trailDistancePips: 8,
        emaFast: 9,
        emaSlow: 21,
        htfPeriod: 'H4',
        rsiPeriod: 14,
        rsiOverbought: 70,
        rsiOversold: 30,
        rsiSellBlock: 25,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
        atrPeriod: 14,
        magicNumber: 234000,
        maxSlippage: 30,
        tradeOnNewBar: true,
        cooldownBars: 5,
        minATR: 6.0,
        sidewaysMaxGap: 0.04,
        useTimeFilter: true,
        blockHours: [
          { start: 9, end: 11 },
          { start: 12, end: 14 },
          { start: 17, end: 19 },
          { start: 5, end: 6 },
        ],
        skipMonday: false,
        usePA: true,
        paTimeframe: 'H1',
        paLookback: 100,
        paMinConfluence: 2,
        swingBars: 5,
        obMinBodyPct: 0.5,
        fvgMinPips: 5,
        liqSweepPips: 3,
        sdMinMovePct: 0.4,
      },
      riskConfig: {
        maxDrawdownPct: 15,
        maxDailyLossPct: 3,
        maxConsecutiveLosses: 5,
        equityProtectionUsd: 500,
        maxOpenPositions: 3,
        marginLevelPct: 150,
        spreadFilter: { default: 3.0, XAUUSD: 5.0 },
        sessionFilter: {
          enabled: true,
          sessions: [
            { name: 'London', startHour: 8, endHour: 12 },
            { name: 'New York', startHour: 14, endHour: 17 },
          ],
        },
      },
      isActive: true,
    },
  });
  console.log(`✅ Strategy created: ${tradecandleV12.name} v${tradecandleV12.version}`);

  // ─── Create Subscription Packages (THB pricing) ────────────────────────────
  const starterPackage = await prisma.package.upsert({
    where: { id: 'pkg_starter' },
    update: {
      name: 'Starter',
      description: 'For Beginner Traders 1 MT5 Accounts — 3-Wave Cashout + Dashboard',
      priceCents: 99000, // 990 THB
      currency: 'THB',
      billingCycle: 'MONTHLY',
      maxAccounts: 1,
      features: {
        strategyIds: [tradecandleV12.id],
        maxAccounts: 1,
        features: [
          '1 MT5 Accounts',
          'SaaS Dashboard',
          'Heartbeat Monitor',
          'Email Support',
          '3-Wave Cashout',
          '6 Smart Money Filters',
          'Time Filter',
        ],
        support: 'email',
      },
      isActive: true,
      sortOrder: 1,
    },
    create: {
      id: 'pkg_starter',
      name: 'Starter',
      description: 'For Beginner Traders 1 MT5 Accounts — 3-Wave Cashout + Dashboard',
      priceCents: 99000,
      currency: 'THB',
      billingCycle: 'MONTHLY',
      maxAccounts: 1,
      features: {
        strategyIds: [tradecandleV12.id],
        maxAccounts: 1,
        features: [
          '1 MT5 Accounts',
          'SaaS Dashboard',
          'Heartbeat Monitor',
          'Email Support',
          '3-Wave Cashout',
          '6 Smart Money Filters',
          'Time Filter',
        ],
        support: 'email',
      },
      isActive: true,
      sortOrder: 1,
    },
  });

  const proPackage = await prisma.package.upsert({
    where: { id: 'pkg_pro' },
    update: {
      name: 'Pro',
      description: 'For Serious Traders 3 Accounts — Kill Switch + Risk Management + Line Support',
      priceCents: 249000, // 2,490 THB
      currency: 'THB',
      billingCycle: 'MONTHLY',
      maxAccounts: 3,
      features: {
        strategyIds: [tradecandleV12.id],
        maxAccounts: 3,
        features: [
          '3 MT5 Accounts',
          'Dashboard + Kill Switch',
          'Heartbeat + Risk Management',
          'Line Support',
          '3-Wave Cashout',
          '6 Smart Money Filters',
          'Time Filter',
        ],
        support: 'line',
      },
      isActive: true,
      sortOrder: 2,
    },
    create: {
      id: 'pkg_pro',
      name: 'Pro',
      description: 'For Serious Traders 3 Accounts — Kill Switch + Risk Management + Line Support',
      priceCents: 249000,
      currency: 'THB',
      billingCycle: 'MONTHLY',
      maxAccounts: 3,
      features: {
        strategyIds: [tradecandleV12.id],
        maxAccounts: 3,
        features: [
          '3 MT5 Accounts',
          'Dashboard + Kill Switch',
          'Heartbeat + Risk Management',
          'Line Support',
          '3-Wave Cashout',
          '6 Smart Money Filters',
          'Time Filter',
        ],
        support: 'line',
      },
      isActive: true,
      sortOrder: 2,
    },
  });

  const elitePackage = await prisma.package.upsert({
    where: { id: 'pkg_elite' },
    update: {
      name: 'Elite',
      description: 'For Professional Traders — 5 Accounts: Custom Config + VIP Line + 1-on-1 Setup Call',
      priceCents: 499000, // 4,990 THB
      currency: 'THB',
      billingCycle: 'MONTHLY',
      maxAccounts: 5,
      features: {
        strategyIds: [tradecandleV12.id],
        maxAccounts: 5,
        features: [
          '5 MT5 Accounts',
          'Everything in Pro',
          'Custom EA Config',
          'VIP Line + 1-on-1 Setup Call',
          '3-Wave Cashout',
          '6 Smart Money Filters',
          'Time Filter',
        ],
        support: 'vip_line',
      },
      isActive: true,
      sortOrder: 3,
    },
    create: {
      id: 'pkg_elite',
      name: 'Elite',
      description: 'For Professional Traders — 5 Accounts: Custom Config + VIP Line + 1-on-1 Setup Call',
      priceCents: 499000,
      currency: 'THB',
      billingCycle: 'MONTHLY',
      maxAccounts: 5,
      features: {
        strategyIds: [tradecandleV12.id],
        maxAccounts: 5,
        features: [
          '5 MT5 Accounts',
          'Everything in Pro',
          'Custom EA Config',
          'VIP Line + 1-on-1 Setup Call',
          '3-Wave Cashout',
          '6 Smart Money Filters',
          'Time Filter',
        ],
        support: 'vip_line',
      },
      isActive: true,
      sortOrder: 3,
    },
  });

  console.log(`✅ Packages: Starter=${starterPackage.id}, Pro=${proPackage.id}, Elite=${elitePackage.id}`);

  // ─── Create Config Version for TradeCandle v12 ───────────────────────────
  const configHash = hashConfig(JSON.stringify(tradecandleV12.defaultConfig));
  await prisma.configVersion.upsert({
    where: {
      strategyId_configHash: {
        strategyId: tradecandleV12.id,
        configHash,
      },
    },
    update: {},
    create: {
      strategyId: tradecandleV12.id,
      configHash,
      configJson: tradecandleV12.defaultConfig as Prisma.InputJsonValue,
      changeReason: 'TradeCandle v12 initial seed',
    },
  });
  console.log('✅ Config version created for TradeCandle v12');

  // ─── Create Demo Subscription for Trader ──────────────────────────────────
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const demoSubscription = await prisma.subscription.upsert({
    where: { id: 'sub_demo_trader_pro' },
    update: {
      userId: trader.id,
      packageId: proPackage.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
    },
    create: {
      id: 'sub_demo_trader_pro',
      userId: trader.id,
      packageId: proPackage.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      cancelAtPeriodEnd: false,
    },
  });
  console.log(`✅ Demo subscription created: ${demoSubscription.id}`);

  // ─── Create Demo License for Trader ─────────────────────────────────────
  const { license: demoLicense, rawKey: demoLicenseKey } = await createLicenseWithKey({
    userId: trader.id,
    subscriptionId: demoSubscription.id,
    strategyId: tradecandleV12.id,
    maxAccounts: 3,
    expiresAt: nextMonth,
  });
  console.log(`✅ Demo license created: ${demoLicense.id}`);
  console.log(`   License Key: ${demoLicenseKey}`);

  // ─── Create Demo API Key for Trader ───────────────────────────────────────
  const apiKeyRaw = 'ea_demo_trader_local_2026';
  const apiKeyHash = crypto.createHash('sha256').update(apiKeyRaw).digest('hex');
  const apiKeyPrefix = apiKeyRaw.substring(0, 8);

  await prisma.apiKey.deleteMany({
    where: {
      userId: trader.id,
      name: 'Demo Trading API Key',
    },
  });

  await prisma.apiKey.create({
    data: {
      userId: trader.id,
      keyHash: apiKeyHash,
      keyPrefix: apiKeyPrefix,
      name: 'Demo Trading API Key',
    },
  });
  console.log(`✅ API key created for demo trader (prefix: ${apiKeyPrefix})`);
  console.log(`   Full API key: ${apiKeyRaw}`);

  console.log('\n🎉 Seeding complete!');
  console.log('\n📝 Default credentials:');
  console.log('   Admin: admin@ea-saas.com / Admin@2026!Secure');
  console.log('   Trader: trader@demo.com / Trader@2026!Demo');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

function hashConfig(configStr: string): string {
  return crypto.createHash('sha256').update(configStr).digest('hex');
}

async function createLicenseWithKey(input: {
  userId: string;
  subscriptionId: string;
  strategyId: string;
  maxAccounts: number;
  expiresAt: Date;
}) {
  const rawKey = `ea-${crypto.randomUUID()}`;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      const license = await prisma.license.create({
        data: {
          key: rawKey,
          userId: input.userId,
          subscriptionId: input.subscriptionId,
          strategyId: input.strategyId,
          maxAccounts: input.maxAccounts,
          expiresAt: input.expiresAt,
          status: 'ACTIVE',
        },
      });
      return { license, rawKey };
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('key')) {
        attempts++;
        continue;
      }
      throw error;
    }
  }
  throw new Error('Failed to generate unique license key');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });