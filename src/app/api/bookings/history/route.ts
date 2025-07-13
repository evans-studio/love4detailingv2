import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Supabase auth error:', userError)
      return NextResponse.json(
        { error: 'Authentication error', details: userError.message },
        { status: 401 }
      )
    }
    
    if (!user) {
      console.error('No user session found')
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      )
    }

    console.log('API: User authenticated:', user.id, user.email)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('API: Query parameters - limit:', limit, 'offset:', offset)

    // Direct SQL query for user bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        status,
        payment_status,
        total_price_pence,
        customer_email,
        customer_name,
        customer_phone,
        customer_instructions,
        notes,
        created_at,
        updated_at,
        confirmed_at,
        completed_at,
        cancelled_at,
        available_slots (
          slot_date,
          start_time,
          end_time
        ),
        services (
          name,
          code,
          base_duration_minutes
        ),
        vehicles (
          registration,
          make,
          model,
          year,
          color,
          size
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    console.log('API: Query completed. Data:', bookings?.length || 0, 'bookings. Error:', error?.message || 'none')

    if (error) {
      console.error('Direct SQL query error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json({ 
        error: error.message, 
        details: error.details,
        hint: error.hint,
        code: error.code 
      }, { status: 500 })
    }

    // Transform data to match expected format
    const transformedBookings = (bookings || []).map((booking: any) => ({
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      booking_status: booking.status,
      payment_status: booking.payment_status,
      total_price_pence: booking.total_price_pence,
      special_instructions: booking.special_requests,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      confirmed_at: booking.confirmed_at,
      completed_at: booking.completed_at,
      cancelled_at: booking.cancelled_at,
      
      // Time slot info
      appointment_date: booking.available_slots?.slot_date,
      appointment_time: booking.available_slots?.start_time,
      slot_end_time: booking.available_slots?.end_time,
      service_duration: booking.services?.base_duration_minutes || 120,
      
      // Service info
      service_name: booking.services?.name,
      service_code: booking.services?.code,
      
      // Vehicle info
      vehicle_registration: booking.vehicles?.registration,
      vehicle_make: booking.vehicles?.make,
      vehicle_model: booking.vehicles?.model,
      vehicle_year: booking.vehicles?.year,
      vehicle_color: booking.vehicles?.color,
      vehicle_size: booking.vehicles?.size,
      
      // Customer info
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      
      // Additional fields for component compatibility
      service_location: 'Customer Address',
      notes: booking.customer_instructions || booking.notes
    }))

    return NextResponse.json({ data: transformedBookings })
  } catch (error) {
    console.error('API /bookings/history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}