import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Direct SQL query for user bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        status,
        payment_status,
        total_price_pence,
        special_requests,
        created_at,
        updated_at,
        confirmed_at,
        completed_at,
        cancelled_at,
        time_slots (
          slot_date,
          start_time,
          end_time,
          duration_minutes
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
        ),
        users (
          full_name,
          email,
          phone
        )
      `)
      .eq('customer_user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Direct SQL query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
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
      appointment_date: booking.time_slots?.slot_date,
      appointment_time: booking.time_slots?.start_time,
      slot_end_time: booking.time_slots?.end_time,
      service_duration: booking.time_slots?.duration_minutes || booking.services?.base_duration_minutes,
      
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
      customer_name: booking.users?.full_name,
      customer_email: booking.users?.email,
      customer_phone: booking.users?.phone,
      
      // Additional fields for component compatibility
      service_location: 'Customer Address',
      notes: booking.special_requests
    }))

    return NextResponse.json({ data: transformedBookings })
  } catch (error) {
    console.error('API /bookings/history-direct error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}