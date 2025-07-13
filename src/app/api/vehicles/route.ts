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

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'

    // Get vehicles using service role to bypass RLS
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    let query = serviceSupabase
      .from('vehicles')
      .select(`
        id,
        user_id,
        registration,
        make,
        model,
        year,
        color,
        size,
        size_confirmed,
        is_active,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: vehicles, error } = await query

    if (error) {
      console.error('Error fetching vehicles:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get booking statistics for each vehicle
    const vehicleStats = new Map()
    
    if (vehicles && vehicles.length > 0) {
      const vehicleIds = vehicles.map((v: any) => v.id)
      
      const { data: bookingStats, error: statsError } = await serviceSupabase
        .from('bookings')
        .select(`
          vehicle_id,
          status,
          total_price_pence,
          service_price_pence,
          created_at
        `)
        .in('vehicle_id', vehicleIds)
      
      if (!statsError && bookingStats) {
        // Calculate stats for each vehicle
        vehicleIds.forEach((vehicleId: any) => {
          const vehicleBookings = bookingStats.filter((b: any) => b.vehicle_id === vehicleId)
          const completedBookings = vehicleBookings.filter((b: any) => b.status === 'completed')
          const totalSpent = completedBookings.reduce((sum: number, b: any) => 
            sum + (b.total_price_pence || b.service_price_pence || 0), 0)
          
          const lastService = completedBookings.length > 0 
            ? completedBookings
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                .created_at
            : null
          
          vehicleStats.set(vehicleId, {
            booking_count: vehicleBookings.length,
            completed_bookings: completedBookings.length,
            total_spent_pence: totalSpent,
            last_service_date: lastService
          })
        })
      }
    }

    // Transform vehicles to match the API format expected by the frontend
    const transformedVehicles = vehicles?.map((vehicle: any) => ({
      id: vehicle.id,
      user_id: vehicle.user_id,
      registration: vehicle.registration,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      size: dbToFrontendSizeMap[vehicle.size as keyof typeof dbToFrontendSizeMap] || 'M',
      size_confirmed: vehicle.size_confirmed || false,
      booking_count: vehicleStats.get(vehicle.id)?.booking_count || 0,
      completed_bookings: vehicleStats.get(vehicle.id)?.completed_bookings || 0,
      total_spent_pence: vehicleStats.get(vehicle.id)?.total_spent_pence || 0,
      last_service_date: vehicleStats.get(vehicle.id)?.last_service_date || null,
      is_active: vehicle.is_active,
      created_at: vehicle.created_at,
      updated_at: vehicle.updated_at
    })) || []

    return NextResponse.json({ data: transformedVehicles })
  } catch (error) {
    console.error('Error in vehicles API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Validate required fields
    const required = ['registration', 'make', 'model']
    const missing = required.filter(field => !vehicleData[field])
    
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS for vehicle operations
    const { createClient } = require('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check for duplicate registration
    const { data: existing, error: checkError } = await serviceSupabase
      .from('vehicles')
      .select('id')
      .eq('user_id', user.id)
      .eq('registration', vehicleData.registration.toUpperCase())
      .eq('is_active', true)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for duplicate vehicle:', checkError)
      return NextResponse.json({ error: 'Failed to check for duplicate vehicle' }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Vehicle with this registration already exists' },
        { status: 400 }
      )
    }

    // Convert frontend size format to database format
    const dbSize = frontendToDbSizeMap[vehicleData.size as keyof typeof frontendToDbSizeMap] || 'medium'

    // Insert new vehicle (without size_confirmed for now)
    const { data: newVehicle, error } = await serviceSupabase
      .from('vehicles')
      .insert([{
        user_id: user.id,
        registration: vehicleData.registration.toUpperCase(),
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year || new Date().getFullYear(),
        color: vehicleData.color || '',
        size: dbSize,
        size_confirmed: false,
        is_active: true
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating vehicle:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the response back to frontend format
    const transformedVehicle = {
      ...newVehicle,
      size: dbToFrontendSizeMap[newVehicle.size as keyof typeof dbToFrontendSizeMap] || 'M'
    }

    return NextResponse.json({ data: transformedVehicle }, { status: 201 })
  } catch (error) {
    console.error('Error in vehicles POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}