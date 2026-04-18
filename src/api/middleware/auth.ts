import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '../lib/prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me'
);

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    actorType: 'user' | 'admin';
  };
}

export async function authMiddleware(
  request: NextRequest
): Promise<{ user?: NonNullable<AuthenticatedRequest['user']>; response?: NextResponse }> {
  const token = request.cookies.get('session-token')?.value;

  if (!token) {
    return {
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const email = typeof payload.email === 'string' ? payload.email : null;
    const actorType = payload.actorType === 'admin' ? 'admin' : 'user';

    if (!email) {
      return {
        response: NextResponse.json(
          { error: 'Invalid session' },
          { status: 401 }
        ),
      };
    }

    if (actorType === 'admin') {
      const admin = await prisma.adminUser.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      if (!admin) {
        return {
          response: NextResponse.json(
            { error: 'Admin user not found' },
            { status: 401 }
          ),
        };
      }

      return {
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          actorType: 'admin',
        },
      };
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return {
        response: NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        ),
      };
    }

    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      return {
        response: NextResponse.json(
          { error: 'Account suspended or banned' },
          { status: 403 }
        ),
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        actorType: 'user',
      },
    };
  } catch {
    return {
      response: NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      ),
    };
  }
}
