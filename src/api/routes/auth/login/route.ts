import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail } from '../../../lib/db';
import crypto from 'crypto';
import { SignJWT } from 'jose';

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const attempt = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return attempt === hash;
}

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const user = await findUserByEmail(email);
<<<<<<< HEAD
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
=======
    if (!user || !verifyPassword(password, user.passwordHash)) {
>>>>>>> cba4206f46728294b317464c4728579d35ff872d
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }
    const token = await new SignJWT({ id: user.id, email: user.email, role: user.role, actorType: 'user' })
      .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('24h').setIssuedAt().sign(SECRET);
    const resp = NextResponse.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name, role: user.role, actorType: 'user' },
      token,  // for axios interceptor to store in localStorage
    });
    resp.cookies.set('session-token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 86400, path: '/' });
    return resp;
  } catch (e) {
    console.error('Login error:', e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
