import { NextResponse } from 'next/server';

export async function GET() {
  const raw = process.env.DATABASE_URL || '(not set)';
  // Mask password for safety
  const masked = raw.replace(/(mysql:\/\/[^:]+:)[^@]+(@.*)/, '$1***$2');
  
  return NextResponse.json({
    DATABASE_URL: masked,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    REDIS_URL: (process.env.REDIS_URL || '').replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
    APP_URL: process.env.APP_URL || '(not set)',
    all_env_keys: Object.keys(process.env).filter(k => 
      k.includes('DATABASE') || k.includes('MYSQL') || k.includes('REDIS') || 
      k.includes('PORT') || k.includes('APP') || k.includes('API')
    ),
  });
}
