import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser, createSub, createLic, generateLicenseKey } from '../../../lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  packageId: z.string().optional().default('starter'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const v = schema.parse(body);
    if (findUserByEmail(v.email)) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    const now = new Date().toISOString();
    const trialEnd = new Date(Date.now()+30*86400000).toISOString();
    const user = createUser({
      email: v.email, name: v.name || null,
      passwordHash: await bcrypt.hash(v.password, 10),
      role: 'TRADER', status: 'ACTIVE',
      timezone: 'UTC', twoFactorEnabled: false,
      stripeCustomerId: null,
    });
    const sub = createSub({
      userId: user.id, packageId: v.packageId,
      status: 'TRIAL', currentPeriodEnd: trialEnd, trialEndsAt: trialEnd,
    });
    const lic = createLic({
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
    console.error('Register error:', e);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
