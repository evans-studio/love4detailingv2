import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/customer/booking-status-updates - Poll for status changes across all user bookings
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const lastCheckTime = searchParams.get('last_check')
    const bookingIds = searchParams.get('booking_ids')?.split(',') || []

    // Use admin client for comprehensive data access
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Build query for user's bookings
    let query = supabaseAdmin
      .from('bookings')
      .select(`
        id,
        booking_reference,
        status,
        last_status_change,
        status_change_reason,
        reschedule_count,
        current_slot_id,
        current_slot:current_slot_id(
          id,
          slot_date,
          start_time,
          slot_status
        )
      `)
      .eq('user_id', user.id)

    // Filter by specific booking IDs if provided
    if (bookingIds.length > 0) {
      query = query.in('id', bookingIds)
    }

    // Filter by last check time if provided
    if (lastCheckTime) {
      query = query.gte('last_status_change', lastCheckTime)
    }

    const { data: bookings, error: bookingsError } = await query.order('last_status_change', { ascending: false })

    if (bookingsError) {
      console.error('Error fetching booking updates:', bookingsError)
      return NextResponse.json(
        { error: 'Failed to fetch booking updates' },
        { status: 500 }
      )
    }

    // Get reschedule requests for these bookings
    const { data: rescheduleRequests } = await supabaseAdmin
      .from('reschedule_requests')
      .select(`
        id,
        booking_id,
        status,
        requested_at,
        responded_at,
        admin_notes,
        requested_slot:requested_slot_id(
          slot_date,
          start_time
        )
      `)
      .eq('customer_id', user.id)
      .in('status', ['pending', 'approved', 'declined'])

    // Build updates response
    const updates = bookings.map(booking => {
      const rescheduleRequest = rescheduleRequests?.find(req => req.booking_id === booking.id)
      
      return {
        booking_id: booking.id,
        booking_reference: booking.booking_reference,
        status: booking.status,
        last_status_change: booking.last_status_change,
        status_change_reason: booking.status_change_reason,
        reschedule_count: booking.reschedule_count || 0,
        current_slot: booking.current_slot ? {
          id: booking.current_slot.id,
          date: booking.current_slot.slot_date,
          time: booking.current_slot.start_time,
          status: booking.current_slot.slot_status,
          formatted_date: new Date(booking.current_slot.slot_date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          formatted_time: booking.current_slot.start_time?.slice(0, 5)
        } : null,
        reschedule_request: rescheduleRequest ? {
          id: rescheduleRequest.id,
          status: rescheduleRequest.status,
          requested_at: rescheduleRequest.requested_at,
          responded_at: rescheduleRequest.responded_at,
          admin_notes: rescheduleRequest.admin_notes,
          requested_slot: rescheduleRequest.requested_slot ? {
            date: rescheduleRequest.requested_slot.slot_date,
            time: rescheduleRequest.requested_slot.start_time,
            formatted_date: new Date(rescheduleRequest.requested_slot.slot_date).toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            formatted_time: rescheduleRequest.requested_slot.start_time?.slice(0, 5)
          } : null
        } : null,
        has_updates: lastCheckTime ? new Date(booking.last_status_change) > new Date(lastCheckTime) : false
      }
    })

    // Get summary of changes
    const summary = {
      total_bookings_checked: bookings.length,
      bookings_with_updates: lastCheckTime ? updates.filter(u => u.has_updates).length : 0,
      pending_reschedule_requests: rescheduleRequests?.filter(req => req.status === 'pending').length || 0,
      recent_status_changes: updates.filter(u => {
        const changeTime = new Date(u.last_status_change)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        return changeTime > oneHourAgo
      }).length,
      check_timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: {
        updates,
        summary,
        last_check_time: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in booking status updates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}