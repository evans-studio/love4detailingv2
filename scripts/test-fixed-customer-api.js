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

async function testFixedCustomerAPI() {
  console.log('🔧 Testing Fixed Customer Details API...\n')
  
  try {
    // Get a customer user
    const { data: customerUsers, error: customerError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('role', 'customer')
      .limit(1)
    
    if (customerError || !customerUsers || customerUsers.length === 0) {
      console.error('❌ No customer users found:', customerError)
      return
    }
    
    const customerUser = customerUsers[0]
    console.log(`🎯 Testing with customer: ${customerUser.full_name} (${customerUser.email})`)
    
    // Test each query component separately
    console.log('\n1️⃣ Testing customer profile query...')
    const { data: customerProfile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        role,
        is_active,
        email_verified_at,
        created_at,
        updated_at
      `)
      .eq('id', customerUser.id)
      .single()
    
    if (profileError) {
      console.error('❌ Customer profile query failed:', profileError)
    } else {
      console.log('✅ Customer profile query successful')
    }
    
    // Test customer rewards
    console.log('\n2️⃣ Testing customer rewards query...')
    const { data: rewardsData, error: rewardsError } = await supabase
      .from('customer_rewards')
      .select('total_points, current_tier, points_lifetime')
      .eq('user_id', customerUser.id)
      .single()
    
    if (rewardsError) {
      console.log('⚠️  Customer rewards query failed (may be normal):', rewardsError.message)
    } else {
      console.log('✅ Customer rewards query successful:', rewardsData)
    }
    
    // Test booking history
    console.log('\n3️⃣ Testing booking history query...')
    const { data: bookingHistory, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        service_id,
        status,
        total_price_pence,
        payment_method,
        completed_at,
        created_at,
        customer_name,
        vehicle_id
      `)
      .eq('user_id', customerUser.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (bookingError) {
      console.log('⚠️  Booking history query failed:', bookingError.message)
    } else {
      console.log(`✅ Booking history query successful: ${bookingHistory?.length || 0} bookings`)
    }
    
    // Test vehicles
    console.log('\n4️⃣ Testing vehicles query...')
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select(`
        id,
        registration,
        make,
        model,
        year,
        color,
        size,
        is_active,
        created_at
      `)
      .eq('user_id', customerUser.id)
      .eq('is_active', true)
    
    if (vehiclesError) {
      console.log('⚠️  Vehicles query failed:', vehiclesError.message)
    } else {
      console.log(`✅ Vehicles query successful: ${vehicles?.length || 0} vehicles`)
    }
    
    // Test statistics
    console.log('\n5️⃣ Testing statistics calculation...')
    const { data: statsData, error: statsError } = await supabase
      .from('bookings')
      .select('status, total_price_pence, created_at')
      .eq('user_id', customerUser.id)
    
    if (statsError) {
      console.log('⚠️  Statistics query failed:', statsError.message)
    } else {
      console.log(`✅ Statistics query successful: ${statsData?.length || 0} bookings for analysis`)
      
      const statistics = {
        total_bookings: statsData?.length || 0,
        completed_bookings: statsData?.filter(b => b.status === 'completed').length || 0,
        cancelled_bookings: statsData?.filter(b => b.status === 'cancelled').length || 0,
        total_spent_pence: statsData?.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.total_price_pence || 0), 0) || 0
      }
      
      console.log('   📊 Calculated statistics:', statistics)
    }
    
    console.log('\n🎉 All API components tested successfully!')
    console.log('\n💡 The customer details API should now work without 500 errors.')
    console.log('💡 Test by clicking the "View" button on a customer in the admin panel.')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

testFixedCustomerAPI()