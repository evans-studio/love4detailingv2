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
        original_date,
        original_time,
        requested_date,
        requested_time
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

    // Process the admin decision directly
    console.log(`💾 Processing ${action} for reschedule request...`)
    
    try {
      // Update the reschedule request status
      const { error: updateError } = await supabaseAdmin
        .from('reschedule_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'declined',
          admin_notes: admin_notes || null,
          responded_at: new Date().toISOString(),
          responded_by: user.id
        })
        .eq('id', params.requestId)

      if (updateError) {
        console.error(`❌ Failed to update reschedule request:`, updateError)
        return NextResponse.json(
          { error: `Failed to ${action} reschedule request. Database error.` },
          { status: 500 }
        )
      }

      // If approved, we would need to update the booking slot
      // For now, just mark as approved - slot management can be done separately
      console.log(`✅ Reschedule request ${action}d successfully`)
      
    } catch (dbError) {
      console.error(`❌ Database error during ${action}:`, dbError)
      return NextResponse.json(
        { error: `Failed to ${action} reschedule request. Please try again.` },
        { status: 500 }
      )
    }

    // Email notifications - temporarily disabled for testing
    console.log('📧 Email notifications temporarily disabled')
    
    // TODO: Re-enable email notifications after testing
    // try {
    //   const emailData = { ... }
    //   if (action === 'approve') {
    //     await EmailService.sendRescheduleApproved(emailData)
    //   } else {
    //     await EmailService.sendRescheduleDeclined(emailData)
    //   }
    //   console.log(`✅ ${action} notification emails sent successfully`)
    // } catch (emailError) {
    //   console.error('⚠️ Email sending failed:', emailError)
    // }

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
        booking_reference: `REQ-${rescheduleRequest.booking_id.slice(-8)}`
      },
      message: `Reschedule request ${action}d successfully.`
    })

  } catch (error) {
    console.error('❌ Admin reschedule response error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}