import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';
import { ROUTES } from '@/lib/constants/routes';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/rewards',
];

// Routes that require admin role
const ADMIN_ROUTES = [
  '/admin',
];

// Routes that are only accessible to non-authenticated users
const AUTH_ROUTES = [
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/reset-password',
];

// Routes that should be accessible regardless of auth state
const PUBLIC_ROUTES = [
  '/auth/callback',
  '/auth/update-password',
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Skip middleware for certain internal Next.js requests to avoid RSC payload issues
  if (
    req.nextUrl.pathname.includes('/_next/') ||
    req.nextUrl.pathname.includes('/api/') ||
    req.headers.get('RSC') === '1' ||
    req.headers.get('Next-Router-Prefetch') === '1'
  ) {
    return res;
  }
  
  const supabase = createMiddlewareClient<Database>({ req, res });
  
  try {
    // Refresh session if expired - required for Server Components
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      // Clear session on error
      await supabase.auth.signOut();
      throw error;
    }

    const isProtectedRoute = PROTECTED_ROUTES.some(route => 
      req.nextUrl.pathname.startsWith(route)
    );

    const isAdminRoute = ADMIN_ROUTES.some(route =>
      req.nextUrl.pathname.startsWith(route)
    );

    const isAuthRoute = AUTH_ROUTES.some(route => 
      req.nextUrl.pathname.startsWith(route)
    );

    const isPublicRoute = PUBLIC_ROUTES.some(route => 
      req.nextUrl.pathname.startsWith(route)
    );

    // Allow public routes regardless of auth state
    if (isPublicRoute) {
      return res;
    }

    // Handle admin routes
    if (isAdminRoute) {
      if (!session) {
        const redirectUrl = new URL(ROUTES.SIGN_IN, req.url);
        redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }

      // Check if user has admin role - but cache the result in session to avoid repeated DB calls
      const userRole = session.user.user_metadata?.role;
      if (userRole !== 'admin') {
        // Only make DB call if role isn't cached in session
        const { data: user } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (!user || user.role !== 'admin') {
          return NextResponse.redirect(new URL(ROUTES.DASHBOARD, req.url));
        }
      }
    }

    // Handle protected routes
    if (isProtectedRoute && !session) {
      // Store the original URL to redirect back after login
      const redirectUrl = new URL(ROUTES.SIGN_IN, req.url);
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Handle protected routes - redirect admin users to admin portal
    if (isProtectedRoute && session) {
      const userRole = session.user.user_metadata?.role;
      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin', req.url));
      } else if (!userRole) {
        // Only make DB call if role isn't cached
        const { data: user } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (user && user.role === 'admin') {
          return NextResponse.redirect(new URL('/admin', req.url));
        }
      }
    }

    // Handle auth routes when user is logged in
    if (isAuthRoute && session) {
      // Check if user is admin and redirect appropriately
      const userRole = session.user.user_metadata?.role;
      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin', req.url));
      } else if (userRole) {
        return NextResponse.redirect(new URL(ROUTES.DASHBOARD, req.url));
      } else {
        // Only make DB call if role isn't cached
        const { data: user } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (user && user.role === 'admin') {
          return NextResponse.redirect(new URL('/admin', req.url));
        } else {
          return NextResponse.redirect(new URL(ROUTES.DASHBOARD, req.url));
        }
      }
    }

    // Special handling for /book route
    if (req.nextUrl.pathname === ROUTES.BOOK && session) {
      // Check if user has a profile
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        return NextResponse.redirect(new URL(ROUTES.DASHBOARD, req.url));
      }
    }

    return res;
  } catch (error) {
    // On error, clear session and redirect to sign in
    const redirectUrl = new URL(ROUTES.SIGN_IN, req.url);
    redirectUrl.searchParams.set('error', 'session_error');
    return NextResponse.redirect(redirectUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     * - RSC payloads
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|api/|_next/webpack-hmr).*)',
  ],
}; 