import { NextResponse } from 'next/server';

export async function GET() {
  // This endpoint just returns the DATABASE_URL env var info
  // We'll use it to understand how to connect
  const dbUrl = (process.env.DATABASE_URL || '').replace(/\/\/.*:.*@/, '//***:***@');
  return NextResponse.json({
    node_env: process.env.NODE_ENV,
    db_url_masked: dbUrl,
    db_host_direct: process.env.DB_HOST || '(not set)',
    db_name: process.env.DB_NAME || '(not set)',
    db_user: process.env.DB_USER || '(not set)',
    db_port: process.env.DB_PORT || '3306',
    all_db_keys: Object.keys(process.env)
      .filter(k => k.includes('DB_') || k.includes('DATABASE') || k.includes('MYSQL'))
      .map(k => k + '=' + (process.env[k] || '').slice(0, 30)),
  });
}
