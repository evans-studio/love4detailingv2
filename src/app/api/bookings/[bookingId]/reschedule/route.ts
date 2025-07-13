import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { EmailService } from '@/lib/services/email'

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    console.log('🔄 Reschedule request started:', {
      bookingId: params.bookingId,
      timestamp: new Date().toISOString()
    })

    const supabase = createServerSupabase()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError?.message)
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { newSlotId, reason } = body

    if (!newSlotId) {
      return NextResponse.json(
        { error: 'New time slot is required' },
        { status: 400 }
      )
    }

    // Use service role for database operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Step 1: Validate booking exists and user owns it
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, 
        booking_reference, 
        user_id, 
        slot_id, 
        status,
        customer_name,
        customer_email,
        reschedule_count,
        services(id, name),
        vehicles(make, model, registration),
        current_slot:available_slots!current_slot_id(id, slot_date, start_time),
        original_slot:available_slots!slot_id(id, slot_date, start_time)
      `)
      .eq('id', params.bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('❌ Booking not found:', bookingError?.message)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (booking.user_id !== user.id) {
      console.error('❌ Unauthorized booking access attempt:', {
        bookingUserId: booking.user_id,
        currentUserId: user.id
      })
      return NextResponse.json(
        { error: 'You can only reschedule your own bookings' },
        { status: 403 }
      )
    }

    // Check if booking can be rescheduled
    if (!['confirmed', 'reschedule_declined'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Booking cannot be rescheduled - current status: ${booking.status}` },
        { status: 400 }
      )
    }

    // Check reschedule limit (max 3 reschedules per booking)
    if (booking.reschedule_count >= 3) {
      return NextResponse.json(
        { error: 'Maximum reschedule limit reached. Please contact customer service.' },
        { status: 400 }
      )
    }

    // Step 2: Validate requested slot is available
    const { data: requestedSlot, error: slotError } = await supabaseAdmin
      .from('available_slots')
      .select('id, slot_date, start_time, slot_status')
      .eq('id', newSlotId)
      .single()

    if (slotError || !requestedSlot) {
      console.error('❌ Requested slot not found:', slotError?.message)
      return NextResponse.json(
        { error: 'Requested time slot not found' },
        { status: 400 }
      )
    }

    // Check if slot is available
    if (requestedSlot.slot_status !== 'available') {
      return NextResponse.json(
        { 
          error: 'Requested time slot is no longer available',
          debug: { slotStatus: requestedSlot.slot_status }
        },
        { status: 409 }
      )
    }

    // Step 3: Check for existing pending reschedule requests
    const { data: existingRequest } = await supabaseAdmin
      .from('reschedule_requests')
      .select('id, status')
      .eq('booking_id', params.bookingId)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending reschedule request for this booking' },
        { status: 409 }
      )
    }

    // Step 4: Create reschedule request and update booking status atomically
    console.log('💾 Creating reschedule request...')
    
    const { data: rescheduleRequest, error: requestError } = await supabaseAdmin
      .rpc('create_reschedule_request', {
        p_booking_id: params.bookingId,
        p_customer_id: user.id,
        p_original_slot_id: booking.slot_id,
        p_requested_slot_id: newSlotId,
        p_reason: reason || 'Customer request'
      })

    if (requestError) {
      console.error('❌ Failed to create reschedule request:', requestError)
      return NextResponse.json(
        { error: 'Failed to create reschedule request. Please try again.' },
        { status: 500 }
      )
    }

    // Step 5: Send email notifications
    console.log('📧 Sending reschedule request emails...')
    
    try {
      // Get user profile for email
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .single()

      const emailData = {
        booking_reference: booking.booking_reference,
        customer_name: profile?.full_name || booking.customer_name || 'Customer',
        customer_email: profile?.email || booking.customer_email || user.email || '',
        customer_phone: profile?.phone || '',
        service_name: booking.services?.name || 'Service',
        old_service_date: new Date(booking.original_slot?.slot_date || booking.current_slot?.slot_date).toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        old_service_time: (booking.original_slot?.start_time || booking.current_slot?.start_time)?.slice(0, 5) || '',
        service_date: new Date(requestedSlot.slot_date).toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        service_time: requestedSlot.start_time.slice(0, 5),
        service_location: 'Your location',
        vehicle_make: booking.vehicles?.make || '',
        vehicle_model: booking.vehicles?.model || '',
        vehicle_registration: booking.vehicles?.registration || '',
        total_price_pence: 0, // Will be populated from booking
        reschedule_reason: reason || 'Customer request',
        request_id: rescheduleRequest.request_id
      }

      await EmailService.sendRescheduleRequest(emailData)
      console.log('✅ Reschedule request emails sent successfully')
      
    } catch (emailError) {
      console.error('⚠️ Email sending failed:', emailError)
      // Don't fail the request if email fails - request was created successfully
    }

    console.log('✅ Reschedule request completed successfully:', {
      requestId: rescheduleRequest.request_id,
      bookingId: params.bookingId,
      newSlotId
    })

    return NextResponse.json({ 
      success: true,
      request_id: rescheduleRequest.request_id,
      message: 'Reschedule request submitted successfully! You will receive a confirmation email and hear back from us within 24 hours.',
      data: {
        booking_reference: booking.booking_reference,
        old_date: booking.original_slot?.slot_date || booking.current_slot?.slot_date,
        old_time: (booking.original_slot?.start_time || booking.current_slot?.start_time)?.slice(0, 5),
        new_date: requestedSlot.slot_date,
        new_time: requestedSlot.start_time.slice(0, 5),
        status: 'pending'
      }
    })

  } catch (error) {
    console.error('❌ Reschedule request error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}

// GET endpoint to check reschedule request status
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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get reschedule requests for this booking
    const { data: requests, error } = await supabaseAdmin
      .from('reschedule_requests')
      .select(`
        id,
        status,
        reason,
        admin_notes,
        requested_at,
        responded_at,
        expires_at,
        original_slot:available_slots!original_slot_id(slot_date, start_time),
        requested_slot:available_slots!requested_slot_id(slot_date, start_time)
      `)
      .eq('booking_id', params.bookingId)
      .eq('customer_id', user.id)
      .order('requested_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching reschedule requests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reschedule requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: requests || []
    })

  } catch (error) {
    console.error('❌ Error in GET reschedule status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}