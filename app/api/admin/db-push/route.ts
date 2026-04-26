import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Use Prisma's interactive transaction to run raw SQL
    // This effectively creates any missing tables
    const { execSync } = await import('child_process');
    
    const output = execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', {
      cwd: '/app',
      env: { ...process.env },
      timeout: 120000,
    }).toString();
    
    console.log('db push output:', output);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database schema synced',
      output: output.slice(-500)
    });
  } catch (error: any) {
    console.error('db push error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || String(error),
      output: error.stdout?.toString()?.slice(-500) || '',
      stderr: error.stderr?.toString()?.slice(-500) || '',
    }, { status: 500 });
  }
}