import { NextRequest, NextResponse } from 'next/server';
import { getConnectionConfig } from '@/lib/db';
import mysql from 'mysql2/promise';

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('session-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Decode JWT to get user ID (simplified - in production use jose)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.id;
    
    const conn = await mysql.createConnection(getConnectionConfig());
    try {
      // Generate unique referral code
      let code = generateReferralCode();
      let exists = true;
      while (exists) {
        const [rows] = await conn.execute<any[]>('SELECT id FROM users WHERE referralCode = ?', [code]);
        if (rows.length === 0) exists = false;
        else code = generateReferralCode();
      }
      
      await conn.execute('UPDATE users SET referralCode = ? WHERE id = ?', [code, userId]);
      
      return NextResponse.json({
        success: true,
        referralCode: code,
        referralLink: `https://tradecandle.net/register?ref=${code}`
      });
    } finally {
      await conn.end();
    }
  } catch (e: any) {
    console.error('Generate referral error:', e);
    return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 });
  }
}
