// ─── POST /api/auth/refresh ──────────────────────────────────────────────────
// Refresh an existing session token
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me');

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No session token provided' },
        { status: 401 }
      );
    }

    // Verify current token
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Issue a new token with extended expiry
    const newToken = await new SignJWT({
      id: payload.id,
      email: payload.email,
      role: payload.role,
      actorType: payload.actorType,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .setIssuedAt()
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      message: 'Session refreshed',
      user: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        actorType: payload.actorType,
      },
    });

    response.cookies.set('session-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 401 }
    );
  }
}
