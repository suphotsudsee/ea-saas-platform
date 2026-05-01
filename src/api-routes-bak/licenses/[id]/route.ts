import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '../../../../api/middleware/auth';
import { getLicenseDetail } from '../../../../api/services/license.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware(request);

  if ('response' in authResult || !authResult.user) {
    return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const license = await getLicenseDetail(params.id, authResult.user.id);

    if (!license) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    return NextResponse.json({ license });
  } catch (error) {
    console.error('Get license detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch license detail' }, { status: 500 });
  }
}
