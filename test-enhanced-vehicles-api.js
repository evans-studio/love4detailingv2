#!/usr/bin/env node

const fs = require('fs')

// Load environment variables manually
const envContent = fs.readFileSync('.env.local', 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key] = valueParts.join('=')
  }
})

// Set environment variables
Object.assign(process.env, envVars)

async function testEnhancedVehiclesAPI() {
  console.log('🚗 Testing enhanced vehicles API with booking statistics...')

  // Test user from previous test
  const testUserId = '62d31c0b-62cd-4018-aebc-6349dfecf5e7'
  
  console.log(`📋 Testing API for user: ${testUserId}`)
  
  // Simulate API call by implementing the same logic
  const { createClient } = require('@supabase/supabase-js')
  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Get vehicles
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
      is_active,
      created_at,
      updated_at
    `)
    .eq('user_id', testUserId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error fetching vehicles:', error)
    return
  }

  console.log(`✅ Found ${vehicles.length} vehicles`)

  // Get booking statistics for each vehicle
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
    
    console.log(`📊 Found ${bookingStats?.length || 0} booking records`)
    
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

  // Transform vehicles
  const transformedVehicles = vehicles?.map(vehicle => ({
    id: vehicle.id,
    user_id: vehicle.user_id,
    registration: vehicle.registration,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    size: dbToFrontendSizeMap[vehicle.size] || 'M',
    size_confirmed: false,
    booking_count: vehicleStats.get(vehicle.id)?.booking_count || 0,
    completed_bookings: vehicleStats.get(vehicle.id)?.completed_bookings || 0,
    total_spent_pence: vehicleStats.get(vehicle.id)?.total_spent_pence || 0,
    last_service_date: vehicleStats.get(vehicle.id)?.last_service_date || null,
    is_active: vehicle.is_active,
    created_at: vehicle.created_at,
    updated_at: vehicle.updated_at
  })) || []

  console.log('\n🎯 Enhanced Vehicle Data:')
  transformedVehicles.forEach(vehicle => {
    console.log(`\n🚙 ${vehicle.registration} (${vehicle.make} ${vehicle.model})`)
    console.log(`   Size: ${vehicle.size}`)
    console.log(`   Total Bookings: ${vehicle.booking_count}`)
    console.log(`   Completed: ${vehicle.completed_bookings}`)
    console.log(`   Total Spent: £${(vehicle.total_spent_pence / 100).toFixed(2)}`)
    console.log(`   Last Service: ${vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString() : 'Never'}`)
  })

  // Test summary statistics
  const totalSpent = transformedVehicles.reduce((sum, v) => sum + (v.total_spent_pence || 0), 0)
  const totalBookings = transformedVehicles.reduce((sum, v) => sum + (v.booking_count || 0), 0)

  console.log('\n📈 Dashboard Summary:')
  console.log(`   Total Vehicles: ${transformedVehicles.length}`)
  console.log(`   Total Bookings: ${totalBookings}`)
  console.log(`   Total Spent: £${(totalSpent / 100).toFixed(2)}`)

  console.log('\n🎉 Enhanced vehicles API test complete!')
}

testEnhancedVehiclesAPI().catch(console.error)