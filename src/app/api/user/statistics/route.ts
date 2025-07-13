import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * User Statistics API Route
 * Provides comprehensive user statistics for the customer profile
 */

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 User statistics API called')
    const supabase = createServerSupabase()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    console.log('✅ User authenticated:', user.id, user.email)

    // Use service role to bypass RLS
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user profile for member since date
    const { data: userProfile, error: profileError } = await serviceSupabase
      .from('users')
      .select('created_at, full_name')
      .eq('id', user.id)
      .single()

    let finalUserProfile = userProfile

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      
      // If user profile doesn't exist, create a minimal response with auth user data
      if (profileError.code === 'PGRST116') {
        console.log('User profile not found, using auth user data as fallback')
        finalUserProfile = {
          created_at: user.created_at,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
        }
      } else {
        return NextResponse.json(
          { error: 'Failed to fetch user profile' },
          { status: 500 }
        )
      }
    }

    // Get comprehensive booking statistics 
    const { data: bookingStats, error: bookingStatsError } = await serviceSupabase
      .from('bookings')
      .select(`
        id,
        status,
        total_price_pence,
        service_price_pence,
        created_at,
        booking_reference,
        service_id,
        vehicle_id
      `)
      .eq('user_id', user.id)

    if (bookingStatsError) {
      console.error('Error fetching booking statistics:', bookingStatsError)
      console.error('Booking stats error details:', {
        code: bookingStatsError.code,
        message: bookingStatsError.message,
        details: bookingStatsError.details,
        hint: bookingStatsError.hint
      })
      
      // Continue with empty bookings array instead of failing
      console.log('Continuing with empty bookings array...')
      // Use empty array as fallback
    }

    // Calculate statistics
    const bookings = bookingStats || []
    const totalBookings = bookings.length
    const completedBookings = bookings.filter((b: any) => b.status === 'completed').length
    const cancelledBookings = bookings.filter((b: any) => b.status === 'cancelled').length
    const pendingBookings = bookings.filter((b: any) => ['pending', 'confirmed'].includes(b.status)).length
    
    // Calculate spending (already in pence)
    const completedBookingPrices = bookings
      .filter((b: any) => b.status === 'completed')
      .map((b: any) => b.total_price_pence || b.service_price_pence || 0)
    
    const totalSpentPence = completedBookingPrices.reduce((sum: number, price: number) => sum + price, 0)
    const averageBookingValuePence = completedBookings > 0 ? totalSpentPence / completedBookings : 0

    // Find favorite service (we'll use service_id for now)
    const serviceCount = bookings.reduce((acc: any, booking: any) => {
      const service = booking.service_id || 'Standard Service'
      acc[service] = (acc[service] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const favoriteService = Object.entries(serviceCount).length > 0 
      ? Object.entries(serviceCount).sort(([,a], [,b]) => (b as number) - (a as number))[0][0]
      : undefined

    // Find most used vehicle (simplified - using vehicle_id for now)
    const vehicleCount = bookings.reduce((acc: any, booking: any) => {
      if (booking.vehicle_id) {
        const vehicleKey = `Vehicle ${booking.vehicle_id.slice(-6)}`
        acc[vehicleKey] = (acc[vehicleKey] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const mostUsedVehicle = Object.entries(vehicleCount).length > 0
      ? Object.entries(vehicleCount).sort(([,a], [,b]) => (b as number) - (a as number))[0][0]
      : undefined

    // Get date information
    const sortedBookings = bookings
      .filter((b: any) => b.created_at)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const lastBookingDate = sortedBookings.length > 0 ? sortedBookings[0].created_at : undefined

    // Get next booking (future bookings) - for now just use null since we don't have booking_date
    const nextBookingDate = null

    // Get vehicle count
    const { data: vehicleData, error: vehicleError } = await serviceSupabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (vehicleError) {
      console.error('Error fetching vehicles:', vehicleError)
      console.error('Vehicle error details:', {
        code: vehicleError.code,
        message: vehicleError.message,
        details: vehicleError.details,
        hint: vehicleError.hint
      })
    }

    const vehicleCountTotal = vehicleData?.length || 0

    // Calculate booking frequency (bookings per month)
    const memberSince = new Date(finalUserProfile.created_at)
    const monthsSinceMember = Math.max(1, Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    const bookingsPerMonth = totalBookings / monthsSinceMember

    // Get rewards information from customer_rewards table
    const { data: rewardsData, error: rewardsError } = await serviceSupabase
      .from('customer_rewards')
      .select('total_points, current_tier')
      .eq('user_id', user.id)
      .single()

    const response = {
      total_bookings: totalBookings,
      completed_bookings: completedBookings,
      cancelled_bookings: cancelledBookings,
      total_spent_pence: totalSpentPence,
      total_vehicles: vehicleCountTotal,
      reward_points: rewardsData?.total_points || 0,
      reward_tier: (rewardsData?.current_tier || 'bronze').toLowerCase(),
      last_booking_date: lastBookingDate,
      last_service_date: sortedBookings.find((b: any) => b.status === 'completed')?.created_at || null,
      // Additional useful stats for future use
      pending_bookings: pendingBookings,
      total_spent: totalSpentPence / 100, // Convert to pounds for display
      average_booking_value: Math.round(averageBookingValuePence / 100),
      favorite_service: favoriteService,
      most_used_vehicle: mostUsedVehicle,
      member_since: finalUserProfile.created_at,
      next_booking_date: nextBookingDate,
      bookings_per_month: Math.round(bookingsPerMonth * 10) / 10,
      customer_name: finalUserProfile.full_name,
      completion_rate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0,
      cancellation_rate: totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0,
      service_variety: Object.keys(serviceCount).length,
      vehicle_variety: Object.keys(vehicleCount).length
    }

    console.log('✅ User statistics calculated successfully')
    return NextResponse.json({
      data: response,
      error: null
    })

  } catch (error) {
    console.error('Error in user statistics API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}