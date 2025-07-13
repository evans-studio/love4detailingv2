import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Use service role key for admin access
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all customers with basic info
    const { data: customers, error } = await serviceSupabase
      .from('users')
      .select(`
        id,
        full_name,
        email,
        phone,
        role,
        email_verified_at,
        created_at,
        last_login_at,
        updated_at,
        is_active
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching customers:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get booking statistics for all customers
    const customerStats = new Map()
    const vehicleStats = new Map()
    
    if (customers && customers.length > 0) {
      const customerIds = customers.map(c => c.id)
      
      // Get booking statistics
      const { data: bookingStats, error: statsError } = await serviceSupabase
        .from('bookings')
        .select(`
          user_id,
          status,
          total_price_pence,
          service_price_pence,
          created_at
        `)
        .in('user_id', customerIds)
      
      // Get vehicle counts
      const { data: vehicleCounts, error: vehicleError } = await serviceSupabase
        .from('vehicles')
        .select(`
          user_id,
          id
        `)
        .in('user_id', customerIds)
        .eq('is_active', true)
      
      if (!statsError && bookingStats) {
        // Calculate stats for each customer
        customerIds.forEach(customerId => {
          const customerBookings = bookingStats.filter(b => b.user_id === customerId)
          const completedBookings = customerBookings.filter(b => b.status === 'completed')
          const cancelledBookings = customerBookings.filter(b => b.status === 'cancelled')
          const totalSpent = completedBookings.reduce((sum, b) => 
            sum + (b.total_price_pence || b.service_price_pence || 0), 0)
          
          const firstBooking = customerBookings.length > 0 
            ? customerBookings
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
                .created_at
            : null
          
          const lastBooking = customerBookings.length > 0 
            ? customerBookings
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                .created_at
            : null
          
          customerStats.set(customerId, {
            total_bookings: customerBookings.length,
            completed_bookings: completedBookings.length,
            cancelled_bookings: cancelledBookings.length,
            total_spent_pence: totalSpent,
            avg_booking_value_pence: completedBookings.length > 0 ? totalSpent / completedBookings.length : 0,
            first_booking_date: firstBooking,
            last_booking_date: lastBooking
          })
        })
      }
      
      if (!vehicleError && vehicleCounts) {
        // Calculate vehicle counts for each customer
        customerIds.forEach(customerId => {
          const customerVehicles = vehicleCounts.filter(v => v.user_id === customerId)
          vehicleStats.set(customerId, customerVehicles.length)
        })
      }
    }

    // Calculate reward tier based on total spent
    const calculateTier = (totalSpent: number) => {
      if (totalSpent >= 50000) return 'gold'    // £500+
      if (totalSpent >= 20000) return 'silver'  // £200+
      return 'bronze'
    }

    // Calculate reward points (simple: 1 point per £1 spent)
    const calculatePoints = (totalSpent: number) => {
      return Math.floor(totalSpent / 100)
    }

    // Transform customers data
    const transformedCustomers = customers?.map(customer => {
      const stats = customerStats.get(customer.id) || {
        total_bookings: 0,
        completed_bookings: 0,
        cancelled_bookings: 0,
        total_spent_pence: 0,
        avg_booking_value_pence: 0,
        first_booking_date: null,
        last_booking_date: null
      }
      
      const vehicleCount = vehicleStats.get(customer.id) || 0
      const tier = calculateTier(stats.total_spent_pence)
      const points = calculatePoints(stats.total_spent_pence)
      
      return {
        id: customer.id,
        full_name: customer.full_name,
        email: customer.email,
        phone: customer.phone,
        role: customer.role,
        email_verified: !!customer.email_verified_at, // Convert to boolean
        created_at: customer.created_at,
        last_sign_in_at: customer.last_login_at,
        // Statistics
        total_bookings: stats.total_bookings,
        completed_bookings: stats.completed_bookings,
        cancelled_bookings: stats.cancelled_bookings,
        total_spent_pence: stats.total_spent_pence,
        avg_booking_value_pence: stats.avg_booking_value_pence,
        first_booking_date: stats.first_booking_date,
        last_booking_date: stats.last_booking_date,
        vehicle_count: vehicleCount,
        reward_points: points,
        reward_tier: tier,
        // Status - use database is_active field primarily, with login fallback
        is_active: customer.is_active !== false && (customer.last_login_at ? 
          (Date.now() - new Date(customer.last_login_at).getTime()) < (90 * 24 * 60 * 60 * 1000) : // 90 days
          true), // If never logged in but active, show as active
        last_activity_date: customer.last_login_at
      }
    }) || []

    // Calculate overall statistics
    const overallStats = {
      total_customers: transformedCustomers.length,
      active_customers: transformedCustomers.filter(c => c.is_active).length,
      verified_customers: transformedCustomers.filter(c => c.email_verified).length,
      total_bookings: transformedCustomers.reduce((sum, c) => sum + c.total_bookings, 0),
      total_revenue_pence: transformedCustomers.reduce((sum, c) => sum + c.total_spent_pence, 0),
      avg_customer_value_pence: transformedCustomers.length > 0 
        ? transformedCustomers.reduce((sum, c) => sum + c.total_spent_pence, 0) / transformedCustomers.length
        : 0,
      top_tier_customers: transformedCustomers.filter(c => c.reward_tier === 'gold').length
    }

    return NextResponse.json({ 
      data: {
        customers: transformedCustomers,
        stats: overallStats
      }
    })
  } catch (error) {
    console.error('API /admin/customers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}