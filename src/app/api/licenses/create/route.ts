// ─── POST /api/licenses/create ────────────────────────────────────────────────
// Create a new license (admin only)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { adminOnlyMiddleware, requireWriteAccess } from '@/api/middleware/adminOnly';
import { createLicense } from '@/api/services/license.service';
import { prisma } from '@/api/lib/prisma';
import { z } from 'zod';

const createLicenseSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  strategyId: z.string().min(1, 'Strategy ID is required'),
  maxAccounts: z.number().int().min(1).default(1),
  expiresAt: z.string().datetime('Invalid date format'),
});

export async function POST(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);

  if (authResult.response) {
    return authResult.response;
  }

  if (!requireWriteAccess(authResult.admin.role)) {
    return NextResponse.json(
      { error: 'Insufficient privileges — read-only access' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validated = createLicenseSchema.parse(body);

    // Verify subscription belongs to user
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: validated.subscriptionId,
        userId: validated.userId,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found or does not belong to user' },
        { status: 404 }
      );
    }

    // Verify strategy exists
    const strategy = await prisma.strategy.findUnique({
      where: { id: validated.strategyId },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    const { license, rawKey } = await createLicense({
      userId: validated.userId,
      subscriptionId: validated.subscriptionId,
      strategyId: validated.strategyId,
      maxAccounts: validated.maxAccounts,
      expiresAt: new Date(validated.expiresAt),
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: authResult.admin.id,
        actorType: 'admin',
        action: 'CREATE_LICENSE',
        resourceType: 'license',
        resourceId: license.id,
        newValue: { strategyId: validated.strategyId, maxAccounts: validated.maxAccounts },
      },
    });

    return NextResponse.json({
      message: 'License created successfully',
      license: {
        id: license.id,
        key: rawKey, // Full key shown only once
        status: license.status,
        expiresAt: license.expiresAt,
        maxAccounts: license.maxAccounts,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Create license error:', error);
    return NextResponse.json(
      { error: 'Failed to create license' },
      { status: 500 }
    );
  }
}
