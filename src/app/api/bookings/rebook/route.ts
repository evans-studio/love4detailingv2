import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { BookingProcedures } from '@/lib/database/procedures'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { originalBookingId, slotId } = await request.json()

    if (!originalBookingId || !slotId) {
      return NextResponse.json(
        { error: 'Original booking ID and slot ID are required' },
        { status: 400 }
      )
    }

    // Get the original booking details
    const { data: originalBooking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        user_id,
        services (
          id,
          name,
          code
        ),
        vehicles (
          id,
          registration,
          make,
          model,
          year,
          color,
          size
        )
      `)
      .eq('id', originalBookingId)
      .eq('user_id', user.id)
      .single()

    if (bookingError || !originalBooking) {
      return NextResponse.json(
        { error: 'Original booking not found or access denied' },
        { status: 404 }
      )
    }

    // Check if the slot is available
    const { data: slotData, error: slotError } = await supabase
      .from('available_slots')
      .select('*')
      .eq('id', slotId)
      .single()

    if (slotError || !slotData) {
      return NextResponse.json(
        { error: 'Selected time slot not found' },
        { status: 404 }
      )
    }

    // Check for existing bookings at this slot
    const { data: existingBookings, error: conflictError } = await supabase
      .from('bookings')
      .select('id')
      .eq('available_slot_id', slotId)
      .in('status', ['confirmed', 'pending'])

    if (conflictError) {
      return NextResponse.json(
        { error: 'Error checking slot availability' },
        { status: 500 }
      )
    }

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json(
        { error: `Time slot ${slotData.start_time} on ${slotData.slot_date} is already booked. Please select a different time.` },
        { status: 409 }
      )
    }

    // Create new booking transaction
    const bookingTransaction = {
      customer_data: {
        email: user.email!,
        name: user.user_metadata?.full_name || user.email!,
        phone: user.user_metadata?.phone || '',
        user_id: user.id
      },
      vehicle_data: {
        id: (originalBooking as any).vehicles?.id || null,
        registration: (originalBooking as any).vehicles?.registration || 'N/A',
        make: (originalBooking as any).vehicles?.make || 'Unknown',
        model: (originalBooking as any).vehicles?.model || 'Vehicle',
        year: (originalBooking as any).vehicles?.year || new Date().getFullYear(),
        color: (originalBooking as any).vehicles?.color || '',
        size: (originalBooking as any).vehicles?.size || 'medium'
      },
      booking_data: {
        slot_id: slotId,
        service_id: (originalBooking as any).services?.id || '6856143e-eb1d-4776-bf6b-3f6149f36901',
        payment_method: 'cash' as const,
        add_ons: []
      }
    }

    // Process the booking transaction
    const { data: result, error: transactionError } = await BookingProcedures.processBookingTransaction(bookingTransaction)

    if (transactionError || !result) {
      return NextResponse.json(
        { error: transactionError?.message || 'Failed to create rebooking' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        id: result.booking_id,
        reference: result.booking_reference,
        message: result.message
      }
    })
  } catch (error) {
    console.error('API /bookings/rebook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}