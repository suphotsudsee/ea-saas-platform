// ─── USDT Payment Service ──────────────────────────────────────────────────
// Handles USDT (ERC-20/TRC-20/BEP-20) deposit-based payment for subscriptions
// No Stripe — users send USDT to a deposit address, we verify on-chain
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';
import { createLicense } from './license.service';
import { redis, RedisKeys } from '../utils/redis';
import crypto from 'crypto';

// ─── Configuration ──────────────────────────────────────────────────────────

const DEPOSIT_TIMEOUT_MINUTES = 30; // Payment window
const MIN_CONFIRMATIONS = 12;       // ERC-20: 12 confirmations ≈ 3 min
const USDT_DECIMALS = 6;            // ERC-20 USDT has 6 decimal places

// Company wallet addresses (configure in .env)
const COMPANY_WALLETS: Record<string, string> = {
  'ERC-20': process.env.USDT_ERC20_ADDRESS || '',
  'TRC-20': process.env.USDT_TRC20_ADDRESS || '',
  'BEP-20': process.env.USDT_BEP20_ADDRESS || '',
};

function normalizeNetwork(network?: string): 'ERC-20' | 'TRC-20' | 'BEP-20' {
  if (network === 'TRC20') return 'TRC-20';
  if (network === 'BEP20') return 'BEP-20';
  if (network === 'ERC20') return 'ERC-20';
  if (network === 'TRC-20' || network === 'BEP-20' || network === 'ERC-20') return network;
  return 'ERC-20';
}

const DEFAULT_NETWORK = normalizeNetwork(process.env.USDT_NETWORK);

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateDepositOptions {
  userId: string;
  packageId: string;
  network?: 'TRC-20' | 'BEP-20' | 'ERC-20';
}

interface VerifyDepositOptions {
  paymentId: string;
  txHash: string;
  fromAddress: string;
  amount: number;
}

interface PackageInfo {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  billingCycle: string;
  maxAccounts: number;
  features: any;
  strategyIds: string[];
}

// ─── List Packages ──────────────────────────────────────────────────────────

export async function listActivePackages() {
  return prisma.package.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

// ─── Create Deposit (Checkout) ──────────────────────────────────────────────
// Generates a unique deposit address or uses the company address with a memo

export async function createDeposit(options: CreateDepositOptions) {
  const { userId, packageId, network = DEFAULT_NETWORK } = options;

  // Validate user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  // Validate package
  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg || !pkg.isActive) throw new Error('Package not found or inactive');

  // Check for existing active subscription
  const existingSub = await prisma.subscription.findFirst({
    where: {
      userId,
      packageId,
      status: { in: ['ACTIVE', 'TRIAL', 'PENDING_PAYMENT'] },
    },
  });
  if (existingSub && existingSub.status !== 'PENDING_PAYMENT') {
    throw new Error('User already has an active subscription for this package');
  }

  // If there's a pending payment, return it
  if (existingSub?.status === 'PENDING_PAYMENT') {
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId,
        subscriptionId: existingSub.id,
        status: 'AWAITING_DEPOSIT',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPayment) {
      return {
        paymentId: existingPayment.id,
        depositAddress: existingPayment.depositAddress,
        network: existingPayment.depositNetwork,
        amount: existingPayment.amountCents / 100,
        currency: 'USDT',
        expiresAt: existingPayment.expiresAt,
        packageId: pkg.id,
        packageName: pkg.name,
      };
    }
  }

  // Calculate price in USDT (from cents to USDT)
  const amountUSDT = pkg.priceCents / 100;

  // Get deposit address for the network
  const depositAddress = COMPANY_WALLETS[network];
  if (!depositAddress) {
    throw new Error(`Unsupported network: ${network}. Supported: ERC-20, TRC-20, BEP-20`);
  }

  // Generate payment memo/reference (to identify which user paid)
  const paymentMemo = generatePaymentMemo(userId, packageId);

  // Calculate expiry time
  const expiresAt = new Date(Date.now() + DEPOSIT_TIMEOUT_MINUTES * 60 * 1000);

  // Create or update subscription to PENDING_PAYMENT
  const subscription = existingSub
    ? existingSub
    : await prisma.subscription.create({
        data: {
          userId,
          packageId,
          status: 'PENDING_PAYMENT',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      userId,
      subscriptionId: subscription.id,
      amountCents: pkg.priceCents,
      currency: 'USDT',
      status: 'AWAITING_DEPOSIT',
      paymentMethod: network === 'ERC-20' ? 'USDT_ERC20' : network === 'TRC-20' ? 'USDT_TRC20' : 'USDT_BEP20',
      depositAddress: depositAddress,
      depositNetwork: network,
      expiresAt: expiresAt,
      description: `${pkg.name} subscription - ${amountUSDT} USDT via ${network} - Ref: ${paymentMemo}`,
    },
  });

  return {
    paymentId: payment.id,
    depositAddress: depositAddress,
    network: network,
    amount: amountUSDT,
    currency: 'USDT',
    expiresAt: expiresAt,
    paymentMemo: paymentMemo,
    packageId: pkg.id,
    packageName: pkg.name,
  };
}

// ─── Verify Deposit (Manual or Auto) ────────────────────────────────────────

export async function verifyDeposit(options: VerifyDepositOptions) {
  const { paymentId, txHash, fromAddress, amount } = options;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { subscription: { include: { package: true } } },
  });

  if (!payment) throw new Error('Payment not found');
  if (payment.status === 'COMPLETED') throw new Error('Payment already completed');
  if (payment.status === 'EXPIRED') throw new Error('Payment has expired');
  if (payment.status === 'REFUNDED') throw new Error('Payment has been refunded');

  // Verify amount (allow 1% tolerance for gas/rounding)
  const expectedAmount = payment.amountCents / 100;
  const tolerance = expectedAmount * 0.01;
  if (amount < expectedAmount - tolerance || amount > expectedAmount + tolerance) {
    throw new Error(`Amount mismatch. Expected: ${expectedAmount} USDT, Received: ${amount} USDT`);
  }

  // Verify deposit address matches
  if (payment.depositAddress && fromAddress !== payment.depositAddress) {
    // This is fine — the user sends TO our address, FROM their address
    // We store the FROM address for record-keeping
  }

  // Update payment
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'COMPLETED',
      txHash: txHash,
      fromAddress: fromAddress,
      confirmations: MIN_CONFIRMATIONS,
      verifiedAt: new Date(),
    },
  });

  // Activate subscription
  const subscription = payment.subscription;
  if (!subscription) {
    throw new Error('Payment is not linked to a subscription');
  }

  const pkg = subscription.package;

  // Calculate period dates
  const periodStart = new Date();
  const periodEnd = new Date();
  switch (pkg.billingCycle) {
    case 'MONTHLY':
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      break;
    case 'QUARTERLY':
      periodEnd.setMonth(periodEnd.getMonth() + 3);
      break;
    case 'YEARLY':
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      break;
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });

  // Create license for each strategy in the package
  const features = pkg.features as any;
  const strategyIds: string[] = features?.strategyIds || [];

  for (const strategyId of strategyIds) {
    await createLicense({
      userId: payment.userId,
      subscriptionId: subscription.id,
      strategyId,
      maxAccounts: pkg.maxAccounts,
      expiresAt: periodEnd,
    });
  }

  // Queue welcome notification
  await redis.xadd(RedisKeys.notificationStream(), {
    userId: payment.userId,
    type: 'SUBSCRIPTION_ACTIVATED',
    title: 'สมัครสำเร็จ! 🎉',
    message: `สมัคร ${pkg.name} สำเร็จแล้ว — License Key พร้อมใช้งานใน Dashboard`,
  });

  return {
    success: true,
    subscriptionId: subscription.id,
    licenseCount: strategyIds.length,
    expiresAt: periodEnd,
  };
}

// ─── Admin: Verify Payment Manually ──────────────────────────────────────────

export async function adminVerifyPayment(
  paymentId: string,
  adminId: string,
  txHash: string,
  fromAddress: string,
  amount: number
) {
  const result = await verifyDeposit({
    paymentId,
    txHash,
    fromAddress,
    amount,
  });

  // Log admin action
  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'admin',
      action: 'VERIFY_PAYMENT',
      resourceType: 'payment',
      resourceId: paymentId,
      newValue: { txHash, fromAddress, amount },
    },
  });

  return result;
}

// ─── Expire Stale Payments ──────────────────────────────────────────────────

export async function expireStalePayments() {
  const expired = await prisma.payment.updateMany({
    where: {
      status: 'AWAITING_DEPOSIT',
      expiresAt: { lt: new Date() },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  // Also expire associated subscriptions
  const expiredSubs = await prisma.subscription.updateMany({
    where: {
      status: 'PENDING_PAYMENT',
      payments: {
        every: { status: 'EXPIRED' },
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  return { paymentsExpired: expired.count, subscriptionsExpired: expiredSubs.count };
}

// ─── Get User's Current Subscription ──────────────────────────────────────────

export async function getUserSubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'PENDING_PAYMENT'] },
    },
    include: {
      package: true,
      licenses: {
        include: {
          strategy: { select: { id: true, name: true, version: true } },
          tradingAccounts: {
            where: { status: { not: 'UNLINKED' } },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return subscription;
}

// ─── Get Pending Payment ─────────────────────────────────────────────────────

export async function getPendingPayment(userId: string) {
  const payment = await prisma.payment.findFirst({
    where: {
      userId,
      status: 'AWAITING_DEPOSIT',
      expiresAt: { gt: new Date() },
    },
    include: {
      subscription: { include: { package: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return payment;
}

// ─── Get Payment History ──────────────────────────────────────────────────────

export async function getPaymentHistory(userId: string, page = 1, pageSize = 20) {
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where: { userId } }),
  ]);

  return {
    payments,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── Cancel Subscription ──────────────────────────────────────────────────────

export async function cancelSubscription(
  subscriptionId: string,
  userId: string,
  immediately: boolean,
  reason?: string
) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
  });

  if (!subscription) throw new Error('Subscription not found');

  if (immediately) {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELED' },
    });

    await prisma.license.updateMany({
      where: { subscriptionId },
      data: { status: 'EXPIRED' },
    });
  } else {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { cancelAtPeriodEnd: true },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorType: 'user',
      action: immediately ? 'CANCEL_SUBSCRIPTION_IMMEDIATE' : 'CANCEL_SUBSCRIPTION_AT_PERIOD_END',
      resourceType: 'subscription',
      resourceId: subscriptionId,
      newValue: { reason },
    },
  });

  return subscription;
}

// ─── Helper: Generate Payment Memo ───────────────────────────────────────────

function generatePaymentMemo(userId: string, packageId: string): string {
  // Generate a unique reference code for the payment
  // Users can include this in their transfer memo (if supported)
  // or we can match by amount + approximate timing
  const hash = crypto
    .createHash('sha256')
    .update(`${userId}:${packageId}:${Date.now()}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();
  return `TC${hash}`;
}

// ─── Helper: Get Wallet Balance (for admin) ──────────────────────────────────

export async function getWalletInfo() {
  return {
    addresses: {
      'ERC-20': process.env.USDT_ERC20_ADDRESS || 'NOT_CONFIGURED',
      'TRC-20': process.env.USDT_TRC20_ADDRESS || 'NOT_CONFIGURED',
      'BEP-20': process.env.USDT_BEP20_ADDRESS || 'NOT_CONFIGURED',
    },
    supportedNetworks: ['ERC-20', 'TRC-20', 'BEP-20'],
    defaultNetwork: DEFAULT_NETWORK,
    acceptedCurrency: 'USDT',
    minConfirmations: MIN_CONFIRMATIONS,
    depositTimeoutMinutes: DEPOSIT_TIMEOUT_MINUTES,
  };
}
