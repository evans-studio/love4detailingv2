import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params
    console.log(`🔍 Fetching booking details for ID: ${bookingId}`)
    
    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Query specific booking with all relationships
    const { data: booking, error } = await supabase
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
      .eq('id', bookingId)
      .single()
    
    if (error) {
      console.error('❌ Database query error:', error)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }
    
    console.log(`✅ Found booking: ${booking.booking_reference}`)
    
    // Transform booking data with all relationships
    const transformedBooking = {
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
      
      // Time slot info from available_slots relationship
      appointment_date: (booking as any).available_slots?.slot_date || null,
      appointment_time: (booking as any).available_slots?.start_time || null,
      slot_end_time: (booking as any).available_slots?.end_time || null,
      service_duration: (booking as any).available_slots?.start_time && (booking as any).available_slots?.end_time 
        ? calculateDuration((booking as any).available_slots.start_time, (booking as any).available_slots.end_time)
        : null,
      
      // Service info from services relationship
      service_name: (booking as any).services?.name || 'Service',
      service_code: (booking as any).services?.code || 'SVC',
      service_id: booking.service_id,
      service_description: (booking as any).services?.description || '',
      
      // Vehicle info from vehicles relationship
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
      
      // Customer info
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      
      // Service location
      service_location: booking.service_location || 'Service location not specified',
      
      // Additional fields
      payment_method: booking.payment_method || 'cash',
      is_anonymous: !booking.user_id
    }
    
    console.log(`✅ Returning booking details for ${booking.booking_reference}`)
    
    return NextResponse.json({ 
      data: transformedBooking
    })
    
  } catch (error) {
    console.error('❌ API /admin/bookings/[bookingId] error:', error)
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