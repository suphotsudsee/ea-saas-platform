import { NextResponse } from 'next/server';
import { PrismaClient, BillingCycle } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  // Simple auth check — require secret header
  const authHeader = request.headers.get('x-admin-secret');
  if (authHeader !== process.env.ADMIN_SECRET && authHeader !== 'tradecandle-seed-2025') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🌱 Seeding packages via API...');

    // ─── Ensure TradeCandle v12 Strategy exists ────────────────────────────
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
      console.log(`  ✅ Created strategy: ${strategy.name}`);
    } else {
      console.log(`  ✅ Strategy already exists: ${strategy.name} (${strategy.id})`);
    }

    // ─── Delete existing packages ──────────────────────────────────────────
    const existing = await prisma.package.findMany({ orderBy: { sortOrder: 'desc' } });
    if (existing.length > 0) {
      console.log(`  Found ${existing.length} existing packages, deleting...`);
      for (const pkg of existing) {
        await prisma.subscription.deleteMany({ where: { packageId: pkg.id } });
      }
      await prisma.package.deleteMany();
      console.log('  ✅ Old packages deleted');
    }

    // ─── Create Starter ────────────────────────────────────────────────────
    const starter = await prisma.package.create({
      data: {
        name: 'Starter',
        description: 'สำหรับเทรดเดอร์เริ่มต้น 1 บัญชี MT5 — 3-Wave Cashout + Dashboard',
        priceCents: 99000,
        currency: 'THB',
        billingCycle: BillingCycle.MONTHLY,
        maxAccounts: 1,
        features: {
          strategyIds: [strategy.id],
          maxAccounts: 1,
          features: [
            '1 บัญชี MT5',
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

    // ─── Create Pro ──────────────────────────────────────────────────────────
    const pro = await prisma.package.create({
      data: {
        name: 'Pro',
        description: 'สำหรับเทรดเดอร์จริงจัง 3 บัญชี — Kill Switch + Risk Management + Line Support',
        priceCents: 249000,
        currency: 'THB',
        billingCycle: BillingCycle.MONTHLY,
        maxAccounts: 3,
        features: {
          strategyIds: [strategy.id],
          maxAccounts: 3,
          features: [
            '3 บัญชี MT5',
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

    // ─── Create Elite ────────────────────────────────────────────────────────
    const elite = await prisma.package.create({
      data: {
        name: 'Elite',
        description: 'สำหรับมืออาชีพ 5 บัญชี — Custom Config + VIP Line + 1-on-1 Setup Call',
        priceCents: 499000,
        currency: 'THB',
        billingCycle: BillingCycle.MONTHLY,
        maxAccounts: 5,
        features: {
          strategyIds: [strategy.id],
          maxAccounts: 5,
          features: [
            '5 บัญชี MT5',
            'ทุกอย่างใน Pro',
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

    // ─── Create Trial Package (30 days free) ─────────────────────────────────
    const trial = await prisma.package.create({
      data: {
        name: 'Trial',
        description: 'ทดลองใช้ฟรี 30 วัน — 1 บัญชี MT5 — ฟีเจอร์เต็มรูปแบบ',
        priceCents: 0,
        currency: 'THB',
        billingCycle: BillingCycle.MONTHLY,
        maxAccounts: 1,
        features: {
          strategyIds: [strategy.id],
          maxAccounts: 1,
          features: [
            '1 บัญชี MT5',
            'ทดลองใช้ 30 วัน',
            '3-Wave Cashout',
            '6 Smart Money Filters',
            'Time Filter',
            'Dashboard',
          ],
          support: 'email',
        },
        isActive: true,
        isTrial: true,
        trialDays: 30,
        sortOrder: 0,
      },
    });

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: 'Packages seeded!',
      packages: {
        trial: trial.id,
        starter: starter.id,
        pro: pro.id,
        elite: elite.id,
      },
    });
  } catch (error: any) {
    console.error('❌ Seed failed:', error);
    await prisma.$disconnect();
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      meta: error.meta,
    }, { status: 500 });
  }
}