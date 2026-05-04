import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Seed subscription packages
    const packages = [
      { code: 'free_trial', name: 'Free Trial', description: '1-Month Free Trial — 1 MT5 Account', price: 0, billingCycle: 'monthly', maxAccounts: 1, isTrial: true, trialDays: 30, features: JSON.stringify(['3-Wave Cashout','6 Smart Money Filters','Time Filter','Dashboard','Email Support']), isActive: true },
      { code: 'starter', name: 'Starter', description: '1 MT5 Account — Best for beginners', price: 9.90, billingCycle: 'monthly', maxAccounts: 1, isTrial: false, trialDays: 0, features: JSON.stringify(['3-Wave Cashout','6 Smart Money Filters','Time Filter','Dashboard','Kill Switch','Email Support']), isActive: true },
      { code: 'professional', name: 'Professional', description: '3 MT5 Accounts — For serious traders', price: 24.90, billingCycle: 'monthly', maxAccounts: 3, isTrial: false, trialDays: 0, features: JSON.stringify(['Everything in Starter','Priority Support','Line Support','Advanced Risk Mgmt']), isActive: true },
      { code: 'elite', name: 'Elite', description: '10 MT5 Accounts — For professionals', price: 49.90, billingCycle: 'monthly', maxAccounts: 10, isTrial: false, trialDays: 0, features: JSON.stringify(['Everything in Pro','VIP Line Support','1-on-1 Setup Call','Custom Config']), isActive: true },
    ];

    let created = 0;
    for (const pkg of packages) {
      const existing = await (prisma as any).subscriptionPackage?.findFirst?.({ where: { code: pkg.code } });
      if (!existing) {
        await (prisma as any).subscriptionPackage?.create?.({ data: pkg });
        created++;
      }
    }

    return NextResponse.json({ ok: true, created, total: packages.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
