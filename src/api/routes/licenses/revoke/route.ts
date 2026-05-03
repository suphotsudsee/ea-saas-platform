// ─── PATCH /api/licenses/revoke ───────────────────────────────────────────────
// Revoke a license (admin only)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { adminOnlyMiddleware, requireWriteAccess } from '../../../middleware/adminOnly';
import { revokeLicense } from '../../../services/license.service';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';

const revokeSchema = z.object({
  licenseId: z.string().min(1, 'License ID is required'),
  reason: z.string().min(1, 'Reason is required').max(500),
});

export async function PATCH(request: NextRequest) {
  const authResult = await adminOnlyMiddleware(request);

  if (authResult.response) {
    return authResult.response;
  }

  if (!requireWriteAccess(authResult.admin.role)) {
    return NextResponse.json(
      { error: 'Insufficient privileges — read-only access' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validated = revokeSchema.parse(body);

    // Verify license exists
    const license = await prisma.license.findUnique({
      where: { id: validated.licenseId },
    });

    if (!license) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      );
    }

    const revokedLicense = await revokeLicense(
      validated.licenseId,
      validated.reason,
      authResult.admin.id
    );

    return NextResponse.json({
      message: 'License revoked successfully',
      license: {
        id: revokedLicense.id,
        status: revokedLicense.status,
        killSwitch: revokedLicense.killSwitch,
        killSwitchReason: revokedLicense.killSwitchReason,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Revoke license error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke license' },
      { status: 500 }
    );
  }
}
