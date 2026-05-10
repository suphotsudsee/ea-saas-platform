import { NextRequest, NextResponse } from 'next/server';
import { getConnectionConfig } from '@/lib/db';
import mysql from 'mysql2/promise';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('session-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.id;
    
    const conn = await mysql.createConnection(getConnectionConfig());
    try {
      // Get referral stats
      const [user] = await conn.execute<any[]>('SELECT referralCode, referralEarnings FROM users WHERE id = ?', [userId]);
      if (!user.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      
      const [referred] = await conn.execute<any[]>(
        'SELECT COUNT(*) as count FROM users WHERE referredBy = ?', [userId]
      );
      
      const [rewards] = await conn.execute<any[]>(
        'SELECT SUM(rewardValue) as total FROM referral_rewards WHERE referrerId = ? AND status = "CLAIMED"', [userId]
      );
      
      return NextResponse.json({
        referralCode: user[0].referralCode || null,
        referralLink: user[0].referralCode ? `https://tradecandle.net/register?ref=${user[0].referralCode}` : null,
        totalReferred: referred[0]?.count || 0,
        totalEarnings: user[0].referralEarnings || 0,
        totalClaimed: rewards[0]?.total || 0
      });
    } finally {
      await conn.end();
    }
  } catch (e: any) {
    console.error('Referral stats error:', e);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
