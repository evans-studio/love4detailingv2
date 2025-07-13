import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Use service role for admin dashboard
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const dateFilter = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Get basic statistics
    const today = new Date().toISOString().split('T')[0]
    
    // Get all bookings
    const { data: allBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        vehicles:vehicles(make, model, year, color, registration),
        slots:available_slots(slot_date, start_time, end_time)
      `)
      .order('created_at', { ascending: false })
    
    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }

    // Get available slots
    const { data: availableSlots, error: slotsError } = await supabase
      .from('available_slots')
      .select('*')
      .order('slot_date', { ascending: true })
    
    if (slotsError) {
      console.error('Error fetching slots:', slotsError)
      return NextResponse.json(
        { error: 'Failed to fetch slots' },
        { status: 500 }
      )
    }

    // Calculate statistics
    const todaysBookings = allBookings?.filter(booking => 
      booking.created_at && booking.created_at.startsWith(today)
    ) || []
    
    const confirmedBookings = todaysBookings.filter(booking => booking.status === 'confirmed')
    const pendingBookings = todaysBookings.filter(booking => booking.status === 'pending')
    const completedBookings = todaysBookings.filter(booking => booking.status === 'completed')
    
    const totalRevenueToday = todaysBookings.reduce((sum, booking) => 
      sum + (booking.total_price_pence || 0), 0
    )
    
    const averageBookingValue = todaysBookings.length > 0 
      ? totalRevenueToday / todaysBookings.length 
      : 0

    // Get upcoming bookings (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const upcomingBookings = allBookings?.filter(booking => {
      if (!booking.slots || !booking.slots.slot_date) return false
      const bookingDate = new Date(booking.slots.slot_date)
      return bookingDate >= new Date() && bookingDate <= nextWeek
    }) || []

    // Transform data for frontend
    const dashboardData = {
      statistics: {
        total_bookings_today: todaysBookings.length,
        confirmed_bookings: confirmedBookings.length,
        pending_bookings: pendingBookings.length,
        completed_bookings: completedBookings.length,
        total_revenue_today_pence: totalRevenueToday,
        average_booking_value_pence: Math.round(averageBookingValue),
        total_slots: availableSlots?.length || 0,
        available_slots: availableSlots?.filter(slot => !slot.is_blocked).length || 0
      },
      todays_bookings: todaysBookings.map(booking => ({
        booking_id: booking.id,
        booking_reference: booking.booking_reference,
        status: booking.status,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        customer_phone: booking.customer_phone,
        service_name: 'Full Valet', // Default service
        total_price_pence: booking.total_price_pence,
        special_requests: booking.customer_instructions,
        vehicle_details: booking.vehicles ? {
          make: booking.vehicles.make,
          model: booking.vehicles.model,
          year: booking.vehicles.year,
          color: booking.vehicles.color,
          registration: booking.vehicles.registration
        } : null,
        slot_time: booking.slots ? {
          start_time: booking.slots.start_time,
          end_time: booking.slots.end_time
        } : null,
        created_at: booking.created_at
      })),
      upcoming_bookings: upcomingBookings.slice(0, 10).map(booking => ({
        booking_id: booking.id,
        booking_reference: booking.booking_reference,
        status: booking.status,
        customer_name: booking.customer_name,
        service_name: 'Full Valet',
        total_price_pence: booking.total_price_pence,
        slot_date: booking.slots?.slot_date,
        start_time: booking.slots?.start_time,
        end_time: booking.slots?.end_time
      }))
    }

    return NextResponse.json({
      success: true,
      data: dashboardData
    })

  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}