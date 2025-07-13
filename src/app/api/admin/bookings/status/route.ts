import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/admin/bookings/status - Update booking status with admin context
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Admin booking status update called')
    
    const body = await request.json()
    const { admin_id, booking_id, new_status, notes } = body

    // Validate required fields
    if (!admin_id || !booking_id || !new_status) {
      return NextResponse.json(
        { error: 'Admin ID, booking ID, and new status are required' },
        { status: 400 }
      )
    }

    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Call stored procedure to update booking status with admin context
    const { data, error } = await supabase.rpc('admin_update_booking_status', {
      p_admin_id: admin_id,
      p_booking_id: booking_id,
      p_new_status: new_status,
      p_notes: notes
    })

    if (error) {
      console.error('Error updating booking status:', error)
      return NextResponse.json(
        { error: 'Failed to update booking status' },
        { status: 500 }
      )
    }

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Failed to update booking status' },
        { status: 400 }
      )
    }

    console.log('✅ Booking status updated successfully')

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Booking status updated successfully'
    })

  } catch (error) {
    console.error('❌ Admin booking status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}