import {
  findUserByEmail,
  findUserById,
  getAllUsers,
  createUser,
  updateUser,
  findLicenseByKey,
  getAllLicenses,
  createLic,
  updateLicense,
  findSubscriptionByUserId,
  getAllSubscriptions,
  createSub,
  findSubscriptionById,
  updateSubscription,
  findUserByApiKey,
  createApiKey,
  getAllApiKeys,
  findAdminByEmail,
  getAllPackages,
  findPackageById,
  getAllStrategies,
  findStrategyById,
} from '../../lib/db';

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.warn('DB:', e);
    return null;
  }
}

async function mockUser(user: any) {
  if (!user) return null;
  const [subscriptions, licenses, apiKeys] = await Promise.all([
    getAllSubscriptions(),
    getAllLicenses(),
    getAllApiKeys(),
  ]);

  return {
    ...user,
    subscriptions: () => subscriptions.filter((s: any) => s.userId === user.id),
    licenses: () => licenses.filter((l: any) => l.userId === user.id),
    tradingAccounts: () => [],
    notifications: () => [],
    apiKeys: () => apiKeys.filter((a: any) => a.userId === user.id),
  };
}

function matchesWhere(row: any, where: any) {
  if (!where) return true;
  if (where.status && row.status !== where.status) return false;
  if (where.role && row.role !== where.role) return false;
  if (where.userId && row.userId !== where.userId) return false;
  if (where.id && row.id !== where.id) return false;
  if (where.key && row.key !== where.key) return false;
  if (where.email?.contains && !row.email?.includes(where.email.contains)) return false;
  if (where.id?.notIn?.includes(row.id)) return false;
  if (where.createdAt?.gte && new Date(row.createdAt) < new Date(where.createdAt.gte)) return false;
  if (where.createdAt?.lte && new Date(row.createdAt) > new Date(where.createdAt.lte)) return false;
  if (where.expiresAt?.lte && row.expiresAt && new Date(row.expiresAt) > new Date(where.expiresAt.lte)) return false;
  if (where.currentPeriodEnd?.lte && new Date(row.currentPeriodEnd) > new Date(where.currentPeriodEnd.lte)) return false;
  return true;
}

function sortRows(rows: any[], orderBy: any) {
  if (!orderBy?.createdAt) return rows;
  return [...rows].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return orderBy.createdAt === 'asc' ? diff : -diff;
  });
}

const userModel = {
  findUnique: async ({ where }: any) => {
    if (where.email) return safe(async () => mockUser(await findUserByEmail(where.email)));
    if (where.id) return safe(async () => mockUser(await findUserById(where.id)));
    return null;
  },
  findFirst: async ({ where }: any = {}) => {
    const users = await getAllUsers();
    return users.find((u: any) => matchesWhere(u, where)) || null;
  },
  findMany: async ({ where, orderBy, take }: any = {}) => {
    let results = (await getAllUsers()).filter((u: any) => matchesWhere(u, where));
    results = sortRows(results, orderBy);
    return take ? results.slice(0, take) : results;
  },
  create: async ({ data }: any) =>
    createUser({
      ...data,
      timezone: data.timezone || 'UTC',
      twoFactorEnabled: data.twoFactorEnabled || false,
      status: data.status || 'ACTIVE',
      role: data.role || 'TRADER',
    }),
  update: async ({ where, data }: any) => {
    if (!where.id) return null;
    return updateUser(where.id, data);
  },
  count: async ({ where }: any = {}) => (await getAllUsers()).filter((u: any) => matchesWhere(u, where)).length,
};

const licModel = {
  findUnique: async ({ where }: any) => {
    if (where.key) return safe(async () => findLicenseByKey(where.key));
    if (where.id) return (await getAllLicenses()).find((l: any) => l.id === where.id) || null;
    return null;
  },
  findFirst: async ({ where }: any = {}) => (await getAllLicenses()).find((l: any) => matchesWhere(l, where)) || null,
  findMany: async ({ where }: any = {}) => (await getAllLicenses()).filter((l: any) => matchesWhere(l, where)),
  create: async ({ data }: any) => createLic({ ...data, maxAccounts: data.maxAccounts || 1, expiresAt: data.expiresAt || null }),
  update: async ({ where, data }: any) => {
    if (!where.id) return null;
    return updateLicense(where.id, data);
  },
};

const subModel = {
  findUnique: async ({ where }: any) => {
    if (where?.id) return findSubscriptionById(where.id);
    return null;
  },
  findFirst: async ({ where }: any = {}) => {
    if (where?.userId) return findSubscriptionByUserId(where.userId);
    return (await getAllSubscriptions()).find((s: any) => matchesWhere(s, where)) || null;
  },
  findMany: async ({ where }: any = {}) => (await getAllSubscriptions()).filter((s: any) => matchesWhere(s, where)),
  create: async ({ data }: any) =>
    createSub({
      ...data,
      trialEndsAt: data.trialEndsAt || null,
      currentPeriodEnd: data.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  update: async ({ where, data }: any) => {
    if (!where.id) return null;
    return updateSubscription(where.id, data);
  },
  deleteMany: async () => ({ count: 0 }),
};

const apiKeyModel = {
  findUnique: async ({ where }: any) => {
    if (where?.keyHash) return safe(async () => findUserByApiKey(where.keyHash));
    return null;
  },
  findMany: async ({ where }: any = {}) => (await getAllApiKeys()).filter((a: any) => matchesWhere(a, where)),
  create: async ({ data }: any) => createApiKey(data),
};

const packageModel = {
  findUnique: async ({ where }: any) => (where?.id ? findPackageById(where.id) : null),
  findFirst: async ({ where }: any = {}) => (await getAllPackages()).find((p: any) => matchesWhere(p, where)) || null,
  findMany: async ({ where }: any = {}) => (await getAllPackages()).filter((p: any) => matchesWhere(p, where)),
  create: async () => null,
  update: async () => null,
  deleteMany: async () => ({ count: 0 }),
};

const strategyModel = {
  findUnique: async ({ where }: any) => (where?.id ? findStrategyById(where.id) : null),
  findFirst: async ({ where }: any = {}) => (await getAllStrategies()).find((s: any) => matchesWhere(s, where)) || null,
  findMany: async ({ where }: any = {}) => (await getAllStrategies()).filter((s: any) => matchesWhere(s, where)),
  create: async () => null,
};

export const prisma: any = {
  user: userModel,
  license: licModel,
  subscription: subModel,
  apiKey: apiKeyModel,
  package: packageModel,
  strategy: strategyModel,
  adminUser: {
    findUnique: async ({ where }: any) => findAdminByEmail(where.email),
    findMany: async () => (await getAllUsers()).filter((u: any) => ['ADMIN', 'SUPER_ADMIN', 'BILLING_ADMIN', 'RISK_ADMIN', 'SUPPORT'].includes(u.role)),
  },
  tradingAccount: { findUnique: async () => null, findFirst: async () => null, findMany: async () => [], count: async () => 0 },
  notification: { findMany: async () => [], count: async () => 0, findFirst: async () => null },
  heartbeat: { findMany: async () => [], findFirst: async () => null, count: async () => 0, findUnique: async () => null },
  payment: { findMany: async () => [], count: async () => 0, findUnique: async () => null, findFirst: async () => null, create: async () => null },
  metric: { findMany: async () => [] },
  riskRule: { findMany: async () => [], findFirst: async () => null, findUnique: async () => null },
  riskEvent: { findMany: async () => [], count: async () => 0, findFirst: async () => null, create: async () => null },
  configVersion: { findMany: async () => [] },
  auditLog: { create: async () => ({}), findMany: async () => [] },
  tradeEvent: { findMany: async () => [], count: async () => 0, findFirst: async () => null, findUnique: async () => null, create: async () => null },
  $transaction: (fn: any) => Promise.resolve(fn(prisma)),
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
};

export default prisma;
