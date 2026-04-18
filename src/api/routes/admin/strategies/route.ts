// ─── GET/POST/PUT/DELETE /api/admin/strategies ───────────────────────────────
// CRUD operations for trading strategies (admin only)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { adminOnlyMiddleware, requireWriteAccess, requireSuperAdmin } from '../../../middleware/adminOnly';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';

// ─── GET: List all strategies ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const where: any = {};
    if (activeOnly) where.isActive = true;

    const strategies = await prisma.strategy.findMany({
      where,
      include: {
        _count: { select: { licenses: true } },
        configVersions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ strategies });
  } catch (error) {
    console.error('Admin list strategies error:', error);
    return NextResponse.json({ error: 'Failed to fetch strategies' }, { status: 500 });
  }
}

// ─── POST: Create strategy ─────────────────────────────────────────────────

const createStrategySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  version: z.string().min(1),
  defaultConfig: z.record(z.any()),
  riskConfig: z.record(z.any()),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  if (!requireWriteAccess(authResult.admin.role)) {
    return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = createStrategySchema.parse(body);

    const strategy = await prisma.strategy.create({
      data: {
        name: validated.name,
        description: validated.description,
        version: validated.version,
        defaultConfig: validated.defaultConfig,
        riskConfig: validated.riskConfig,
        isActive: validated.isActive,
      },
    });

    // Create initial config version
    const configHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(validated.defaultConfig))
      .digest('hex');

    await prisma.configVersion.create({
      data: {
        strategyId: strategy.id,
        configHash,
        configJson: validated.defaultConfig,
        changedBy: authResult.admin.id,
        changeReason: 'Initial strategy creation',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: authResult.admin.id,
        actorType: 'admin',
        action: 'CREATE_STRATEGY',
        resourceType: 'strategy',
        resourceId: strategy.id,
        newValue: { name: validated.name, version: validated.version },
      },
    });

    return NextResponse.json({ strategy }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    if ((error as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'Strategy name already exists' }, { status: 409 });
    }
    console.error('Create strategy error:', error);
    return NextResponse.json({ error: 'Failed to create strategy' }, { status: 500 });
  }
}

// ─── PUT: Update strategy ─────────────────────────────────────────────────

const updateStrategySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  version: z.string().min(1).optional(),
  defaultConfig: z.record(z.any()).optional(),
  riskConfig: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
  changeReason: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  if (!requireWriteAccess(authResult.admin.role)) {
    return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = updateStrategySchema.parse(body);
    const { id, changeReason, ...updateData } = validated;

    const existingStrategy = await prisma.strategy.findUnique({ where: { id } });
    if (!existingStrategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    const strategy = await prisma.strategy.update({
      where: { id },
      data: updateData,
    });

    // If config was updated, create a new config version
    if (validated.defaultConfig) {
      const configHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(validated.defaultConfig))
        .digest('hex');

      await prisma.configVersion.create({
        data: {
          strategyId: id,
          configHash,
          configJson: validated.defaultConfig,
          changedBy: authResult.admin.id,
          changeReason: changeReason || 'Config update',
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: authResult.admin.id,
        actorType: 'admin',
        action: 'UPDATE_STRATEGY',
        resourceType: 'strategy',
        resourceId: id,
        oldValue: { name: existingStrategy.name, version: existingStrategy.version },
        newValue: updateData,
      },
    });

    return NextResponse.json({ strategy });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Update strategy error:', error);
    return NextResponse.json({ error: 'Failed to update strategy' }, { status: 500 });
  }
}

// ─── DELETE: Deactivate strategy ────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  if (!requireSuperAdmin(authResult.admin.role)) {
    return NextResponse.json({ error: 'Super admin required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Strategy ID required' }, { status: 400 });
    }

    // Soft delete — just deactivate
    const strategy = await prisma.strategy.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        actorId: authResult.admin.id,
        actorType: 'admin',
        action: 'DEACTIVATE_STRATEGY',
        resourceType: 'strategy',
        resourceId: id,
      },
    });

    return NextResponse.json({ message: 'Strategy deactivated', strategy });
  } catch (error) {
    console.error('Delete strategy error:', error);
    return NextResponse.json({ error: 'Failed to deactivate strategy' }, { status: 500 });
  }
}
