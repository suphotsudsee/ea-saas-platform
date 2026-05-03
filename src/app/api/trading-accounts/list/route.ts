// ─── GET /api/trading-accounts ────────────────────────────────────────────────
// List all trading accounts for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/api/middleware/auth';
import { prisma } from '@/api/lib/prisma';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accounts = await prisma.tradingAccount.findMany({
      where: {
        userId: authResult.user.id,
        status: { not: 'UNLINKED' },
      },
      include: {
        license: {
          select: {
            id: true,
            key: true,
            status: true,
            strategy: { select: { id: true, name: true, version: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mask license keys
    const maskedAccounts = accounts.map((a) => ({
      ...a,
      license: {
        ...a.license,
        key: a.license.key.substring(0, 8) + '****',
      },
    }));

    return NextResponse.json({ accounts: maskedAccounts });
  } catch (error) {
    console.error('List trading accounts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trading accounts' },
      { status: 500 }
    );
  }
}
