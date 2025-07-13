import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Extract UK postcode from address string
function extractPostcode(address: string): string {
  if (!address) return ''
  
  // UK postcode regex - matches most UK postcode formats
  const postcodeRegex = /([A-Z]{1,2}[0-9R][0-9A-Z]?\s?[0-9][A-Z]{2})/gi
  const match = address.match(postcodeRegex)
  
  return match ? match[match.length - 1].trim() : ''
}

// GET /api/admin/bookings/dashboard - Get admin booking dashboard data
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin booking dashboard GET called')
    
    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('admin_id')
    const dateFilter = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const statusFilter = searchParams.get('status') || null

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID required' },
        { status: 400 }
      )
    }

    console.log('🔍 Fetching dashboard data with params:', {
      admin_id: adminId,
      date_filter: dateFilter,
      status_filter: statusFilter
    })

    // Get today's bookings with slot information
    // First, get slots for the specified date
    const { data: todaySlots, error: slotsError } = await supabase
      .from('available_slots')
      .select('id, slot_date, start_time, end_time')
      .eq('slot_date', dateFilter)
    
    if (slotsError) {
      console.error('❌ Error fetching slots for date:', slotsError)
      return NextResponse.json(
        { error: 'Failed to fetch schedule data', details: slotsError.message },
        { status: 500 }
      )
    }
    
    console.log('📅 Found slots for date:', dateFilter, todaySlots?.length || 0)
    
    // If no slots exist for today, return empty result
    if (!todaySlots || todaySlots.length === 0) {
      const result = {
        success: true,
        date_filter: dateFilter,
        today_bookings: [],
        daily_stats: {
          total_bookings: 0,
          confirmed_bookings: 0,
          completed_bookings: 0,
          pending_bookings: 0,
          total_revenue_pence: 0,
          avg_booking_value_pence: 0
        },
        generated_at: new Date().toISOString()
      }
      
      console.log('✅ No slots found for date:', dateFilter)
      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
    // Get slot IDs for today
    const todaySlotIds = todaySlots.map(slot => slot.id)
    
    // Now get bookings for today's slots
    let query = supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        status,
        total_price_pence,
        customer_instructions,
        created_at,
        updated_at,
        user_id,
        service_id,
        vehicle_id,
        slot_id,
        customer_name,
        customer_email,
        customer_phone,
        service_location
      `)
      .in('slot_id', todaySlotIds)
      .not('status', 'in', '(cancelled)')
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: bookings, error: bookingsError } = await query

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
      return NextResponse.json(
        { error: 'Failed to fetch bookings', details: bookingsError.message },
        { status: 500 }
      )
    }

    console.log('📊 Found bookings:', bookings?.length || 0)

    // If no bookings, return empty result
    if (!bookings || bookings.length === 0) {
      const result = {
        success: true,
        date_filter: dateFilter,
        today_bookings: [],
        daily_stats: {
          total_bookings: 0,
          confirmed_bookings: 0,
          completed_bookings: 0,
          pending_bookings: 0,
          total_revenue_pence: 0,
          avg_booking_value_pence: 0
        },
        generated_at: new Date().toISOString()
      }

      console.log('✅ No bookings found for date:', dateFilter)
      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // Get related data
    const userIds = [...new Set(bookings.map(b => b.user_id).filter(Boolean))]
    const serviceIds = [...new Set(bookings.map(b => b.service_id).filter(Boolean))]
    const vehicleIds = [...new Set(bookings.map(b => b.vehicle_id).filter(Boolean))]

    // Fetch users, services, and vehicles
    const [usersResult, servicesResult, vehiclesResult] = await Promise.all([
      userIds.length > 0 ? supabase.from('users').select('id, full_name, email, phone').in('id', userIds) : { data: [] },
      serviceIds.length > 0 ? supabase.from('services').select('id, name').in('id', serviceIds) : { data: [] },
      vehicleIds.length > 0 ? supabase.from('vehicles').select('id, make, model, size, registration').in('id', vehicleIds) : { data: [] }
    ])

    // Create lookup maps
    const usersMap = new Map((usersResult.data || []).map(u => [u.id, u]))
    const servicesMap = new Map((servicesResult.data || []).map(s => [s.id, s]))
    const vehiclesMap = new Map((vehiclesResult.data || []).map(v => [v.id, v]))

    // Get slot information for bookings that have slot_id
    const slotIds = [...new Set(bookings.map(b => b.slot_id).filter(Boolean))]
    const slotsResult = slotIds.length > 0 
      ? await supabase.from('available_slots').select('id, slot_date, start_time, end_time').in('id', slotIds)
      : { data: [] }
    
    const slotsMap = new Map((slotsResult.data || []).map(s => [s.id, s]))

    // Combine data - get scheduling info from slots if available, fallback to created date
    const enrichedBookings = bookings.map(booking => {
      const slot = slotsMap.get(booking.slot_id)
      
      console.log(`📅 Booking ${booking.booking_reference} slot lookup:`, {
        slot_id: booking.slot_id,
        found_slot: !!slot,
        slot_date: slot?.slot_date,
        slot_time: slot?.start_time,
        fallback_date: booking.created_at?.split('T')[0]
      })
      
      return {
        id: booking.id,
        booking_reference: booking.booking_reference,
        scheduled_date: slot?.slot_date || booking.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        scheduled_time: slot?.start_time?.substring(0, 5) || '10:00',
        scheduled_end_time: slot?.end_time?.substring(0, 5) || '12:00',
        slot_found: !!slot, // Add flag to indicate if slot was found
        status: booking.status,
        total_price_pence: booking.total_price_pence,
        customer: {
          full_name: booking.customer_name || 'Unknown',
          email: booking.customer_email || '',
          phone: booking.customer_phone || ''
        },
        service: servicesMap.get(booking.service_id) || { name: 'Unknown Service', duration_minutes: 120 },
        vehicle: vehiclesMap.get(booking.vehicle_id) || { make: 'Unknown', model: '', registration: '', size: 'medium' },
        address: {
          full_address: booking.service_location || 'Service location not specified',
          postcode: ''
        },
        special_instructions: booking.customer_instructions,
        created_at: booking.created_at,
        updated_at: booking.updated_at
      }
    })

    // Get basic stats
    const stats = {
      total_bookings: bookings.length,
      confirmed_bookings: bookings.filter(b => b.status === 'confirmed').length,
      completed_bookings: bookings.filter(b => b.status === 'completed').length,
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
      date_filter: dateFilter,
      today_bookings: enrichedBookings,
      daily_stats: stats,
      generated_at: new Date().toISOString()
    }

    console.log('✅ Admin booking dashboard data fetched successfully:', {
      bookings_count: result.today_bookings.length,
      stats: result.daily_stats
    })

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Admin booking dashboard GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}