import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/admin/schedule/availability - Get availability overrides
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin schedule availability GET called')
    
    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('admin_id')

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID required' },
        { status: 400 }
      )
    }

    console.log('🔍 Fetching availability overrides for admin:', adminId)

    // Get availability overrides (assuming we have this table)
    // For now, return empty array as this is a new feature
    const overrides = []

    // Could also fetch from a hypothetical availability_overrides table:
    /*
    const { data: overrides, error: overridesError } = await supabase
      .from('availability_overrides')
      .select(`
        id,
        date,
        is_available,
        start_time,
        end_time,
        reason,
        notes,
        created_at,
        updated_at
      `)
      .eq('admin_id', adminId)
      .order('date', { ascending: true })

    if (overridesError) {
      console.error('❌ Error fetching availability overrides:', overridesError)
      return NextResponse.json(
        { error: 'Failed to fetch availability overrides', details: overridesError.message },
        { status: 500 }
      )
    }
    */

    console.log('📊 Found availability overrides:', overrides?.length || 0)

    const result = {
      success: true,
      overrides: overrides || [],
      generated_at: new Date().toISOString()
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Admin schedule availability GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/schedule/availability - Create availability override
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Admin schedule availability POST called')
    
    const body = await request.json()
    const { admin_id, date, is_available, start_time, end_time, reason, notes } = body

    if (!admin_id || !date || typeof is_available !== 'boolean') {
      return NextResponse.json(
        { error: 'Admin ID, date, and availability status are required' },
        { status: 400 }
      )
    }

    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('🔍 Creating availability override:', { admin_id, date, is_available })

    // For now, we'll simulate creating an override by updating time_slots directly
    // In a full implementation, you'd have an availability_overrides table
    
    // Update existing time slots for this date
    const updateData: any = {
      is_available,
      updated_at: new Date().toISOString()
    }

    const { data: updatedSlots, error: updateError } = await supabase
      .from('time_slots')
      .update(updateData)
      .eq('date', date)
      .select()

    if (updateError) {
      console.error('❌ Error updating time slots:', updateError)
      return NextResponse.json(
        { error: 'Failed to create availability override', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('✅ Created availability override affecting', updatedSlots?.length || 0, 'slots')

    // Create a mock override record for response
    const override = {
      id: `override_${Date.now()}`,
      admin_id,
      date,
      is_available,
      start_time: is_available ? start_time : null,
      end_time: is_available ? end_time : null,
      reason: reason || null,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      message: 'Availability override created successfully',
      override,
      affected_slots: updatedSlots?.length || 0
    })

  } catch (error) {
    console.error('❌ Admin schedule availability POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}