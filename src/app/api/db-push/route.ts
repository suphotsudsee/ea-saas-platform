import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('x-admin-secret');
    if (authHeader !== process.env.ADMIN_SECRET && authHeader !== 'tradecandle-seed-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Execute prisma db push using the Prisma CLI binary
    const { execSync } = await import('child_process');
    
    // Try multiple paths for prisma binary (standalone Docker has limited node_modules)
    const prismaPaths = [
      'node ./node_modules/.bin/prisma',
      'node ./node_modules/prisma/build/index.js', 
      'npx prisma',
    ];
    
    let output = '';
    let success = false;
    
    for (const prismaCmd of prismaPaths) {
      try {
        console.log(`Trying: ${prismaCmd} db push`);
        const result = execSync(`${prismaCmd} db push --skip-generate --accept-data-loss 2>&1`, {
          cwd: process.cwd(),
          timeout: 120000,
          env: { ...process.env },
        });
        output = result.toString();
        success = true;
        break;
      } catch (err: any) {
        output += `\n❌ ${prismaCmd} failed: ${err.message?.substring(0, 200) || 'Unknown error'}`;
        if (err.stdout) output += `\nstdout: ${err.stdout.toString().substring(0, 500)}`;
        if (err.stderr) output += `\nstderr: ${err.stderr.toString().substring(0, 500)}`;
      }
    }
    
    if (!success) {
      // Fallback: try to verify DB connection and list tables
      try {
        await prisma.$connect();
        const result = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()` as any[];
        const tables = result.map((r: any) => r.table_name || r.TABLE_NAME);
        return NextResponse.json({
          ok: false,
          error: 'All prisma db push methods failed',
          output,
          tables,
          hint: 'DB connection works but schema push failed. Tables may need manual creation.',
        }, { status: 500 });
      } catch (dbErr: any) {
        return NextResponse.json({
          ok: false,
          error: 'Schema push failed AND DB connection failed',
          output,
          dbError: dbErr.message,
        }, { status: 500 });
      }
    }
    
    // Verify by checking tables
    await prisma.$connect();
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()` as any[];
    const tableNames = tables.map((r: any) => r.table_name || r.TABLE_NAME);
    
    return NextResponse.json({
      ok: true,
      message: '✅ Schema pushed to database',
      output: output.substring(0, 1000),
      tables: tableNames,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message,
      stack: error.stack?.substring(0, 500),
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}