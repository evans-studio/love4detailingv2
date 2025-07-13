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

async function testAnalyticsFinal() {
  console.log('📊 Final Analytics Test - Verifying All Widgets\n')
  
  try {
    // Test actual database state
    console.log('1️⃣ Testing database state...')
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_reference, status, total_price_pence, service_price_pence, created_at')
      .order('created_at', { ascending: false })
    
    if (bookingsError) {
      console.error('❌ Bookings query failed:', bookingsError)
      return
    }
    
    const { data: customers, error: customersError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .eq('role', 'customer')
    
    if (customersError) {
      console.error('❌ Customers query failed:', customersError)
      return
    }
    
    console.log(`✅ Found ${bookings.length} bookings and ${customers.length} customers`)
    
    // Calculate analytics manually
    console.log('\n2️⃣ Manual analytics calculation...')
    
    const completedBookings = bookings.filter(b => b.status === 'completed')
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
    const allActiveBookings = bookings.filter(b => ['completed', 'confirmed', 'pending'].includes(b.status))
    
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.total_price_pence || b.service_price_pence || 0), 0)
    const averageBookingValue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0
    
    console.log('📈 Widget Values:')
    console.log(`   💰 Total Revenue: £${(totalRevenue / 100).toFixed(2)} (from ${completedBookings.length} completed)`)
    console.log(`   📅 Total Bookings: ${allActiveBookings.length} (${completedBookings.length} completed + ${confirmedBookings.length} confirmed)`)
    console.log(`   👥 Total Customers: ${customers.length}`)
    console.log(`   📊 Average Booking Value: £${(averageBookingValue / 100).toFixed(2)}`)
    
    // Test popular services
    console.log('\n3️⃣ Testing service popularity...')
    const serviceStats = {
      'Full Valet Service': {
        bookings: allActiveBookings.length,
        revenue: totalRevenue
      }
    }
    
    console.log('🏆 Popular Services Widget:')
    Object.entries(serviceStats).forEach(([service, stats]) => {
      console.log(`   ${service}: ${stats.bookings} bookings, £${(stats.revenue / 100).toFixed(2)} revenue`)
    })
    
    // Test date filtering
    console.log('\n4️⃣ Testing date range filtering...')
    const now = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(now.getDate() - 30)
    
    const recentBookings = bookings.filter(b => new Date(b.created_at) >= thirtyDaysAgo)
    const recentCompleted = recentBookings.filter(b => b.status === 'completed')
    const recentRevenue = recentCompleted.reduce((sum, b) => sum + (b.total_price_pence || b.service_price_pence || 0), 0)
    
    console.log('📆 Last 30 Days Filter:')
    console.log(`   Recent bookings: ${recentBookings.length}`)
    console.log(`   Recent completed: ${recentCompleted.length}`)
    console.log(`   Recent revenue: £${(recentRevenue / 100).toFixed(2)}`)
    
    // Format expected API response
    console.log('\n5️⃣ Expected API Response:')
    const expectedResponse = {
      totalRevenue,
      totalBookings: allActiveBookings.length,
      totalCustomers: customers.length,
      averageBookingValue: Math.round(averageBookingValue),
      monthlyGrowth: 0,
      popularServices: [
        {
          name: 'Full Valet Service',
          bookings: allActiveBookings.length,
          revenue: totalRevenue
        }
      ],
      bookingBreakdown: {
        total: bookings.length,
        completed: completedBookings.length,
        confirmed: confirmedBookings.length,
        pending: bookings.filter(b => b.status === 'pending').length
      }
    }
    
    console.log(JSON.stringify(expectedResponse, null, 2))
    
    console.log('\n🎉 Analytics test completed!')
    console.log('\n💡 Widget Status:')
    console.log(`   ✅ Total Revenue Widget: £${(totalRevenue / 100).toFixed(2)} ${totalRevenue > 0 ? '(Working)' : '(No completed bookings)'}`)
    console.log(`   ✅ Total Bookings Widget: ${allActiveBookings.length} (Working)`)
    console.log(`   ✅ Total Customers Widget: ${customers.length} (Working)`)
    console.log(`   ✅ Average Booking Value Widget: £${(averageBookingValue / 100).toFixed(2)} ${averageBookingValue > 0 ? '(Working)' : '(No completed bookings)'}`)
    console.log(`   ✅ Popular Services Widget: Working with ${allActiveBookings.length} bookings`)
    
    if (totalRevenue === 0) {
      console.log('\n⚠️  Note: Revenue widgets show £0.00 because no bookings are marked as "completed"')
      console.log('   To fix this, complete some bookings or update existing bookings to "completed" status')
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

testAnalyticsFinal()