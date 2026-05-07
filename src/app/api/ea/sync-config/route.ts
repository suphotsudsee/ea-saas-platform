// ─── GET/POST /api/ea/sync-config ──────────────────────────────────────────────
// EA endpoint: GET = fetch current strategy config, POST = acknowledge config receipt.
// Uses raw mysql2 — no Prisma/Redis middleware (standalone Docker safe).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

function getDbConfig() {
  let raw = process.env.DATABASE_URL!;
  if (raw.includes('mysql-database-')) {
    raw = raw.replace('mysql-database-', '');
  }
  try {
    const u = new URL(raw);
    return {
      host: u.hostname,
      port: parseInt(u.port || '3306'),
      user: u.username,
      password: u.password,
      database: u.pathname.replace('/', ''),
    };
  } catch {
    const value = raw.replace(/^mysql:\/\//, '');
    const at = value.lastIndexOf('@');
    const auth = at >= 0 ? value.slice(0, at) : '';
    const hostAndDb = at >= 0 ? value.slice(at + 1) : value;
    const colon = auth.indexOf(':');
    const user = colon >= 0 ? auth.slice(0, colon) : auth;
    const password = colon >= 0 ? auth.slice(colon + 1) : '';
    const slash = hostAndDb.indexOf('/');
    const hostPort = slash >= 0 ? hostAndDb.slice(0, slash) : hostAndDb;
    const database = slash >= 0 ? hostAndDb.slice(slash + 1).split('?')[0] : '';
    const [host, portText] = hostPort.split(':');
    return { host, port: portText ? Number(portText) : 3306, user, password, database };
  }
}

function extractLicenseInfo(request: NextRequest, body: any) {
  return {
    apiKey: request.headers.get('x-api-key') || body.apiKey || '',
    licenseKey: request.headers.get('x-license-key') || body.licenseKey || '',
  };
}

// ─── GET: Fetch current strategy configuration ────────────────────────────────

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const licenseKey = url.searchParams.get('licenseKey') || request.headers.get('x-license-key') || '';
  const accountNumber = url.searchParams.get('accountNumber') || '';

  if (!licenseKey) {
    return NextResponse.json(
      { error: 'licenseKey is required (query param or header)' },
      { status: 400 }
    );
  }

  let conn: mysql.Connection | null = null;
  try {
    const dbConfig = getDbConfig();
    conn = await mysql.createConnection(dbConfig);

    const [licRows] = await conn.execute(
      `SELECT l.id, l.strategyId, l.status,
              st.configJson, st.configHash, st.name as strategyName, st.version as strategyVersion
       FROM licenses l
       LEFT JOIN strategies st ON st.id = l.strategyId
       WHERE l.\`key\` = ?`,
      [licenseKey]
    ) as any[];

    if (!licRows || licRows.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_KEY' },
        { status: 401 }
      );
    }

    const lic = licRows[0];

    // Parse config JSON
    let config = {};
    if (lic.configJson) {
      try {
        config = typeof lic.configJson === 'string' ? JSON.parse(lic.configJson) : lic.configJson;
      } catch {}
    }

    return NextResponse.json({
      strategyId: lic.strategyId,
      strategyName: lic.strategyName || 'TradeCandle',
      strategyVersion: lic.strategyVersion || '1.0.0',
      configHash: lic.configHash || '',
      config,
    });
  } catch (error: any) {
    console.error('EA sync-config GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration', message: error.message },
      { status: 500 }
    );
  } finally {
    if (conn) await conn.end();
  }
}

// ─── POST: Acknowledge config receipt ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { apiKey, licenseKey } = extractLicenseInfo(request, body);
  const accountNumber = body.accountNumber || '';
  const configHash = body.configHash || '';

  if (!licenseKey) {
    return NextResponse.json(
      { error: 'licenseKey is required' },
      { status: 400 }
    );
  }

  let conn: mysql.Connection | null = null;
  try {
    const dbConfig = getDbConfig();
    conn = await mysql.createConnection(dbConfig);

    const [licRows] = await conn.execute(
      `SELECT id FROM licenses WHERE \`key\` = ?`,
      [licenseKey]
    ) as any[];

    if (!licRows || licRows.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_KEY' },
        { status: 401 }
      );
    }

    const lic = licRows[0];

    // Log config acknowledgment
    if (configHash) {
      try {
        await conn.execute(
          `INSERT INTO config_ack_logs (id, licenseId, accountNumber, configHash, acknowledgedAt)
           VALUES (?, ?, ?, ?, NOW())`,
          [`ca_${Date.now()}`, lic.id, accountNumber, configHash]
        );
      } catch (e) {
        // Table may not exist — optional
        console.log('config_ack_logs insert skipped:', e);
      }
    }

    return NextResponse.json({
      status: 'acknowledged',
      configHash,
    });
  } catch (error: any) {
    console.error('EA sync-config POST error:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge config', message: error.message },
      { status: 500 }
    );
  } finally {
    if (conn) await conn.end();
  }
}
