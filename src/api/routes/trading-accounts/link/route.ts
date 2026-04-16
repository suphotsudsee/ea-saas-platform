// ─── POST /api/trading-accounts/link ──────────────────────────────────────────
// Link a trading account to a license
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

const linkAccountSchema = z.object({
  licenseId: z.string().min(1, 'License ID is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  brokerName: z.string().min(1, 'Broker name is required'),
  platform: z.enum(['MT4', 'MT5']),
});

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = linkAccountSchema.parse(body);

    // Verify license belongs to user
    const license = await prisma.license.findFirst({
      where: {
        id: validated.licenseId,
        userId: authResult.user.id,
        status: 'ACTIVE',
      },
      include: {
        tradingAccounts: { where: { status: { not: 'UNLINKED' } } },
      },
    });

    if (!license) {
      return NextResponse.json(
        { error: 'License not found or not active' },
        { status: 404 }
      );
    }

    // Check max accounts limit
    if (license.tradingAccounts.length >= license.maxAccounts) {
      return NextResponse.json(
        { error: 'License limit reached — unlink an account first', maxAccounts: license.maxAccounts },
        { status: 400 }
      );
    }

    // Check if account already exists
    const existingAccount = await prisma.tradingAccount.findFirst({
      where: {
        accountNumber: validated.accountNumber,
        brokerName: validated.brokerName,
        platform: validated.platform,
        status: { not: 'UNLINKED' },
      },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account already linked to a license' },
        { status: 409 }
      );
    }

    // Create trading account
    const tradingAccount = await prisma.tradingAccount.create({
      data: {
        userId: authResult.user.id,
        licenseId: validated.licenseId,
        accountNumber: validated.accountNumber,
        brokerName: validated.brokerName,
        platform: validated.platform,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      message: 'Trading account linked successfully',
      account: tradingAccount,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if ((error as any)?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Account already linked' },
        { status: 409 }
      );
    }

    console.error('Link account error:', error);
    return NextResponse.json(
      { error: 'Failed to link trading account' },
      { status: 500 }
    );
  }
}