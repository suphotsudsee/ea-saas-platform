import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard/admin/:path*',
  ],
};

export default async function middleware(request: NextRequest) {
  // In a real implementation, this would check for the session cookie
  // and verify the role for /admin paths.
  
  const token = request.cookies.get('auth_token');
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
