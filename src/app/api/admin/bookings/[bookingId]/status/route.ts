import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// PUT /api/admin/bookings/[bookingId]/status - Update booking status
export async function PUT(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    console.log(`🔄 Admin booking status update API called for booking ID: ${params.bookingId}`)
    
    const body = await request.json()
    const { status, notes } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status value
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Get admin user authentication
    const supabase = createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    console.log('✅ Admin user authenticated:', user.id, user.email)

    // Use service role for admin operations
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get current booking to check old status
    const { data: currentBooking, error: fetchError } = await serviceSupabase
      .from('bookings')
      .select('id, status')
      .eq('id', params.bookingId)
      .single()

    if (fetchError) {
      console.error('Error fetching current booking:', fetchError)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    const oldStatus = currentBooking.status

    // Update booking status
    const { data: updatedBooking, error: updateError } = await serviceSupabase
      .from('bookings')
      .update({
        status: status,
        updated_at: new Date().toISOString(),
        ...(notes && { notes: notes })
      })
      .eq('id', params.bookingId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update booking status' },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully updated booking ${params.bookingId} status from ${oldStatus} to ${status}`)

    const updateData = {
      success: true,
      booking_id: params.bookingId,
      old_status: oldStatus,
      new_status: status,
      updated_at: updatedBooking.updated_at,
      notes: notes || null
    }

    return NextResponse.json({
      success: true,
      data: updateData,
      message: `Booking status updated to ${status} successfully`
    })

  } catch (error) {
    console.error('Admin booking status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 