// ─── POST /api/auth/register ──────────────────────────────────────────────────
// Register a new trader account
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { generateLicenseKey } from '../../../services/license.service';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(1, 'Name is required').max(100).optional(),
  packageId: z.string().min(1, 'Please select a trial package').optional(),
});

function getStrategyIds(features: Prisma.JsonValue): string[] {
  if (!features || typeof features !== 'object' || Array.isArray(features)) return [];
  const strategyIds = (features as { strategyIds?: unknown }).strategyIds;
  return Array.isArray(strategyIds) ? strategyIds.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
}

function isDatabaseConnectionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  const message = error instanceof Error ? error.message : '';
  return (
    message.includes('Authentication failed against database server') ||
    message.includes("Can't reach database server")
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    const selectedPackage = validated.packageId
      ? await prisma.package.findFirst({
          where: { id: validated.packageId, isActive: true },
        })
      : await prisma.package.findFirst({
          where: { isActive: true, billingCycle: 'MONTHLY' },
          orderBy: { sortOrder: 'asc' },
        });

    if (!selectedPackage) {
      return NextResponse.json(
        {
          error: 'Please select a trial package',
          message: 'No matching package was found, or this package is currently unavailable',
        },
        { status: 400 }
      );
    }

    const strategyIds = getStrategyIds(selectedPackage.features);
    if (strategyIds.length === 0) {
      return NextResponse.json(
        {
          error: 'This package is currently unavailable',
          message: 'The selected package has no strategies configured for license creation. Please contact support.',
        },
        { status: 400 }
      );
    }

    const activeStrategies = await prisma.strategy.findMany({
      where: { id: { in: strategyIds }, isActive: true },
      select: { id: true },
    });

    if (activeStrategies.length === 0) {
      return NextResponse.json(
        {
          error: 'This package is currently unavailable',
          message: 'No active strategies were found for this package.',
        },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 12);
    const now = new Date();
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 1-month trial

    // Create user + trial subscription + licenses together.
    const { user, subscription, licenses } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: validated.email,
          passwordHash,
          name: validated.name || null,
          role: 'TRADER',
          status: 'ACTIVE',
          emailVerified: now,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          packageId: selectedPackage.id,
          status: 'TRIAL',
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
        },
      });

      const licenses = await Promise.all(
        activeStrategies.map((strategy) =>
          tx.license.create({
            data: {
              key: generateLicenseKey(),
              userId: user.id,
              subscriptionId: subscription.id,
              strategyId: strategy.id,
              maxAccounts: selectedPackage.maxAccounts,
              expiresAt: trialEndsAt,
              status: 'ACTIVE',
            },
            select: {
              id: true,
              key: true,
              maxAccounts: true,
              expiresAt: true,
              strategyId: true,
            },
          })
        )
      );

      return { user, subscription, licenses };
    });

    return NextResponse.json({
      message: 'Registration successful. Your trial license is ready.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      trial: {
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        subscriptionId: subscription.id,
        expiresAt: trialEndsAt.toISOString(),
        maxAccounts: selectedPackage.maxAccounts,
        licenseCount: licenses.length,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (isDatabaseConnectionError(error)) {
      console.error('Registration database error:', error);
      return NextResponse.json(
        {
          error: 'Registration temporarily unavailable',
          message: 'Unable to connect to the database. Please contact support or try again later.',
        },
        { status: 503 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      {
        error: 'Registration unsuccessful',
        message: 'Unable to create an account at this time. Please try again later.',
      },
      { status: 500 }
    );
  }
}
