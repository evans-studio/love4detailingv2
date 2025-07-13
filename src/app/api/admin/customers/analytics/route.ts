import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/admin/customers/analytics - Get customer analytics
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin customer analytics GET called')
    
    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('admin_id')
    const range = searchParams.get('range') || '30d'

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID required' },
        { status: 400 }
      )
    }

    // Calculate date range
    const endDate = new Date()
    let startDate = new Date()
    
    switch (range) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      case 'all':
        startDate = new Date('2020-01-01')
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }

    console.log('🔍 Fetching customer analytics for range:', { range, startDate, endDate })

    // Get basic customer data
    const { data: customers, error: customersError } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        email,
        phone,
        role,
        is_active,
        email_verified_at,
        created_at,
        last_sign_in_at
      `)
      .eq('role', 'user')

    if (customersError) {
      console.error('❌ Error fetching customers:', customersError)
      return NextResponse.json(
        { error: 'Failed to fetch customer data', details: customersError.message },
        { status: 500 }
      )
    }

    // Get booking data
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        status,
        total_price_pence,
        service_id,
        created_at,
        completed_at
      `)
      .gte('created_at', startDate.toISOString())

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
      return NextResponse.json(
        { error: 'Failed to fetch booking data', details: bookingsError.message },
        { status: 500 }
      )
    }

    // Get services data
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name')

    if (servicesError) {
      console.error('❌ Error fetching services:', servicesError)
    }

    console.log('📊 Found data:', {
      customers: customers?.length || 0,
      bookings: bookings?.length || 0,
      services: services?.length || 0
    })

    // Calculate analytics
    const totalCustomers = customers?.length || 0
    const activeCustomers = customers?.filter(c => c.is_active).length || 0
    const verifiedCustomers = customers?.filter(c => c.email_verified_at).length || 0

    // Calculate new customers this month
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)
    const newCustomersThisMonth = customers?.filter(c => 
      new Date(c.created_at) >= thisMonth
    ).length || 0

    // Customer lifetime value calculation
    const customerBookings = new Map()
    bookings?.forEach(booking => {
      const userId = booking.user_id
      if (!customerBookings.has(userId)) {
        customerBookings.set(userId, { count: 0, totalSpent: 0, bookings: [] })
      }
      const customerData = customerBookings.get(userId)
      customerData.count++
      customerData.totalSpent += booking.total_price_pence || 0
      customerData.bookings.push(booking)
    })

    const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_price_pence || 0), 0) || 0
    const avgCustomerLifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0

    // Calculate repeat customers
    const repeatCustomers = Array.from(customerBookings.values()).filter(data => data.count > 1).length
    const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0

    // Find most popular service
    const serviceBookings = new Map()
    bookings?.forEach(booking => {
      const serviceId = booking.service_id
      if (serviceId) {
        serviceBookings.set(serviceId, (serviceBookings.get(serviceId) || 0) + 1)
      }
    })

    let mostPopularServiceId = null
    let maxBookings = 0
    serviceBookings.forEach((count, serviceId) => {
      if (count > maxBookings) {
        maxBookings = count
        mostPopularServiceId = serviceId
      }
    })

    const mostPopularService = services?.find(s => s.id === mostPopularServiceId)?.name || 'No data'

    // Calculate engagement metrics
    const avgBookingsPerCustomer = totalCustomers > 0 ? (bookings?.length || 0) / totalCustomers : 0
    
    // Top spenders
    const topSpenders = Array.from(customerBookings.entries())
      .map(([userId, data]) => {
        const customer = customers?.find(c => c.id === userId)
        return {
          name: customer?.full_name || 'Unknown',
          email: customer?.email || '',
          total_spent_pence: data.totalSpent,
          bookings_count: data.count
        }
      })
      .sort((a, b) => b.total_spent_pence - a.total_spent_pence)
      .slice(0, 10)

    // Calculate monthly growth (simplified)
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const customersLastMonth = customers?.filter(c => 
      new Date(c.created_at) >= lastMonth
    ).length || 0
    const monthlyGrowthRate = totalCustomers > 0 ? (customersLastMonth / totalCustomers) * 100 : 0

    // Mock tier data (would need actual tier logic)
    const tierDistribution = {
      bronze: Math.floor(totalCustomers * 0.7),
      silver: Math.floor(totalCustomers * 0.25),
      gold: Math.floor(totalCustomers * 0.05)
    }

    // Activity levels (simplified)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const active7d = customers?.filter(c => 
      c.last_sign_in_at && new Date(c.last_sign_in_at) >= sevenDaysAgo
    ).length || 0

    const active30d = customers?.filter(c => 
      c.last_sign_in_at && new Date(c.last_sign_in_at) >= thirtyDaysAgo
    ).length || 0

    const dormant = totalCustomers - active30d

    const analytics = {
      overview: {
        total_customers: totalCustomers,
        active_customers: activeCustomers,
        new_customers_this_month: newCustomersThisMonth,
        returning_customers: repeatCustomers,
        churn_rate: 5.2, // Mock data
        avg_customer_lifetime_value_pence: Math.round(avgCustomerLifetimeValue)
      },
      demographics: {
        by_tier: tierDistribution,
        by_activity: {
          active_7d: active7d,
          active_30d: active30d,
          dormant: dormant
        },
        by_registration: {
          email_verified: verifiedCustomers,
          phone_verified: Math.floor(totalCustomers * 0.8), // Mock
          profile_complete: Math.floor(totalCustomers * 0.9) // Mock
        }
      },
      engagement: {
        avg_bookings_per_customer: avgBookingsPerCustomer,
        avg_days_between_bookings: 30, // Mock data
        most_popular_service: mostPopularService,
        peak_booking_day: 'Saturday', // Mock data
        repeat_customer_rate: repeatCustomerRate
      },
      revenue: {
        total_revenue_pence: totalRevenue,
        avg_order_value_pence: bookings?.length > 0 ? Math.round(totalRevenue / bookings.length) : 0,
        revenue_per_customer_pence: Math.round(avgCustomerLifetimeValue),
        top_spenders: topSpenders
      },
      trends: {
        monthly_growth_rate: monthlyGrowthRate,
        booking_frequency_trend: 'Increasing', // Mock data
        seasonal_patterns: ['Summer peak', 'Holiday surge'] // Mock data
      }
    }

    const result = {
      success: true,
      analytics,
      range,
      generated_at: new Date().toISOString()
    }

    console.log('✅ Customer analytics calculated successfully')

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Admin customer analytics GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}