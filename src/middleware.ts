import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/session';

// Protected paths that require authentication
// Note: We also protect process manager APIs, but allow monitoring health pings
const protectedPaths = ['/', '/api/process'];
const authPaths = ['/login', '/register'];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  const isProtected = protectedPaths.some(p => path === p || path.startsWith(p + '/'));
  const isAuthPath = authPaths.some(p => path === p);

  // Retrieve the session cookie
  const cookie = req.cookies.get('session')?.value;
  const session = await decrypt(cookie);

  // Redirect to login if accessing a protected page without a session
  if (isProtected && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect to dashboard if logged in and trying to access login/register
  if (isAuthPath && session?.userId) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/monitor (health ping endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/monitor|_next/static|_next/image|favicon.ico).*)',
  ],
};
