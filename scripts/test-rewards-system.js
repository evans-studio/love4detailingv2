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

async function testRewardsSystem() {
  console.log('🎁 Testing Love4Detailing Rewards System...\n')
  
  try {
    // 1. Check customer_rewards table
    console.log('📊 Checking customer rewards records...')
    const { data: rewards, error: rewardsError } = await supabase
      .from('customer_rewards')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (rewardsError) {
      console.error('❌ Error fetching rewards:', rewardsError)
    } else {
      console.log(`✅ Found ${rewards?.length || 0} customer rewards records:`)
      rewards?.forEach(r => {
        console.log(`   📧 ${r.customer_email} - 🏆 ${r.total_points} points (${r.current_tier} tier)`)
      })
    }
    
    // 2. Check reward_transactions table
    console.log('\n💰 Checking reward transactions...')
    const { data: transactions, error: transError } = await supabase
      .from('reward_transactions')
      .select(`
        id,
        transaction_type,
        points_amount,
        description,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (transError) {
      console.error('❌ Error fetching transactions:', transError)
    } else {
      console.log(`✅ Found ${transactions?.length || 0} recent transactions:`)
      transactions?.forEach(t => {
        const date = new Date(t.created_at).toLocaleDateString()
        console.log(`   📝 ${date}: ${t.transaction_type} ${t.points_amount} points - ${t.description}`)
      })
    }
    
    // 3. Check if any users are missing rewards records
    console.log('\n👥 Checking for users without rewards records...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('role', 'customer')
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
    } else {
      const rewardUserIds = rewards?.map(r => r.user_id) || []
      const missingRewards = users?.filter(u => !rewardUserIds.includes(u.id)) || []
      
      if (missingRewards.length > 0) {
        console.log(`⚠️  Found ${missingRewards.length} customer users missing rewards records:`)
        missingRewards.forEach(u => {
          console.log(`   📧 ${u.email} (${u.id})`)
        })
        
        // Create missing rewards records
        console.log('\n🔧 Creating missing rewards records...')
        for (const user of missingRewards) {
          const { error: createError } = await supabase
            .from('customer_rewards')
            .insert([{
              user_id: user.id,
              customer_email: user.email,
              total_points: 0,
              points_lifetime: 0,
              points_pending: 0,
              current_tier: 'bronze',
              tier_progress: 0
            }])
          
          if (createError) {
            console.error(`❌ Failed to create rewards record for ${user.email}:`, createError)
          } else {
            console.log(`✅ Created rewards record for ${user.email}`)
          }
        }
      } else {
        console.log('✅ All customer users have rewards records')
      }
    }
    
    // 4. Test rewards API endpoint simulation
    console.log('\n🧪 Testing rewards calculation logic...')
    
    const testPoints = [0, 150, 600, 1200, 2500]
    testPoints.forEach(points => {
      let tier = 'bronze'
      if (points >= 2000) tier = 'platinum'
      else if (points >= 1000) tier = 'gold'
      else if (points >= 500) tier = 'silver'
      
      console.log(`   🎯 ${points} points → ${tier} tier`)
    })
    
    console.log('\n🎉 Rewards system test completed!')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

testRewardsSystem()