import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// GET /api/admin/analytics - Get admin analytics
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    console.log('🔍 Analytics API: Starting authentication check')
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('👤 User check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email,
      userError: userError?.message 
    })
    
    // Also check the session details
    const { data: { session } } = await supabase.auth.getSession()
    console.log('🔑 Session details:', {
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      sessionUserEmail: session?.user?.email
    })
    
    if (userError || !user) {
      console.log('❌ Authentication failed:', userError?.message)
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      )
    }

    // Verify admin permissions using service role to bypass RLS
    console.log('🔑 Checking user permissions for:', user.email)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: userProfiles, error: profileError } = await serviceSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)

    console.log('👤 User profile query result:', { 
      userProfiles, 
      profileCount: userProfiles?.length,
      profileError: profileError?.message
    })

    if (profileError) {
      console.log('❌ Profile fetch error:', profileError.message)
      return NextResponse.json(
        { error: `Profile fetch failed: ${profileError.message}` },
        { status: 500 }
      )
    }

    const userProfile = userProfiles?.[0]

    if (!userProfiles || userProfiles.length === 0 || !userProfile) {
      console.log('❌ No user profile found for:', user.email)
      return NextResponse.json(
        { error: `User profile not found. Please contact administrator.` },
        { status: 403 }
      )
    }

    if (userProfiles.length > 1) {
      console.log('⚠️ Multiple profiles found for user:', user.id, 'Count:', userProfiles.length)
    }

    if (!userProfile.role || !['admin', 'super_admin', 'staff'].includes(userProfile.role)) {
      console.log('❌ Permission denied:', { 
        email: user.email,
        role: userProfile?.role,
        allowedRoles: ['admin', 'super_admin', 'staff'],
        allowedUsers: ['paul@evans-studio.co.uk', 'zell@love4detailing.com']
      })
      return NextResponse.json(
        { error: `Insufficient permissions - Admin access required. Current role: ${userProfile?.role || 'none'}` },
        { status: 403 }
      )
    }

    console.log('✅ Authorization successful for:', user.email, 'Role:', userProfile.role)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'
    const dateStart = searchParams.get('date_start')
    const dateEnd = searchParams.get('date_end')

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    const range = searchParams.get('range') || '30d'
    
    switch (range) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      default: // 30d
        startDate.setDate(endDate.getDate() - 30)
    }

    // Get basic analytics data with direct queries using service role
    const [bookingsResult, customersResult] = await Promise.all([
      // Get bookings data
      serviceSupabase
        .from('bookings')
        .select('id, total_price_pence, status, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      // Get customers data
      serviceSupabase
        .from('users')
        .select('id')
        .eq('role', 'customer')
    ])

    if (bookingsResult.error || customersResult.error) {
      console.error('Error fetching analytics data:', bookingsResult.error || customersResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      )
    }

    // Calculate analytics
    const bookings = bookingsResult.data || []
    const completedBookings = bookings.filter(b => b.status === 'completed')
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
    const allActiveBookings = bookings.filter(b => ['completed', 'confirmed', 'pending'].includes(b.status))
    
    // Calculate revenue from completed bookings only
    const completedRevenue = completedBookings.reduce((sum, b) => sum + (b.total_price_pence || 0), 0)
    
    // For analytics display, show all active bookings but note revenue is only from completed
    const totalBookings = allActiveBookings.length
    const totalCustomers = customersResult.data?.length || 0
    const averageBookingValue = completedBookings.length > 0 ? Math.round(completedRevenue / completedBookings.length) : 0
    
    console.log('📊 Analytics calculation summary:', {
      totalBookings: bookings.length,
      completedBookings: completedBookings.length,
      confirmedBookings: confirmedBookings.length,
      completedRevenue,
      totalCustomers,
      averageBookingValue
    })

    const data = {
      totalRevenue: completedRevenue,
      totalBookings,
      totalCustomers,
      averageBookingValue,
      monthlyGrowth: 0, // Would need historical data for this
      popularServices: [
        {
          name: 'Full Valet Service',
          bookings: totalBookings,
          revenue: completedRevenue
        }
      ],
      recentMetrics: [],
      // Additional debug info
      bookingBreakdown: {
        total: bookings.length,
        completed: completedBookings.length,
        confirmed: confirmedBookings.length,
        pending: bookings.filter(b => b.status === 'pending').length
      }
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 