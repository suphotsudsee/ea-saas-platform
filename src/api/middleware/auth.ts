import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { findUserById } from '../lib/db';

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET||'fallback-secret');

export interface AuthUser {
  id: string;
  email: string;
  name: string|null;
  role: string;
  actorType: 'user' | 'admin';
}

export async function authMiddleware(req: NextRequest): Promise<{ user?: AuthUser; response?: NextResponse }> {
  const token = req.cookies.get('session-token')?.value;
  if (!token) return { response: NextResponse.json({error:'Login required'},{status:401}) };
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const id = typeof payload.id === 'string' ? payload.id : null;
    if (!id) return { response: NextResponse.json({error:'Invalid session'},{status:401}) };
    const user = await findUserById(id);
    if (!user) return { response: NextResponse.json({error:'User not found'},{status:401}) };
    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      return { response: NextResponse.json({error:'Account suspended'},{status:403}) };
    }
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role, actorType: 'user' } };
  } catch {
    return { response: NextResponse.json({error:'Invalid or expired session'},{status:401}) };
  }
}
