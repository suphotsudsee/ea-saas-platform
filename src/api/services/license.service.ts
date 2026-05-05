// ─── License Service ──────────────────────────────────────────────────────────
// Business logic for license creation, validation, revocation, and management
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';
import { redis, RedisKeys, RedisTTL } from '../utils/redis';
import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LicenseValidationResult {
  valid: boolean;
  error?: 'INVALID_KEY' | 'EXPIRED' | 'REVOKED' | 'PAUSED' | 'ACCOUNT_MISMATCH' | 'MAX_ACCOUNTS_REACHED' | 'KILLED' | 'SUBSCRIPTION_INACTIVE';
  message?: string;
  license?: {
    id: string;
    key: string;
    userId: string;
    strategyId: string;
    status: string;
    expiresAt: string;
    maxAccounts: number;
    killSwitch: boolean;
  };
  strategy?: {
    id: string;
    name: string;
    version: string;
    defaultConfig: any;
    riskConfig: any;
  };
  configHash?: string;
}

interface CreateLicenseInput {
  userId: string;
  subscriptionId: string;
  strategyId: string;
  maxAccounts: number;
  expiresAt: Date;
}

// ─── License Key Generation ──────────────────────────────────────────────────

export function generateLicenseKey(): string {
  const uuid = crypto.randomUUID();
  return `ea-${uuid}`;
}

export function hashLicenseKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// ─── Create License ──────────────────────────────────────────────────────────

export async function createLicense(input: CreateLicenseInput) {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const rawKey = generateLicenseKey();
    
    try {
      const license = await prisma.license.create({
        data: {
          key: rawKey,
          userId: input.userId,
          subscriptionId: input.subscriptionId,
          strategyId: input.strategyId,
          maxAccounts: input.maxAccounts,
          expiresAt: input.expiresAt,
          status: 'ACTIVE',
        },
      });

      return { license, rawKey };
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('key')) {
        // Key collision — extremely unlikely but retry
        attempts++;
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate unique license key after multiple attempts');
}

// ─── Validate License (with caching) ─────────────────────────────────────────

export async function validateLicense(
  licenseKey: string,
  accountNumber?: string
): Promise<LicenseValidationResult> {
  // 1. Check Redis cache first
  const cacheKey = RedisKeys.licenseCache(licenseKey);
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    const result = JSON.parse(cached);
    
    // If there's an account validation needed, check that even for cached results
    if (result.valid && accountNumber) {
      const accountCheck = await validateAccountForLicense(result.license.id, accountNumber);
      if (!accountCheck.valid) {
        return accountCheck;
      }
    }

    // Check kill switch in Redis (may have been set after cache)
    if (result.valid) {
      const killFlag = await redis.get(RedisKeys.killSwitch(result.license.id));
      const globalKill = await redis.get(RedisKeys.globalKillSwitch());
      if (killFlag === '1' || globalKill === '1') {
        return {
          valid: false,
          error: 'KILLED',
          message: 'Kill switch is active',
        };
      }
    }

    return result;
  }

  // 2. Cache miss — query database
  const license = await prisma.license.findUnique({
    where: { key: licenseKey },
    include: {
      user: { select: { id: true, status: true } },
      subscription: { select: { id: true, status: true } },
      strategy: { select: { id: true, name: true, version: true, defaultConfig: true, riskConfig: true } },
    },
  });

  if (!license) {
    return { valid: false, error: 'INVALID_KEY', message: 'License key not found' };
  }

  if (license.user.status === 'SUSPENDED' || license.user.status === 'BANNED') {
    return { valid: false, error: 'ACCOUNT_MISMATCH', message: 'Account is suspended or banned' };
  }

  if (license.status === 'EXPIRED' || license.expiresAt < new Date()) {
    return { valid: false, error: 'EXPIRED', message: 'License has expired' };
  }

  if (license.status === 'REVOKED') {
    return { valid: false, error: 'REVOKED', message: 'License has been revoked' };
  }

  if (license.status === 'PAUSED') {
    return { valid: false, error: 'PAUSED', message: 'License is paused' };
  }

  if (license.subscription.status !== 'ACTIVE' && license.subscription.status !== 'TRIAL') {
    return { valid: false, error: 'SUBSCRIPTION_INACTIVE', message: 'Associated subscription is not active' };
  }

  // 3. Check kill switch
  const killFlag = await redis.get(RedisKeys.killSwitch(license.id));
  const globalKill = await redis.get(RedisKeys.globalKillSwitch());
  if (killFlag === '1' || globalKill === '1' || license.killSwitch) {
    return { valid: false, error: 'KILLED', message: 'Kill switch is active' };
  }

  // 4. Validate trading account if provided
  if (accountNumber) {
    const accountCheck = await validateAccountForLicense(license.id, accountNumber);
    if (!accountCheck.valid) {
      return accountCheck;
    }
  }

  // 5. Build config hash
  const configHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(license.strategy.defaultConfig))
    .digest('hex');

  // 6. Cache the result
  const result: LicenseValidationResult = {
    valid: true,
    license: {
      id: license.id,
      key: license.key,
      userId: license.userId,
      strategyId: license.strategyId,
      status: license.status,
      expiresAt: license.expiresAt.toISOString(),
      maxAccounts: license.maxAccounts,
      killSwitch: license.killSwitch,
    },
    strategy: {
      id: license.strategy.id,
      name: license.strategy.name,
      version: license.strategy.version,
      defaultConfig: license.strategy.defaultConfig,
      riskConfig: license.strategy.riskConfig,
    },
    configHash,
  };

  await redis.setex(cacheKey, RedisTTL.LICENSE_CACHE, JSON.stringify(result));

  return result;
}

// ─── Validate Account for License ────────────────────────────────────────────

async function validateAccountForLicense(
  licenseId: string,
  accountNumber: string
): Promise<LicenseValidationResult> {
  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    include: { tradingAccounts: true },
  });

  if (!license) {
    return { valid: false, error: 'INVALID_KEY', message: 'License not found' };
  }

  // Check if account is already linked
  const existingAccount = license.tradingAccounts.find(
    (a) => a.accountNumber === accountNumber && a.status !== 'UNLINKED'
  );

  if (existingAccount) {
    return { valid: true }; // Account already linked to this license
  }

  // Check max accounts limit
  const activeAccounts = license.tradingAccounts.filter((a) => a.status !== 'UNLINKED');
  if (activeAccounts.length >= license.maxAccounts) {
    return {
      valid: false,
      error: 'MAX_ACCOUNTS_REACHED',
      message: `Maximum accounts (${license.maxAccounts}) reached for this license`,
    };
  }

  // Auto-link is possible — but we don't auto-create here, that's done in heartbeat
  return { valid: true };
}

// ─── Revoke License ──────────────────────────────────────────────────────────

export async function revokeLicense(licenseId: string, reason: string, adminId: string) {
  const license = await prisma.license.update({
    where: { id: licenseId },
    data: {
      status: 'REVOKED',
      killSwitch: true,
      killSwitchReason: reason,
      killSwitchAt: new Date(),
    },
  });

  // Invalidate cache
  await redis.del(RedisKeys.licenseCache(license.key));
  await redis.set(RedisKeys.killSwitch(licenseId), '1');

  // Create audit log
  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'admin',
      action: 'REVOKE_LICENSE',
      resourceType: 'license',
      resourceId: licenseId,
      newValue: { status: 'REVOKED', reason },
    },
  });

  return license;
}

// ─── Pause/Resume License ────────────────────────────────────────────────────

export async function pauseLicense(licenseId: string, reason: string, adminId: string) {
  const license = await prisma.license.update({
    where: { id: licenseId },
    data: {
      status: 'PAUSED',
      pausedAt: new Date(),
      pausedReason: reason,
    },
  });

  await redis.del(RedisKeys.licenseCache(license.key));

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'admin',
      action: 'PAUSE_LICENSE',
      resourceType: 'license',
      resourceId: licenseId,
      newValue: { status: 'PAUSED', reason },
    },
  });

  return license;
}

export async function resumeLicense(licenseId: string, adminId: string) {
  const license = await prisma.license.update({
    where: { id: licenseId },
    data: {
      status: 'ACTIVE',
      pausedAt: null,
      pausedReason: null,
    },
  });

  await redis.del(RedisKeys.licenseCache(license.key));

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'admin',
      action: 'RESUME_LICENSE',
      resourceType: 'license',
      resourceId: licenseId,
      newValue: { status: 'ACTIVE' },
    },
  });

  return license;
}

// ─── Extend License ──────────────────────────────────────────────────────────

export async function extendLicense(licenseId: string, newExpiry: Date, reason: string, adminId: string) {
  const oldLicense = await prisma.license.findUnique({ where: { id: licenseId } });
  if (!oldLicense) throw new Error('License not found');

  const license = await prisma.license.update({
    where: { id: licenseId },
    data: { expiresAt: newExpiry },
  });

  await redis.del(RedisKeys.licenseCache(license.key));

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'admin',
      action: 'EXTEND_LICENSE',
      resourceType: 'license',
      resourceId: licenseId,
      oldValue: { expiresAt: oldLicense.expiresAt.toISOString() },
      newValue: { expiresAt: newExpiry.toISOString(), reason },
    },
  });

  return license;
}

// ─── Regenerate License Key ─────────────────────────────────────────────────

export async function regenerateLicenseKey(licenseId: string, adminId: string) {
  const oldLicense = await prisma.license.findUnique({ where: { id: licenseId } });
  if (!oldLicense) throw new Error('License not found');

  const newRawKey = generateLicenseKey();

  // Invalidate old cache
  await redis.del(RedisKeys.licenseCache(oldLicense.key));

  const license = await prisma.license.update({
    where: { id: licenseId },
    data: { key: newRawKey },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'admin',
      action: 'REGENERATE_LICENSE_KEY',
      resourceType: 'license',
      resourceId: licenseId,
      newValue: { keyPrefix: newRawKey.substring(0, 8) },
    },
  });

  return { license, rawKey: newRawKey };
}

// ─── Toggle Kill Switch ──────────────────────────────────────────────────────

export async function toggleKillSwitch(
  licenseId: string,
  activate: boolean,
  reason: string | null,
  adminId: string
) {
  const license = await prisma.license.update({
    where: { id: licenseId },
    data: {
      killSwitch: activate,
      killSwitchReason: reason,
      killSwitchAt: activate ? new Date() : null,
    },
  });

  // Update Redis
  if (activate) {
    await redis.set(RedisKeys.killSwitch(licenseId), '1');
  } else {
    await redis.del(RedisKeys.killSwitch(licenseId));
  }

  // Invalidate license cache
  await redis.del(RedisKeys.licenseCache(license.key));

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'admin',
      action: activate ? 'ACTIVATE_KILL_SWITCH' : 'DEACTIVATE_KILL_SWITCH',
      resourceType: 'license',
      resourceId: licenseId,
      newValue: { killSwitch: activate, reason },
    },
  });

  return license;
}

// ─── Global Kill Switch ──────────────────────────────────────────────────────

export async function setGlobalKillSwitch(activate: boolean, adminId: string, reason: string) {
  if (activate) {
    await redis.set(RedisKeys.globalKillSwitch(), '1');

    // Also set kill switch on all active licenses
    await prisma.license.updateMany({
      where: { status: 'ACTIVE' },
      data: {
        killSwitch: true,
        killSwitchReason: `Global kill switch: ${reason}`,
        killSwitchAt: new Date(),
      },
    });
  } else {
    await redis.del(RedisKeys.globalKillSwitch());

    // Deactivate kill switch on all licenses
    await prisma.license.updateMany({
      where: { killSwitch: true },
      data: {
        killSwitch: false,
        killSwitchReason: null,
        killSwitchAt: null,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'admin',
      action: activate ? 'GLOBAL_KILL_SWITCH_ACTIVATE' : 'GLOBAL_KILL_SWITCH_DEACTIVATE',
      resourceType: 'system',
      resourceId: 'global',
      newValue: { activate, reason },
    },
  });
}

// ─── List User Licenses ──────────────────────────────────────────────────────

export async function listUserLicenses(userId: string) {
  return prisma.license.findMany({
    where: { userId },
    include: {
      strategy: { select: { id: true, name: true, version: true } },
      subscription: { select: { id: true, status: true, package: { select: { name: true } } } },
      tradingAccounts: {
        where: { status: { not: 'UNLINKED' } },
        select: {
          id: true,
          accountNumber: true,
          brokerName: true,
          platform: true,
          status: true,
          lastHeartbeatAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Get License Detail ──────────────────────────────────────────────────────

export async function getLicenseDetail(licenseId: string, userId: string) {
  return prisma.license.findFirst({
    where: { id: licenseId, userId },
    include: {
      strategy: true,
      subscription: { include: { package: true } },
      tradingAccounts: {
        where: { status: { not: 'UNLINKED' } },
      },
      heartbeats: {
        orderBy: { receivedAt: 'desc' },
        take: 10,
      },
      riskEvents: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
}