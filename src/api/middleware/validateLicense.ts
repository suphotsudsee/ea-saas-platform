// ─── License Validation Middleware ─────────────────────────────────────────────
// Validates X-API-Key and X-License-Key headers for EA backend endpoints
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../lib/prisma';
import { redis } from '../utils/redis';
import crypto from 'crypto';

export interface ValidatedLicenseRequest extends NextRequest {
  license?: {
    id: string;
    key: string;
    userId: string;
    subscriptionId: string;
    strategyId: string;
    status: string;
    expiresAt: Date;
    maxAccounts: number;
    killSwitch: boolean;
    killSwitchReason: string | null;
  };
  apiKey?: {
    id: string;
    userId: string;
    name: string;
  };
}

export async function validateLicenseMiddleware(
  request: NextRequest
): Promise<{ license: NonNullable<ValidatedLicenseRequest['license']>; apiKey: NonNullable<ValidatedLicenseRequest['apiKey']> } | NextResponse> {
  // ─── Extract Headers ────────────────────────────────────────────────
  const apiKeyHeader = request.headers.get('x-api-key');
  const licenseKeyHeader = request.headers.get('x-license-key');

  if (!apiKeyHeader || !licenseKeyHeader) {
    return NextResponse.json(
      {
        valid: false,
        error: 'MISSING_HEADERS',
        message: 'X-API-Key and X-License-Key headers are required',
      },
      { status: 400 }
    );
  }

  // ─── Validate API Key ────────────────────────────────────────────────
  const apiKeyHash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: apiKeyHash },
    include: { user: { select: { id: true, status: true } } },
  });

  if (!apiKey) {
    return NextResponse.json(
      { valid: false, error: 'INVALID_API_KEY', message: 'The provided API key is invalid' },
      { status: 401 }
    );
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return NextResponse.json(
      { valid: false, error: 'API_KEY_EXPIRED', message: 'The provided API key has expired' },
      { status: 401 }
    );
  }

  if (apiKey.user.status === 'SUSPENDED' || apiKey.user.status === 'BANNED') {
    return NextResponse.json(
      { valid: false, error: 'ACCOUNT_SUSPENDED', message: 'Account associated with this API key is suspended' },
      { status: 403 }
    );
  }

  // Update lastUsedAt asynchronously (don't await to save latency)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  // ─── Validate License Key ────────────────────────────────────────────
  // Check Redis cache first
  const cacheKey = `license:validate:${licenseKeyHeader}`;
  let licenseData = await redis.get(cacheKey);

  if (licenseData) {
    const cached = JSON.parse(licenseData);
    if (cached.status !== 'ACTIVE') {
      return NextResponse.json(
        { valid: false, error: cached.errorCode, message: cached.errorMessage },
        { status: 403 }
      );
    }
    return {
      license: cached.license,
      apiKey: {
        id: apiKey.id,
        userId: apiKey.userId,
        name: apiKey.name,
      },
    };
  }

  // Cache miss — query database
  const license = await prisma.license.findUnique({
    where: { key: licenseKeyHeader },
    include: {
      user: { select: { id: true, status: true } },
      subscription: { select: { id: true, status: true } },
    },
  });

  if (!license) {
    return NextResponse.json(
      { valid: false, error: 'INVALID_KEY', message: 'License key not found' },
      { status: 401 }
    );
  }

  if (license.user.status === 'SUSPENDED' || license.user.status === 'BANNED') {
    return NextResponse.json(
      { valid: false, error: 'ACCOUNT_SUSPENDED', message: 'Account is suspended or banned' },
      { status: 403 }
    );
  }

  if (license.status === 'EXPIRED' || license.expiresAt < new Date()) {
    return NextResponse.json(
      { valid: false, error: 'EXPIRED', message: 'License has expired' },
      { status: 403 }
    );
  }

  if (license.status === 'REVOKED') {
    return NextResponse.json(
      { valid: false, error: 'REVOKED', message: 'License has been revoked' },
      { status: 403 }
    );
  }

  if (license.status === 'PAUSED') {
    return NextResponse.json(
      { valid: false, error: 'PAUSED', message: 'License is paused' },
      { status: 403 }
    );
  }

  if (license.subscription.status !== 'ACTIVE' && license.subscription.status !== 'TRIAL') {
    return NextResponse.json(
      { valid: false, error: 'SUBSCRIPTION_INACTIVE', message: 'Associated subscription is not active' },
      { status: 403 }
    );
  }

  // Cache the valid license for 5 minutes
  const licenseInfo = {
    id: license.id,
    key: license.key,
    userId: license.userId,
    subscriptionId: license.subscriptionId,
    strategyId: license.strategyId,
    status: license.status,
    expiresAt: license.expiresAt.toISOString(),
    maxAccounts: license.maxAccounts,
    killSwitch: license.killSwitch,
    killSwitchReason: license.killSwitchReason,
  };

  await redis.setex(cacheKey, parseInt(process.env.LICENSE_CACHE_TTL_SEC || '300'), JSON.stringify({
    status: 'ACTIVE',
    license: licenseInfo,
  }));

  return {
    license: licenseInfo as NonNullable<ValidatedLicenseRequest['license']>,
    apiKey: {
      id: apiKey.id,
      userId: apiKey.userId,
      name: apiKey.name,
    },
  };
}