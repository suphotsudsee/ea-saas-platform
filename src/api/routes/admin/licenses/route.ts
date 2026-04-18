// ─── GET/PATCH /api/admin/licenses ─────────────────────────────────────────────
// List all licenses with filters; admin license management
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { adminOnlyMiddleware, requireWriteAccess } from '../../../middleware/adminOnly';
import { prisma } from '../../../lib/prisma';
import {
  revokeLicense,
  pauseLicense,
  resumeLicense,
  extendLicense,
  regenerateLicenseKey,
  toggleKillSwitch,
} from '../../../services/license.service';
import { z } from 'zod';

// ─── GET: List all licenses ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const strategyId = searchParams.get('strategyId');

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (strategyId) where.strategyId = strategyId;

    const [licenses, total] = await Promise.all([
      prisma.license.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          strategy: { select: { id: true, name: true, version: true } },
          subscription: { select: { id: true, status: true, package: { select: { name: true } } } },
          _count: { select: { tradingAccounts: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.license.count({ where }),
    ]);

    // Mask keys
    const maskedLicenses = licenses.map((l) => ({
      ...l,
      key: l.key.substring(0, 8) + '****',
    }));

    return NextResponse.json({
      licenses: maskedLicenses,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('Admin list licenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
  }
}

// ─── PATCH: Admin license actions ───────────────────────────────────────────

const licenseActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('revoke'), licenseId: z.string(), reason: z.string() }),
  z.object({ action: z.literal('pause'), licenseId: z.string(), reason: z.string() }),
  z.object({ action: z.literal('resume'), licenseId: z.string() }),
  z.object({ action: z.literal('extend'), licenseId: z.string(), newExpiry: z.string() }),
  z.object({ action: z.literal('regenerate'), licenseId: z.string() }),
  z.object({ action: z.literal('kill'), licenseId: z.string(), activate: z.boolean(), reason: z.string().optional() }),
]);

export async function PATCH(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  if (!requireWriteAccess(authResult.admin.role)) {
    return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = licenseActionSchema.parse(body);

    let result;
    switch (validated.action) {
      case 'revoke':
        result = await revokeLicense(validated.licenseId, validated.reason, authResult.admin.id);
        break;
      case 'pause':
        result = await pauseLicense(validated.licenseId, validated.reason, authResult.admin.id);
        break;
      case 'resume':
        result = await resumeLicense(validated.licenseId, authResult.admin.id);
        break;
      case 'extend':
        result = await extendLicense(validated.licenseId, new Date(validated.newExpiry), 'Admin extension', authResult.admin.id);
        break;
      case 'regenerate':
        result = await regenerateLicenseKey(validated.licenseId, authResult.admin.id);
        break;
      case 'kill':
        result = await toggleKillSwitch(validated.licenseId, validated.activate, validated.reason || null, authResult.admin.id);
        break;
    }

    return NextResponse.json({ message: `License ${validated.action} successful`, result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Admin license action error:', error);
    return NextResponse.json({ error: 'Failed to perform license action' }, { status: 500 });
  }
}
