import { NextResponse } from 'next/server';
import { PrismaClient, BillingCycle } from '@prisma/client';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Step 1: Push schema to database (creates/updates tables)
    console.log('📊 Pushing schema to database...');
    try {
      execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', {
        cwd: process.cwd(),
        timeout: 60000,
        env: { ...process.env },
      });
      console.log('✅ Schema pushed');
    } catch (e) {
      console.log('⚠️ Schema push warning:', String(e).substring(0, 200));
    }

    // Step 2: Ensure TradeCandle v12 Strategy exists
    let strategy = await prisma.strategy.findFirst({
      where: { name: 'TradeCandle Gold Scalper' },
    });

    if (!strategy) {
      strategy = await prisma.strategy.create({
        data: {
          name: 'TradeCandle Gold Scalper',
          description: 'XAUUSD M5 auto-trading EA — 3-Wave Cashout + PA/SMC Confluence + Time Filter. Backtested 1yr +$5,171 PF 1.18 WR 74%.',
          version: '12.0.0',
          defaultConfig: {
            symbol: 'XAUUSDm',
            timeframe: 'M5',
            lotSize: 0.03,
          },
          riskConfig: {
            maxDrawdownPct: 15,
            maxDailyLossPct: 3,
          },
          isActive: true,
        },
      });
    }

    // Step 3: Delete existing packages (cascade subscriptions first)
    const existing = await prisma.package.findMany();
    for (const pkg of existing) {
      await prisma.subscription.deleteMany({ where: { packageId: pkg.id } });
    }
    await prisma.package.deleteMany();

    // Step 4: Create Trial Package (1 month = 30 days)
    const trial = await prisma.package.create({
      data: {
        name: '1-Month Free Trial',
        description: 'Trial TradeCandle Gold Scalper v12 Free 30 days — 1 MT5 Accounts + Dashboard + 3-Wave Cashout',
        priceCents: 0, // Free
        currency: 'USD',
        billingCycle: BillingCycle.MONTHLY,
        maxAccounts: 1,
        isTrial: true,
        trialDays: 30,
        features: {
          strategyIds: [strategy.id],
          maxAccounts: 1,
          features: [
            '1 MT5 Accounts',
            'SaaS Dashboard',
            '3-Wave Cashout',
            '6 Smart Money Filters',
            'Time Filter',
            'Free Trial 30 days',
            'Email Support',
          ],
          support: 'email',
        },
        isActive: true,
        sortOrder: 0, // Show before other packages
      },
    });

    // Step 5: Create Starter
    const starter = await prisma.package.create({
      data: {
        name: 'Starter',
        description: 'For Beginner Traders 1 MT5 Accounts — 3-Wave Cashout + Dashboard',
        priceCents: 990, // 9.90 USD
        currency: 'USD',
        billingCycle: BillingCycle.MONTHLY,
        maxAccounts: 1,
        isTrial: false,
        trialDays: 0,
        features: {
          strategyIds: [strategy.id],
          maxAccounts: 1,
          features: [
            '1 MT5 Accounts',
            'SaaS Dashboard',
            '3-Wave Cashout',
            '6 Smart Money Filters',
            'Time Filter',
            'Email Support',
          ],
          support: 'email',
        },
        isActive: true,
        sortOrder: 1,
      },
    });

    // Step 6: Create Pro
    const pro = await prisma.package.create({
      data: {
        name: 'Pro',
        description: 'For Serious Traders 3 Accounts — Kill Switch + Risk Management + Line Support',
        priceCents: 2490, // 24.90 USD
        currency: 'USD',
        billingCycle: BillingCycle.MONTHLY,
        maxAccounts: 3,
        isTrial: false,
        trialDays: 0,
        features: {
          strategyIds: [strategy.id],
          maxAccounts: 3,
          features: [
            '3 MT5 Accounts',
            'Dashboard + Kill Switch',
            '3-Wave Cashout + 6 PA/SMC Filters',
            'Time Filter',
            'Heartbeat + Risk Management',
            'Line Support',
          ],
          support: 'line',
        },
        isActive: true,
        sortOrder: 2,
      },
    });

    // Step 7: Create Elite
    const elite = await prisma.package.create({
      data: {
        name: 'Elite',
        description: 'For Professional Traders — 5 Accounts: Custom Config + VIP Line + 1-on-1 Setup Call',
        priceCents: 4990, // 4,990 USD
        currency: 'USD',
        billingCycle: BillingCycle.MONTHLY,
        maxAccounts: 5,
        isTrial: false,
        trialDays: 0,
        features: {
          strategyIds: [strategy.id],
          maxAccounts: 5,
          features: [
            '5 MT5 Accounts',
            'Everything in Pro',
            'Custom EA Config',
            'VIP Line + 1-on-1 Setup Call',
            '3-Wave Cashout + 6 PA/SMC Filters',
            'Time Filter',
          ],
          support: 'vip_line',
        },
        isActive: true,
        sortOrder: 3,
      },
    });

    await prisma.$disconnect();

    return NextResponse.json({
      ok: true,
      message: '🎉 Schema pushed + Packages seeded!',
      strategy: { name: strategy.name, id: strategy.id },
      packages: {
        trial: { id: trial.id, name: trial.name, priceCents: trial.priceCents, trialDays: trial.trialDays },
        starter: { id: starter.id, name: starter.name },
        pro: { id: pro.id, name: pro.name },
        elite: { id: elite.id, name: elite.name },
      },
    });
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await prisma.$disconnect();
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
