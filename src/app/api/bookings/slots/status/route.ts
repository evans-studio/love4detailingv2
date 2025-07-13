import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { searchParams } = new URL(request.url)
    
    const slotId = searchParams.get('slot_id')
    
    if (!slotId) {
      return NextResponse.json(
        { error: 'slot_id is required' },
        { status: 400 }
      )
    }

    // Get slot status by querying the table directly (replacing removed stored procedure)
    const { data, error } = await supabase
      .from('available_slots')
      .select('*')
      .eq('id', slotId)
      .single()

    if (error) {
      console.error('Error getting slot status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      )
    }

    // Transform the data to match frontend expectations
    const transformedData = {
      id: data.id,
      date: data.slot_date,
      startTime: data.start_time,
      endTime: data.end_time,
      status: data.is_blocked ? 'blocked' : ((data.current_bookings || 0) >= (data.max_bookings || 1) ? 'booked' : 'available'),
      availableCapacity: Math.max(0, (data.max_bookings || 1) - (data.current_bookings || 0)),
      totalCapacity: data.max_bookings || 1,
      currentBookings: data.current_bookings || 0,
      isBlocked: data.is_blocked || false,
      blockReason: null,
      bookingWindowOpen: true,
      timeUntilSlot: 0
    }

    return NextResponse.json({ data: transformedData })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}