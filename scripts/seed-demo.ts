#!/usr/bin/env npx tsx
// ─── Full Seed: Strategies + Packages + Test User + Trial Subscription + License ───
// Run from PowerShell: npx tsx scripts/seed-demo.ts
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient, BillingCycle, SubscriptionStatus, LicenseStatus } from '@prisma/client';
import { generateLicenseKey } from '../src/api/services/license.service';

const prisma = new PrismaClient();

// ─── EA v12 Default Config ──────────────────────────────────────────────────
const STRATEGY_DEFAULT_CONFIG = {
  // 3-Wave Cashout
  wave1: { enabled: true, closePercent: 0.33, tpPercent: 0.25 },
  wave2: { enabled: true, closePercent: 0.34, tpPercent: 0.50 },
  wave3: { enabled: true, closePercent: 0.33, mode: 'trailing', trailPoints: 300 },

  // Entry
  timeframe: 'H1',
  lotSize: 0.01,
  maxDailyTrades: 5,
  maxSpread: 30,

  // Smart Money Filters (PA/SMC)
  smartMoney: {
    bos:  { enabled: true, weight: 1, direction: 'trend' },
    choch: { enabled: true, weight: 2, direction: 'reversal' },
    ob:   { enabled: true, weight: 1, direction: 'both' },
    fvg:  { enabled: true, weight: 1, direction: 'both' },
    liq:  { enabled: true, weight: 2, direction: 'both' },
    sd:   { enabled: true, weight: 1, direction: 'both' },
    confluenceGate: { minScore: 2, blockOpposing: true },
  },

  // Risk
  stopLoss: { enabled: true, atrMultiplier: 1.5 },
  trailingStop: { enabled: true, startAt: 100, step: 50 },
  maxDrawdown: 0.10,
  maxOpenPositions: 1,
};

const STRATEGY_RISK_CONFIG = {
  // Platform-level risk rules
  maxDailyLoss: { enabled: true, percent: 5 },
  maxDrawdown: { enabled: true, percent: 10 },
  maxTradesPerDay: { enabled: true, count: 5 },
  maxSpread: { enabled: true, points: 30 },
  newsFilter: { enabled: true, minutesBefore: 30, minutesAfter: 15 },
  sessionFilter: {
    enabled: true,
    allowedSessions: ['London', 'NewYork'],
    blockedSessions: ['Asia'],
  },
  killSwitch: { enabled: true, allowManualTrigger: true },
};

async function main() {
  console.log('🌱 Seeding demo data for TradeCandle v12...\n');

  // ─── 1. Clean existing demo data ──────────────────────────────────────────
  console.log('🧹 Cleaning existing data...');
  // Delete in correct order (children first to avoid FK constraints)
  await prisma.riskEvent.deleteMany();
  await prisma.metric.deleteMany();
  await prisma.tradeEvent.deleteMany();
  await prisma.heartbeat.deleteMany();
  await prisma.tradingAccount.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.license.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.configVersion.deleteMany();
  await prisma.package.deleteMany();
  await prisma.strategy.deleteMany();
  // Keep user if exists, delete demo users
  await prisma.user.deleteMany({
    where: { email: { in: ['demo@tradecandle.ai', 'starter@tradecandle.ai', 'pro@tradecandle.ai', 'elite@tradecandle.ai'] } },
  });
  console.log('  ✅ Cleaned\n');

  // ─── 2. Create Strategy ───────────────────────────────────────────────────
  console.log('📋 Creating Strategy: TradeCandle v12...');
  const strategy = await prisma.strategy.create({
    data: {
      name: 'TradeCandle v12',
      description: 'AI Gold Trading Bot — 3-Wave Cashout + 6 Smart Money Filters for XAUUSD on MT5',
      version: '12.0.0',
      defaultConfig: STRATEGY_DEFAULT_CONFIG,
      riskConfig: STRATEGY_RISK_CONFIG,
      isActive: true,
    },
  });
  console.log(`  ✅ Strategy: ${strategy.id} (${strategy.name} v${strategy.version})\n`);

  // ─── 3. Create Packages ───────────────────────────────────────────────────
  console.log('💰 Creating Packages...');

  const starterPkg = await prisma.package.create({
    data: {
      name: 'Starter',
      description: 'For Beginner Traders 1 MT5 Accounts — 3-Wave Cashout + Dashboard',
      priceCents: 990,
      currency: 'USD',
      billingCycle: BillingCycle.MONTHLY,
      maxAccounts: 1,
      features: {
        maxAccounts: 1,
        strategyIds: [strategy.id],
        features: [
          '1 MT5 Accounts',
          'SaaS Dashboard',
          'Heartbeat Monitor',
          'Email Support',
          '3-Wave Cashout',
          '6 Smart Money Filters',
        ],
        support: 'email',
      },
      isActive: true,
      sortOrder: 1,
      stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    },
  });

  const proPkg = await prisma.package.create({
    data: {
      name: 'Pro',
      description: 'For Serious Traders 3 Accounts — Kill Switch + Risk Management + Line Support',
      priceCents: 2490,
      currency: 'USD',
      billingCycle: BillingCycle.MONTHLY,
      maxAccounts: 3,
      features: {
        maxAccounts: 3,
        strategyIds: [strategy.id],
        features: [
          '3 MT5 Accounts',
          'Dashboard + Kill Switch',
          'Heartbeat + Risk Management',
          'Line Support',
          '3-Wave Cashout',
          '6 Smart Money Filters',
        ],
        support: 'line',
      },
      isActive: true,
      sortOrder: 2,
      stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null,
    },
  });

  const elitePkg = await prisma.package.create({
    data: {
      name: 'Elite',
      description: 'For Professional Traders — 5 Accounts: Custom Config + VIP Line + 1-on-1 Setup Call',
      priceCents: 4990,
      currency: 'USD',
      billingCycle: BillingCycle.MONTHLY,
      maxAccounts: 5,
      features: {
        maxAccounts: 5,
        strategyIds: [strategy.id],
        features: [
          '5 MT5 Accounts',
          'Everything in Pro',
          'Custom EA Config',
          'VIP Line + 1-on-1 Setup Call',
          '3-Wave Cashout',
          '6 Smart Money Filters',
        ],
        support: 'vip_line',
      },
      isActive: true,
      sortOrder: 3,
      stripePriceId: process.env.STRIPE_ELITE_PRICE_ID || null,
    },
  });

  console.log(`  ✅ Starter: ${starterPkg.id} — 990 USD/mo`);
  console.log(`  ✅ Pro:     ${proPkg.id} — 2,490 USD/mo`);
  console.log(`  ✅ Elite:   ${elitePkg.id} — 4,990 USD/mo\n`);

  // ─── 4. Create Demo Users with Subscriptions & Licenses ───────────────────
  console.log('👤 Creating demo users...\n');

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days trial
  const monthEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // --- Demo user (_TRIAL_, full access for testing) ---
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@tradecandle.ai',
      name: 'Demo User',
      passwordHash: '$2a$10$demo.hash.placeholder.for.testing.only', // placeholder
      role: 'TRADER',
    },
  });

  const demoSub = await prisma.subscription.create({
    data: {
      userId: demoUser.id,
      packageId: proPkg.id,
      status: SubscriptionStatus.TRIAL,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      cancelAtPeriodEnd: false,
    },
  });

  const rawDemoKey = generateLicenseKey();
  await prisma.license.create({
    data: {
      key: rawDemoKey,
      userId: demoUser.id,
      subscriptionId: demoSub.id,
      strategyId: strategy.id,
      maxAccounts: 3,
      expiresAt: trialEnd,
      status: LicenseStatus.ACTIVE,
    },
  });

  console.log(`  ✅ Demo User: ${demoUser.email}`);
  console.log(`     License Key: ${rawDemoKey}`);
  console.log(`     Package: Pro (TRIAL)`);
  console.log(`     Max Accounts: 3`);
  console.log(`     Expires: ${trialEnd.toISOString()}\n`);

  // --- Starter test user ---
  const starterUser = await prisma.user.create({
    data: {
      email: 'starter@tradecandle.ai',
      name: 'Starter Test',
      passwordHash: '$2a$10$starter.hash.placeholder',
      role: 'TRADER',
    },
  });

  const starterSub = await prisma.subscription.create({
    data: {
      userId: starterUser.id,
      packageId: starterPkg.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: monthEnd,
      cancelAtPeriodEnd: false,
    },
  });

  const rawStarterKey = generateLicenseKey();
  await prisma.license.create({
    data: {
      key: rawStarterKey,
      userId: starterUser.id,
      subscriptionId: starterSub.id,
      strategyId: strategy.id,
      maxAccounts: 1,
      expiresAt: monthEnd,
      status: LicenseStatus.ACTIVE,
    },
  });

  console.log(`  ✅ Starter User: ${starterUser.email}`);
  console.log(`     License Key: ${rawStarterKey}`);
  console.log(`     Package: Starter (ACTIVE)`);
  console.log(`     Max Accounts: 1`);
  console.log(`     Expires: ${monthEnd.toISOString()}\n`);

  // --- Pro test user ---
  const proUser = await prisma.user.create({
    data: {
      email: 'pro@tradecandle.ai',
      name: 'Pro Test',
      passwordHash: '$2a$10$pro.hash.placeholder',
      role: 'TRADER',
    },
  });

  const proSub = await prisma.subscription.create({
    data: {
      userId: proUser.id,
      packageId: proPkg.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: monthEnd,
      cancelAtPeriodEnd: false,
    },
  });

  const rawProKey = generateLicenseKey();
  await prisma.license.create({
    data: {
      key: rawProKey,
      userId: proUser.id,
      subscriptionId: proSub.id,
      strategyId: strategy.id,
      maxAccounts: 3,
      expiresAt: monthEnd,
      status: LicenseStatus.ACTIVE,
    },
  });

  console.log(`  ✅ Pro User: ${proUser.email}`);
  console.log(`     License Key: ${rawProKey}`);
  console.log(`     Package: Pro (ACTIVE)`);
  console.log(`     Max Accounts: 3`);
  console.log(`     Expires: ${monthEnd.toISOString()}\n`);

  // --- Elite test user ---
  const eliteUser = await prisma.user.create({
    data: {
      email: 'elite@tradecandle.ai',
      name: 'Elite Test',
      passwordHash: '$2a$10$elite.hash.placeholder',
      role: 'TRADER',
    },
  });

  const eliteSub = await prisma.subscription.create({
    data: {
      userId: eliteUser.id,
      packageId: elitePkg.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: monthEnd,
      cancelAtPeriodEnd: false,
    },
  });

  const rawEliteKey = generateLicenseKey();
  await prisma.license.create({
    data: {
      key: rawEliteKey,
      userId: eliteUser.id,
      subscriptionId: eliteSub.id,
      strategyId: strategy.id,
      maxAccounts: 5,
      expiresAt: monthEnd,
      status: LicenseStatus.ACTIVE,
    },
  });

  console.log(`  ✅ Elite User: ${eliteUser.email}`);
  console.log(`     License Key: ${rawEliteKey}`);
  console.log(`     Package: Elite (ACTIVE)`);
  console.log(`     Max Accounts: 5`);
  console.log(`     Expires: ${monthEnd.toISOString()}\n`);

  // ─── 5. Summary ──────────────────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Demo data seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📋 Strategy:    TradeCandle v12 (XAUUSD/MT5)');
  console.log('💰 Packages:    Starter (990$) / Pro (2,490$) / Elite (4,990$)');
  console.log('');
  console.log('👤 Test Accounts:');
  console.log('   demo@tradecandle.ai     — Pro TRIAL (7 days)');
  console.log('   starter@tradecandle.ai   — Starter ACTIVE');
  console.log('   pro@tradecandle.ai       — Pro ACTIVE');
  console.log('   elite@tradecandle.ai    — Elite ACTIVE');
  console.log('');
  console.log('🔑 License Keys are shown above — copy them for testing!');
  console.log('');
  console.log('⚠️  Passwords are placeholder hashes — set real passwords before production.');
  console.log('⚠️  Update STRIPE_*_PRICE_ID in .env after creating Stripe products.');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });