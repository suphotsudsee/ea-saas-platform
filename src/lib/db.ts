import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function readJson(file: string): any[] {
  ensureDir();
  if (!fs.existsSync(file)) { fs.writeFileSync(file, '[]'); return []; }
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return []; }
}
function writeJson(file: string, data: any[]) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const USERS = path.join(DATA_DIR, 'users.json');
const SUBS  = path.join(DATA_DIR, 'subs.json');
const LICS  = path.join(DATA_DIR, 'licenses.json');
const KEYS  = path.join(DATA_DIR, 'apikeys.json');
const ADMINS= path.join(DATA_DIR, 'admins.json');
const PKGS  = path.join(DATA_DIR, 'packages.json');
const STRATS= path.join(DATA_DIR, 'strategies.json');

export interface DbUser {
  id: string; email: string; name: string|null;
  passwordHash: string; role: string; status: string;
  timezone: string; twoFactorEnabled: boolean;
  createdAt: string; updatedAt: string;
}
export function findUserByEmail(email: string): DbUser|null {
  return readJson(USERS).find(u => u.email.toLowerCase()===email.toLowerCase()) || null;
}
export function findUserById(id: string): DbUser|null {
  return readJson(USERS).find(u => u.id===id) || null;
}
export function getAllUsers(): DbUser[] {
  return readJson(USERS);
}
export function updateUser(id: string, data: Partial<DbUser>): DbUser|null {
  const u = readJson(USERS);
  const idx = u.findIndex(u => u.id === id);
  if (idx === -1) return null;
  u[idx] = { ...u[idx], ...data, updatedAt: new Date().toISOString() };
  writeJson(USERS, u);
  return u[idx];
}
export function createUser(data: Omit<DbUser,'id'|'createdAt'|'updatedAt'>): DbUser {
  const u = readJson(USERS);
  const user = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  u.push(user); writeJson(USERS,u); return user;
}

export interface DbSub {
  id: string; userId: string; packageId: string; status: string;
  currentPeriodEnd: string; trialEndsAt: string|null;
  createdAt: string;
}
export function createSub(data: Omit<DbSub,'id'|'createdAt'>): DbSub {
  const s = readJson(SUBS);
  const sub = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  s.push(sub); writeJson(SUBS,s); return sub;
}

export interface DbLic {
  id: string; userId: string; subscriptionId: string|null;
  key: string; status: string; maxAccounts: number; expiresAt: string|null;
  createdAt: string;
}
export function createLic(data: Omit<DbLic,'id'|'createdAt'>): DbLic {
  const l = readJson(LICS);
  const lic = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  l.push(lic); writeJson(LICS,l); return lic;
}
export function findLicenseByKey(key: string): DbLic|null {
  return readJson(LICS).find((l: any) => l.key === key) || null;
}
export function findLicensesByUserId(userId: string): DbLic[] {
  return readJson(LICS).filter((l: any) => l.userId === userId);
}
export function updateLicense(id: string, data: Partial<DbLic>): DbLic|null {
  const l = readJson(LICS);
  const idx = l.findIndex((x: any) => x.id === id);
  if (idx === -1) return null;
  l[idx] = { ...l[idx], ...data };
  writeJson(LICS, l);
  return l[idx];
}

export function generateLicenseKey(): string {
  return Array.from({length:4},()=>Math.random().toString(36).substring(2,6).toUpperCase()).join('-');
}

// ─── subscriptions helpers ───────────────────────────────────────────
export const getAllSubscriptions = () => readJson(SUBS);
export const findSubscriptionByUserId = (userId: string) => readJson(SUBS).find((s: any) => s.userId === userId);
export const getAllLicenses = () => readJson(LICS);
export function findSubscriptionById(id: string): any|null {
  return readJson(SUBS).find((s: any) => s.id === id) || null;
}
export function updateSubscription(id: string, data: any): any|null {
  const s = readJson(SUBS);
  const idx = s.findIndex((x: any) => x.id === id);
  if (idx === -1) return null;
  s[idx] = { ...s[idx], ...data };
  writeJson(SUBS, s);
  return s[idx];
}

// ─── API Key helpers ─────────────────────────────────────────────────
export interface DbApiKey {
  id: string; userId: string; keyHash: string; keyPrefix: string;
  name: string; lastUsedAt: string|null; expiresAt: string|null;
  createdAt: string; status?: string;
}
export function findUserByApiKey(keyHash: string): DbApiKey|null {
  return readJson(KEYS).find((k: any) => k.keyHash === keyHash) || null;
}
export function getAllApiKeys(status?: string): DbApiKey[] {
  const k = readJson(KEYS);
  if (status) return k.filter((x: any) => x.status === status);
  return k;
}
export function createApiKey(data: Omit<DbApiKey,'id'|'createdAt'>): DbApiKey {
  const k = readJson(KEYS);
  const key = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: data.status||'ACTIVE' };
  k.push(key); writeJson(KEYS, k); return key;
}
export function revokeApiKey(keyHash: string): boolean {
  const k = readJson(KEYS);
  const idx = k.findIndex((x: any) => x.keyHash === keyHash);
  if (idx === -1) return false;
  k[idx].status = 'REVOKED';
  writeJson(KEYS, k); return true;
}

// ─── Admin helpers ──────────────────────────────────────────────────
export interface DbAdmin {
  id: string; email: string; passwordHash: string; name: string;
  role: string; twoFactorEnabled: boolean; createdAt: string; updatedAt: string;
}
export function findAdminByEmail(email: string): DbAdmin|null {
  return readJson(ADMINS).find((a: any) => a.email.toLowerCase() === email.toLowerCase()) || null;
}
export function createAdmin(data: Omit<DbAdmin,'id'|'createdAt'|'updatedAt'>): DbAdmin {
  const a = readJson(ADMINS);
  const admin = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  a.push(admin); writeJson(ADMINS, a); return admin;
}

// ─── Package helpers ────────────────────────────────────────────────
export interface DbPackage {
  id: string; name: string; description: string|null; priceCents: number;
  currency: string; billingCycle: string; maxAccounts: number;
  features: string; isActive: boolean; isTrial: boolean; trialDays: number;
  sortOrder: number; stripePriceId: string|null;
  createdAt: string; updatedAt: string;
}
export function findPackageById(id: string): DbPackage|null {
  return readJson(PKGS).find((p: any) => p.id === id) || null;
}
export function getAllPackages(): DbPackage[] {
  return readJson(PKGS);
}
export function createPackage(data: Omit<DbPackage,'id'|'createdAt'|'updatedAt'>): DbPackage {
  const p = readJson(PKGS);
  const pkg = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  p.push(pkg); writeJson(PKGS, p); return pkg;
}

// ─── Strategy helpers ───────────────────────────────────────────────
export interface DbStrategy {
  id: string; name: string; description: string|null; version: string;
  defaultConfig: string; riskConfig: string; isActive: boolean;
  createdAt: string; updatedAt: string;
}
export function findStrategyById(id: string): DbStrategy|null {
  return readJson(STRATS).find((s: any) => s.id === id) || null;
}
export function getAllStrategies(): DbStrategy[] {
  return readJson(STRATS);
}
export function createStrategy(data: Omit<DbStrategy,'id'|'createdAt'|'updatedAt'>): DbStrategy {
  const s = readJson(STRATS);
  const st = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  s.push(st); writeJson(STRATS, s); return st;
}

