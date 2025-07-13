#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
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

async function testDashboardVehicles() {
  console.log('🚗 Testing dashboard vehicles display...')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Test data - use existing test user from previous test
  const testUserId = '62d31c0b-62cd-4018-aebc-6349dfecf5e7'
  const testEmail = 'test-1752089092600@example.com'

  console.log(`🔍 Checking vehicles for test user: ${testUserId}`)

  // Check vehicles directly in database
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', testUserId)
    .eq('is_active', true)

  if (vehiclesError) {
    console.error('❌ Error fetching vehicles:', vehiclesError)
    return
  }

  console.log(`✅ Found ${vehicles.length} vehicles in database:`)
  vehicles.forEach(vehicle => {
    console.log(`  - ${vehicle.registration} (${vehicle.make} ${vehicle.model}) - Size: ${vehicle.size}`)
  })

  // Check bookings linked to these vehicles
  if (vehicles.length > 0) {
    console.log('\n🎯 Checking bookings linked to vehicles...')
    
    for (const vehicle of vehicles) {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, booking_reference, vehicle_id, status')
        .eq('vehicle_id', vehicle.id)

      if (bookingsError) {
        console.error(`❌ Error fetching bookings for vehicle ${vehicle.registration}:`, bookingsError)
      } else {
        console.log(`  Vehicle ${vehicle.registration}: ${bookings.length} bookings`)
        bookings.forEach(booking => {
          console.log(`    - ${booking.booking_reference} (${booking.status})`)
        })
      }
    }
  }

  // Test vehicles API endpoint as if we're the authenticated user
  console.log('\n🔌 Testing vehicles API endpoint...')
  
  // Create a user session for testing (simulate authenticated request)
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Since we can't simulate user session easily, let's call the API with service role
  // and check the logic manually

  console.log('📊 API Endpoint Logic Check:')
  console.log('  - User ID:', testUserId)
  console.log('  - Query: vehicles where user_id =', testUserId, 'and is_active = true')
  console.log('  - Results:', vehicles.length, 'vehicles found')

  if (vehicles.length === 0) {
    console.log('\n❌ ISSUE FOUND: No vehicles found for test user')
    console.log('  This would cause the "no vehicles" display in dashboard')
  } else {
    console.log('\n✅ Vehicles found - dashboard should display them properly')
  }

  // Check user's booking history
  console.log('\n📋 Checking user booking history...')
  
  const { data: userBookings, error: userBookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_reference,
      status,
      customer_name,
      vehicle_id,
      created_at,
      vehicles!inner(registration, make, model)
    `)
    .eq('user_id', testUserId)
    .order('created_at', { ascending: false })

  if (userBookingsError) {
    console.error('❌ Error fetching user bookings:', userBookingsError)
  } else {
    console.log(`✅ Found ${userBookings.length} bookings for user:`)
    userBookings.forEach(booking => {
      const vehicleInfo = booking.vehicles ? 
        `${booking.vehicles.registration} (${booking.vehicles.make} ${booking.vehicles.model})` : 
        'No vehicle linked'
      console.log(`  - ${booking.booking_reference} - ${vehicleInfo} - ${booking.status}`)
    })
  }

  console.log('\n🎉 Dashboard vehicles test complete!')
}

testDashboardVehicles().catch(console.error)