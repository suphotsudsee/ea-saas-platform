import { NextResponse } from 'next/server';
import { redis } from '@/api/utils/redis';

export async function GET() {
  const redisOk = await redis.ping();
  return NextResponse.json({ 
    status: 'ok', 
    redis: redisOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString() 
  });
}