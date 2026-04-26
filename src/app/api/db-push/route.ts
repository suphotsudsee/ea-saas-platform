import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export async function GET() {
  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    
    // Push schema to database (creates/updates tables)
    const pushOutput = execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', {
      cwd: process.cwd(),
      timeout: 60000,
      env: { ...process.env },
    });
    
    return NextResponse.json({
      ok: true,
      message: '📊 Schema pushed to database',
      output: pushOutput.toString(),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: String(error),
      output: error instanceof Error && 'stdout' in error ? (error as any).stdout?.toString() : undefined,
    }, { status: 500 });
  }
}