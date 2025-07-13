import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { EmailService } from '@/lib/services/email'

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    console.log('🔄 Admin reschedule response started:', {
      requestId: params.requestId,
      timestamp: new Date().toISOString()
    })

    const supabase = createServerSupabase()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify user is admin
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, admin_notes } = body

    if (!action || !['approve', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action (approve/decline) is required' },
        { status: 400 }
      )
    }

    // Get reschedule request details before processing
    const { data: rescheduleRequest, error: requestError } = await supabaseAdmin
      .from('reschedule_requests')
      .select(`
        id,
        booking_id,
        customer_id,
        status,
        reason,
        requested_at,
        booking:bookings!booking_id(
          booking_reference,
          customer_name,
          customer_email,
          services(name),
          vehicles(make, model, registration)
        ),
        customer:users!customer_id(
          full_name,
          email,
          phone
        ),
        original_slot:available_slots!original_slot_id(
          slot_date,
          start_time
        ),
        requested_slot:available_slots!requested_slot_id(
          slot_date,
          start_time
        )
      `)
      .eq('id', params.requestId)
      .single()

    if (requestError || !rescheduleRequest) {
      console.error('❌ Reschedule request not found:', requestError?.message)
      return NextResponse.json(
        { error: 'Reschedule request not found' },
        { status: 404 }
      )
    }

    if (rescheduleRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Request already processed - status: ${rescheduleRequest.status}` },
        { status: 400 }
      )
    }

    // Process the admin decision using stored procedures
    console.log(`💾 Processing ${action} for reschedule request...`)
    
    let result, error

    if (action === 'approve') {
      const { data, error: approvalError } = await supabaseAdmin
        .rpc('process_reschedule_approval', {
          p_reschedule_request_id: params.requestId,
          p_admin_id: user.id,
          p_admin_notes: admin_notes || null
        })
      result = data
      error = approvalError
    } else {
      const { data, error: declineError } = await supabaseAdmin
        .rpc('process_reschedule_decline', {
          p_reschedule_request_id: params.requestId,
          p_admin_id: user.id,
          p_admin_notes: admin_notes || null
        })
      result = data
      error = declineError
    }

    if (error || !result?.success) {
      console.error(`❌ Failed to ${action} reschedule:`, error || result?.error)
      return NextResponse.json(
        { error: result?.error || `Failed to ${action} reschedule request. Please try again.` },
        { status: 500 }
      )
    }

    // Send email notifications
    console.log('📧 Sending reschedule decision emails...')
    
    try {
      const emailData = {
        booking_reference: rescheduleRequest.booking?.booking_reference || '',
        customer_name: rescheduleRequest.customer?.full_name || rescheduleRequest.booking?.customer_name || 'Customer',
        customer_email: rescheduleRequest.customer?.email || rescheduleRequest.booking?.customer_email || '',
        customer_phone: rescheduleRequest.customer?.phone || '',
        service_name: rescheduleRequest.booking?.services?.name || 'Service',
        old_service_date: new Date(rescheduleRequest.original_slot?.slot_date).toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        old_service_time: rescheduleRequest.original_slot?.start_time?.slice(0, 5) || '',
        service_date: new Date(rescheduleRequest.requested_slot?.slot_date).toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        service_time: rescheduleRequest.requested_slot?.start_time?.slice(0, 5) || '',
        service_location: 'Your location',
        vehicle_make: rescheduleRequest.booking?.vehicles?.make || '',
        vehicle_model: rescheduleRequest.booking?.vehicles?.model || '',
        vehicle_registration: rescheduleRequest.booking?.vehicles?.registration || '',
        total_price_pence: rescheduleRequest.booking?.total_price_pence || 0,
        reschedule_reason: rescheduleRequest.reason || 'Customer request',
        admin_notes: admin_notes || '',
        admin_name: userProfile.full_name || 'Admin',
        request_id: params.requestId
      }

      if (action === 'approve') {
        await EmailService.sendRescheduleApproved(emailData)
      } else {
        await EmailService.sendRescheduleDeclined(emailData)
      }
      
      console.log(`✅ ${action} notification emails sent successfully`)
      
    } catch (emailError) {
      console.error('⚠️ Email sending failed:', emailError)
      // Don't fail the request if email fails - decision was processed successfully
    }

    console.log(`✅ Reschedule ${action} completed successfully:`, {
      requestId: params.requestId,
      bookingId: rescheduleRequest.booking_id
    })

    return NextResponse.json({
      success: true,
      data: {
        request_id: params.requestId,
        booking_id: rescheduleRequest.booking_id,
        action: action,
        status: action === 'approve' ? 'approved' : 'declined',
        admin_notes: admin_notes,
        processed_at: new Date().toISOString(),
        booking_reference: rescheduleRequest.booking?.booking_reference
      },
      message: `Reschedule request ${action}d successfully. Customer will be notified by email.`
    })

  } catch (error) {
    console.error('❌ Admin reschedule response error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}