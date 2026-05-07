import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

function getConnectionConfig() {
  let raw = process.env.DATABASE_URL!;
  // Strip Coolify's mysql-database- prefix (Docker DNS resolves bare UUID only)
  if (raw.includes('mysql-database-')) {
    raw = raw.replace('mysql-database-', '');
  }
  try {
    new URL(raw);
    return raw;
  } catch {
    return parseMysqlUrl(raw);
  }
}

function parseMysqlUrl(raw: string) {
  const value = raw.replace(/^mysql:\/\//, '');
  const at = value.lastIndexOf('@');
  const auth = at >= 0 ? value.slice(0, at) : '';
  const hostAndDb = at >= 0 ? value.slice(at + 1) : value;
  const colon = auth.indexOf(':');
  const user = colon >= 0 ? auth.slice(0, colon) : auth;
  const password = colon >= 0 ? auth.slice(colon + 1) : '';
  const slash = hostAndDb.indexOf('/');
  const hostPort = slash >= 0 ? hostAndDb.slice(0, slash) : hostAndDb;
  const databaseAndQuery = slash >= 0 ? hostAndDb.slice(slash + 1) : '';
  const [host, portText] = hostPort.split(':');
  const database = databaseAndQuery.split('?')[0];
  return { host, port: portText ? Number(portText) : 3306, user, password, database };
}

export async function GET() {
  let conn: mysql.Connection | null = null;
  try {
    const config = getConnectionConfig();
    conn = await mysql.createConnection(config as any);
    
    // --- CREATE TABLES ---
    await conn.execute(`CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(191) NOT NULL PRIMARY KEY, email VARCHAR(191) NOT NULL UNIQUE,
      passwordHash VARCHAR(191) NULL, name VARCHAR(191) NULL,
      timezone VARCHAR(191) NOT NULL DEFAULT 'UTC',
      role VARCHAR(64) NOT NULL DEFAULT 'TRADER', status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
      autoLinkAccounts BOOLEAN NOT NULL DEFAULT true,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS packages (
      id VARCHAR(191) NOT NULL PRIMARY KEY, name VARCHAR(191) NOT NULL,
      description VARCHAR(191) NULL, priceCents INTEGER NOT NULL,
      currency VARCHAR(191) NOT NULL DEFAULT 'USD', billingCycle VARCHAR(64) NOT NULL DEFAULT 'MONTHLY',
      maxAccounts INTEGER NOT NULL DEFAULT 1, features JSON NULL,
      isActive BOOLEAN NOT NULL DEFAULT true, isTrial BOOLEAN NOT NULL DEFAULT false,
      trialDays INTEGER NOT NULL DEFAULT 0, sortOrder INTEGER NOT NULL DEFAULT 0,
      stripePriceId VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS strategies (
      id VARCHAR(191) NOT NULL PRIMARY KEY, name VARCHAR(191) NOT NULL UNIQUE,
      description VARCHAR(191) NULL, version VARCHAR(191) NOT NULL,
      defaultConfig JSON NULL, riskConfig JSON NULL,
      isActive BOOLEAN NOT NULL DEFAULT true,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS subscriptions (
      id VARCHAR(191) NOT NULL PRIMARY KEY, userId VARCHAR(191) NOT NULL,
      packageId VARCHAR(191) NOT NULL, status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
      currentPeriodStart DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      currentPeriodEnd DATETIME(3) NOT NULL, trialEndsAt DATETIME(3) NULL,
      cancelAtPeriodEnd BOOLEAN NOT NULL DEFAULT false,
      stripeSubscriptionId VARCHAR(191) NULL, stripeCustomerId VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS licenses (
      id VARCHAR(191) NOT NULL PRIMARY KEY, \`key\` VARCHAR(191) NOT NULL UNIQUE,
      userId VARCHAR(191) NOT NULL, subscriptionId VARCHAR(191) NULL,
      strategyId VARCHAR(191) NULL, status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
      expiresAt DATETIME(3) NULL, maxAccounts INTEGER NOT NULL DEFAULT 1,
      killSwitch BOOLEAN NOT NULL DEFAULT false, killSwitchReason VARCHAR(500) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS trading_accounts (
      id VARCHAR(191) NOT NULL PRIMARY KEY, accountNumber VARCHAR(191) NOT NULL,
      brokerName VARCHAR(191) NULL DEFAULT 'Exness', platform VARCHAR(64) NULL DEFAULT 'MT5',
      licenseId VARCHAR(191) NOT NULL, userId VARCHAR(191) NULL,
      status VARCHAR(64) NOT NULL DEFAULT 'LINKED',
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_licenseId (licenseId), INDEX idx_accountNumber (accountNumber)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS heartbeat_events (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      licenseId VARCHAR(191) NOT NULL, accountNumber VARCHAR(191) NOT NULL,
      platform VARCHAR(64) NULL DEFAULT 'MT5', eaVersion VARCHAR(64) NULL,
      equity DOUBLE NULL, balance DOUBLE NULL, 
      openPositions INT NULL DEFAULT 0, marginLevel DOUBLE NULL,
      status VARCHAR(64) NULL DEFAULT 'ALIVE',
      lastHeartbeatAt DATETIME(3) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_licenseId (licenseId),
      INDEX idx_lastHeartbeatAt (lastHeartbeatAt),
      UNIQUE KEY uk_license_account (licenseId, accountNumber)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS trade_events (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      licenseId VARCHAR(191) NOT NULL, accountNumber VARCHAR(191) NULL,
      platform VARCHAR(64) NULL DEFAULT 'MT5',
      ticket VARCHAR(191) NOT NULL, symbol VARCHAR(64) NULL,
      direction VARCHAR(16) NULL, eventType VARCHAR(64) NULL,
      openPrice DOUBLE NULL, closePrice DOUBLE NULL, volume DOUBLE NULL,
      openTime VARCHAR(64) NULL, closeTime VARCHAR(64) NULL,
      profit DOUBLE NULL, commission DOUBLE NULL DEFAULT 0, swap DOUBLE NULL DEFAULT 0,
      magicNumber INT NULL, comment VARCHAR(500) NULL,
      status VARCHAR(64) NULL DEFAULT 'RECORDED',
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_licenseId (licenseId),
      INDEX idx_ticket (ticket),
      INDEX idx_createdAt (createdAt)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    await conn.execute(`CREATE TABLE IF NOT EXISTS admin_users (
      id VARCHAR(191) NOT NULL PRIMARY KEY, email VARCHAR(191) NOT NULL UNIQUE,
      passwordHash VARCHAR(191) NOT NULL, name VARCHAR(191) NOT NULL,
      role VARCHAR(64) NOT NULL DEFAULT 'ADMIN', twoFactorEnabled BOOLEAN NOT NULL DEFAULT false,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    // --- CLEANUP STALE DATA (from old db.ts seed) — only the stale 'starter' id ---
    await conn.execute("UPDATE packages SET isActive = 0 WHERE id = 'starter' AND name = '1-Month Free Trial'");

    // --- SEED DATA ---
    const now = new Date();

    // Strategy
    await conn.execute(`INSERT IGNORE INTO strategies (id, name, description, version, defaultConfig, riskConfig, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      ['str_tradecandle_v12', 'TradeCandle Gold Scalper',
       'XAUUSD M5 auto-trading EA — 3-Wave Cashout + PA/SMC Confluence + Time Filter. Backtested 1yr +$5,171 PF 1.18 WR 74%.',
       '12.0.0',
       JSON.stringify({ symbol: 'XAUUSDm', timeframe: 'M5', lotSize: 0.03 }),
       JSON.stringify({ maxDrawdownPct: 15, maxDailyLossPct: 3 }),
       now, now]);

    // Packages
    const packages = [
      ['pkg_trial_30d', '1-Month Free Trial',
       'Trial TradeCandle v12 Free 30 days — 1 Account + Dashboard + 3-Wave Cashout',
       0, 'MONTHLY', 1, true, 30, 0],
      ['pkg_starter', 'Starter',
       'For Beginner Traders — 1 MT5 Account + Dashboard',
       990, 'MONTHLY', 1, false, 0, 1],
      ['pkg_pro', 'Pro',
       'For Serious Traders — 3 MT5 Accounts + Kill Switch + Line Support',
       2490, 'MONTHLY', 3, false, 0, 2],
      ['pkg_elite', 'Elite',
       'For Professionals — 5 Accounts + Custom Config + VIP Line + Setup Call',
       4990, 'MONTHLY', 5, false, 0, 3],
    ];

    for (const [id, name, desc, cents, cycle, maxAcc, isTrial, trialDays, sort] of packages) {
      await conn.execute(`INSERT IGNORE INTO packages
        (id, name, description, priceCents, currency, billingCycle, maxAccounts, features, isActive, isTrial, trialDays, sortOrder, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 'USD', ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
        [id, name, desc, cents, cycle, maxAcc,
         JSON.stringify({ strategyIds: ['str_tradecandle_v12'], maxAccounts: maxAcc }),
         isTrial, trialDays, sort, now, now]);
    }

    // Admin user
    const bcrypt = (await import('bcryptjs')).default;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ea-saas.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2026!Secure';
    const adminHash = await bcrypt.hash(adminPassword, 12);
    await conn.execute(`INSERT INTO admin_users (id, email, passwordHash, name, role, twoFactorEnabled, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'SUPER_ADMIN', 0, ?, ?)
      ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), role = 'SUPER_ADMIN', updatedAt = VALUES(updatedAt)`,
      ['adm_bootstrap', adminEmail, adminHash, 'Platform Admin', now, now]);

    return NextResponse.json({
      ok: true,
      message: '🎉 Schema created + Packages seeded!',
      packages: packages.map(p => ({ id: p[0], name: p[1], priceCents: p[3] })),
    });
  } catch (error) {
    console.error('Seed failed:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
