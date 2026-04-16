// ─── Admin-Only Middleware ─────────────────────────────────────────────────────
// Verifies that the authenticated user has admin privileges
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '../lib/prisma';

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
    name: string;
    role: string;
  };
  response?: undefined;
} | {
  admin?: undefined;
  response: NextResponse;
}> {
  const { allowedRoles } = options;

  const session = await getServerSession();

  if (!session?.user?.email) {
    return {
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  // Check if this is an AdminUser
  const admin = await prisma.adminUser.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!admin) {
    // Also check if a regular User has ADMIN or SUPER_ADMIN role
    const regularUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (regularUser && (regularUser.role === 'ADMIN' || regularUser.role === 'SUPER_ADMIN')) {
      if (allowedRoles && !allowedRoles.includes(regularUser.role as AdminRole)) {
        return {
          response: NextResponse.json(
            { error: 'Insufficient privileges' },
            { status: 403 }
          ),
        };
      }

      return {
        admin: {
          id: regularUser.id,
          email: regularUser.email,
          name: regularUser.name || 'Admin',
          role: regularUser.role,
        },
      };
    }

    return {
      response: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ),
    };
  }

  // AdminUser found — check role restrictions
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