#!/usr/bin/env node

/**
 * Check User Roles Script
 * Checks current user roles and permissions
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables manually
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

async function checkUsers() {
  console.log('👥 CHECKING USER ROLES AND PERMISSIONS')
  console.log('=' .repeat(50))
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.log(`   ❌ Error fetching users: ${error.message}`)
      return
    }
    
    console.log(`   📊 Found ${users?.length || 0} users:`)
    
    for (const user of users || []) {
      console.log(`\n   👤 User: ${user.full_name || 'No name'} (${user.email})`)
      console.log(`       ID: ${user.id}`)
      console.log(`       Role: ${user.role || 'No role'}`)
      console.log(`       Active: ${user.is_active ? 'Yes' : 'No'}`)
      console.log(`       Email verified: ${user.email_verified_at ? 'Yes' : 'No'}`)
      console.log(`       Created: ${new Date(user.created_at).toLocaleDateString()}`)
      console.log(`       Last login: ${user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}`)
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
  }
}

async function updateUserRole() {
  console.log('\n🔧 UPDATING USER ROLE TO ADMIN')
  console.log('=' .repeat(50))
  
  try {
    // Get the first user (likely the main user)
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (fetchError) {
      console.log(`   ❌ Error fetching users: ${fetchError.message}`)
      return
    }
    
    if (!users || users.length === 0) {
      console.log(`   ❌ No users found`)
      return
    }
    
    const user = users[0]
    console.log(`   👤 Updating user: ${user.full_name} (${user.email})`)
    console.log(`       Current role: ${user.role || 'No role'}`)
    
    // Update user role to admin
    const { data, error } = await supabase
      .from('users')
      .update({ 
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
    
    if (error) {
      console.log(`   ❌ Error updating user role: ${error.message}`)
      return
    }
    
    console.log(`   ✅ Successfully updated user role to admin`)
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
  }
}

async function main() {
  console.log('🔍 USER ROLE CHECK AND UPDATE')
  console.log('Checking current user roles and updating if needed')
  console.log('=' .repeat(70))
  
  try {
    // Step 1: Check current users
    await checkUsers()
    
    // Step 2: Update user role if needed
    await updateUserRole()
    
    // Step 3: Verify update
    await checkUsers()
    
    console.log('\n✅ USER ROLE UPDATE COMPLETE')
    console.log('=' .repeat(50))
    console.log('🎯 User should now have admin access')
    
  } catch (error) {
    console.error('Error in process:', error)
  }
}

main().catch(console.error)