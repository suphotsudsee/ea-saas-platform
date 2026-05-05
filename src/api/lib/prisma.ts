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
  if (where.status?.not && row.status === where.status.not) return false;
  if (where.status && typeof where.status !== 'object' && row.status !== where.status) return false;
<<<<<<< HEAD
=======
  if (where.status?.in && !where.status.in.includes(row.status)) return false;
  if (where.packageId && row.packageId !== where.packageId) return false;
>>>>>>> cba4206f46728294b317464c4728579d35ff872d
  if (where.role && row.role !== where.role) return false;
  if (where.userId && row.userId !== where.userId) return false;
  if (where.id && row.id !== where.id) return false;
  if (where.key && row.key !== where.key) return false;
  if (where.killSwitch !== undefined && Boolean(row.killSwitch) !== Boolean(where.killSwitch)) return false;
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
  findMany: async ({ where, select, include, orderBy, skip, take }: any = {}) => {
    let results = (await getAllUsers()).filter((u: any) => matchesWhere(u, where));
    results = sortRows(results, orderBy || { createdAt: 'desc' });

    // Pre-fetch shared data
    const [allSubs, allLicenses, allPackages] = await Promise.all([
      getAllSubscriptions(),
      getAllLicenses(),
      getAllPackages(),
    ]);

    const enriched = results.map((u: any) => {
      const result: any = {};

      // Handle select fields
      if (select) {
        for (const [key, val] of Object.entries(select)) {
          if (['id', 'email', 'name', 'role', 'status', 'emailVerified', 'twoFactorEnabled', 'createdAt'].includes(key)) {
            result[key] = u[key];
          } else if (key === 'subscriptions') {
            const fields = (val as any).select;
            const subs = (val as any).take
              ? allSubs.filter((s: any) => s.userId === u.id).slice(0, (val as any).take)
              : allSubs.filter((s: any) => s.userId === u.id);
            result.subscriptions = fields
              ? subs.map((s: any) => ({
                  ...Object.fromEntries(Object.entries(fields).map(([kk, vv]) => [kk, (s as any)[kk]])),
                  ...(fields.package ? { package: { name: allPackages.find((p: any) => p.id === s.packageId)?.name || '' } } : {}),
                }))
              : subs;
          } else if (key === 'tradingAccounts') {
            result.tradingAccounts = (val as any).take ? [] : [];
          } else if (key === '_count') {
            const countFields = (val as any).select;
            result._count = {};
            if (countFields.subscriptions) result._count.subscriptions = allSubs.filter((s: any) => s.userId === u.id).length;
            if (countFields.licenses) result._count.licenses = allLicenses.filter((l: any) => l.userId === u.id).length;
            if (countFields.tradingAccounts) result._count.tradingAccounts = 0;
          }
        }
      } else {
        Object.assign(result, u);
      }

      return result;
    });

    const sliced = skip ? enriched.slice(skip) : enriched;
    return take ? sliced.slice(0, take) : sliced;
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
  findMany: async ({ where, include, orderBy, skip, take }: any = {}) => {
    let licenses = (await getAllLicenses()).filter((l: any) => matchesWhere(l, where));
    licenses = sortRows(licenses, orderBy || { createdAt: 'desc' });

    const enriched = await Promise.all(
      licenses.map(async (l: any) => {
        const result = { ...l };

        if (include?.user) {
          const users = await getAllUsers();
          const fields = include.user.select;
          const raw = users.find((u: any) => u.id === l.userId);
          result.user = raw && fields
            ? Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, (raw as any)[k]]))
            : raw ?? null;
        }

        if (include?.strategy) {
          const strategies = await getAllStrategies();
          const fields = include.strategy.select;
          const raw = strategies.find((s: any) => s.id === l.strategyId);
          result.strategy = raw && fields
            ? Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, (raw as any)[k]]))
            : raw ?? null;
        }

        if (include?.subscription) {
          const subs = await getAllSubscriptions();
          const fields = include.subscription.select;
          const raw = subs.find((s: any) => s.id === l.subscriptionId);
          result.subscription = raw && fields
            ? { ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, (raw as any)[k]])), package: (await getAllPackages()).find((p: any) => p.id === raw.packageId) || null }
            : raw ?? null;
        }

        if (include?.tradingAccounts) {
          result.tradingAccounts = [];
        }

        if (include?._count) {
          const countFields = include._count.select;
          result._count = {};
          if (countFields.tradingAccounts) {
            result._count.tradingAccounts = 0;
          }
        }

        return result;
      })
    );

    const sliced = skip ? enriched.slice(skip) : enriched;
    return take ? sliced.slice(0, take) : sliced;
  },
  create: async ({ data }: any) => createLic({ ...data, maxAccounts: data.maxAccounts || 1, expiresAt: data.expiresAt || null }),
  update: async ({ where, data }: any) => {
    if (!where.id) return null;
    return updateLicense(where.id, data);
  },
  count: async ({ where }: any = {}) => (await getAllLicenses()).filter((l: any) => matchesWhere(l, where)).length,
};

const subModel = {
  findUnique: async ({ where }: any) => {
    if (where?.id) return findSubscriptionById(where.id);
    return null;
  },
  findFirst: async ({ where, include }: any = {}) => {
    let sub;
    if (where?.userId) {
<<<<<<< HEAD
      sub = await findSubscriptionByUserId(where.userId);
=======
      // Check all subscriptions for the user and apply remaining filters
      const allSubs = await getAllSubscriptions();
      const userSubs = allSubs.filter((s: any) => s.userId === where.userId);
      sub = userSubs.find((s: any) => {
        // Apply remaining where conditions (packageId, status, etc.)
        const remaining = { ...where };
        delete remaining.userId;
        return matchesWhere(s, remaining);
      }) || null;
>>>>>>> cba4206f46728294b317464c4728579d35ff872d
    } else {
      sub = (await getAllSubscriptions()).find((s: any) => matchesWhere(s, where)) || null;
    }

    if (!sub) return null;

    // Enrich with includes (same as findMany)
    if (include?.package) {
      const packages = await getAllPackages();
      sub.package = packages.find((pkg: any) => pkg.id === sub.packageId) || null;
    }
    if (include?.licenses) {
      const licenses = await getAllLicenses();
      const strategies = await getAllStrategies();
      sub.licenses = licenses
        .filter((l: any) => l.subscriptionId === sub.id)
        .map((l: any) => ({
          ...l,
          strategy: strategies.find((s: any) => s.id === l.strategyId) || null,
          tradingAccounts: [],
        }));
    }

    return sub;
  },
  findMany: async ({ where, include, orderBy }: any = {}) => {
    const subs = (await getAllSubscriptions()).filter((s: any) => matchesWhere(s, where));
    const sorted = sortRows(subs, orderBy || { createdAt: 'desc' });

    const enriched = await Promise.all(
      sorted.map(async (sub: any) => {
        const result = { ...sub };

        if (include?.user) {
          const users = await getAllUsers();
          const fields = include.user.select;
          const raw = users.find((u: any) => u.id === sub.userId);
          result.user = raw && fields
            ? Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, (raw as any)[k]]))
            : raw ?? null;
        }

        if (include?.package) {
          const packages = await getAllPackages();
          result.package = packages.find((pkg: any) => pkg.id === sub.packageId) || null;
        }

        if (include?.licenses) {
          const licenses = await getAllLicenses();
          const fields = include.licenses.select;
          const raw = licenses.filter((l: any) => l.subscriptionId === sub.id);
          result.licenses = fields
            ? raw.map((l: any) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, (l as any)[k]])))
            : raw;
        }

        return result;
      })
    );

    return enriched;
  },
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
  count: async ({ where }: any = {}) => (await getAllSubscriptions()).filter((s: any) => matchesWhere(s, where)).length,
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
  payment: {
<<<<<<< HEAD
    findMany: async () => [],
    count: async () => 0,
    findUnique: async () => null,
    findFirst: async () => null,
    create: async () => null,
=======
    findMany: async ({ where, orderBy }: any = {}) => {
      const { getAllPayments } = await import('../../lib/db');
      const rows = await getAllPayments(where);
      if (orderBy?.createdAt === 'asc') rows.reverse();
      return rows;
    },
    count: async ({ where }: any = {}) => {
      const { getAllPayments } = await import('../../lib/db');
      return (await getAllPayments(where)).length;
    },
    findUnique: async ({ where }: any) => {
      const { findPaymentById } = await import('../../lib/db');
      return where?.id ? findPaymentById(where.id) : null;
    },
    findFirst: async ({ where }: any = {}) => {
      const { findPaymentFirst } = await import('../../lib/db');
      return findPaymentFirst(where);
    },
    create: async ({ data }: any) => {
      const { createPayment } = await import('../../lib/db');
      return createPayment(data);
    },
    update: async ({ where, data }: any) => {
      const { updatePayment } = await import('../../lib/db');
      return where?.id ? updatePayment(where.id, data) : null;
    },
>>>>>>> cba4206f46728294b317464c4728579d35ff872d
    aggregate: async () => ({ _sum: { amountCents: 0 } }),
  },
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
