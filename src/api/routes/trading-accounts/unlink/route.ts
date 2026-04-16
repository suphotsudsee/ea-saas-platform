// ─── DELETE /api/trading-accounts/unlink ───────────────────────────────────────
// Unlink a trading account from a license
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

const unlinkSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
});

export async function DELETE(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = unlinkSchema.parse(body);

    // Verify account belongs to user
    const account = await prisma.tradingAccount.findFirst({
      where: {
        id: validated.accountId,
        userId: authResult.user.id,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Trading account not found' },
        { status: 404 }
      );
    }

    // Set status to UNLINKED instead of deleting
    await prisma.tradingAccount.update({
      where: { id: validated.accountId },
      data: { status: 'UNLINKED' },
    });

    return NextResponse.json({
      message: 'Trading account unlinked successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Unlink account error:', error);
    return NextResponse.json(
      { error: 'Failed to unlink trading account' },
      { status: 500 }
    );
  }
}