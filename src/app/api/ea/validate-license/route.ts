// ─── POST /api/ea/validate-license ─────────────────────────────────────────────
// EA endpoint: Validate license key with account binding check
// Uses raw mysql2 — no Redis/PrismaClient dependency (standalone Docker safe)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

function getDbConfig() {
  let raw = process.env.DATABASE_URL!;
  // Strip Coolify's mysql-database- prefix (Docker DNS resolves bare UUID only)
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
    // Fallback parsing
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

export async function POST(request: NextRequest) {
  let body: any;
  try {
    // MQL5 WebRequest adds null terminator \0 to body — strip before parse
    const rawText = await request.text();
    const cleaned = rawText.replace(/\0/g, '');
    body = JSON.parse(cleaned);
  } catch (e) {
    return NextResponse.json(
      { valid: false, error: 'PARSE_ERROR', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Extract auth from headers OR JSON body (EA sends both)
  const apiKey =
    request.headers.get('x-api-key') ||
    body.apiKey ||
    '';
  const licenseKey =
    request.headers.get('x-license-key') ||
    body.licenseKey ||
    '';
  const accountNumber = body.accountNumber || '';

  if (!licenseKey) {
    return NextResponse.json(
      { valid: false, error: 'MISSING_LICENSE_KEY', message: 'License key is required' },
      { status: 400 }
    );
  }

  let conn: mysql.Connection | null = null;
  try {
    const config = getDbConfig();
    conn = await mysql.createConnection(config);

    // ─── Look up license ───
    const [rows] = await conn.execute(
      `SELECT l.id, l.\`key\`, l.status, l.expiresAt, l.maxAccounts, l.killSwitch,
              l.killSwitchReason, l.userId, l.subscriptionId, l.strategyId,
              s.id as subId, s.status as subStatus,
              p.name as planName,
              st.name as strategyName, st.version as strategyVersion
       FROM licenses l
       LEFT JOIN subscriptions s ON s.id = l.subscriptionId
       LEFT JOIN packages p ON p.id = s.packageId
       LEFT JOIN strategies st ON st.id = l.strategyId
       WHERE l.\`key\` = ?`,
      [licenseKey]
    ) as any[];

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { valid: false, error: 'INVALID_KEY', message: 'License key not found' },
        { status: 401 }
      );
    }

    const lic = rows[0];

    // ─── Status checks ───
    if (lic.status === 'EXPIRED' || (lic.expiresAt && new Date(lic.expiresAt) < new Date())) {
      return NextResponse.json(
        { valid: false, error: 'EXPIRED', message: 'License has expired' },
        { status: 403 }
      );
    }
    if (lic.status === 'REVOKED') {
      return NextResponse.json(
        { valid: false, error: 'REVOKED', message: 'License has been revoked' },
        { status: 403 }
      );
    }
    if (lic.status === 'PAUSED') {
      return NextResponse.json(
        { valid: false, error: 'PAUSED', message: 'License is paused' },
        { status: 403 }
      );
    }
    if (lic.subStatus !== 'ACTIVE' && lic.subStatus !== 'TRIAL' && lic.subStatus !== 'TRIALING') {
      return NextResponse.json(
        { valid: false, error: 'SUBSCRIPTION_INACTIVE', message: 'Your subscription is not active' },
        { status: 403 }
      );
    }
    if (lic.killSwitch) {
      return NextResponse.json(
        {
          valid: false,
          error: 'KILLED',
          message: lic.killSwitchReason || 'Kill switch is active',
        },
        { status: 403 }
      );
    }

    // ─── Account binding check (if accountNumber provided) ───
    if (accountNumber) {
      const [existingAccounts] = await conn.execute(
        `SELECT accountNumber FROM trading_accounts
         WHERE licenseId = ? AND status != 'UNLINKED'`,
        [lic.id]
      ) as any[];

      const existingNums = existingAccounts.map((a: any) => String(a.accountNumber));

      if (existingNums.length > 0 && !existingNums.includes(String(accountNumber))) {
        // Check if under maxAccounts limit — allow new account if within limit
        if (existingNums.length >= (lic.maxAccounts || 1)) {
          return NextResponse.json(
            {
              valid: false,
              error: 'MAX_ACCOUNTS_REACHED',
              message: `This license is already linked to ${existingNums.length} account(s) (limit: ${lic.maxAccounts || 1})`,
            },
            { status: 403 }
          );
        }
        // Auto-link new account
        try {
          await conn.execute(
            `INSERT INTO trading_accounts (id, accountNumber, brokerName, platform, licenseId, status, userId, createdAt, updatedAt)
             VALUES (?, ?, 'Exness', 'MT5', ?, 'LINKED', ?, NOW(), NOW())`,
            [`ta_${accountNumber}`, accountNumber, lic.id, lic.userId]
          );
        } catch (e) {
          // Duplicate — ignore
        }
      } else if (existingNums.length === 0) {
        // First account — auto-link
        try {
          await conn.execute(
            `INSERT INTO trading_accounts (id, accountNumber, brokerName, platform, licenseId, status, userId, createdAt, updatedAt)
             VALUES (?, ?, 'Exness', 'MT5', ?, 'LINKED', ?, NOW(), NOW())`,
            [`ta_${accountNumber}`, accountNumber, lic.id, lic.userId]
          );
        } catch (e) {
          // Duplicate — ignore
        }
      }
    }

    // ─── Success ───
    return NextResponse.json({
      valid: true,
      id: lic.id,
      license: {
        id: lic.id,
        key: lic.key,
        userId: lic.userId,
        subscriptionId: lic.subscriptionId,
        strategyId: lic.strategyId,
        status: lic.status,
        expiresAt: lic.expiresAt,
        maxAccounts: lic.maxAccounts || 1,
        killSwitch: Boolean(lic.killSwitch),
        killSwitchReason: lic.killSwitchReason || null,
      },
      strategy: {
        id: lic.strategyId,
        name: lic.strategyName || 'Unknown',
        version: lic.strategyVersion || '1.0.0',
      },
      subscription: {
        id: lic.subscriptionId,
        status: lic.subStatus,
      },
      plan: {
        name: lic.planName || 'Unknown',
      },
    });
  } catch (error: any) {
    console.error('EA validate-license error:', error);
    return NextResponse.json(
      { valid: false, error: 'INTERNAL_ERROR', message: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (conn) await conn.end();
  }
}
