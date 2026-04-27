import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Auth check
    const authHeader = request.headers.get('x-admin-secret');
    if (authHeader !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get email from query param
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Missing email query param' }, { status: 400 });
    }

    // Search user by email (exact match or contains)
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            subscriptions: true,
            licenses: true,
            tradingAccounts: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({
        found: false,
        email: email,
        message: 'User not found in database',
      });
    }

    return NextResponse.json({
      found: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        counts: user._count,
      },
    });
  } catch (error) {
    console.error('❌ User search failed:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
