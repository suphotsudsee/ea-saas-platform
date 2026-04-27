import {
  findUserByEmail, findUserById, getAllUsers, createUser, updateUser,
  findLicenseByKey, findLicensesByUserId, getAllLicenses, createLic, updateLicense,
  findSubscriptionByUserId, getAllSubscriptions, createSub, findSubscriptionById, updateSubscription,
  findUserByApiKey, createApiKey, revokeApiKey, getAllApiKeys,
} from '../../lib/db';

// ─── Simple Prisma adapter for JSON DB ───────────────────────────────────────
// Covers the most common patterns used in this app
// For unsupported queries, returns safe defaults
// ─────────────────────────────────────────────────────────────────────────────

function safe<T>(fn: () => T): T { try { return fn(); } catch(e) { console.warn('DB:',e); return null as any; } }

const mockUser = (u: any) => u ? {
  ...u,
  subscriptions: () => getAllSubscriptions().filter((s: any) => s.userId === u.id),
  licenses: () => getAllLicenses().filter((l: any) => l.userId === u.id),
  tradingAccounts: () => [],
  notifications: () => [],
  apiKeys: () => getAllApiKeys().filter((a: any) => a.userId === u.id),
} : null;

const userModel = {
  findUnique: ({ where }: any) => {
    if (where.email) return safe(()=>mockUser(findUserByEmail(where.email)));
    if (where.id) return safe(()=>mockUser(findUserById(where.id)));
    return null;
  },
  findFirst: ({ where }: any): any => {
    const users = getAllUsers();
    if (where?.email?.contains) return users.find((u: any)=>u.email.includes(where.email.contains)) || null;
    if (where?.status) return users.find((u: any)=>u.status===where.status) || null;
    if (where?.role) return users.find((u: any)=>u.role===where.role) || null;
    return users[0] || null;
  },
  findMany: ({ where, orderBy, take }: any): any[] => {
    let results = getAllUsers().map((u: any)=>({ ...u }));
    if (where?.status) results = results.filter((u: any)=>u.status===where.status);
    if (where?.role) results = results.filter((u: any)=>u.role===where.role);
    if (where?.id?.notIn) results = results.filter((u: any)=>!where.id.notIn.includes(u.id));
    if (where?.email?.contains) results = results.filter((u: any)=>u.email && u.email.includes(where.email.contains));
    if (where?.createdAt?.gte) results = results.filter((u: any)=>new Date(u.createdAt)>=new Date(where.createdAt.gte));
    if (where?.createdAt?.lte) results = results.filter((u: any)=>new Date(u.createdAt)<=new Date(where.createdAt.lte));
    if (orderBy?.createdAt) results = orderBy.createdAt==='asc'
      ? results.sort((a: any,b: any)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime())
      : results.sort((a: any,b: any)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    if (take) results = results.slice(0, take);
    return results;
  },
  create: ({ data }: any) => {
    return createUser({ ...data, timezone: data.timezone||'UTC', twoFactorEnabled: data.twoFactorEnabled||false, status: data.status||'ACTIVE', role: data.role||'TRADER' });
  },
  update: ({ where, data }: any) => {
    if (!where.id) return null;
    return updateUser(where.id, data);
  },
  count: ({ where }: any): number => {
    let results = getAllUsers();
    if (where?.status) results = results.filter((u: any)=>u.status===where.status);
    if (where?.role) results = results.filter((u: any)=>u.role===where.role);
    return results.length;
  },
};

const licModel = {
  findUnique: ({ where }: any) => {
    if (where.key) return safe(()=>findLicenseByKey(where.key));
    return null;
  },
  findFirst: ({ where }: any): any => {
    const lics = getAllLicenses();
    if (where?.key) return lics.find((l: any)=>l.key===where.key) || null;
    if (where?.id) return lics.find((l: any)=>l.id===where.id) || null;
    return lics[0] || null;
  },
  findMany: ({ where }: any): any[] => {
    let results = getAllLicenses();
    if (where?.userId) results = results.filter((l: any)=>l.userId===where.userId);
    if (where?.status) results = results.filter((l: any)=>l.status===where.status);
    if (where?.expiresAt?.lte) results = results.filter((l: any)=>!l.expiresAt || new Date(l.expiresAt)<=new Date(where.expiresAt.lte));
    return results;
  },
  create: ({ data }: any): any => createLic({ ...data, maxAccounts:data.maxAccounts||1, expiresAt:data.expiresAt||null }),
  update: ({ where, data }: any): any => {
    if (!where.id) return null;
    return updateLicense(where.id, data);
  },
};

const subModel = {
  findUnique: ({ where }: any): any => {
    if (where?.id) return findSubscriptionById(where.id) || null;
    return null;
  },
  findFirst: ({ where }: any): any => {
    if (where?.userId) return findSubscriptionByUserId(where.userId) || null;
    const subs = getAllSubscriptions();
    return subs[0] || null;
  },
  findMany: ({ where }: any): any[] => {
    let results = getAllSubscriptions();
    if (where?.userId) results = results.filter((s: any)=>s.userId===where.userId);
    if (where?.status) results = results.filter((s: any)=>s.status===where.status);
    if (where?.currentPeriodEnd?.lte) results = results.filter((s: any)=>new Date(s.currentPeriodEnd)<=new Date(where.currentPeriodEnd.lte));
    return results;
  },
  create: ({ data }: any): any => createSub({ ...data, trialEndsAt:data.trialEndsAt||null, currentPeriodEnd: data.currentPeriodEnd||new Date(Date.now()+30*24*60*60*1000).toISOString() }),
  update: ({ where, data }: any): any => {
    if (!where.id) return null;
    return updateSubscription(where.id, data);
  },
};

const apiKeyModel = {
  findUnique: ({ where }: any): any => {
    if (where?.keyHash) return safe(()=>findUserByApiKey(where.keyHash)); // using hash as lookup
    return null;
  },
  findMany: ({ where }: any): any[] => {
    let results = getAllApiKeys();
    if (where?.userId) results = results.filter((a: any)=>a.userId===where.userId);
    if (where?.status) results = results.filter((a: any)=>a.status===where.status);
    return results;
  },
  create: ({ data }: any): any => createApiKey(data),
};

// ─── Prisma export with all models ───────────────────────────────────────────

export const prisma: any = {
  user: userModel,
  license: licModel,
  subscription: subModel,
  apiKey: apiKeyModel,
  package: { findUnique:()=>null, findFirst:()=>null, findMany:()=>[], create:()=>null, update:()=>null },
  strategy: { findUnique:()=>null, findFirst:()=>null, findMany:()=>[] },
  adminUser: { findUnique:({ where }: any) => where.email==='admin@tradecandle.net'?{id:'1',email:'admin@tradecandle.net',role:'SUPER_ADMIN',name:'Admin'}:null, findMany: ()=>[] },
  tradingAccount: { findUnique:()=>null, findFirst:()=>null, findMany:()=>[], count:()=>0 },
  notification: { findMany:()=>[], count:()=>0, findFirst:()=>null },
  heartbeat: { findMany:()=>[], findFirst:()=>null, count:()=>0, findUnique:()=>null },
  payment: { findMany:()=>[], count:()=>0, findUnique:()=>null, findFirst:()=>null, create:()=>null },
  metric: { findMany:()=>[] },
  riskRule: { findMany:()=>[], findFirst:()=>null, findUnique:()=>null },
  riskEvent: { findMany:()=>[], count:()=>0, findFirst:()=>null, create:()=>null },
  configVersion: { findMany:()=>[] },
  auditLog: { create:()=>Promise.resolve({}), findMany:()=>[] },
  tradeEvent: { findMany:()=>[], count:()=>0, findFirst:()=>null, findUnique:()=>null, create:()=>null },
  $transaction: (fn: any) => Promise.resolve(fn(prisma)),
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
};

export default prisma;
