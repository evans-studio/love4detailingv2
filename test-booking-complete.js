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

async function testCompleteBooking() {
  console.log('🚀 Testing complete booking flow...')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Get a valid slot ID
  console.log('📅 Getting available slot...')
  const { data: slots, error: slotsError } = await supabase
    .from('available_slots')
    .select('id, slot_date, start_time')
    .limit(1)

  if (slotsError || !slots || slots.length === 0) {
    console.error('❌ No available slots found:', slotsError)
    return
  }

  const slotId = slots[0].id
  console.log('✅ Using slot:', slotId)

  // Test data
  const testEmail = `test-${Date.now()}@example.com`
  const bookingData = {
    customer_email: testEmail,
    customer_name: "Test User Complete",
    customer_phone: "07123456789",
    slot_id: slotId,
    service_id: "6856143e-eb1d-4776-bf6b-3f6149f36901",
    vehicle_size: "medium",
    service_address: "123 Test Street, Test City",
    special_instructions: "Complete test booking",
    vehicle_registration: "TEST999",
    vehicle_make: "Toyota",
    vehicle_model: "Corolla",
    vehicle_year: 2020,
    vehicle_color: "Blue",
    vehicle_type: "car",
    payment_method: "cash",
    booking_source: "web",
    created_via: "complete_test"
  }

  console.log('📝 Booking data:', bookingData)

  // Call booking API
  console.log('🎯 Calling booking API...')
  const response = await fetch('http://localhost:3000/api/bookings/enhanced/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bookingData }),
  })

  const result = await response.json()
  
  if (!response.ok) {
    console.error('❌ Booking failed:', result)
    return
  }

  console.log('✅ Booking result:', result)

  // Check if user was created in both auth and public tables
  if (result.data.account_created) {
    console.log('🔍 Checking user creation...')
    
    // Check auth.users
    const authUsersResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    })
    
    if (authUsersResponse.ok) {
      const { users } = await authUsersResponse.json()
      const authUser = users.find(u => u.email === testEmail)
      
      if (authUser) {
        console.log('✅ User found in auth.users:', authUser.id)
        
        // Check public.users
        const { data: publicUser, error: publicUserError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        if (publicUserError) {
          console.error('❌ User NOT found in public.users:', publicUserError)
        } else {
          console.log('✅ User found in public.users:', publicUser.id)
        }
      } else {
        console.error('❌ User NOT found in auth.users')
      }
    }
  }

  // Check if vehicle was created and linked
  if (result.data.user_id) {
    console.log('🚗 Checking vehicle creation...')
    
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', result.data.user_id)
      .eq('registration', 'TEST999')
    
    if (vehiclesError) {
      console.error('❌ Error checking vehicles:', vehiclesError)
    } else if (vehicles.length === 0) {
      console.error('❌ Vehicle NOT created')
    } else {
      console.log('✅ Vehicle created:', vehicles[0].id)
      
      // Check if booking is linked to vehicle
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('vehicle_id')
        .eq('id', result.data.booking_id)
        .single()
      
      if (bookingError) {
        console.error('❌ Error checking booking:', bookingError)
      } else if (!booking.vehicle_id) {
        console.error('❌ Booking NOT linked to vehicle')
      } else {
        console.log('✅ Booking linked to vehicle:', booking.vehicle_id)
      }
    }
  }

  console.log('🎉 Test complete!')
}

testCompleteBooking().catch(console.error)