import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// GET /api/admin/customers/[customerId] - Get customer profile for admin
export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    // First, verify admin authentication using regular client
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log('Authentication failed:', userError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('User authenticated:', user.id, user.email)

    // Use service role client for admin verification and data access
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify admin permissions using service role
    const { data: userProfile, error: profileError } = await serviceSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('User profile:', userProfile, 'Profile error:', profileError)

    if (!userProfile || !userProfile.role || !['admin', 'staff', 'super_admin'].includes(userProfile.role)) {
      console.log('Insufficient permissions. User role:', userProfile?.role)
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    console.log('Admin permissions verified. Role:', userProfile.role)

    // Get customer profile with admin view using direct queries (fallback from stored procedure)
    console.log('Fetching customer profile directly for customer_id:', params.customerId)
    
    try {
      // Get customer profile data
      const { data: customerProfile, error: profileError } = await serviceSupabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          phone,
          role,
          is_active,
          email_verified_at,
          created_at,
          updated_at
        `)
        .eq('id', params.customerId)
        .single()

      if (profileError) {
        console.error('Error fetching customer profile:', profileError)
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        )
      }

      // Get customer rewards
      const { data: rewardsData } = await serviceSupabase
        .from('customer_rewards')
        .select('total_points, current_tier, points_lifetime')
        .eq('user_id', params.customerId)
        .single()

      // Get booking history
      const { data: bookingHistory } = await serviceSupabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          service_id,
          status,
          total_price_pence,
          payment_method,
          completed_at,
          created_at,
          customer_name,
          vehicle_id
        `)
        .eq('user_id', params.customerId)
        .order('created_at', { ascending: false })
        .limit(10)

      // Get vehicles
      const { data: vehicles } = await serviceSupabase
        .from('vehicles')
        .select(`
          id,
          registration,
          make,
          model,
          year,
          color,
          size,
          is_active,
          created_at
        `)
        .eq('user_id', params.customerId)
        .eq('is_active', true)

      // Calculate statistics
      const { data: statsData } = await serviceSupabase
        .from('bookings')
        .select('status, total_price_pence, created_at')
        .eq('user_id', params.customerId)

      const completedBookings = statsData?.filter(b => b.status === 'completed') || []
      const totalSpent = completedBookings.reduce((sum, b) => sum + (b.total_price_pence || 0), 0)
      
      const statistics = {
        total_bookings: statsData?.length || 0,
        completed_bookings: completedBookings.length,
        cancelled_bookings: statsData?.filter(b => b.status === 'cancelled').length || 0,
        total_spent_pence: totalSpent,
        average_booking_value_pence: completedBookings.length > 0 
          ? Math.round(totalSpent / completedBookings.length)
          : 0,
        first_booking_date: statsData && statsData.length > 0 ? [...statsData].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0].created_at : null,
        last_booking_date: statsData && statsData.length > 0 ? [...statsData].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at : null
      }

      // Build response data
      const responseData = {
        customer_profile: {
          ...customerProfile,
          reward_info: rewardsData ? {
            total_points: rewardsData.total_points,
            current_tier: rewardsData.current_tier,
            points_lifetime: rewardsData.points_lifetime
          } : null
        },
        booking_history: bookingHistory?.map(booking => ({
          booking_id: booking.id,
          booking_reference: booking.booking_reference,
          service_name: 'Full Valet Service', // Since we only have one service
          status: booking.status,
          total_price_pence: booking.total_price_pence,
          payment_method: booking.payment_method,
          completed_at: booking.completed_at,
          created_at: booking.created_at
        })) || [],
        vehicles: vehicles?.map(vehicle => ({
          vehicle_id: vehicle.id,
          registration: vehicle.registration,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          size: vehicle.size,
          is_active: vehicle.is_active,
          created_at: vehicle.created_at
        })) || [],
        statistics,
        admin_notes: [], // No admin notes table yet
        generated_at: new Date().toISOString()
      }

      console.log('Customer profile data assembled successfully')

      return NextResponse.json({
        success: true,
        data: responseData
      })

    } catch (queryError) {
      console.error('Error in direct queries:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch customer details' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Admin customer profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 