import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/services',
    '/booking',
    '/contact',
    '/about',
    '/auth/login',
    '/auth/register',
    '/auth/reset-password',
    '/auth/update-password',
    '/auth/callback',
  ]

  // API routes that require authentication
  const protectedApiRoutes = [
    '/api/auth/profile',
    '/api/auth/permissions',
    '/api/auth/admin',
  ]

  // Admin routes that require admin role
  const adminRoutes = [
    '/admin',
    '/dashboard/admin',
  ]

  // Customer dashboard routes
  const customerRoutes = [
    '/dashboard',
    '/dashboard/bookings',
    '/dashboard/vehicles',
    '/dashboard/profile',
    '/dashboard/rewards',
  ]

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  // Check if route is protected API
  const isProtectedApi = protectedApiRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Check if route is admin
  const isAdminRoute = adminRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  // Check if route is customer dashboard
  const isCustomerRoute = customerRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  // Handle protected API routes
  if (isProtectedApi) {
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return res
  }

  // Handle admin routes
  if (isAdminRoute) {
    if (!session) {
      const url = req.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }

    // Check user role for admin access with error handling
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile || !['admin', 'staff', 'super_admin'].includes(profile.role)) {
        const url = req.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error('Error checking user role in middleware:', error)
      // Allow access to prevent infinite loops - let page handle auth
      return res
    }

    return res
  }

  // Handle customer dashboard routes
  if (isCustomerRoute) {
    if (!session) {
      const url = req.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }

    // Check if admin user is trying to access customer dashboard - redirect to admin
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile && ['admin', 'staff', 'super_admin'].includes(profile.role)) {
        const url = req.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error('Error checking user role for customer route:', error)
      // Allow access to prevent infinite loops
    }

    return res
  }

  // Handle root page redirect for authenticated users
  if (pathname === '/' && session) {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      const url = req.nextUrl.clone()
      if (profile && ['admin', 'staff', 'super_admin'].includes(profile.role)) {
        url.pathname = '/admin'
      } else {
        url.pathname = '/dashboard'
      }
      return NextResponse.redirect(url)
    } catch (error) {
      console.error('Error checking user role for root redirect:', error)
      // Don't redirect on error, let user access homepage
      return res
    }
  }

  // Handle auth pages when already logged in
  if (pathname.startsWith('/auth/') && session) {
    const redirectTo = req.nextUrl.searchParams.get('redirectTo')
    const url = req.nextUrl.clone()
    
    if (redirectTo) {
      url.pathname = redirectTo
      url.search = ''
    } else {
      // Default redirect based on user role
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile && ['admin', 'staff', 'super_admin'].includes(profile.role)) {
          url.pathname = '/admin'
        } else {
          url.pathname = '/dashboard'
        }
      } catch (error) {
        url.pathname = '/dashboard'
      }
    }
    
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: [
    // Re-enable middleware with simplified matching
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}