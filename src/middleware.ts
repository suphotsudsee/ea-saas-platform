import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard/admin/:path*',
  ],
};

export default async function middleware(request: NextRequest) {
  const token = request.cookies.get('session-token');

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
