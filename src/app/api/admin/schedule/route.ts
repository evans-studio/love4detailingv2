import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/admin/schedule - Get admin weekly schedule and time slots
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin schedule GET called')
    
    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const adminId = searchParams.get('admin_id')

    console.log('🔍 Schedule params:', { startDate, endDate, adminId })

    // If date range is provided, fetch time slots for that period
    if (startDate && endDate) {
      console.log('🔍 Fetching time slots for date range:', { startDate, endDate })

      // Get time slots using simplified slot_status
      const { data: slots, error: slotsError } = await supabase
        .from('available_slots')
        .select(`
          id,
          slot_date,
          start_time,
          end_time,
          slot_status,
          created_at
        `)
        .gte('slot_date', startDate)
        .lte('slot_date', endDate)
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (slotsError) {
        console.error('❌ Error fetching time slots:', slotsError)
        return NextResponse.json(
          { error: 'Failed to fetch time slots', details: slotsError.message },
          { status: 500 }
        )
      }

      console.log('📊 Found time slots:', slots?.length || 0)

      // Note: This simplified schema doesn't directly link to bookings
      // Booking details would need to be fetched separately if needed

      // Use simplified slot_status instead of complex booking logic
      const enrichedSlots = slots?.map(slot => {
        const status = slot.slot_status || 'available' // Use existing slot_status column
        const isBooked = status === 'booked'
        const isAvailable = status === 'available'
        const isBlocked = status === 'blocked'
        
        return {
          id: slot.id,
          date: slot.slot_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          slot_status: status,
          is_available: isAvailable,
          is_booked: isBooked,
          is_blocked: isBlocked,
          booking_id: null, // This schema doesn't directly store booking_id
          booking_reference: null,
          customer_name: null,
          customer_email: null,
          service_name: null,
          created_at: slot.created_at
        }
      }) || []

      const result = {
        success: true,
        slots: enrichedSlots,
        date_range: { start_date: startDate, end_date: endDate },
        total_slots: enrichedSlots.length,
        available_slots: enrichedSlots.filter(s => s.slot_status === 'available').length,
        booked_slots: enrichedSlots.filter(s => s.slot_status === 'booked').length,
        blocked_slots: enrichedSlots.filter(s => s.slot_status === 'blocked').length,
        generated_at: new Date().toISOString()
      }

      console.log('✅ Schedule slots fetched successfully:', {
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
    }

    // If no date range, return basic schedule configuration
    // For now, return a simple working day template
    const weeklySchedule = [
      { day_of_week: 1, day_name: 'Monday', is_working_day: true, start_time: '09:00', end_time: '17:00' },
      { day_of_week: 2, day_name: 'Tuesday', is_working_day: true, start_time: '09:00', end_time: '17:00' },
      { day_of_week: 3, day_name: 'Wednesday', is_working_day: true, start_time: '09:00', end_time: '17:00' },
      { day_of_week: 4, day_name: 'Thursday', is_working_day: true, start_time: '09:00', end_time: '17:00' },
      { day_of_week: 5, day_name: 'Friday', is_working_day: true, start_time: '09:00', end_time: '17:00' },
      { day_of_week: 6, day_name: 'Saturday', is_working_day: false },
      { day_of_week: 0, day_name: 'Sunday', is_working_day: false }
    ]

    const result = {
      success: true,
      schedule: weeklySchedule,
      generated_at: new Date().toISOString()
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Admin schedule GET error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// POST /api/admin/schedule - Update admin weekly schedule configuration
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Admin schedule configuration POST called')
    
    const body = await request.json()
    const { admin_id, schedule_data } = body

    // Validate required fields
    if (!admin_id || !schedule_data) {
      return NextResponse.json(
        { error: 'Admin ID and schedule data are required' },
        { status: 400 }
      )
    }

    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Call stored procedure to update schedule
    const { data, error } = await supabase.rpc('update_admin_schedule', {
      p_admin_id: admin_id,
      p_schedule_data: schedule_data
    })

    if (error) {
      console.error('Error updating admin schedule:', error)
      return NextResponse.json(
        { error: 'Failed to update schedule' },
        { status: 500 }
      )
    }

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Failed to update schedule' },
        { status: 400 }
      )
    }

    console.log('✅ Admin schedule updated successfully')

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Schedule updated successfully'
    })

  } catch (error) {
    console.error('❌ Admin schedule POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

