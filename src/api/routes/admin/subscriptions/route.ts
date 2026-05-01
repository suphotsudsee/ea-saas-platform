// ─── GET/PATCH /api/admin/subscriptions ───────────────────────────────────────
// List all subscriptions; admin subscription management
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { adminOnlyMiddleware } from '../../../middleware/adminOnly';
import { prisma } from '../../../lib/prisma';

// ─── GET: List all subscriptions ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          package: true,
          licenses: { select: { id: true, status: true, key: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.subscription.count({ where }),
    ]);

    // Mask license keys
    const maskedSubscriptions = subscriptions.map((sub: any) => ({
      ...sub,
      licenses: (sub.licenses || []).map((lic: any) => ({
        ...lic,
        key: (lic.key || '').substring(0, 8) + '****',
      })),
    }));

    return NextResponse.json({
      subscriptions: maskedSubscriptions,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('Admin list subscriptions error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

// ─── PATCH: Subscription actions ───────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  try {
    const body = await request.json();
    const { action, subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 });
    }

    switch (action) {
      case 'cancel': {
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: { status: 'CANCELED', cancelAtPeriodEnd: true },
        });
        break;
      }
      case 'activate': {
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: { status: 'ACTIVE', cancelAtPeriodEnd: false },
        });
        break;
      }
      case 'suspend': {
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: { status: 'SUSPENDED' },
        });
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ message: `Subscription ${action} successful` });
  } catch (error) {
    console.error('Admin subscription action error:', error);
    return NextResponse.json({ error: 'Failed to perform subscription action' }, { status: 500 });
  }
}
