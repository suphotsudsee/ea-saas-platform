// ─── Admin-Only Middleware ─────────────────────────────────────────────────────
// Verifies that the authenticated user has admin privileges
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from './auth';

type AdminRole = 'SUPER_ADMIN' | 'BILLING_ADMIN' | 'RISK_ADMIN' | 'SUPPORT';

interface AdminMiddlewareOptions {
  allowedRoles?: AdminRole[];
}

/**
 * Middleware to verify the current session user is an admin with sufficient privileges.
 * 
 * Usage:
 *   const result = await adminOnlyMiddleware(request);
 *   if (result.response) return result.response; // unauthorized
 *   const adminUser = result.admin;
 */
export async function adminOnlyMiddleware(
  request: NextRequest,
  options: AdminMiddlewareOptions = {}
): Promise<{
  admin: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    actorType: 'user' | 'admin';
  };
  response?: undefined;
} | {
  admin?: undefined;
  response: NextResponse;
}> {
  const { allowedRoles } = options;
  const authResult = await authMiddleware(request);

  if (authResult.response || !authResult.user) {
    return {
      response: authResult.response || NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  const admin = authResult.user;
  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'BILLING_ADMIN', 'RISK_ADMIN', 'SUPPORT'];

  if (!adminRoles.includes(admin.role)) {
    return {
      response: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(admin.role as AdminRole)) {
    return {
      response: NextResponse.json(
        { error: 'Insufficient privileges for this action' },
        { status: 403 }
      ),
    };
  }

  return { admin };
}

/**
 * Check if admin has write access (not read-only SUPPORT role).
 */
export function requireWriteAccess(role: string): boolean {
  return role !== 'SUPPORT';
}

/**
 * Check if admin is SUPER_ADMIN.
 */
export function requireSuperAdmin(role: string): boolean {
  return role === 'SUPER_ADMIN';
}
