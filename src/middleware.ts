import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/rewards',
];

// Routes that are only accessible to non-authenticated users
const AUTH_ROUTES = [
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/reset-password',
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  const isAuthRoute = AUTH_ROUTES.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  // Handle protected routes
  if (isProtectedRoute) {
    if (!session) {
      // Redirect to login if trying to access protected route while not authenticated
      const redirectUrl = new URL('/auth/sign-in', req.url);
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Handle auth routes
  if (isAuthRoute) {
    if (session) {
      // Redirect to dashboard if trying to access auth routes while authenticated
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 