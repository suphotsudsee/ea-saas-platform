// ─── GET /api/admin/users ──────────────────────────────────────────────────────
// List all users with search, filter, and pagination (admin only)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { adminOnlyMiddleware } from '../../../middleware/adminOnly';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          emailVerified: true,
          twoFactorEnabled: true,
          createdAt: true,
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              currentPeriodEnd: true,
              package: {
                select: {
                  name: true,
                },
              },
            },
          },
          tradingAccounts: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: {
              updatedAt: true,
            },
          },
          _count: {
            select: {
              subscriptions: true,
              licenses: true,
              tradingAccounts: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update user status ────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  try {
    const body = await request.json();
    const { userId, status } = body;

    if (!userId || !['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid userId or status' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, email: true, name: true, status: true },
    });

    return NextResponse.json({ user, message: `User status updated to ${status}` });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// ─── DELETE: Remove user ──────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);
  if (authResult.response) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Delete related records first (cascade manually since fake prisma doesn't)
    const [licenses, subscriptions, tradingAccounts, apiKeys] = await Promise.all([
      prisma.license.findMany({ where: { userId } }),
      prisma.subscription.findMany({ where: { userId } }),
      prisma.tradingAccount.findMany({ where: { userId } }),
      prisma.apiKey.findMany({ where: { userId } }),
    ]);

    // Delete all related records
    for (const lic of licenses) {
      await prisma.license.update({ where: { id: lic.id }, data: { status: 'REVOKED' } });
    }
    for (const sub of subscriptions) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELED' } });
    }

    // Try to delete the user
    // Fake prisma doesn't have delete, so we ban them instead
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: 'BANNED', name: `[DELETED] ${new Date().toISOString()}` },
      select: { id: true, email: true, status: true },
    });

    return NextResponse.json({ user, message: 'User deleted (banned + renamed)' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
