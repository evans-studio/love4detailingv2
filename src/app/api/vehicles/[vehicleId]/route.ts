import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// Size mapping between frontend and database formats
const dbToFrontendSizeMap = {
  'small': 'S',
  'medium': 'M',
  'large': 'L',
  'extra_large': 'XL'
}

const frontendToDbSizeMap = {
  'S': 'small',
  'M': 'medium',
  'L': 'large',
  'XL': 'extra_large'
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
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

    const body = await request.json()
    const vehicleData = body.vehicleData || body

    if (!vehicleData) {
      return NextResponse.json(
        { error: 'Vehicle data is required' },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify vehicle belongs to user
    const { data: existingVehicle, error: checkError } = await serviceSupabase
      .from('vehicles')
      .select('id')
      .eq('id', params.vehicleId)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found or unauthorized' },
        { status: 404 }
      )
    }

    // Convert frontend size format to database format if size is provided
    const dbSize = vehicleData.size ? frontendToDbSizeMap[vehicleData.size as keyof typeof frontendToDbSizeMap] : undefined

    // Update vehicle
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (vehicleData.registration) updateData.registration = vehicleData.registration.toUpperCase()
    if (vehicleData.make) updateData.make = vehicleData.make
    if (vehicleData.model) updateData.model = vehicleData.model
    if (vehicleData.year) updateData.year = vehicleData.year
    if (vehicleData.color) updateData.color = vehicleData.color
    if (dbSize) updateData.size = dbSize
    // Skip size_confirmed for now - column doesn't exist yet

    const { data: updatedVehicle, error } = await serviceSupabase
      .from('vehicles')
      .update(updateData)
      .eq('id', params.vehicleId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating vehicle:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the response back to frontend format
    const transformedVehicle = {
      ...updatedVehicle,
      size: dbToFrontendSizeMap[updatedVehicle.size as keyof typeof dbToFrontendSizeMap] || 'M',
      size_confirmed: false // Add this field for frontend compatibility
    }

    return NextResponse.json({ data: transformedVehicle })
  } catch (error) {
    console.error('Error in vehicle PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
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

    // Use service role to bypass RLS
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify vehicle belongs to user
    const { data: existingVehicle, error: checkError } = await serviceSupabase
      .from('vehicles')
      .select('id')
      .eq('id', params.vehicleId)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found or unauthorized' },
        { status: 404 }
      )
    }

    // Soft delete by setting is_active to false
    const { data: deletedVehicle, error } = await serviceSupabase
      .from('vehicles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.vehicleId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error deleting vehicle:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true, vehicle: deletedVehicle } })
  } catch (error) {
    console.error('Error in vehicle DELETE API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}