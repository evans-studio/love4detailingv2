import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/admin/bookings/history - Get booking history with filtering
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin booking history GET called')
    
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
        startDate = new Date('2020-01-01') // Far back date
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }

    console.log('🔍 Fetching booking history for range:', { range, startDate, endDate })

    // Get bookings with basic info
    let query = supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        status,
        total_price_pence,
        customer_name,
        customer_email,
        customer_phone,
        service_id,
        vehicle_id,
        service_location,
        created_at,
        updated_at,
        completed_at,
        cancelled_at
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })

    const { data: bookings, error: bookingsError } = await query

    if (bookingsError) {
      console.error('❌ Error fetching booking history:', bookingsError)
      return NextResponse.json(
        { error: 'Failed to fetch booking history', details: bookingsError.message },
        { status: 500 }
      )
    }

    console.log('📊 Found booking history:', bookings?.length || 0)

    if (!bookings || bookings.length === 0) {
      const result = {
        success: true,
        bookings: [],
        stats: {
          total_bookings: 0,
          completed_bookings: 0,
          cancelled_bookings: 0,
          pending_bookings: 0,
          total_revenue_pence: 0,
          avg_booking_value_pence: 0
        },
        range,
        generated_at: new Date().toISOString()
      }

      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // Get related data
    const serviceIds = [...new Set(bookings.map(b => b.service_id).filter(Boolean))]
    const vehicleIds = [...new Set(bookings.map(b => b.vehicle_id).filter(Boolean))]

    // Fetch services and vehicles
    const [servicesResult, vehiclesResult] = await Promise.all([
      serviceIds.length > 0 ? supabase.from('services').select('id, name').in('id', serviceIds) : { data: [] },
      vehicleIds.length > 0 ? supabase.from('vehicles').select('id, make, model, registration').in('id', vehicleIds) : { data: [] }
    ])

    // Create lookup maps
    const servicesMap = new Map((servicesResult.data || []).map(s => [s.id, s]))
    const vehiclesMap = new Map((vehiclesResult.data || []).map(v => [v.id, v]))

    // Combine data
    const enrichedBookings = bookings.map(booking => ({
      id: booking.id,
      booking_reference: booking.booking_reference,
      customer_name: booking.customer_name || 'Unknown',
      customer_email: booking.customer_email || '',
      customer_phone: booking.customer_phone || '',
      service_name: servicesMap.get(booking.service_id)?.name || 'Unknown Service',
      vehicle_make: vehiclesMap.get(booking.vehicle_id)?.make || 'Unknown',
      vehicle_model: vehiclesMap.get(booking.vehicle_id)?.model || '',
      vehicle_reg: vehiclesMap.get(booking.vehicle_id)?.registration || '',
      service_location: booking.service_location || 'Service location not specified',
      status: booking.status,
      total_price_pence: booking.total_price_pence,
      created_at: booking.created_at,
      completed_at: booking.completed_at,
      cancelled_at: booking.cancelled_at
    }))

    // Calculate stats
    const stats = {
      total_bookings: bookings.length,
      completed_bookings: bookings.filter(b => b.status === 'completed').length,
      cancelled_bookings: bookings.filter(b => b.status === 'cancelled').length,
      pending_bookings: bookings.filter(b => b.status === 'pending').length,
      total_revenue_pence: bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_price_pence || 0), 0),
      avg_booking_value_pence: bookings.length > 0 
        ? Math.round(bookings.reduce((sum, b) => sum + (b.total_price_pence || 0), 0) / bookings.length)
        : 0
    }

    const result = {
      success: true,
      bookings: enrichedBookings,
      stats,
      range,
      generated_at: new Date().toISOString()
    }

    console.log('✅ Booking history fetched successfully:', {
      bookings_count: result.bookings.length,
      stats: result.stats
    })

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Admin booking history GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}