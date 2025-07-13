import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/admin/pending-slot-actions - Get all pending slot-related actions for admin
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

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Use admin client for comprehensive data access
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all pending reschedule requests
    const { data: rescheduleRequests, error: rescheduleError } = await supabaseAdmin
      .from('reschedule_requests')
      .select(`
        *,
        booking:bookings(
          id,
          booking_reference,
          customer_name,
          customer_email,
          customer_phone,
          service_id,
          total_price_pence,
          services(name)
        ),
        customer:customer_id(
          id,
          email,
          users(full_name, phone)
        ),
        original_slot:original_slot_id(
          id,
          slot_date,
          start_time,
          end_time,
          slot_status
        ),
        requested_slot:requested_slot_id(
          id,
          slot_date,
          start_time,
          end_time,
          slot_status
        )
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })

    if (rescheduleError) {
      console.error('Error fetching reschedule requests:', rescheduleError)
    }

    // Get expired temporary reservations
    const { data: expiredReservations, error: expiredError } = await supabaseAdmin
      .from('available_slots')
      .select(`
        id,
        slot_date,
        start_time,
        reserved_for_user_id,
        reserved_until,
        slot_status,
        modification_reason
      `)
      .in('slot_status', ['temporarily_reserved', 'reschedule_reserved'])
      .lt('reserved_until', new Date().toISOString())

    if (expiredError) {
      console.error('Error fetching expired reservations:', expiredError)
    }

    // Get recent cancellations that freed up slots
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentCancellations, error: cancellationError } = await supabaseAdmin
      .from('available_slots')
      .select(`
        id,
        slot_date,
        start_time,
        end_time,
        last_modified,
        modification_reason
      `)
      .eq('slot_status', 'available')
      .gte('last_modified', oneDayAgo)
      .like('modification_reason', '%cancellation%')
      .order('last_modified', { ascending: false })

    if (cancellationError) {
      console.error('Error fetching recent cancellations:', cancellationError)
    }

    // Get slot conflicts (if any)
    const { data: slotConflicts, error: conflictError } = await supabaseAdmin
      .from('available_slots')
      .select(`
        id,
        slot_date,
        start_time,
        current_bookings,
        max_bookings,
        booking_id
      `)
      .gt('current_bookings', 1)
      .order('slot_date', { ascending: true })

    if (conflictError) {
      console.error('Error fetching slot conflicts:', conflictError)
    }

    // Format the response
    const pendingActions = {
      reschedule_requests: (rescheduleRequests || []).map(req => ({
        id: req.id,
        type: 'reschedule_request',
        priority: 'high',
        booking_id: req.booking_id,
        booking_reference: req.booking?.booking_reference,
        customer: {
          name: req.booking?.customer_name || req.customer?.users?.full_name || 'Customer',
          email: req.booking?.customer_email || req.customer?.email,
          phone: req.booking?.customer_phone || req.customer?.users?.phone
        },
        service: {
          name: req.booking?.services?.name || 'Service'
        },
        current_slot: req.original_slot ? {
          id: req.original_slot.id,
          date: req.original_slot.slot_date,
          time: req.original_slot.start_time,
          formatted_date: new Date(req.original_slot.slot_date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          formatted_time: req.original_slot.start_time?.slice(0, 5),
          status: req.original_slot.slot_status
        } : null,
        requested_slot: req.requested_slot ? {
          id: req.requested_slot.id,
          date: req.requested_slot.slot_date,
          time: req.requested_slot.start_time,
          formatted_date: new Date(req.requested_slot.slot_date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          formatted_time: req.requested_slot.start_time?.slice(0, 5),
          status: req.requested_slot.slot_status
        } : null,
        reason: req.reason,
        requested_at: req.requested_at,
        expires_at: req.expires_at,
        days_pending: Math.floor((new Date().getTime() - new Date(req.requested_at).getTime()) / (1000 * 60 * 60 * 24)),
        total_price: req.booking?.total_price_pence ? `£${(req.booking.total_price_pence / 100).toFixed(2)}` : 'N/A'
      })),

      expired_reservations: (expiredReservations || []).map(slot => ({
        id: slot.id,
        type: 'expired_reservation',
        priority: 'medium',
        slot: {
          id: slot.id,
          date: slot.slot_date,
          time: slot.start_time,
          formatted_date: new Date(slot.slot_date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          formatted_time: slot.start_time?.slice(0, 5),
          status: slot.slot_status
        },
        reserved_until: slot.reserved_until,
        hours_expired: Math.floor((new Date().getTime() - new Date(slot.reserved_until).getTime()) / (1000 * 60 * 60)),
        reason: slot.modification_reason
      })),

      recent_cancellations: (recentCancellations || []).map(slot => ({
        id: slot.id,
        type: 'newly_available_slot',
        priority: 'low',
        slot: {
          id: slot.id,
          date: slot.slot_date,
          time: slot.start_time,
          formatted_date: new Date(slot.slot_date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          formatted_time: slot.start_time?.slice(0, 5)
        },
        freed_at: slot.last_modified,
        hours_ago: Math.floor((new Date().getTime() - new Date(slot.last_modified).getTime()) / (1000 * 60 * 60)),
        reason: slot.modification_reason
      })),

      slot_conflicts: (slotConflicts || []).map(slot => ({
        id: slot.id,
        type: 'slot_conflict',
        priority: 'critical',
        slot: {
          id: slot.id,
          date: slot.slot_date,
          time: slot.start_time,
          formatted_date: new Date(slot.slot_date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          formatted_time: slot.start_time?.slice(0, 5)
        },
        current_bookings: slot.current_bookings,
        max_bookings: slot.max_bookings,
        booking_id: slot.booking_id
      }))
    }

    // Calculate summary statistics
    const summary = {
      total_pending_actions: 
        pendingActions.reschedule_requests.length + 
        pendingActions.expired_reservations.length + 
        pendingActions.slot_conflicts.length,
      
      high_priority_count: 
        pendingActions.reschedule_requests.length + 
        pendingActions.slot_conflicts.length,
      
      reschedule_requests_count: pendingActions.reschedule_requests.length,
      expired_reservations_count: pendingActions.expired_reservations.length,
      recent_cancellations_count: pendingActions.recent_cancellations.length,
      slot_conflicts_count: pendingActions.slot_conflicts.length,
      
      oldest_pending_reschedule: pendingActions.reschedule_requests.length > 0 
        ? Math.max(...pendingActions.reschedule_requests.map(req => req.days_pending))
        : 0,
      
      check_timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: {
        pending_actions: pendingActions,
        summary
      }
    })

  } catch (error) {
    console.error('Error fetching pending slot actions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}