// ─── Billing Service ──────────────────────────────────────────────────────────
// Handles Stripe integration, subscription management, and payment processing
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';
import { createLicense } from './license.service';
import { redis, RedisKeys } from '../utils/redis';
import Stripe from 'stripe';

// ─── Stripe Client ────────────────────────────────────────────────────────────

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.includes('REPLACE_WITH_YOUR_KEY')) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
}

// ─── List Packages ────────────────────────────────────────────────────────────

export async function listActivePackages() {
  try {
    return await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  } catch {
    // Fallback to JSON file (local dev without MySQL)
    const { getAllPackages } = await import('../../lib/db');
    const all = await getAllPackages();
    return all.filter((p: any) => p.isActive === 1 || p.isActive === true);
  }
}

// ─── Create Checkout Session ─────────────────────────────────────────────────

export async function createCheckoutSession(
  userId: string,
  packageId: string,
  successUrl: string,
  cancelUrl: string
) {
  const stripe = getStripeClient();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg || !pkg.isActive) throw new Error('Package not found or inactive');

  // Check if user already has an active subscription for this package
  const existingSub = await prisma.subscription.findFirst({
    where: {
      userId,
      packageId,
      status: { in: ['ACTIVE', 'TRIAL'] },
    },
  });
  if (existingSub) throw new Error('User already has an active subscription for this package');

  // Get or create Stripe customer
  let stripeCustomerId = await getOrCreateStripeCustomer(user.id, user.email, user.name || undefined);

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: pkg.stripePriceId || undefined,
        price_data: pkg.stripePriceId ? undefined : {
          currency: pkg.currency.toLowerCase(),
          unit_amount: pkg.priceCents,
          product_data: {
            name: pkg.name,
            description: pkg.description || undefined,
          },
          recurring: {
            interval: pkg.billingCycle === 'MONTHLY' ? 'month' : 
                       pkg.billingCycle === 'QUARTERLY' ? 'month' : 'year',
            interval_count: pkg.billingCycle === 'QUARTERLY' ? 3 : 1,
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: user.id,
      packageId: pkg.id,
    },
  });

  return { sessionId: session.id, url: session.url };
}

export async function createCustomerPortalSession(userId: string, returnUrl: string) {
  const stripe = getStripeClient();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const stripeCustomerId = await getOrCreateStripeCustomer(user.id, user.email, user.name || undefined);
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

// ─── Handle Stripe Webhook ───────────────────────────────────────────────────

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }
}

// ─── Checkout Completed ──────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const packageId = session.metadata?.packageId;

  if (!userId || !packageId) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) {
    console.error('Package not found:', packageId);
    return;
  }

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

  // Create or update subscription
  const subscription = await prisma.subscription.upsert({
    where: { stripeSubscriptionId: session.subscription as string },
    update: {
      status: 'ACTIVE',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
    create: {
      userId,
      packageId,
      status: 'ACTIVE',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      stripeSubscriptionId: session.subscription as string,
      stripeCustomerId: session.customer as string,
    },
  });

  // Create license for each strategy in the package
  const features = pkg.features as any;
  const strategyIds: string[] = features?.strategyIds || [];

  for (const strategyId of strategyIds) {
    await createLicense({
      userId,
      subscriptionId: subscription.id,
      strategyId,
      maxAccounts: pkg.maxAccounts,
      expiresAt: periodEnd,
    });
  }

  // Queue welcome notification
  await redis.xadd(RedisKeys.notificationStream(), {
    userId,
    type: 'SUBSCRIPTION_ACTIVATED',
    title: 'Subscription Activated',
    message: `Your ${pkg.name} subscription has been activated. Your license keys are ready.`,
  });
}

// ─── Subscription Events ─────────────────────────────────────────────────────

async function handleSubscriptionCreated(stripeSubscription: Stripe.Subscription) {
  // Subscription is created in Stripe — may already be handled by checkout completed
  console.log('Stripe subscription created:', stripeSubscription.id);
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });

  if (!dbSubscription) return;

  const statusMap: Record<string, string> = {
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    trialing: 'TRIAL',
  };

  const newStatus = statusMap[stripeSubscription.status] || 'EXPIRED';

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: newStatus as any,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
  });

  // If subscription became inactive, revoke licenses
  if (newStatus === 'CANCELED' || newStatus === 'EXPIRED') {
    await prisma.license.updateMany({
      where: { subscriptionId: dbSubscription.id, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });
  }

  // If past_due, start grace period logic
  if (newStatus === 'PAST_DUE') {
    await redis.xadd(RedisKeys.notificationStream(), {
      userId: dbSubscription.userId,
      type: 'PAYMENT_FAILED',
      title: 'Payment Failed',
      message: 'Your subscription payment failed. Please update your payment method within 3 days.',
    });
  }
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });

  if (!dbSubscription) return;

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: { status: 'EXPIRED' },
  });

  // Revoke all licenses for this subscription
  await prisma.license.updateMany({
    where: { subscriptionId: dbSubscription.id },
    data: { status: 'EXPIRED' },
  });
}

// ─── Payment Events ──────────────────────────────────────────────────────────

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = invoice.subscription as string;
  if (!stripeSubscriptionId) return;

  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });

  if (!dbSubscription) return;

  // Create payment record
  await prisma.payment.create({
    data: {
      userId: dbSubscription.userId,
      subscriptionId: dbSubscription.id,
      amountCents: invoice.amount_paid,
      currency: invoice.currency.toUpperCase(),
      status: 'COMPLETED',
      stripePaymentId: invoice.id,
      description: `Subscription payment for period ${new Date(invoice.period_start * 1000).toLocaleDateString()} - ${new Date(invoice.period_end * 1000).toLocaleDateString()}`,
    },
  });

  // Extend license expiry
  const periodEnd = new Date(invoice.period_end * 1000);
  await prisma.license.updateMany({
    where: { subscriptionId: dbSubscription.id },
    data: { expiresAt: periodEnd },
  });

  // Reactivate subscription if it was past_due
  if (dbSubscription.status === 'PAST_DUE') {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: { status: 'ACTIVE' },
    });

    // Reactivate licenses
    await prisma.license.updateMany({
      where: { subscriptionId: dbSubscription.id, status: 'EXPIRED' },
      data: { status: 'ACTIVE' },
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = invoice.subscription as string;
  if (!stripeSubscriptionId) return;

  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });

  if (!dbSubscription) return;

  // Create failed payment record
  await prisma.payment.create({
    data: {
      userId: dbSubscription.userId,
      subscriptionId: dbSubscription.id,
      amountCents: invoice.amount_due,
      currency: invoice.currency.toUpperCase(),
      status: 'FAILED',
      stripePaymentId: invoice.id,
      description: 'Failed subscription payment',
    },
  });

  // Set subscription to past_due
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: { status: 'PAST_DUE' },
  });

  // Notify user
  await redis.xadd(RedisKeys.notificationStream(), {
    userId: dbSubscription.userId,
    type: 'PAYMENT_FAILED',
    title: 'Payment Failed',
    message: 'Your subscription payment failed. Please update your payment method.',
  });
}

// ─── Get or Create Stripe Customer ────────────────────────────────────────────

async function getOrCreateStripeCustomer(userId: string, email: string, name?: string): Promise<string> {
  const stripe = getStripeClient();

  // Check if user already has a Stripe customer ID
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  // Look for existing subscriptions with stripeCustomerId
  const existingSub = await prisma.subscription.findFirst({
    where: { userId, stripeCustomerId: { not: null } },
    select: { stripeCustomerId: true },
  });

  if (existingSub?.stripeCustomerId) {
    return existingSub.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { userId },
  });

  return customer.id;
}

// ─── Get User's Current Subscription ─────────────────────────────────────────

export async function getUserSubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
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

  // If package wasn't included by fake Prisma, enrich it manually
  if (subscription && !subscription.package) {
    const { getAllPackages, getAllLicenses, getAllStrategies } = await import('../../lib/db');
    const packages = await getAllPackages();
    const licenses = await getAllLicenses();
    const strategies = await getAllStrategies();
    
    subscription.package = packages.find((p: any) => p.id === subscription.packageId) || null;
    subscription.licenses = licenses
      .filter((l: any) => l.subscriptionId === subscription.id)
      .map((l: any) => ({
        ...l,
        strategy: strategies.find((s: any) => s.id === l.strategyId) || null,
        tradingAccounts: [],
      }));
  }

  return subscription;
}

// ─── Cancel Subscription ─────────────────────────────────────────────────────

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
    // Cancel immediately
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELED' },
    });

    // Revoke licenses immediately
    await prisma.license.updateMany({
      where: { subscriptionId },
      data: { status: 'EXPIRED' },
    });
  } else {
    // Cancel at period end
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { cancelAtPeriodEnd: true },
    });
  }

  // Also cancel in Stripe if there's a Stripe subscription
  if (subscription.stripeSubscriptionId) {
    try {
      const stripe = getStripeClient();
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: !immediately,
      });

      if (immediately) {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      }
    } catch (error) {
      console.error('Failed to cancel Stripe subscription:', error);
      // Don't throw — our DB is the source of truth
    }
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
