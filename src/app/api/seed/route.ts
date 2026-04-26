import { NextResponse } from 'next/server';
import { PrismaClient, BillingCycle } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Ensure TradeCandle v12 Strategy exists
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

    // Delete existing packages
    const existing = await prisma.package.findMany();
    for (const pkg of existing) {
      await prisma.subscription.deleteMany({ where: { packageId: pkg.id } });
    }
    await prisma.package.deleteMany();

    // Create Starter
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

    // Create Pro
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

    // Create Elite
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

    await prisma.$disconnect();

    return NextResponse.json({
      ok: true,
      message: '🎉 Packages seeded!',
      packages: { starter: starter.id, pro: pro.id, elite: elite.id },
    });
  } catch (error) {
    await prisma.$disconnect();
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}