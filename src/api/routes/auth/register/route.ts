import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser, createSub, createLic, generateLicenseKey } from '../../../lib/db';
import crypto from 'crypto';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  packageId: z.string().optional().default('pkg_trial'),
});

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const attempt = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return attempt === hash;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const v = schema.parse(body);
    
    if (await findUserByEmail(v.email)) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    
    const now = new Date().toISOString();
    const trialEnd = new Date(Date.now()+30*86400000).toISOString();
    
    const user = await createUser({
      email: v.email, name: v.name || null,
      passwordHash: hashPassword(v.password),
      role: 'TRADER', status: 'ACTIVE',
      timezone: 'UTC', twoFactorEnabled: false,
      stripeCustomerId: null,
    });
    
    const sub = await createSub({
      userId: user.id, packageId: v.packageId,
      status: 'TRIAL', currentPeriodEnd: trialEnd, trialEndsAt: trialEnd,
    });
    
    const lic = await createLic({
      userId: user.id, subscriptionId: sub.id,
      key: generateLicenseKey(), status: 'ACTIVE',
      maxAccounts: 1, expiresAt: trialEnd,
    });
    
    return NextResponse.json({
      message: 'Registration successful! Trial activated.',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      trial: { subscriptionId: sub.id, expiresAt: trialEnd, licenseKey: lic.key },
    }, { status: 201 });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    const msg = String(e?.message || e);
    console.error('Register error:', msg, e?.stack);
    return NextResponse.json({ error: 'Registration failed', detail: msg }, { status: 500 });
  }
}
