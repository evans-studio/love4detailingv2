const { readFileSync } = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Load environment variables manually
const envFile = readFileSync('.env.local', 'utf8')
const envVars = {}
envFile.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, value] = line.split('=')
    envVars[key] = value
  }
})

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

async function createTestAnalyticsData() {
  console.log('📊 Creating test analytics data...\n')
  
  try {
    // Get a customer user for testing
    const { data: customers, error: customersError } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'customer')
      .limit(1)
    
    if (customersError || !customers || customers.length === 0) {
      console.error('❌ No customer users found:', customersError)
      return
    }
    
    const testCustomer = customers[0]
    console.log(`🎯 Using customer: ${testCustomer.email}`)
    
    // Create some test bookings with different statuses and dates
    const testBookings = [
      {
        booking_reference: 'TEST001',
        user_id: testCustomer.id,
        customer_email: testCustomer.email,
        customer_name: 'Test Customer',
        customer_phone: '+44 1234 567890',
        service_id: 'full-valet',
        vehicle_size: 'medium',
        vehicle_make: 'BMW',
        vehicle_model: '3 Series',
        vehicle_color: 'Black',
        vehicle_registration: 'TE57 ABC',
        booking_date: '2025-07-11',
        start_time: '10:00:00',
        end_time: '12:00:00',
        service_address: '123 Test Street, Test City, TE1 2ST',
        total_price_pence: 7500, // £75.00
        service_price_pence: 7500,
        travel_charge_pence: 0,
        status: 'completed',
        notes: 'Test completed booking for analytics',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        updated_at: new Date().toISOString()
      },
      {
        booking_reference: 'TEST002',
        user_id: testCustomer.id,
        customer_email: testCustomer.email,
        customer_name: 'Test Customer',
        customer_phone: '+44 1234 567890',
        service_id: 'full-valet',
        vehicle_size: 'large',
        vehicle_make: 'Audi',
        vehicle_model: 'A6',
        vehicle_color: 'White',
        vehicle_registration: 'TE57 XYZ',
        booking_date: '2025-07-15',
        start_time: '14:00:00',
        end_time: '16:30:00',
        service_address: '456 Test Avenue, Test Town, TE3 4QR',
        total_price_pence: 8500, // £85.00
        service_price_pence: 8500,
        travel_charge_pence: 0,
        status: 'completed',
        notes: 'Test completed booking for analytics - large vehicle',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        updated_at: new Date().toISOString()
      },
      {
        booking_reference: 'TEST003',
        user_id: testCustomer.id,
        customer_email: testCustomer.email,
        customer_name: 'Test Customer',
        customer_phone: '+44 1234 567890',
        service_id: 'full-valet',
        vehicle_size: 'small',
        vehicle_make: 'Ford',
        vehicle_model: 'Fiesta',
        vehicle_color: 'Blue',
        vehicle_registration: 'TE57 DEF',
        booking_date: '2025-07-20',
        start_time: '09:00:00',
        end_time: '10:30:00',
        service_address: '789 Test Close, Test Village, TE5 6GH',
        total_price_pence: 6000, // £60.00
        service_price_pence: 6000,
        travel_charge_pence: 0,
        status: 'confirmed',
        notes: 'Test confirmed booking for analytics',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        updated_at: new Date().toISOString()
      }
    ]
    
    console.log('📝 Creating test bookings...')
    
    for (const booking of testBookings) {
      const { data, error } = await supabase
        .from('bookings')
        .insert([booking])
        .select()
        .single()
      
      if (error) {
        console.error(`❌ Failed to create booking ${booking.booking_reference}:`, error)
      } else {
        console.log(`✅ Created booking ${booking.booking_reference} (${booking.status}) - £${(booking.total_price_pence / 100).toFixed(2)}`)
      }
    }
    
    // Now test the analytics calculation
    console.log('\n🧮 Testing updated analytics...')
    
    const { data: allBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, total_price_pence, created_at, booking_reference')
    
    if (bookingsError) {
      console.error('❌ Failed to fetch bookings:', bookingsError)
      return
    }
    
    const completedBookings = allBookings.filter(b => b.status === 'completed')
    const confirmedBookings = allBookings.filter(b => b.status === 'confirmed')
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.total_price_pence || 0), 0)
    const averageBookingValue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0
    
    console.log('📊 Analytics Summary:')
    console.log(`   📅 Total Bookings: ${allBookings.length}`)
    console.log(`   ✅ Completed Bookings: ${completedBookings.length}`)
    console.log(`   📋 Confirmed Bookings: ${confirmedBookings.length}`)
    console.log(`   💰 Total Revenue: £${(totalRevenue / 100).toFixed(2)}`)
    console.log(`   📈 Average Booking Value: £${(averageBookingValue / 100).toFixed(2)}`)
    
    console.log('\n📋 Booking Details:')
    allBookings.forEach(booking => {
      console.log(`   ${booking.booking_reference || booking.id}: ${booking.status} - £${((booking.total_price_pence || 0) / 100).toFixed(2)}`)
    })
    
    console.log('\n🎉 Test analytics data created successfully!')
    console.log('💡 The analytics dashboard should now show meaningful data.')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

createTestAnalyticsData()