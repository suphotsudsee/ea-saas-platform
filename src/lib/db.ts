import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATABASE_URL = process.env.DATABASE_URL;
let mysqlSchemaReady: Promise<void> | null = null;

function useMysql() {
  return !!DATABASE_URL && DATABASE_URL.startsWith('mysql');
}

let pool: any = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(getConnectionConfig());
  }
  return pool;
}

async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  await ensureMysqlSchema();
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

async function ensureMysqlSchema() {
  if (!useMysql()) return;
  if (!mysqlSchemaReady) {
    mysqlSchemaReady = bootstrapMysqlSchema().catch((error) => {
      mysqlSchemaReady = null;
      throw error;
    });
  }
  await mysqlSchemaReady;
}

async function bootstrapMysqlSchema() {
  const connection = await getPool().getConnection();
  const exec = async (sql: string, params: any[] = []) => {
    await connection.execute(sql, params);
  };
  const ignore = async (sql: string) => {
    try {
      await exec(sql);
    } catch {
      // Existing Coolify databases may already have the Prisma migration schema.
    }
  };

  try {
    await exec(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        email VARCHAR(191) NOT NULL UNIQUE,
        passwordHash VARCHAR(191) NULL,
        name VARCHAR(191) NULL,
        timezone VARCHAR(191) NOT NULL DEFAULT 'UTC',
        emailVerified DATETIME(3) NULL,
        twoFactorEnabled BOOLEAN NOT NULL DEFAULT false,
        twoFactorSecret VARCHAR(191) NULL,
        role VARCHAR(64) NOT NULL DEFAULT 'TRADER',
        status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
        autoLinkAccounts BOOLEAN NOT NULL DEFAULT true,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await exec(`
      CREATE TABLE IF NOT EXISTS packages (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        description VARCHAR(191) NULL,
        priceCents INTEGER NOT NULL,
        currency VARCHAR(191) NOT NULL DEFAULT 'USD',
        billingCycle VARCHAR(64) NOT NULL DEFAULT 'MONTHLY',
        maxAccounts INTEGER NOT NULL DEFAULT 1,
        features JSON NULL,
        isActive BOOLEAN NOT NULL DEFAULT true,
        isTrial BOOLEAN NOT NULL DEFAULT false,
        trialDays INTEGER NOT NULL DEFAULT 0,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        stripePriceId VARCHAR(191) NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await exec(`
      CREATE TABLE IF NOT EXISTS strategies (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        name VARCHAR(191) NOT NULL UNIQUE,
        description VARCHAR(191) NULL,
        version VARCHAR(191) NOT NULL,
        defaultConfig JSON NULL,
        riskConfig JSON NULL,
        isActive BOOLEAN NOT NULL DEFAULT true,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        userId VARCHAR(191) NOT NULL,
        packageId VARCHAR(191) NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
        currentPeriodStart DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        currentPeriodEnd DATETIME(3) NOT NULL,
        trialEndsAt DATETIME(3) NULL,
        cancelAtPeriodEnd BOOLEAN NOT NULL DEFAULT false,
        stripeSubscriptionId VARCHAR(191) NULL,
        stripeCustomerId VARCHAR(191) NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        \`key\` VARCHAR(191) NOT NULL UNIQUE,
        userId VARCHAR(191) NOT NULL,
        subscriptionId VARCHAR(191) NULL,
        strategyId VARCHAR(191) NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
        expiresAt DATETIME(3) NULL,
        maxAccounts INTEGER NOT NULL DEFAULT 1,
        killSwitch BOOLEAN NOT NULL DEFAULT false,
        killSwitchReason VARCHAR(191) NULL,
        killSwitchAt DATETIME(3) NULL,
        pausedAt DATETIME(3) NULL,
        pausedReason VARCHAR(191) NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        userId VARCHAR(191) NOT NULL,
        keyHash VARCHAR(191) NOT NULL UNIQUE,
        keyPrefix VARCHAR(191) NOT NULL,
        name VARCHAR(191) NOT NULL,
        lastUsedAt DATETIME(3) NULL,
        expiresAt DATETIME(3) NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await exec(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        email VARCHAR(191) NOT NULL UNIQUE,
        passwordHash VARCHAR(191) NOT NULL,
        name VARCHAR(191) NOT NULL,
        role VARCHAR(64) NOT NULL DEFAULT 'SUPER_ADMIN',
        twoFactorEnabled BOOLEAN NOT NULL DEFAULT false,
        twoFactorSecret VARCHAR(191) NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await ignore('ALTER TABLE subscriptions ADD COLUMN trialEndsAt DATETIME(3) NULL');
    await ignore('ALTER TABLE packages ADD COLUMN isTrial BOOLEAN NOT NULL DEFAULT false');
    await ignore('ALTER TABLE packages ADD COLUMN trialDays INTEGER NOT NULL DEFAULT 0');
    await ignore('ALTER TABLE api_keys ADD COLUMN status VARCHAR(64) NOT NULL DEFAULT "ACTIVE"');

    await seedMysqlDefaults(connection);
  } finally {
    await connection.end();
  }
}

async function seedMysqlDefaults(connection: mysql.Connection) {
  const now = new Date();
  await connection.execute(
    `INSERT IGNORE INTO strategies
      (id, name, description, version, defaultConfig, riskConfig, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      'str_tradecandle_v12',
      'TradeCandle Gold Scalper',
      'XAUUSD M5 automated trading EA',
      '12.0.0',
      JSON.stringify({ symbol: 'XAUUSDm', timeframe: 'M5', lotSize: 0.03 }),
      JSON.stringify({ maxDrawdownPct: 15, maxDailyLossPct: 3 }),
      now,
      now,
    ],
  );
  // Packages are seeded via /api/seed (clean mysql2-based seed)
  // No packages inserted here to avoid duplicates.

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ea-saas.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2026!Secure';
  const adminHash = await bcrypt.hash(adminPassword, 12);
  await connection.execute(
    `INSERT INTO admin_users
      (id, email, passwordHash, name, role, twoFactorEnabled, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'SUPER_ADMIN', 0, ?, ?)
     ON DUPLICATE KEY UPDATE
      passwordHash = VALUES(passwordHash),
      role = 'SUPER_ADMIN',
      updatedAt = VALUES(updatedAt)`,
    ['adm_bootstrap', adminEmail, adminHash, 'Platform Admin', now, now],
  );
}

function getConnectionConfig() {
  const raw = DATABASE_URL!;
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

  return {
    host,
    port: portText ? Number(portText) : 3306,
    user,
    password,
    database,
  };
}

function toMysqlDate(value: any) {
  if (!value) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function normalizeMysqlValues(entries: [string, any][]) {
  const dateFields = new Set(['currentPeriodEnd', 'trialEndsAt', 'expiresAt', 'revokedAt', 'lastHeartbeatAt']);
  return entries.map(([key, value]) => (dateFields.has(key) ? toMysqlDate(value) : value));
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file: string): any[] {
  ensureDir();
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function writeJson(file: string, data: any[]) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const USERS = path.join(DATA_DIR, 'users.json');
const SUBS = path.join(DATA_DIR, 'subs.json');
const LICS = path.join(DATA_DIR, 'licenses.json');
const KEYS = path.join(DATA_DIR, 'apikeys.json');
const ADMINS = path.join(DATA_DIR, 'admins.json');
const PKGS = path.join(DATA_DIR, 'packages.json');
const STRATS = path.join(DATA_DIR, 'strategies.json');

export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: string;
  status: string;
  timezone: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

function normalizeUser(row: any): DbUser {
  return {
    ...row,
    twoFactorEnabled: !!row.twoFactorEnabled,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  if (useMysql()) {
    const rows = await query('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
    return rows[0] ? normalizeUser(rows[0]) : null;
  }
  return readJson(USERS).find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  if (useMysql()) {
    const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] ? normalizeUser(rows[0]) : null;
  }
  return readJson(USERS).find((u) => u.id === id) || null;
}

export async function getAllUsers(): Promise<DbUser[]> {
  if (useMysql()) {
    const rows = await query('SELECT * FROM users ORDER BY createdAt DESC');
    return rows.map(normalizeUser);
  }
  return readJson(USERS);
}

export async function updateUser(id: string, data: Partial<DbUser>): Promise<DbUser | null> {
  if (useMysql()) {
    const allowed = ['email', 'passwordHash', 'name', 'timezone', 'emailVerified', 'twoFactorEnabled', 'twoFactorSecret', 'role', 'status', 'autoLinkAccounts'];
    const entries = Object.entries(data).filter(([key]) => allowed.includes(key));
    if (!entries.length) return findUserById(id);
    const setSql = entries.map(([key]) => `\`${key}\` = ?`).join(', ');
    await query(`UPDATE users SET ${setSql}, updatedAt = NOW() WHERE id = ?`, [...entries.map(([, value]) => value), id]);
    return findUserById(id);
  }

  const users = readJson(USERS);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...data, updatedAt: new Date().toISOString() };
  writeJson(USERS, users);
  return users[idx];
}

export async function createUser(data: Omit<DbUser, 'id' | 'createdAt' | 'updatedAt'> & Record<string, any>): Promise<DbUser> {
  const user = {
    id: `usr_${crypto.randomBytes(12).toString('hex')}`,
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name ?? null,
    timezone: data.timezone || 'UTC',
    role: data.role || 'TRADER',
    status: data.status || 'ACTIVE',
    twoFactorEnabled: !!data.twoFactorEnabled,
  };

  if (useMysql()) {
    await query(
      `INSERT INTO users
        (id, email, passwordHash, name, timezone, emailVerified, twoFactorEnabled, twoFactorSecret, role, status, autoLinkAccounts, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, NULL, ?, ?, 1, NOW(), NOW())`,
      [user.id, user.email, user.passwordHash, user.name, user.timezone, user.twoFactorEnabled ? 1 : 0, user.role, user.status],
    );
    return (await findUserById(user.id))!;
  }

  const users = readJson(USERS);
  const jsonUser = { ...user, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  users.push(jsonUser);
  writeJson(USERS, users);
  return jsonUser;
}

export interface DbSub {
  id: string;
  userId: string;
  packageId: string;
  status: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  createdAt: string;
}

export async function createSub(data: Omit<DbSub, 'id' | 'createdAt'>): Promise<DbSub> {
  const sub = { ...data, id: `sub_${crypto.randomBytes(12).toString('hex')}` };
  if (useMysql()) {
    await query(
      `INSERT INTO subscriptions
        (id, userId, packageId, status, currentPeriodStart, currentPeriodEnd, trialEndsAt, cancelAtPeriodEnd, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, 0, NOW(), NOW())`,
      [sub.id, sub.userId, sub.packageId, sub.status, toMysqlDate(sub.currentPeriodEnd), toMysqlDate(sub.trialEndsAt)],
    );
    return { ...sub, createdAt: new Date().toISOString() };
  }
  const subs = readJson(SUBS);
  const jsonSub = { ...sub, createdAt: new Date().toISOString() };
  subs.push(jsonSub);
  writeJson(SUBS, subs);
  return jsonSub;
}

export interface DbLic {
  id: string;
  userId: string;
  subscriptionId: string | null;
  key: string;
  status: string;
  maxAccounts: number;
  expiresAt: string | null;
  createdAt: string;
}

export async function createLic(data: Omit<DbLic, 'id' | 'createdAt'>): Promise<DbLic> {
  const lic = { ...data, id: `lic_${crypto.randomBytes(12).toString('hex')}` };
  if (useMysql()) {
    await query(
      `INSERT INTO licenses
        (id, \`key\`, userId, subscriptionId, strategyId, status, maxAccounts, expiresAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [lic.id, lic.key, lic.userId, lic.subscriptionId, 'str_tradecandle_v12', lic.status, lic.maxAccounts, toMysqlDate(lic.expiresAt)],
    );
    return { ...lic, createdAt: new Date().toISOString() };
  }
  const licenses = readJson(LICS);
  const jsonLic = { ...lic, createdAt: new Date().toISOString() };
  licenses.push(jsonLic);
  writeJson(LICS, licenses);
  return jsonLic;
}

export async function findLicenseByKey(key: string): Promise<DbLic | null> {
  if (useMysql()) {
    const rows = await query('SELECT * FROM licenses WHERE `key` = ? LIMIT 1', [key]);
    return (rows[0] as any) || null;
  }
  return readJson(LICS).find((l: any) => l.key === key) || null;
}

export async function findLicensesByUserId(userId: string): Promise<DbLic[]> {
  if (useMysql()) return query('SELECT * FROM licenses WHERE userId = ?', [userId]);
  return readJson(LICS).filter((l: any) => l.userId === userId);
}

export async function getAllLicenses(): Promise<DbLic[]> {
  if (useMysql()) return query('SELECT * FROM licenses ORDER BY createdAt DESC');
  return readJson(LICS);
}

export async function updateLicense(id: string, data: Partial<DbLic>): Promise<DbLic | null> {
  if (useMysql()) {
    const allowed = ['status', 'maxAccounts', 'expiresAt', 'revokedAt', 'revokedReason', 'lastHeartbeatAt'];
    const entries = Object.entries(data).filter(([key]) => allowed.includes(key));
    if (!entries.length) return null;
    const setSql = entries.map(([key]) => `\`${key}\` = ?`).join(', ');
    await query(`UPDATE licenses SET ${setSql}, updatedAt = NOW() WHERE id = ?`, [...normalizeMysqlValues(entries), id]);
    const rows = await query('SELECT * FROM licenses WHERE id = ? LIMIT 1', [id]);
    return (rows[0] as any) || null;
  }
  const licenses = readJson(LICS);
  const idx = licenses.findIndex((x: any) => x.id === id);
  if (idx === -1) return null;
  licenses[idx] = { ...licenses[idx], ...data };
  writeJson(LICS, licenses);
  return licenses[idx];
}

export function generateLicenseKey(): string {
  return Array.from({ length: 4 }, () => Math.random().toString(36).substring(2, 6).toUpperCase()).join('-');
}

export async function getAllSubscriptions(): Promise<any[]> {
  if (useMysql()) return query('SELECT * FROM subscriptions ORDER BY createdAt DESC');
  return readJson(SUBS);
}

export async function findSubscriptionByUserId(userId: string): Promise<any | null> {
  if (useMysql()) {
    const rows = await query('SELECT * FROM subscriptions WHERE userId = ? ORDER BY createdAt DESC LIMIT 1', [userId]);
    return rows[0] || null;
  }
  return readJson(SUBS).find((s: any) => s.userId === userId) || null;
}

export async function findSubscriptionById(id: string): Promise<any | null> {
  if (useMysql()) {
    const rows = await query('SELECT * FROM subscriptions WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }
  return readJson(SUBS).find((s: any) => s.id === id) || null;
}

export async function updateSubscription(id: string, data: any): Promise<any | null> {
  if (useMysql()) {
    const allowed = ['status', 'currentPeriodEnd', 'trialEndsAt', 'cancelAtPeriodEnd'];
    const entries = Object.entries(data).filter(([key]) => allowed.includes(key));
    if (!entries.length) return findSubscriptionById(id);
    const setSql = entries.map(([key]) => `\`${key}\` = ?`).join(', ');
    await query(`UPDATE subscriptions SET ${setSql}, updatedAt = NOW() WHERE id = ?`, [...normalizeMysqlValues(entries), id]);
    return findSubscriptionById(id);
  }
  const subs = readJson(SUBS);
  const idx = subs.findIndex((x: any) => x.id === id);
  if (idx === -1) return null;
  subs[idx] = { ...subs[idx], ...data };
  writeJson(SUBS, subs);
  return subs[idx];
}

export interface DbApiKey {
  id: string;
  userId: string;
  keyHash: string;
  keyPrefix: string;
  name: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  status?: string;
}

export async function findUserByApiKey(keyHash: string): Promise<DbApiKey | null> {
  if (useMysql()) {
    const rows = await query('SELECT * FROM api_keys WHERE keyHash = ? LIMIT 1', [keyHash]);
    return (rows[0] as any) || null;
  }
  return readJson(KEYS).find((k: any) => k.keyHash === keyHash) || null;
}

export async function getAllApiKeys(status?: string): Promise<DbApiKey[]> {
  if (useMysql()) {
    return status ? query('SELECT * FROM api_keys WHERE status = ?', [status]) : query('SELECT * FROM api_keys');
  }
  const keys = readJson(KEYS);
  return status ? keys.filter((x: any) => x.status === status) : keys;
}

export async function createApiKey(data: Omit<DbApiKey, 'id' | 'createdAt'>): Promise<DbApiKey> {
  const key = { ...data, id: `key_${crypto.randomBytes(12).toString('hex')}`, createdAt: new Date().toISOString(), status: data.status || 'ACTIVE' };
  if (useMysql()) {
    await query(
      'INSERT INTO api_keys (id, userId, keyHash, keyPrefix, name, lastUsedAt, expiresAt, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [key.id, key.userId, key.keyHash, key.keyPrefix, key.name, key.lastUsedAt, key.expiresAt, key.status],
    );
    return key;
  }
  const keys = readJson(KEYS);
  keys.push(key);
  writeJson(KEYS, keys);
  return key;
}

export async function revokeApiKey(keyHash: string): Promise<boolean> {
  if (useMysql()) {
    await query('UPDATE api_keys SET status = ? WHERE keyHash = ?', ['REVOKED', keyHash]);
    return true;
  }
  const keys = readJson(KEYS);
  const idx = keys.findIndex((x: any) => x.keyHash === keyHash);
  if (idx === -1) return false;
  keys[idx].status = 'REVOKED';
  writeJson(KEYS, keys);
  return true;
}

export interface DbAdmin {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function findAdminByEmail(email: string): Promise<DbAdmin | null> {
  if (useMysql()) {
    const rows = await query('SELECT * FROM admin_users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
    if (rows[0]) {
      const admin = rows[0] as any;
      return {
        ...admin,
        twoFactorEnabled: !!admin.twoFactorEnabled,
        createdAt: admin.createdAt instanceof Date ? admin.createdAt.toISOString() : admin.createdAt,
        updatedAt: admin.updatedAt instanceof Date ? admin.updatedAt.toISOString() : admin.updatedAt,
      };
    }
  }

  const user = await findUserByEmail(email);
  if (user && ['ADMIN', 'SUPER_ADMIN', 'BILLING_ADMIN', 'RISK_ADMIN', 'SUPPORT'].includes(user.role)) {
    return { ...user, twoFactorEnabled: !!user.twoFactorEnabled };
  }
  return readJson(ADMINS).find((a: any) => a.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function createAdmin(data: Omit<DbAdmin, 'id' | 'createdAt' | 'updatedAt'>): Promise<DbAdmin> {
  return createUser({
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name,
    role: data.role,
    status: 'ACTIVE',
    timezone: 'UTC',
    twoFactorEnabled: data.twoFactorEnabled,
  }) as Promise<DbAdmin>;
}

export interface DbPackage {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingCycle: string;
  maxAccounts: number;
  features: any;
  isActive: boolean;
  isTrial: boolean;
  trialDays: number;
  sortOrder: number;
  stripePriceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function findPackageById(id: string): Promise<DbPackage | null> {
  if (useMysql()) {
    const rows = await query('SELECT * FROM packages WHERE id = ? LIMIT 1', [id]);
    return (rows[0] as any) || null;
  }
  return readJson(PKGS).find((p: any) => p.id === id) || null;
}

export async function getAllPackages(): Promise<DbPackage[]> {
  if (useMysql()) return query('SELECT * FROM packages ORDER BY sortOrder ASC');
  return readJson(PKGS);
}

export async function createPackage(data: Omit<DbPackage, 'id' | 'createdAt' | 'updatedAt'>): Promise<DbPackage> {
  const pkg = { ...data, id: `pkg_${crypto.randomBytes(12).toString('hex')}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const packages = readJson(PKGS);
  packages.push(pkg);
  writeJson(PKGS, packages);
  return pkg;
}

export interface DbStrategy {
  id: string;
  name: string;
  description: string | null;
  version: string;
  defaultConfig: any;
  riskConfig: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function findStrategyById(id: string): Promise<DbStrategy | null> {
  if (useMysql()) {
    const rows = await query('SELECT * FROM strategies WHERE id = ? LIMIT 1', [id]);
    return (rows[0] as any) || null;
  }
  return readJson(STRATS).find((s: any) => s.id === id) || null;
}

export async function getAllStrategies(): Promise<DbStrategy[]> {
  if (useMysql()) return query('SELECT * FROM strategies ORDER BY createdAt DESC');
  return readJson(STRATS);
}

export async function createStrategy(data: Omit<DbStrategy, 'id' | 'createdAt' | 'updatedAt'>): Promise<DbStrategy> {
  const strategy = { ...data, id: `str_${crypto.randomBytes(12).toString('hex')}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const strategies = readJson(STRATS);
  strategies.push(strategy);
  writeJson(STRATS, strategies);
  return strategy;
}
