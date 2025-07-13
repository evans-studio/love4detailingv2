import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/admin/schedule/slots - Get time slots for admin management
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin schedule slots GET called')
    
    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    console.log('🔍 Fetching slots for date range:', { startDate, endDate })

    // Get time slots with booking information
    const { data: slots, error: slotsError } = await supabase
      .from('time_slots')
      .select(`
        id,
        date,
        start_time,
        end_time,
        is_available,
        is_booked,
        booking_id,
        created_at,
        updated_at
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (slotsError) {
      console.error('❌ Error fetching time slots:', slotsError)
      return NextResponse.json(
        { error: 'Failed to fetch time slots', details: slotsError.message },
        { status: 500 }
      )
    }

    console.log('📊 Found time slots:', slots?.length || 0)

    // Get booking references for booked slots
    const bookedSlotIds = slots?.filter(slot => slot.is_booked && slot.booking_id).map(slot => slot.booking_id) || []
    
    let bookingDetails = new Map()
    if (bookedSlotIds.length > 0) {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          customer_name,
          customer_email,
          service_id,
          services:service_id (
            name
          )
        `)
        .in('id', bookedSlotIds)

      if (!bookingsError && bookings) {
        bookings.forEach(booking => {
          bookingDetails.set(booking.id, {
            booking_reference: booking.booking_reference,
            customer_name: booking.customer_name,
            customer_email: booking.customer_email,
            service_name: booking.services?.name || 'Unknown Service'
          })
        })
      }
    }

    // Enrich slots with booking details
    const enrichedSlots = slots?.map(slot => {
      const booking = slot.booking_id ? bookingDetails.get(slot.booking_id) : null
      
      return {
        id: slot.id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available,
        is_booked: slot.is_booked,
        booking_id: slot.booking_id,
        booking_reference: booking?.booking_reference || null,
        customer_name: booking?.customer_name || null,
        customer_email: booking?.customer_email || null,
        service_name: booking?.service_name || null,
        created_at: slot.created_at,
        updated_at: slot.updated_at
      }
    }) || []

    const result = {
      success: true,
      slots: enrichedSlots,
      date_range: { start_date: startDate, end_date: endDate },
      total_slots: enrichedSlots.length,
      available_slots: enrichedSlots.filter(s => s.is_available && !s.is_booked).length,
      booked_slots: enrichedSlots.filter(s => s.is_booked).length,
      unavailable_slots: enrichedSlots.filter(s => !s.is_available).length,
      generated_at: new Date().toISOString()
    }

    console.log('✅ Time slots fetched successfully:', {
      total: result.total_slots,
      available: result.available_slots,
      booked: result.booked_slots,
      unavailable: result.unavailable_slots
    })

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Admin schedule slots GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/schedule/slots - Create or update time slots
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Admin schedule slots POST called')
    
    const body = await request.json()
    const { action, ...data } = body

    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    switch (action) {
      case 'generate_slots': {
        const { start_date, end_date, start_time, end_time, slot_duration_minutes, days_of_week } = data

        if (!start_date || !end_date || !start_time || !end_time || !slot_duration_minutes) {
          return NextResponse.json(
            { error: 'Missing required fields for slot generation' },
            { status: 400 }
          )
        }

        // Generate time slots for the specified date range
        const slots = []
        const current = new Date(start_date)
        const endDateObj = new Date(end_date)

        while (current <= endDateObj) {
          const dayOfWeek = current.getDay()
          
          // Check if this day should have slots generated
          if (!days_of_week || days_of_week.includes(dayOfWeek)) {
            const dateStr = current.toISOString().split('T')[0]
            
            // Generate slots for this day
            const startHour = parseInt(start_time.split(':')[0])
            const startMinute = parseInt(start_time.split(':')[1])
            const endHour = parseInt(end_time.split(':')[0])
            const endMinute = parseInt(end_time.split(':')[1])
            
            let slotStart = new Date(current)
            slotStart.setHours(startHour, startMinute, 0, 0)
            
            const dayEnd = new Date(current)
            dayEnd.setHours(endHour, endMinute, 0, 0)
            
            while (slotStart < dayEnd) {
              const slotEnd = new Date(slotStart.getTime() + (slot_duration_minutes * 60 * 1000))
              
              if (slotEnd <= dayEnd) {
                slots.push({
                  date: dateStr,
                  start_time: slotStart.toTimeString().slice(0, 8),
                  end_time: slotEnd.toTimeString().slice(0, 8),
                  is_available: true,
                  is_booked: false
                })
              }
              
              slotStart = new Date(slotEnd)
            }
          }
          
          current.setDate(current.getDate() + 1)
        }

        // Insert slots into database
        const { data: insertedSlots, error: insertError } = await supabase
          .from('time_slots')
          .insert(slots)
          .select()

        if (insertError) {
          console.error('❌ Error inserting time slots:', insertError)
          return NextResponse.json(
            { error: 'Failed to generate time slots', details: insertError.message },
            { status: 500 }
          )
        }

        console.log('✅ Generated time slots:', insertedSlots?.length || 0)

        return NextResponse.json({
          success: true,
          message: `Generated ${insertedSlots?.length || 0} time slots`,
          slots: insertedSlots
        })
      }

      case 'update_slot': {
        const { slot_id, is_available, is_booked } = data

        if (!slot_id) {
          return NextResponse.json(
            { error: 'Slot ID is required' },
            { status: 400 }
          )
        }

        const updateData: any = {}
        if (typeof is_available === 'boolean') updateData.is_available = is_available
        if (typeof is_booked === 'boolean') updateData.is_booked = is_booked
        updateData.updated_at = new Date().toISOString()

        const { data: updatedSlot, error: updateError } = await supabase
          .from('time_slots')
          .update(updateData)
          .eq('id', slot_id)
          .select()
          .single()

        if (updateError) {
          console.error('❌ Error updating time slot:', updateError)
          return NextResponse.json(
            { error: 'Failed to update time slot', details: updateError.message },
            { status: 500 }
          )
        }

        console.log('✅ Updated time slot:', updatedSlot?.id)

        return NextResponse.json({
          success: true,
          message: 'Time slot updated successfully',
          slot: updatedSlot
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Admin schedule slots POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/schedule/slots - Delete time slots
export async function DELETE(request: NextRequest) {
  try {
    console.log('🔍 Admin schedule slots DELETE called')
    
    const { searchParams } = new URL(request.url)
    const slotId = searchParams.get('slot_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (slotId) {
      // Delete single slot
      const { error: deleteError } = await supabase
        .from('time_slots')
        .delete()
        .eq('id', slotId)
        .eq('is_booked', false) // Only delete unbooked slots

      if (deleteError) {
        console.error('❌ Error deleting time slot:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete time slot', details: deleteError.message },
          { status: 500 }
        )
      }

      console.log('✅ Deleted time slot:', slotId)

      return NextResponse.json({
        success: true,
        message: 'Time slot deleted successfully'
      })

    } else if (startDate && endDate) {
      // Delete range of slots
      const { error: deleteError } = await supabase
        .from('time_slots')
        .delete()
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('is_booked', false) // Only delete unbooked slots

      if (deleteError) {
        console.error('❌ Error deleting time slots:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete time slots', details: deleteError.message },
          { status: 500 }
        )
      }

      console.log('✅ Deleted time slots for date range:', { startDate, endDate })

      return NextResponse.json({
        success: true,
        message: 'Time slots deleted successfully'
      })

    } else {
      return NextResponse.json(
        { error: 'Either slot_id or start_date and end_date are required' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Admin schedule slots DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}