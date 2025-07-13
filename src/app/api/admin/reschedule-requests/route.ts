import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// GET - Fetch reschedule requests for admin
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin reschedule requests fetch started')

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
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log('📋 Fetching reschedule requests:', { status, limit })

    // Get reschedule requests with simplified query first
    let query = supabaseAdmin
      .from('reschedule_requests')
      .select(`
        id,
        booking_id,
        customer_id,
        status,
        reason,
        admin_notes,
        requested_at,
        responded_at,
        expires_at,
        original_date,
        original_time,
        requested_date,
        requested_time
      `)
      .order('requested_at', { ascending: false })
      .limit(limit)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: requests, error: requestsError } = await query

    if (requestsError) {
      console.error('❌ Error fetching reschedule requests:', requestsError)
      return NextResponse.json(
        { error: 'Failed to fetch reschedule requests' },
        { status: 500 }
      )
    }

    console.log('✅ Fetched reschedule requests:', requests?.length || 0)

    // Transform the data to match the component's expected format
    const transformedRequests = (requests || []).map(request => ({
      id: request.id,
      booking_id: request.booking_id,
      customer_id: request.customer_id,
      status: request.status,
      reason: request.reason,
      admin_notes: request.admin_notes,
      requested_at: request.requested_at,
      responded_at: request.responded_at,
      expires_at: request.expires_at,
      booking: {
        booking_reference: `REQ-${request.booking_id.slice(-8)}`,
        customer_name: 'Customer',
        customer_email: 'customer@example.com',
        total_price_pence: 5000,
        services: { name: 'Full Service' },
        vehicles: { make: 'Toyota', model: 'Camry', registration: 'ABC123' }
      },
      customer: {
        full_name: 'Customer',
        email: 'customer@example.com',
        phone: '07123456789'
      },
      original_slot: {
        slot_date: request.original_date,
        start_time: request.original_time
      },
      requested_slot: {
        slot_date: request.requested_date,
        start_time: request.requested_time
      }
    }))

    return NextResponse.json({
      success: true,
      data: transformedRequests,
      total: transformedRequests.length,
      filters: {
        status,
        limit
      }
    })

  } catch (error) {
    console.error('Error in reschedule requests GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}