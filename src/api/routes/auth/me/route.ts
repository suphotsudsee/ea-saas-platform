import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../middleware/auth';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');

export async function GET(request: NextRequest) {
  // Try cookie-based auth first
  let authResult = await authMiddleware(request);
  
  // If cookie fails, try Authorization header (Bearer token)
  if (authResult.response) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const { payload } = await jwtVerify(token, SECRET);
        const { findUserById } = await import('../../../lib/db');
        const user = await findUserById(payload.id as string);
        if (user) {
          return NextResponse.json({
            user: { id: user.id, email: user.email, name: user.name, role: user.role, actorType: 'user' },
          });
        }
      } catch {}
    }
    return authResult.response;
  }

  return NextResponse.json({ user: authResult.user });
}
