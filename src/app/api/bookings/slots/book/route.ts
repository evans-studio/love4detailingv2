import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { z } from 'zod'

const bookSlotSchema = z.object({
  slotId: z.string().uuid(),
  bookingId: z.string().uuid(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sessionId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const body = await request.json()
    
    // Validate request body
    const validatedData = bookSlotSchema.parse(body)
    
    // Update the slot to mark it as booked (replacing removed stored procedure)
    const { data, error } = await supabase
      .from('available_slots')
      .update({ 
        current_bookings: 1,
        is_blocked: true 
      })
      .eq('id', validatedData.slotId)
      .select()
      .single()

    if (error) {
      console.error('Error booking slot:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to book slot' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Slot booked successfully',
      booking_id: validatedData.bookingId,
      slot_id: validatedData.slotId
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { searchParams } = new URL(request.url)
    
    const slotBookingId = searchParams.get('slot_booking_id')
    const reason = searchParams.get('reason')
    
    if (!slotBookingId) {
      return NextResponse.json(
        { error: 'slot_booking_id is required' },
        { status: 400 }
      )
    }

    // Cancel slot booking by resetting availability (replacing removed stored procedure)
    const { data, error } = await supabase
      .from('available_slots')
      .update({ 
        current_bookings: 0,
        is_blocked: false 
      })
      .eq('id', slotBookingId)
      .select()
      .single()

    if (error) {
      console.error('Error cancelling slot booking:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Slot booking cancelled successfully'
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}