import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/bookings/{id}/complete-status - Get complete booking status with slot relationship
export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
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

    // Use admin client for comprehensive data access
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get complete booking information with slot relationship
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        services(id, name, code),
        vehicles(id, make, model, registration, color, year, size),
        current_slot:current_slot_id(
          id,
          slot_date,
          start_time,
          end_time,
          slot_status,
          current_bookings,
          max_bookings
        ),
        original_slot:original_slot_id(
          id,
          slot_date,
          start_time,
          end_time
        )
      `)
      .eq('id', params.bookingId)
      .eq('user_id', user.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or access denied' },
        { status: 404 }
      )
    }

    // Get any pending reschedule requests
    const { data: rescheduleRequest } = await supabaseAdmin
      .from('reschedule_requests')
      .select(`
        *,
        requested_slot:requested_slot_id(
          id,
          slot_date,
          start_time,
          end_time,
          slot_status
        )
      `)
      .eq('booking_id', params.bookingId)
      .eq('status', 'pending')
      .single()

    // Format the response with complete status information
    const completeStatus = {
      booking: {
        id: booking.id,
        reference: booking.booking_reference,
        status: booking.status,
        reschedule_count: booking.reschedule_count || 0,
        last_status_change: booking.last_status_change,
        status_change_reason: booking.status_change_reason,
        created_from_reschedule: booking.created_from_reschedule || false,
        booking_history: booking.booking_history || []
      },
      service: {
        id: booking.services?.id,
        name: booking.services?.name || 'Service',
        code: booking.services?.code
      },
      vehicle: {
        id: booking.vehicles?.id,
        make: booking.vehicles?.make || '',
        model: booking.vehicles?.model || '',
        registration: booking.vehicles?.registration || '',
        displayName: `${booking.vehicles?.make || ''} ${booking.vehicles?.model || ''}`.trim()
      },
      current_slot: booking.current_slot ? {
        id: booking.current_slot.id,
        date: booking.current_slot.slot_date,
        time: booking.current_slot.start_time,
        end_time: booking.current_slot.end_time,
        status: booking.current_slot.slot_status,
        formatted_date: new Date(booking.current_slot.slot_date).toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        formatted_time: booking.current_slot.start_time?.slice(0, 5)
      } : null,
      original_slot: booking.original_slot ? {
        id: booking.original_slot.id,
        date: booking.original_slot.slot_date,
        time: booking.original_slot.start_time,
        end_time: booking.original_slot.end_time,
        formatted_date: new Date(booking.original_slot.slot_date).toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        formatted_time: booking.original_slot.start_time?.slice(0, 5)
      } : null,
      reschedule_request: rescheduleRequest ? {
        id: rescheduleRequest.id,
        status: rescheduleRequest.status,
        reason: rescheduleRequest.reason,
        requested_at: rescheduleRequest.requested_at,
        expires_at: rescheduleRequest.expires_at,
        admin_notes: rescheduleRequest.admin_notes,
        requested_slot: rescheduleRequest.requested_slot ? {
          id: rescheduleRequest.requested_slot.id,
          date: rescheduleRequest.requested_slot.slot_date,
          time: rescheduleRequest.requested_slot.start_time,
          status: rescheduleRequest.requested_slot.slot_status,
          formatted_date: new Date(rescheduleRequest.requested_slot.slot_date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          formatted_time: rescheduleRequest.requested_slot.start_time?.slice(0, 5)
        } : null
      } : null,
      pricing: {
        service_price_pence: booking.service_price_pence || 0,
        total_price_pence: booking.total_price_pence || 0,
        total_price_formatted: `£${((booking.total_price_pence || 0) / 100).toFixed(2)}`
      },
      customer: {
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone
      },
      timestamps: {
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        last_status_change: booking.last_status_change
      },
      actions: {
        can_reschedule: booking.status === 'confirmed' && !rescheduleRequest,
        can_cancel: booking.status === 'confirmed',
        can_view_details: true,
        can_rebook: booking.status === 'completed'
      }
    }

    return NextResponse.json({
      success: true,
      data: completeStatus
    })

  } catch (error) {
    console.error('Error fetching complete booking status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}