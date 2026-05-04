#!/bin/sh
# ⚠️ Do NOT use `set -e` — prisma db push may return non-zero for harmless warnings

echo "📊 Pushing Prisma schema to database..."
node ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss 2>&1 \
  || node ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss 2>&1 \
  || echo "⚠️ Prisma db push warning (tables may already exist)"

echo "🌱 Checking for seed data..."
# Auto-seed packages if none exist (uses Node.js one-liner)
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const count = await p.package.count();
  if (count === 0) {
    const pkgs = [
      { name:'Free Trial', description:'1-Month Free Trial', priceCents:0, currency:'USD', billingCycle:'MONTHLY', maxAccounts:1, isTrial:true, trialDays:30, features:'[\"3-Wave Cashout\",\"Smart Money Filters\",\"Dashboard\"]', sortOrder:0 },
      { name:'Starter', description:'1 MT5 Account', priceCents:990, currency:'USD', billingCycle:'MONTHLY', maxAccounts:1, isTrial:false, trialDays:0, features:'[\"3-Wave Cashout\",\"Smart Money Filters\",\"Dashboard\",\"Kill Switch\"]', sortOrder:1 },
      { name:'Professional', description:'3 MT5 Accounts', priceCents:2490, currency:'USD', billingCycle:'MONTHLY', maxAccounts:3, isTrial:false, trialDays:0, features:'[\"Everything in Starter\",\"Priority Support\"]', sortOrder:2 },
      { name:'Elite', description:'10 MT5 Accounts', priceCents:4990, currency:'USD', billingCycle:'MONTHLY', maxAccounts:10, isTrial:false, trialDays:0, features:'[\"Everything in Pro\",\"VIP Support\",\"1-on-1 Setup\"]', sortOrder:3 },
    ];
    for (const pkg of pkgs) await p.package.create({ data: pkg });
    console.log('Created ' + pkgs.length + ' packages');
  } else {
    console.log('Already have ' + count + ' packages');
  }
  await p.\$disconnect();
})().catch(e => console.error('Seed error:', e.message));
" 2>&1 || echo "⚠️ Seed skipped (non-critical)"

echo "🚀 Starting Next.js server..."
exec node server.js
