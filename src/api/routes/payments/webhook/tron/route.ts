// ─── POST /api/payments/webhook/tron ────────────────────────────────────────
// TronGrid webhook for automatic USDT TRC-20 deposit verification
// Called by TronGrid event server when USDT transfer is detected
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { verifyDeposit } from '../../../services/usdt-payment.service';
import { redis, RedisKeys } from '../../../utils/redis';

interface TronGridEvent {
  event: string;
  contract: string;      // USDT TRC-20 contract address
  transaction: string;    // TX hash
  block_number: number;
  from: string;
  to: string;
  value: number;          // Amount in smallest unit (6 decimals for USDT TRC-20)
  result: {
    from: string;
    to: string;
    value: string;
  };
}

const USDT_TRC20_CONTRACT = process.env.USDT_TRC20_CONTRACT || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const webhookSecret = request.headers.get('x-trongrid-secret');
  if (webhookSecret !== process.env.TRONGRID_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
  }

  try {
    const events: TronGridEvent[] = await request.json();

    for (const event of Array.isArray(events) ? events : [events]) {
      // Only process USDT transfers to our wallet
      const companyWallet = process.env.USDT_TRC20_ADDRESS;
      if (!companyWallet) continue;

      const toAddress = event.to || event.result?.to;
      if (toAddress !== companyWallet) continue;

      // Check if it's USDT TRC-20
      if (event.contract !== USDT_TRC20_CONTRACT) continue;

      // Convert amount (USDT TRC-20 has 6 decimals)
      const amountRaw = event.value || Number(event.result?.value || 0);
      const amountUSDT = amountRaw / 1_000_000;

      // Find matching pending payment by amount + deposit address
      const payment = await prisma.payment.findFirst({
        where: {
          depositAddress: companyWallet,
          depositNetwork: 'TRC-20',
          status: 'AWAITING_DEPOSIT',
          expiresAt: { gt: new Date() },
          amountCents: {
            gte: Math.floor(amountUSDT * 100) - 1, // Allow 1 cent tolerance
            lte: Math.ceil(amountUSDT * 100) + 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!payment) {
        console.log(`[Webhook] No matching payment for ${amountUSDT} USDT TRC-20 transfer ${event.transaction}`);
        continue;
      }

      // Verify the deposit
      await verifyDeposit({
        paymentId: payment.id,
        txHash: event.transaction,
        fromAddress: event.from || event.result?.from || '',
        amount: amountUSDT,
      });

      console.log(`[Webhook] Verified payment ${payment.id} for ${amountUSDT} USDT TRC-20`);

      // Notify user via Redis stream
      await redis.xadd(RedisKeys.notificationStream(), {
        userId: payment.userId,
        type: 'PAYMENT_CONFIRMED',
        title: 'ชำระเงินสำเร็จ ✅',
        message: `ได้รับ ${amountUSDT} USDT เรียบร้อย — License Key พร้อมใช้งาน`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Webhook] TronGrid error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}