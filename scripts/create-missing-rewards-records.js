#!/usr/bin/env node

/**
 * Create Missing Rewards Records Script
 * Ensures all customer users have rewards records
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, value] = line.split('=')
      if (key && value) {
        process.env[key.trim()] = value.trim()
      }
    }
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createMissingRewardsRecords() {
  console.log('🎁 CREATING MISSING REWARDS RECORDS')
  console.log('=' .repeat(50))
  
  try {
    // Get all customer users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .eq('role', 'customer')
      .eq('is_active', true)
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
      return
    }
    
    console.log(`📋 Found ${users?.length || 0} customer users`)
    
    let created = 0
    let existing = 0
    
    for (const user of users || []) {
      console.log(`\n🔍 Checking user: ${user.email}`)
      
      // Check if user already has a rewards record
      const { data: existingRewards, error: existingError } = await supabase
        .from('customer_rewards')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (existingError && existingError.code === 'PGRST116') {
        // No rewards record exists, create one
        console.log(`   ✅ Creating rewards record for ${user.email}`)
        
        const { data: newRewards, error: createError } = await supabase
          .from('customer_rewards')
          .insert([{
            user_id: user.id,
            customer_email: user.email,
            total_points: 0,
            points_lifetime: 0,
            points_pending: 0,
            current_tier: 'bronze',
            tier_progress: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()
        
        if (createError) {
          console.error(`   ❌ Error creating rewards for ${user.email}:`, createError.message)
        } else {
          console.log(`   ✅ Created rewards record for ${user.email}`)
          created++
        }
      } else if (existingError) {
        console.error(`   ❌ Error checking existing rewards for ${user.email}:`, existingError.message)
      } else {
        console.log(`   ℹ️  Rewards record already exists for ${user.email}`)
        existing++
      }
    }
    
    console.log(`\n📊 SUMMARY:`)
    console.log(`   ✅ Created: ${created} new rewards records`)
    console.log(`   ℹ️  Existing: ${existing} rewards records`)
    console.log(`   📋 Total: ${created + existing} rewards records`)
    
    // Verify all users now have rewards records
    const { data: finalCheck, error: finalError } = await supabase
      .from('customer_rewards')
      .select('id, user_id, customer_email, total_points, current_tier')
    
    if (finalError) {
      console.error('❌ Error in final verification:', finalError.message)
    } else {
      console.log(`\n🔍 FINAL VERIFICATION:`)
      console.log(`   📋 Total rewards records in database: ${finalCheck?.length || 0}`)
      finalCheck?.forEach(record => {
        console.log(`   - ${record.customer_email}: ${record.total_points} points, ${record.current_tier} tier`)
      })
    }
    
  } catch (error) {
    console.error('💥 Error creating missing rewards records:', error)
  }
}

createMissingRewardsRecords().catch(console.error)