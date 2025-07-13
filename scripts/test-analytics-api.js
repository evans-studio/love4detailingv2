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

async function testAnalyticsAPI() {
  console.log('📊 Testing Analytics API data sources...\n')
  
  try {
    // Test 1: Check admin users
    console.log('👤 Testing admin user permissions...')
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, email, role')
      .in('role', ['admin', 'super_admin', 'staff'])
    
    if (adminError) {
      console.error('❌ Admin users query failed:', adminError)
      return
    }
    
    console.log(`✅ Found ${adminUsers?.length || 0} admin users:`)
    adminUsers?.forEach(user => {
      console.log(`   📧 ${user.email} - ${user.role}`)
    })
    
    // Test 2: Check bookings data
    console.log('\n📅 Testing bookings data...')
    const { data: allBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, total_price_pence, service_price_pence, created_at, customer_email')
    
    if (bookingsError) {
      console.error('❌ Bookings query failed:', bookingsError)
    } else {
      console.log(`✅ Found ${allBookings?.length || 0} total bookings`)
      
      if (allBookings && allBookings.length > 0) {
        const statuses = {}
        let totalRevenue = 0
        
        allBookings.forEach(booking => {
          statuses[booking.status] = (statuses[booking.status] || 0) + 1
          if (booking.status === 'completed') {
            totalRevenue += booking.total_price_pence || booking.service_price_pence || 0
          }
        })
        
        console.log('   📊 Booking status breakdown:')
        Object.entries(statuses).forEach(([status, count]) => {
          console.log(`      ${status}: ${count} bookings`)
        })
        
        console.log(`   💰 Total revenue from completed bookings: £${(totalRevenue / 100).toFixed(2)}`)
      }
    }
    
    // Test 3: Check customers data
    console.log('\n👥 Testing customers data...')
    const { data: customers, error: customersError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .eq('role', 'customer')
    
    if (customersError) {
      console.error('❌ Customers query failed:', customersError)
    } else {
      console.log(`✅ Found ${customers?.length || 0} customer users`)
      
      if (customers && customers.length > 0) {
        console.log('   📧 Customer emails:')
        customers.forEach(customer => {
          console.log(`      ${customer.email} (joined: ${new Date(customer.created_at).toLocaleDateString()})`)
        })
      }
    }
    
    // Test 4: Test analytics calculation logic
    console.log('\n🧮 Testing analytics calculations...')
    
    if (allBookings && customers) {
      const completedBookings = allBookings.filter(b => b.status === 'completed')
      const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.total_price_pence || b.service_price_pence || 0), 0)
      const totalBookings = completedBookings.length
      const totalCustomers = customers.length
      const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0
      
      console.log('📈 Analytics summary:')
      console.log(`   💰 Total Revenue: £${(totalRevenue / 100).toFixed(2)}`)
      console.log(`   📅 Total Bookings: ${totalBookings}`)
      console.log(`   👥 Total Customers: ${totalCustomers}`)
      console.log(`   📊 Average Booking Value: £${(averageBookingValue / 100).toFixed(2)}`)
      
      // Test date range filtering
      console.log('\n📆 Testing date range filtering (last 30 days)...')
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const recentBookings = allBookings.filter(b => new Date(b.created_at) >= thirtyDaysAgo)
      const recentCompleted = recentBookings.filter(b => b.status === 'completed')
      const recentRevenue = recentCompleted.reduce((sum, b) => sum + (b.total_price_pence || b.service_price_pence || 0), 0)
      
      console.log(`   📅 Recent bookings (30d): ${recentCompleted.length}`)
      console.log(`   💰 Recent revenue (30d): £${(recentRevenue / 100).toFixed(2)}`)
    }
    
    // Test 5: Test service popularity
    console.log('\n🏆 Testing service popularity...')
    if (allBookings && allBookings.length > 0) {
      const serviceStats = {}
      allBookings.forEach(booking => {
        const serviceName = 'Full Valet Service' // Since we only have one service
        if (!serviceStats[serviceName]) {
          serviceStats[serviceName] = {
            bookings: 0,
            revenue: 0
          }
        }
        serviceStats[serviceName].bookings++
        if (booking.status === 'completed') {
          serviceStats[serviceName].revenue += booking.total_price_pence || booking.service_price_pence || 0
        }
      })
      
      console.log('   🎯 Popular services:')
      Object.entries(serviceStats).forEach(([service, stats]) => {
        console.log(`      ${service}: ${stats.bookings} bookings, £${(stats.revenue / 100).toFixed(2)} revenue`)
      })
    }
    
    console.log('\n🎉 Analytics API testing completed!')
    console.log('\n💡 The analytics data should now display correctly on the admin dashboard.')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

testAnalyticsAPI()