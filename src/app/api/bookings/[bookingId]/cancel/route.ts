import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { EmailService } from '@/lib/services/email'

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    console.log('🚫 Booking cancellation started:', {
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
    const { reason, refundAmount } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Cancellation reason is required' },
        { status: 400 }
      )
    }

    // Use service role for database operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get booking details before cancellation for email and validation
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        booking_reference,
        user_id,
        status,
        customer_name,
        customer_email,
        total_price_pence,
        service_location,
        slot_id,
        services(id, name),
        vehicles(make, model, registration),
        current_slot:available_slots!slot_id(id, slot_date, start_time)
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
      console.error('❌ Unauthorized cancellation attempt:', {
        bookingUserId: booking.user_id,
        currentUserId: user.id
      })
      return NextResponse.json(
        { error: 'You can only cancel your own bookings' },
        { status: 403 }
      )
    }

    // Check if booking can be cancelled
    if (['cancelled', 'completed', 'no_show'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Booking cannot be cancelled - current status: ${booking.status}` },
        { status: 400 }
      )
    }

    // Cancel booking using our stored procedure
    console.log('💾 Cancelling booking with stored procedure...')
    
    const { data: cancelResult, error: cancelError } = await supabaseAdmin
      .rpc('cancel_booking_and_free_slot', {
        p_booking_id: params.bookingId,
        p_cancelled_by: user.id,
        p_reason: reason,
        p_refund_amount: refundAmount || null
      })

    if (cancelError || !cancelResult?.success) {
      console.error('❌ Failed to cancel booking:', cancelError || cancelResult?.error)
      return NextResponse.json(
        { error: cancelResult?.error || 'Failed to cancel booking. Please try again.' },
        { status: 500 }
      )
    }

    // Send cancellation confirmation email
    console.log('📧 Sending cancellation confirmation emails...')
    
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
        service_date: new Date(booking.current_slot?.slot_date).toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        service_time: booking.current_slot?.start_time?.slice(0, 5) || '',
        service_location: booking.service_location || 'Your location',
        vehicle_make: booking.vehicles?.make || '',
        vehicle_model: booking.vehicles?.model || '',
        vehicle_registration: booking.vehicles?.registration || '',
        total_price_pence: booking.total_price_pence || 0,
        cancellation_reason: reason,
        refund_amount: refundAmount
      }

      await EmailService.sendBookingCancellation(emailData)
      console.log('✅ Cancellation emails sent successfully')
      
    } catch (emailError) {
      console.error('⚠️ Email sending failed:', emailError)
      // Don't fail the cancellation if email fails - booking was cancelled successfully
    }

    console.log('✅ Booking cancellation completed successfully:', {
      bookingId: params.bookingId,
      refundAmount
    })

    return NextResponse.json({ 
      success: true,
      data: {
        booking_id: params.bookingId,
        booking_reference: booking.booking_reference,
        status: 'cancelled',
        cancellation_reason: reason,
        refund_amount: refundAmount,
        cancelled_at: new Date().toISOString()
      },
      message: 'Booking successfully cancelled. You will receive a confirmation email shortly.'
    })

  } catch (error) {
    console.error('❌ Booking cancellation error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}