// ─── POST /api/payments/verify ──────────────────────────────────────────────
// Verify a USDT deposit (called by admin or webhook)
// This endpoint verifies the on-chain transaction and activates the subscription
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { verifyDeposit, adminVerifyPayment } from '../../../services/usdt-payment.service';
import { z } from 'zod';

const verifySchema = z.object({
  paymentId: z.string().min(1),
  txHash: z.string().min(1, 'Transaction hash is required'),
  fromAddress: z.string().min(1, 'Sender address is required'),
  amount: z.number().positive('Amount must be positive'),
});

// ─── Manual verification by user (submit TX hash) ─────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = verifySchema.parse(body);

    const result = await verifyDeposit({
      paymentId: validated.paymentId,
      txHash: validated.txHash,
      fromAddress: validated.fromAddress,
      amount: validated.amount,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 400 }
    );
  }
}

// ─── Admin verification ──────────────────────────────────────────────────

const adminVerifySchema = z.object({
  paymentId: z.string().min(1),
  txHash: z.string().min(1),
  fromAddress: z.string().min(1),
  amount: z.number().positive(),
  adminId: z.string().min(1),
});

export async function PUT(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-api-key');
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = adminVerifySchema.parse(body);

    const result = await adminVerifyPayment(
      validated.paymentId,
      validated.adminId,
      validated.txHash,
      validated.fromAddress,
      validated.amount
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Admin verification failed' },
      { status: 400 }
    );
  }
}