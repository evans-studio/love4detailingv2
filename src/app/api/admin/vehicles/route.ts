import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Use service role key for admin access
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all vehicles with customer information
    const { data: vehicles, error } = await serviceSupabase
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
        updated_at,
        users!inner (
          id,
          full_name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching vehicles:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get booking statistics for all vehicles
    const vehicleStats = new Map()
    
    if (vehicles && vehicles.length > 0) {
      const vehicleIds = vehicles.map(v => v.id)
      
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
        vehicleIds.forEach(vehicleId => {
          const vehicleBookings = bookingStats.filter(b => b.vehicle_id === vehicleId)
          const completedBookings = vehicleBookings.filter(b => b.status === 'completed')
          const totalSpent = completedBookings.reduce((sum, b) => 
            sum + (b.total_price_pence || b.service_price_pence || 0), 0)
          
          const lastService = completedBookings.length > 0 
            ? completedBookings
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
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

    // Size mapping
    const dbToFrontendSizeMap = {
      'small': 'S',
      'medium': 'M',
      'large': 'L',
      'extra_large': 'XL'
    }

    // Transform vehicles data
    const transformedVehicles = vehicles?.map(vehicle => ({
      id: vehicle.id,
      user_id: vehicle.user_id,
      registration: vehicle.registration,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      size: dbToFrontendSizeMap[vehicle.size as keyof typeof dbToFrontendSizeMap] || 'M',
      size_confirmed: vehicle.size_confirmed,
      booking_count: vehicleStats.get(vehicle.id)?.booking_count || 0,
      completed_bookings: vehicleStats.get(vehicle.id)?.completed_bookings || 0,
      total_spent_pence: vehicleStats.get(vehicle.id)?.total_spent_pence || 0,
      last_service_date: vehicleStats.get(vehicle.id)?.last_service_date || null,
      is_active: vehicle.is_active,
      created_at: vehicle.created_at,
      updated_at: vehicle.updated_at,
      // Customer information
      customer_name: (vehicle as any).users?.full_name || 'Unknown',
      customer_email: (vehicle as any).users?.email || '',
      customer_phone: (vehicle as any).users?.phone || ''
    })) || []

    // Calculate overall statistics
    const stats = {
      total_vehicles: transformedVehicles.length,
      active_vehicles: transformedVehicles.filter(v => v.is_active).length,
      total_bookings: transformedVehicles.reduce((sum, v) => sum + v.booking_count, 0),
      total_revenue_pence: transformedVehicles.reduce((sum, v) => sum + v.total_spent_pence, 0),
      most_popular_size: (() => {
        const sizeCounts = transformedVehicles.reduce((acc, v) => {
          acc[v.size] = (acc[v.size] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        return Object.entries(sizeCounts).reduce((a, b) => 
          sizeCounts[a[0]] > sizeCounts[b[0]] ? a : b
        )?.[0] || 'M'
      })(),
      average_bookings_per_vehicle: transformedVehicles.length > 0 
        ? transformedVehicles.reduce((sum, v) => sum + v.booking_count, 0) / transformedVehicles.length
        : 0
    }

    return NextResponse.json({ 
      data: {
        vehicles: transformedVehicles,
        stats
      }
    })
  } catch (error) {
    console.error('API /admin/vehicles error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}