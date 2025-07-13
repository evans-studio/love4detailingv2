import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin bookings API called')
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('✅ Service role client created')

    // Query real bookings with relationships to get complete data
    console.log('🔍 Querying bookings with relationships...')
    let query = supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        user_id,
        status,
        total_price_pence,
        service_price_pence,
        created_at,
        updated_at,
        confirmed_at,
        completed_at,
        cancelled_at,
        customer_name,
        customer_email,
        customer_phone,
        customer_instructions,
        notes,
        payment_method,
        payment_status,
        vehicle_id,
        service_id,
        slot_id,
        service_location,
        vehicles(
          id,
          registration,
          make,
          model,
          year,
          color,
          size
        ),
        services(
          id,
          name,
          code,
          description
        ),
        available_slots(
          id,
          slot_date,
          start_time,
          end_time
        )
      `)
    
    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    // Apply date filters
    if (dateFrom) {
      query = query.gte('service_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('service_date', dateTo)
    }
    
    // Apply search filter (will be done client-side for simplicity)
    query = query.order('created_at', { ascending: false })
    
    const { data: bookings, error } = await query.range(offset, offset + limit - 1)
    
    if (error) {
      console.error('❌ Database query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }
    
    console.log(`✅ Fetched ${bookings?.length || 0} bookings from database`)
    
    // Transform data using real database relationships
    const transformedBookings = bookings?.map(booking => ({
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      user_id: booking.user_id,
      booking_status: booking.status,
      payment_status: booking.payment_status || 'pending',
      total_price_pence: booking.total_price_pence,
      service_price_pence: booking.service_price_pence,
      special_instructions: booking.customer_instructions || '',
      notes: booking.notes || '',
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      confirmed_at: booking.confirmed_at,
      completed_at: booking.completed_at,
      cancelled_at: booking.cancelled_at,
      
      // Real time slot info from available_slots relationship
      appointment_date: (booking as any).available_slots?.slot_date || null,
      appointment_time: (booking as any).available_slots?.start_time || null,
      slot_end_time: (booking as any).available_slots?.end_time || null,
      service_duration: (booking as any).available_slots?.start_time && (booking as any).available_slots?.end_time 
        ? calculateDuration((booking as any).available_slots.start_time, (booking as any).available_slots.end_time)
        : null,
      
      // Real service info from services relationship
      service_name: (booking as any).services?.name || 'Service',
      service_code: (booking as any).services?.code || 'SVC',
      service_id: booking.service_id,
      service_description: (booking as any).services?.description || '',
      
      // Real vehicle info from vehicles relationship
      vehicle_id: booking.vehicle_id,
      vehicle_registration: (booking as any).vehicles?.registration || 'N/A',
      vehicle_make: (booking as any).vehicles?.make || 'Unknown',
      vehicle_model: (booking as any).vehicles?.model || 'Vehicle',
      vehicle_year: (booking as any).vehicles?.year || null,
      vehicle_color: (booking as any).vehicles?.color || 'Unknown',
      vehicle_size: (booking as any).vehicles?.size || 'medium',
      vehicle_display_name: (booking as any).vehicles 
        ? `${(booking as any).vehicles.year || ''} ${(booking as any).vehicles.make || ''} ${(booking as any).vehicles.model || ''}`.trim() || 'Vehicle'
        : 'Vehicle',
      
      // Customer info from booking record
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      
      // User info (same as customer for direct bookings)
      user_full_name: booking.customer_name,
      user_email: booking.customer_email,
      user_phone: booking.customer_phone,
      
      // Service location information
      service_location: booking.service_location || 'Service location not specified',
      
      // Additional fields
      payment_method: booking.payment_method || 'cash',
      is_anonymous: !booking.user_id
    })) || []
    
    // Apply search filter client-side
    let filteredBookings = transformedBookings
    if (search) {
      const searchTerm = search.toLowerCase()
      filteredBookings = transformedBookings.filter(booking =>
        booking.booking_reference?.toLowerCase().includes(searchTerm) ||
        booking.customer_name?.toLowerCase().includes(searchTerm) ||
        booking.customer_email?.toLowerCase().includes(searchTerm) ||
        booking.vehicle_registration?.toLowerCase().includes(searchTerm)
      )
    }
    
    console.log(`✅ Returning ${filteredBookings.length} filtered bookings`)
    
    return NextResponse.json({ 
      data: {
        bookings: filteredBookings,
        total: filteredBookings.length,
        limit,
        offset
      }
    })
    
  } catch (error) {
    console.error('❌ API /admin/bookings error:', error)
    console.error('Error details:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate duration between time strings
function calculateDuration(startTime: string, endTime: string): number {
  try {
    const start = new Date(`1970-01-01T${startTime}`)
    const end = new Date(`1970-01-01T${endTime}`)
    const diffMs = end.getTime() - start.getTime()
    return Math.round(diffMs / (1000 * 60)) // Convert to minutes
  } catch (error) {
    return 120 // Default 2 hours if calculation fails
  }
}
