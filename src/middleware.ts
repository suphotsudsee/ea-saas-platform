import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me'
);

export const config = {
  matcher: [
    '/api/ea/:path*.php',
    '/dashboard/:path*', 
    '/dashboard/admin/:path*',
  ],
};

export default async function middleware(request: NextRequest) {
  // ─── Rewrite .php EA endpoints (EA calls .php but Next.js has no .php routes) ───
  if (request.nextUrl.pathname.endsWith('.php') && request.nextUrl.pathname.startsWith('/api/ea/')) {
    const newPath = request.nextUrl.pathname.replace(/\.php$/, '');
    return NextResponse.rewrite(new URL(newPath + request.nextUrl.search, request.url));
  }

  const token = request.cookies.get('session-token');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/dashboard/admin');

  if (!token) {
    return NextResponse.redirect(new URL(isAdminRoute ? '/admin/login' : '/login', request.url));
  }

  if (isAdminRoute) {
    try {
      const { payload } = await jwtVerify(token.value, JWT_SECRET);
      const actorType = payload.actorType === 'admin' ? 'admin' : 'user';
      const role = typeof payload.role === 'string' ? payload.role : '';
      const hasAdminAccess =
        actorType === 'admin' || ['ADMIN', 'SUPER_ADMIN', 'BILLING_ADMIN', 'RISK_ADMIN', 'SUPPORT'].includes(role);

      if (!hasAdminAccess) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}
