// ─── POST /api/payments/create-deposit ──────────────────────────────────────
// Create a USDT deposit payment request
// Returns deposit address, amount, network, and expiry
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../middleware/auth';
import { createDeposit } from '../../../services/usdt-payment.service';
import { z } from 'zod';

const createDepositSchema = z.object({
  packageId: z.string().min(1, 'Package ID is required'),
  network: z.enum(['ERC-20', 'TRC-20', 'BEP-20']).default('ERC-20'),
});

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createDepositSchema.parse(body);

    const result = await createDeposit({
      userId: authResult.user.id,
      packageId: validated.packageId,
      network: validated.network,
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: result.paymentId,
        depositAddress: result.depositAddress,
        network: result.network,
        amount: result.amount,
        currency: result.currency,
        expiresAt: result.expiresAt,
        paymentMemo: result.paymentMemo,
        packageName: result.packageName,
        instructions: {
          en: `Send ${result.amount} USDT via ${result.network} to the address below within ${DEPOSIT_TIMEOUT_MINUTES} minutes`,
        },
        warning: {
          en: '⚠️ Only send USDT on the specified network — wrong network transfers will be lost',
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create deposit' },
      { status: 400 }
    );
  }
}

const DEPOSIT_TIMEOUT_MINUTES = 30;

// ─── GET /api/payments/pending ───────────────────────────────────────────────
// Get the user's pending deposit payment

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { getPendingPayment } = await import('../../../services/usdt-payment.service');
    const payment = await getPendingPayment(authResult.user.id);

    if (!payment) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        depositAddress: payment.depositAddress,
        network: payment.depositNetwork,
        amount: payment.amountCents / 100,
        currency: payment.currency,
        status: payment.status,
        expiresAt: payment.expiresAt,
        packageName: payment.subscription?.package?.name,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get pending payment' },
      { status: 400 }
    );
  }
}
