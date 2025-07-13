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

async function testCustomerDetailsAPI() {
  console.log('🔍 Testing Customer Details API...\n')
  
  try {
    // 1. Get an admin user and a customer user
    console.log('1️⃣ Getting admin and customer users...')
    
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, email, role')
      .in('role', ['admin', 'super_admin', 'staff'])
      .limit(1)
    
    if (adminError || !adminUsers || adminUsers.length === 0) {
      console.error('❌ No admin users found:', adminError)
      return
    }
    
    const { data: customerUsers, error: customerError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('role', 'customer')
      .limit(1)
    
    if (customerError || !customerUsers || customerUsers.length === 0) {
      console.error('❌ No customer users found:', customerError)
      return
    }
    
    const adminUser = adminUsers[0]
    const customerUser = customerUsers[0]
    
    console.log(`✅ Admin user: ${adminUser.email} (${adminUser.role})`)
    console.log(`✅ Customer user: ${customerUser.email}`)
    
    // 2. Test the stored procedure directly
    console.log('\n2️⃣ Testing stored procedure directly...')
    
    try {
      const { data: procResult, error: procError } = await supabase
        .rpc('get_customer_profile_admin', {
          p_admin_id: adminUser.id,
          p_customer_id: customerUser.id
        })
      
      if (procError) {
        console.error('❌ Stored procedure error:', procError)
        console.error('   Code:', procError.code)
        console.error('   Message:', procError.message)
        console.error('   Details:', procError.details)
        console.error('   Hint:', procError.hint)
      } else {
        console.log('✅ Stored procedure executed successfully')
        console.log('📊 Result keys:', Object.keys(procResult || {}))
        
        if (procResult?.error) {
          console.log('⚠️  Procedure returned error:', procResult.error)
        } else {
          console.log('✅ Customer profile data received')
          if (procResult?.customer_profile) {
            console.log('   Customer profile: ✅')
          }
          if (procResult?.booking_history) {
            console.log(`   Booking history: ${Array.isArray(procResult.booking_history) ? procResult.booking_history.length : 0} bookings`)
          }
          if (procResult?.vehicles) {
            console.log(`   Vehicles: ${Array.isArray(procResult.vehicles) ? procResult.vehicles.length : 0} vehicles`)
          }
          if (procResult?.statistics) {
            console.log('   Statistics: ✅')
          }
        }
      }
    } catch (procError) {
      console.error('❌ Stored procedure execution failed:', procError)
    }
    
    // 3. Check for missing tables that might cause the error
    console.log('\n3️⃣ Checking required tables...')
    
    const requiredTables = ['users', 'bookings', 'vehicles', 'services', 'available_slots', 'customer_rewards']
    
    for (const table of requiredTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`❌ Table '${table}': ${error.message}`)
        } else {
          console.log(`✅ Table '${table}': exists and accessible`)
        }
      } catch (e) {
        console.log(`❌ Table '${table}': ${e.message}`)
      }
    }
    
    // 4. Check admin_notes table specifically (likely causing the issue)
    console.log('\n4️⃣ Checking admin_notes table...')
    try {
      const { data, error } = await supabase
        .from('admin_notes')
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`❌ admin_notes table: ${error.message}`)
        console.log('💡 This is likely causing the 500 error in the stored procedure')
      } else {
        console.log(`✅ admin_notes table: exists and accessible`)
      }
    } catch (e) {
      console.log(`❌ admin_notes table: ${e.message}`)
      console.log('💡 This is likely causing the 500 error in the stored procedure')
    }
    
    // 5. Test a simplified version without admin_notes
    console.log('\n5️⃣ Testing simplified customer data query...')
    try {
      const { data: customerData, error: customerDataError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          phone,
          role,
          is_active,
          created_at
        `)
        .eq('id', customerUser.id)
        .single()
      
      if (customerDataError) {
        console.error('❌ Simple customer query failed:', customerDataError)
      } else {
        console.log('✅ Simple customer query successful')
        console.log('   Customer:', customerData.full_name, customerData.email)
      }
    } catch (e) {
      console.error('❌ Simple customer query error:', e)
    }
    
    console.log('\n🎯 Customer Details API Test Summary:')
    console.log('━'.repeat(50))
    console.log('💡 If admin_notes table is missing, the stored procedure will fail')
    console.log('💡 Solution: Either create the admin_notes table or modify the stored procedure')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

testCustomerDetailsAPI()