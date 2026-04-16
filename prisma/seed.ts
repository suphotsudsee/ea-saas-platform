import { Prisma, PrismaClient, UserRole, UserStatus, BillingCycle, AdminRole } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Create Default Admin User ───────────────────────────────────────────
  const adminPasswordHash = await hashPassword('Admin@2026!Secure');
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@ea-saas.com' },
    update: {},
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
    update: {},
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

  // ─── Create Strategies ────────────────────────────────────────────────────
  const scalperStrategy = await prisma.strategy.upsert({
    where: { name: 'Gold Scalper Pro' },
    update: {},
    create: {
      name: 'Gold Scalper Pro',
      description: 'High-frequency scalping strategy for XAU/USD with tight risk management.',
      version: '2.1.0',
      defaultConfig: {
        lotSizingMethod: 'risk_percent',
        riskPercent: 1.0,
        maxLot: 0.5,
        minLot: 0.01,
        maxTradesPerDay: 10,
        maxSpreadPips: 2.0,
        tradingSessions: [
          { name: 'London', startHour: 8, endHour: 12 },
          { name: 'New York', startHour: 13, endHour: 17 },
        ],
        stopLossPips: 15,
        takeProfitPips: 10,
        trailingStop: false,
        magicNumber: 100100,
      },
      riskConfig: {
        maxDrawdownPct: 15,
        maxDailyLossPct: 3,
        maxConsecutiveLosses: 5,
        equityProtectionUsd: 500,
        maxOpenPositions: 3,
        marginLevelPct: 150,
        spreadFilter: { default: 2.0, XAUUSD: 3.0 },
        sessionFilter: { enabled: true, sessions: [
          { name: 'London', startHour: 8, endHour: 12 },
          { name: 'New York', startHour: 13, endHour: 17 },
        ]},
      },
      isActive: true,
    },
  });

  const swingStrategy = await prisma.strategy.upsert({
    where: { name: 'Forex Swing Master' },
    update: {},
    create: {
      name: 'Forex Swing Master',
      description: 'Medium-term swing trading strategy for major forex pairs.',
      version: '1.5.0',
      defaultConfig: {
        lotSizingMethod: 'fixed_lot',
        fixedLot: 0.1,
        maxLot: 1.0,
        minLot: 0.01,
        maxTradesPerDay: 3,
        maxSpreadPips: 3.0,
        tradingSessions: [
          { name: 'London-NY Overlap', startHour: 13, endHour: 17 },
        ],
        stopLossPips: 50,
        takeProfitPips: 100,
        trailingStop: true,
        trailingStopPips: 30,
        magicNumber: 200200,
      },
      riskConfig: {
        maxDrawdownPct: 20,
        maxDailyLossPct: 5,
        maxConsecutiveLosses: 7,
        equityProtectionUsd: 1000,
        maxOpenPositions: 5,
        marginLevelPct: 120,
        spreadFilter: { default: 3.0, EURUSD: 1.5, GBPUSD: 2.0 },
        sessionFilter: { enabled: true, sessions: [
          { name: 'London-NY Overlap', startHour: 13, endHour: 17 },
        ]},
      },
      isActive: true,
    },
  });

  const gridStrategy = await prisma.strategy.upsert({
    where: { name: 'Grid Trader Elite' },
    update: {},
    create: {
      name: 'Grid Trader Elite',
      description: 'Grid-based trading strategy with dynamic grid spacing and recovery mode.',
      version: '3.0.0',
      defaultConfig: {
        lotSizingMethod: 'martingale',
        startLot: 0.01,
        maxLot: 0.5,
        minLot: 0.01,
        gridSizePips: 20,
        maxOrders: 10,
        maxSpreadPips: 5.0,
        tradingSessions: [
          { name: 'Asian', startHour: 0, endHour: 8 },
          { name: 'London', startHour: 8, endHour: 16 },
          { name: 'New York', startHour: 13, endHour: 22 },
        ],
        stopLossPips: 0,
        takeProfitPips: 0,
        gridTakeProfitPips: 10,
        magicNumber: 300300,
      },
      riskConfig: {
        maxDrawdownPct: 30,
        maxDailyLossPct: 8,
        maxConsecutiveLosses: 10,
        equityProtectionUsd: 2000,
        maxOpenPositions: 10,
        marginLevelPct: 100,
        spreadFilter: { default: 5.0 },
        sessionFilter: { enabled: false, sessions: [] },
      },
      isActive: true,
    },
  });

  console.log(`✅ Strategies created: ${scalperStrategy.name}, ${swingStrategy.name}, ${gridStrategy.name}`);

  // ─── Create Subscription Packages ──────────────────────────────────────────
  const starterPackage = await prisma.package.upsert({
    where: { id: 'pkg_starter' },
    update: {},
    create: {
      id: 'pkg_starter',
      name: 'Starter',
      description: 'Perfect for beginners. Access one strategy with a single trading account.',
      priceCents: 4900,
      currency: 'USD',
      billingCycle: BillingCycle.MONTHLY,
      maxAccounts: 1,
      features: {
        strategyIds: [scalperStrategy.id],
        priority: 'normal',
        support: 'email',
        analytics: 'basic',
      },
      isActive: true,
      sortOrder: 1,
    },
  });

  const professionalPackage = await prisma.package.upsert({
    where: { id: 'pkg_professional' },
    update: {},
    create: {
      id: 'pkg_professional',
      name: 'Professional',
      description: 'For serious traders. Access two strategies with up to 3 trading accounts.',
      priceCents: 9900,
      currency: 'USD',
      billingCycle: BillingCycle.MONTHLY,
      maxAccounts: 3,
      features: {
        strategyIds: [scalperStrategy.id, swingStrategy.id],
        priority: 'high',
        support: 'priority_email',
        analytics: 'advanced',
      },
      isActive: true,
      sortOrder: 2,
    },
  });

  const enterprisePackage = await prisma.package.upsert({
    where: { id: 'pkg_enterprise' },
    update: {},
    create: {
      id: 'pkg_enterprise',
      name: 'Enterprise',
      description: 'Unlimited power. Access all strategies with up to 10 trading accounts and premium support.',
      priceCents: 24900,
      currency: 'USD',
      billingCycle: BillingCycle.MONTHLY,
      maxAccounts: 10,
      features: {
        strategyIds: [scalperStrategy.id, swingStrategy.id, gridStrategy.id],
        priority: 'highest',
        support: 'dedicated',
        analytics: 'full',
        customConfig: true,
      },
      isActive: true,
      sortOrder: 3,
    },
  });

  const yearlyStarterPackage = await prisma.package.upsert({
    where: { id: 'pkg_starter_yearly' },
    update: {},
    create: {
      id: 'pkg_starter_yearly',
      name: 'Starter (Yearly)',
      description: 'Starter plan billed annually. Save 20% compared to monthly.',
      priceCents: 47000,
      currency: 'USD',
      billingCycle: BillingCycle.YEARLY,
      maxAccounts: 1,
      features: {
        strategyIds: [scalperStrategy.id],
        priority: 'normal',
        support: 'email',
        analytics: 'basic',
      },
      isActive: true,
      sortOrder: 4,
    },
  });

  const yearlyProPackage = await prisma.package.upsert({
    where: { id: 'pkg_professional_yearly' },
    update: {},
    create: {
      id: 'pkg_professional_yearly',
      name: 'Professional (Yearly)',
      description: 'Professional plan billed annually. Save 25% compared to monthly.',
      priceCents: 89000,
      currency: 'USD',
      billingCycle: BillingCycle.YEARLY,
      maxAccounts: 3,
      features: {
        strategyIds: [scalperStrategy.id, swingStrategy.id],
        priority: 'high',
        support: 'priority_email',
        analytics: 'advanced',
      },
      isActive: true,
      sortOrder: 5,
    },
  });

  console.log(`✅ Packages created: ${starterPackage.name}, ${professionalPackage.name}, ${enterprisePackage.name}, ${yearlyStarterPackage.name}, ${yearlyProPackage.name}`);

  // ─── Create Config Versions for Strategies ──────────────────────────────────
  const strategies = [scalperStrategy, swingStrategy, gridStrategy];
  for (const strategy of strategies) {
    const configHash = hashConfig(JSON.stringify(strategy.defaultConfig));
    await prisma.configVersion.upsert({
      where: {
        strategyId_configHash: {
          strategyId: strategy.id,
          configHash,
        },
      },
      update: {},
      create: {
        strategyId: strategy.id,
        configHash,
        configJson: strategy.defaultConfig as Prisma.InputJsonValue,
        changeReason: 'Initial seed',
      },
    });
  }
  console.log('✅ Config versions created for all strategies');

  // ─── Create Demo API Key for Trader ───────────────────────────────────────
  const apiKeyRaw = `ea_${crypto.randomUUID()}`;
  const apiKeyHash = crypto.createHash('sha256').update(apiKeyRaw).digest('hex');
  const apiKeyPrefix = apiKeyRaw.substring(0, 8);

  await prisma.apiKey.upsert({
    where: { keyHash: apiKeyHash },
    update: {},
    create: {
      userId: trader.id,
      keyHash: apiKeyHash,
      keyPrefix: apiKeyPrefix,
      name: 'Demo Trading API Key',
    },
  });
  console.log(`✅ API key created for demo trader (prefix: ${apiKeyPrefix})`);
  console.log(`   Full API key (save this — shown only once): ${apiKeyRaw}`);

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

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
