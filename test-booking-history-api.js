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

async function testBookingHistoryAPI() {
  console.log('📋 Testing booking history API with vehicle details...')

  // Test user from previous tests
  const testUserId = '62d31c0b-62cd-4018-aebc-6349dfecf5e7'
  
  console.log(`🔍 Testing API for user: ${testUserId}`)
  
  // Simulate API call by implementing the same logic
  const { createClient } = require('@supabase/supabase-js')
  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Direct SQL query for user bookings (same as API)
  const { data: bookings, error } = await serviceSupabase
    .from('bookings')
    .select(`
      id,
      booking_reference,
      status,
      payment_status,
      total_price_pence,
      customer_email,
      customer_name,
      customer_phone,
      customer_instructions,
      notes,
      created_at,
      updated_at,
      confirmed_at,
      completed_at,
      cancelled_at,
      available_slots (
        slot_date,
        start_time,
        end_time
      ),
      services (
        name,
        code,
        base_duration_minutes
      ),
      vehicles (
        registration,
        make,
        model,
        year,
        color,
        size
      )
    `)
    .eq('user_id', testUserId)
    .order('created_at', { ascending: false })
    .range(0, 49)

  console.log('API: Query completed. Data:', bookings?.length || 0, 'bookings. Error:', error?.message || 'none')

  if (error) {
    console.error('❌ Booking history query error:', error)
    return
  }

  if (!bookings || bookings.length === 0) {
    console.log('❌ No bookings found for user')
    return
  }

  console.log(`✅ Found ${bookings.length} bookings`)

  // Transform data to match expected format (same as API)
  const transformedBookings = bookings.map((booking) => ({
    booking_id: booking.id,
    booking_reference: booking.booking_reference,
    booking_status: booking.status,
    payment_status: booking.payment_status,
    total_price_pence: booking.total_price_pence,
    special_instructions: booking.special_requests,
    created_at: booking.created_at,
    updated_at: booking.updated_at,
    confirmed_at: booking.confirmed_at,
    completed_at: booking.completed_at,
    cancelled_at: booking.cancelled_at,
    
    // Time slot info
    appointment_date: booking.available_slots?.slot_date,
    appointment_time: booking.available_slots?.start_time,
    slot_end_time: booking.available_slots?.end_time,
    service_duration: booking.services?.base_duration_minutes || 120,
    
    // Service info
    service_name: booking.services?.name,
    service_code: booking.services?.code,
    
    // Vehicle info
    vehicle_registration: booking.vehicles?.registration,
    vehicle_make: booking.vehicles?.make,
    vehicle_model: booking.vehicles?.model,
    vehicle_year: booking.vehicles?.year,
    vehicle_color: booking.vehicles?.color,
    vehicle_size: booking.vehicles?.size,
    
    // Customer info
    customer_name: booking.customer_name,
    customer_email: booking.customer_email,
    customer_phone: booking.customer_phone,
    
    // Additional fields for component compatibility
    service_location: 'Customer Address',
    notes: booking.customer_instructions || booking.notes
  }))

  console.log('\n🎯 Booking History with Vehicle Details:')
  transformedBookings.forEach((booking, index) => {
    console.log(`\n📋 Booking ${index + 1}:`)
    console.log(`   Reference: ${booking.booking_reference}`)
    console.log(`   Status: ${booking.booking_status}`)
    console.log(`   Service: ${booking.service_name || 'N/A'}`)
    console.log(`   Vehicle: ${booking.vehicle_registration || 'N/A'} (${booking.vehicle_make || 'N/A'} ${booking.vehicle_model || 'N/A'})`)
    console.log(`   Year: ${booking.vehicle_year || 'N/A'} | Color: ${booking.vehicle_color || 'N/A'} | Size: ${booking.vehicle_size || 'N/A'}`)
    console.log(`   Date: ${booking.appointment_date || 'N/A'} at ${booking.appointment_time || 'N/A'}`)
    console.log(`   Customer: ${booking.customer_name} (${booking.customer_email})`)
    console.log(`   Price: £${booking.total_price_pence ? (booking.total_price_pence / 100).toFixed(2) : '0.00'}`)
    console.log(`   Created: ${booking.created_at ? new Date(booking.created_at).toLocaleString() : 'N/A'}`)
    
    // Check if vehicle info is complete
    const vehicleComplete = booking.vehicle_registration && booking.vehicle_make && booking.vehicle_model
    console.log(`   Vehicle Info Complete: ${vehicleComplete ? '✅' : '❌'}`)
  })

  console.log('\n📊 Summary:')
  const withVehicles = transformedBookings.filter(b => b.vehicle_registration)
  const withServices = transformedBookings.filter(b => b.service_name)
  const withTimeSlots = transformedBookings.filter(b => b.appointment_date)
  
  console.log(`   Total Bookings: ${transformedBookings.length}`)
  console.log(`   With Vehicle Details: ${withVehicles.length}`)
  console.log(`   With Service Details: ${withServices.length}`)
  console.log(`   With Time Slot Details: ${withTimeSlots.length}`)

  if (withVehicles.length === transformedBookings.length && 
      withServices.length === transformedBookings.length &&
      withTimeSlots.length === transformedBookings.length) {
    console.log('✅ All bookings have complete details!')
  } else {
    console.log('❌ Some bookings missing details - may need to check foreign key relationships')
  }

  console.log('\n🎉 Booking history API test complete!')
}

testBookingHistoryAPI().catch(console.error)