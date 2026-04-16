// ─── Auth Middleware ──────────────────────────────────────────────────────────
// Validates NextAuth session for web app routes and extracts user info
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '../lib/prisma';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

export async function authMiddleware(
  request: NextRequest
): Promise<{ user: NonNullable<AuthenticatedRequest['user']>; response?: NextResponse } | NextResponse> {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 401 }
    );
  }

  if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
    return NextResponse.json(
      { error: 'Account suspended or banned' },
      { status: 403 }
    );
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}