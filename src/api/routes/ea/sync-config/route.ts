// ─── GET /api/ea/sync-config ──────────────────────────────────────────────────
// EA endpoint: Fetch current configuration for the strategy
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { validateLicenseMiddleware } from '../../../middleware/validateLicense';
import { getEAConfig } from '../../../services/ea-contract.service';
import { eaRateLimiter } from '../../../middleware/rateLimit';

export async function GET(request: NextRequest) {
  // Rate limit
  const rateLimitResult = await eaRateLimiter()(request);
  if (rateLimitResult) return rateLimitResult;

  // License validation
  const authResult = await validateLicenseMiddleware(request);
  if ('status' in authResult) return authResult;

  try {
    const config = await getEAConfig(authResult.license.id);
    return NextResponse.json(config);
  } catch (error) {
    console.error('EA config fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

// ─── POST /api/ea/sync-config ─────────────────────────────────────────────
// EA endpoint: Acknowledge config receipt
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResult = await eaRateLimiter()(request);
  if (rateLimitResult) return rateLimitResult;

  // License validation
  const authResult = await validateLicenseMiddleware(request);
  if ('status' in authResult) return authResult;

  try {
    const body = await request.json();
    const { configHash } = body;

    if (!configHash) {
      return NextResponse.json(
        { error: 'configHash is required' },
        { status: 400 }
      );
    }

    const result = await acknowledgeConfigEA(authResult.license.id, configHash);
    return NextResponse.json(result);
  } catch (error) {
    console.error('EA config ack error:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge config' },
      { status: 500 }
    );
  }
}

async function acknowledgeConfigEA(licenseId: string, configHash: string) {
  const { acknowledgeConfig } = await import('../../../services/ea-contract.service');
  return acknowledgeConfig(licenseId, configHash);
}
