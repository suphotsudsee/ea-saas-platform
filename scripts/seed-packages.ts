#!/usr/bin/env npx tsx
// ─── Seed Packages (Pricing Tiers) ────────────────────────────────────────
// Run: npx tsx scripts/seed-packages.ts
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient, BillingCycle } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding packages...');

  // Delete existing packages (in reverse sort order)
  const existing = await prisma.package.findMany({ orderBy: { sortOrder: 'desc' } });
  if (existing.length > 0) {
    console.log(`  Found ${existing.length} existing packages, deleting...`);
    // Delete subscriptions that use these packages first
    for (const pkg of existing) {
      await prisma.subscription.deleteMany({ where: { packageId: pkg.id } });
    }
    await prisma.package.deleteMany();
    console.log('  ✅ Old packages deleted');
  }

  // ─── Create Starter ──────────────────────────────────────────────────────
  const starter = await prisma.package.create({
    data: {
      name: 'Starter',
      description: 'สำหรับเทรดเดอร์เริ่มต้น 1 บัญชี MT5 — 3-Wave Cashout + Dashboard',
      priceCents: 99000, // 990 THB (in cents/satang)
      currency: 'THB',
      billingCycle: BillingCycle.MONTHLY,
      maxAccounts: 1,
      features: {
        maxAccounts: 1,
        features: [
          '1 บัญชี MT5',
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
  console.log(`  ✅ Starter: ${starter.id}`);

  // ─── Create Pro ──────────────────────────────────────────────────────────
  const pro = await prisma.package.create({
    data: {
      name: 'Pro',
      description: 'สำหรับเทรดเดอร์จริงจัง 3 บัญชี — Kill Switch + Risk Management + Line Support',
      priceCents: 249000, // 2,490 THB
      currency: 'THB',
      billingCycle: BillingCycle.MONTHLY,
      maxAccounts: 3,
      features: {
        maxAccounts: 3,
        features: [
          '3 บัญชี MT5',
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
  console.log(`  ✅ Pro: ${pro.id}`);

  // ─── Create Elite ────────────────────────────────────────────────────────
  const elite = await prisma.package.create({
    data: {
      name: 'Elite',
      description: 'สำหรับมืออาชีพ 5 บัญชี — Custom Config + VIP Line + 1-on-1 Setup Call',
      priceCents: 499000, // 4,990 THB
      currency: 'THB',
      billingCycle: BillingCycle.MONTHLY,
      maxAccounts: 5,
      features: {
        maxAccounts: 5,
        features: [
          '5 บัญชี MT5',
          'ทุกอย่างใน Pro',
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
  console.log(`  ✅ Elite: ${elite.id}`);

  console.log('\n🎉 Packages seeded successfully!');
  console.log(`   Starter: ${starter.id} — 990 THB/mo — 1 account`);
  console.log(`   Pro:     ${pro.id} — 2,490 THB/mo — 3 accounts`);
  console.log(`   Elite:   ${elite.id} — 4,990 THB/mo — 5 accounts`);
  console.log('\n⚠️  After creating Stripe Products/Prices, update .env with:');
  console.log('   STRIPE_STARTER_PRICE_ID=price_xxx');
  console.log('   STRIPE_PRO_PRICE_ID=price_xxx');
  console.log('   STRIPE_ELITE_PRICE_ID=price_xxx');
  console.log('   Then re-run this script to link the stripePriceId fields.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });