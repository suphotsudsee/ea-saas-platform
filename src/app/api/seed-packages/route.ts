import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Import prisma directly to avoid path issues
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const packages = [
      { name: 'Free Trial', description: '1-Month Free Trial — 1 MT5 Account', priceCents: 0, currency: 'USD', billingCycle: 'MONTHLY', maxAccounts: 1, isTrial: true, trialDays: 30, features: '["3-Wave Cashout","6 Smart Money Filters","Dashboard"]', sortOrder: 1 },
      { name: 'Starter', description: '1 MT5 Account — Best for beginners', priceCents: 990, currency: 'USD', billingCycle: 'MONTHLY', maxAccounts: 1, isTrial: false, trialDays: 0, features: '["3-Wave Cashout","6 Smart Money Filters","Dashboard","Kill Switch"]', sortOrder: 2 },
      { name: 'Professional', description: '3 MT5 Accounts — For serious traders', priceCents: 2490, currency: 'USD', billingCycle: 'MONTHLY', maxAccounts: 3, isTrial: false, trialDays: 0, features: '["Everything in Starter","Priority Support","Line Support"]', sortOrder: 3 },
      { name: 'Elite', description: '10 MT5 Accounts — For professionals', priceCents: 4990, currency: 'USD', billingCycle: 'MONTHLY', maxAccounts: 10, isTrial: false, trialDays: 0, features: '["Everything in Pro","VIP Support","1-on-1 Setup"]', sortOrder: 4 },
    ];

    const count = await prisma.package.count();
    if (count > 0) {
      await prisma.$disconnect();
      return NextResponse.json({ ok: true, message: `Already have ${count} packages`, count });
    }

    let created = 0;
    for (const pkg of packages) {
      await prisma.package.create({ data: pkg });
      created++;
    }

    await prisma.$disconnect();
    return NextResponse.json({ ok: true, created, total: packages.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
