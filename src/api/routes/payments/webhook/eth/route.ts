// ─── POST /api/payments/webhook/eth ─────────────────────────────────────────
// Etherscan webhook for automatic USDT ERC-20 deposit verification
// Polls USDT transfers to the company wallet and auto-completes payments
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyDeposit } from '../../../../services/usdt-payment.service';

const COMPANY_WALLET = (process.env.USDT_ERC20_ADDRESS || '').toLowerCase();
const USDT_ERC20_CONTRACT = (process.env.USDT_ERC20_CONTRACT || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48').toLowerCase();
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const ETHERSCAN_API = 'https://api.etherscan.io/api';

interface EtherscanTx {
  hash: string;           // Transaction hash
  from: string;           // Sender address
  to: string;             // Receiver address
  value: string;          // Amount in USDT (6 decimals)
  tokenSymbol: string;    // "USDT"
  tokenName: string;      // "Tether USD"
  contractAddress: string; // USDT contract address
  timeStamp: string;      // Unix timestamp
  gasUsed: string;
  confirmations: string;
}

// ─── Manual trigger: Admin can call this to check for pending deposits ──────
export async function POST(request: NextRequest) {
  try {
    // Verify admin API key
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    const adminKey = process.env.ADMIN_API_KEY;

    if (!adminKey || (authHeader !== `Bearer ${adminKey}` && apiKey !== adminKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ETHERSCAN_API_KEY) {
      return NextResponse.json({ error: 'ETHERSCAN_API_KEY not configured' }, { status: 500 });
    }

    // Find all payments awaiting deposit
    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: 'AWAITING_DEPOSIT',
        paymentMethod: 'USDT_ERC20',
        expiresAt: { gt: new Date() },
      },
      include: {
        subscription: { include: { package: true } },
      },
    });

    if (pendingPayments.length === 0) {
      return NextResponse.json({ message: 'No pending ERC-20 deposits to verify', checked: 0, verified: 0 });
    }

    const verifiedPayments: string[] = [];
    const failedPayments: { id: string; error: string }[] = [];

    // Check each pending payment against Etherscan
    for (const payment of pendingPayments) {
      try {
        const expectedAmount = payment.amountCents / 100;
        const tolerance = expectedAmount * 0.01; // ±1%

        // Query Etherscan for USDT transfers to our wallet
        const url = `${ETHERSCAN_API}?module=account&action=tokentx`
          + `&address=${COMPANY_WALLET}`
          + `&contractaddress=${USDT_ERC20_CONTRACT}`
          + `&startblock=0&sort=desc`
          + `&apikey=${ETHERSCAN_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== '1' || !Array.isArray(data.result)) {
          console.error(`[Webhook/ETH] Etherscan API error for payment ${payment.id}:`, data.message);
          continue;
        }

        // Find matching transaction
        const matchingTx: EtherscanTx | undefined = data.result.find((tx: EtherscanTx) => {
          const txTo = tx.to.toLowerCase();
          const txContract = tx.contractAddress.toLowerCase();
          const txAmount = parseFloat(tx.value) / 1e6; // USDT ERC-20 has 6 decimals

          return txTo === COMPANY_WALLET
            && txContract === USDT_ERC20_CONTRACT
            && txAmount >= expectedAmount - tolerance
            && txAmount <= expectedAmount + tolerance
            && parseInt(tx.confirmations) >= 12;
        });

        if (matchingTx) {
          const amount = parseFloat(matchingTx.value) / 1e6;

          await verifyDeposit({
            paymentId: payment.id,
            txHash: matchingTx.hash,
            fromAddress: matchingTx.from,
            amount: amount,
          });

          verifiedPayments.push(payment.id);
          console.log(`[Webhook/ETH] ✅ Verified payment ${payment.id} for ${amount} USDT`);
        }
      } catch (error: any) {
        console.error(`[Webhook/ETH] Error verifying payment ${payment.id}:`, error.message);
        failedPayments.push({ id: payment.id, error: error.message });
      }
    }

    return NextResponse.json({
      message: 'ERC-20 deposit verification complete',
      checked: pendingPayments.length,
      verified: verifiedPayments.length,
      failed: failedPayments.length,
      verifiedPayments,
      failedPayments,
    });

  } catch (error: any) {
    console.error('[Webhook/ETH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── GET: Check status of a specific payment ────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('paymentId');

  if (!paymentId) {
    return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      status: true,
      depositAddress: true,
      depositNetwork: true,
      amountCents: true,
      currency: true,
      txHash: true,
      confirmations: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  return NextResponse.json({ payment });
}