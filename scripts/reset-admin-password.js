#!/usr/bin/env node

/**
 * Admin Password Reset Script
 * Resets the password for an admin user directly through Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  const envVars = envFile.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=')
    if (key && value) {
      acc[key.trim()] = value.trim().replace(/^["']|["']$/g, '')
    }
    return acc
  }, {})
  
  Object.assign(process.env, envVars)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetAdminPassword(email, newPassword) {
  try {
    console.log('🔄 Resetting password for admin:', email)
    
    // First, check if user exists
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers()
    
    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError.message)
      return false
    }
    
    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.error('❌ User not found:', email)
      console.log('💡 Creating new admin user...')
      
      // Create new admin user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Paul Evans',
          role: 'admin'
        }
      })
      
      if (createError) {
        console.error('❌ Error creating admin user:', createError.message)
        return false
      }
      
      console.log('✅ Admin user created successfully:', newUser.user.email)
      
      // Create user profile in database
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          user_id: newUser.user.id,
          email: email,
          full_name: 'Paul Evans',
          role: 'admin',
          is_active: true,
          email_verified_at: new Date().toISOString()
        })
      
      if (profileError) {
        console.error('❌ Error creating user profile:', profileError.message)
        return false
      }
      
      console.log('✅ Admin profile created successfully')
      return true
    }
    
    // Update existing user password
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )
    
    if (updateError) {
      console.error('❌ Error updating password:', updateError.message)
      return false
    }
    
    console.log('✅ Password reset successfully for:', email)
    
    // Make sure user has admin role in database
    const { error: roleError } = await supabase
      .from('users')
      .update({ role: 'admin', is_active: true })
      .eq('user_id', user.id)
    
    if (roleError) {
      console.error('⚠️  Warning: Could not update user role:', roleError.message)
    } else {
      console.log('✅ Admin role confirmed')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

// Main execution
async function main() {
  const email = 'paul@evans-studio.co.uk'
  const newPassword = 'TempPassword123!'
  
  console.log('🚀 Starting admin password reset...')
  console.log('📧 Email:', email)
  console.log('🔑 New Password:', newPassword)
  console.log('')
  
  const success = await resetAdminPassword(email, newPassword)
  
  if (success) {
    console.log('')
    console.log('✅ Password reset completed successfully!')
    console.log('📝 Login details:')
    console.log('   Email:', email)
    console.log('   Password:', newPassword)
    console.log('')
    console.log('⚠️  Please change this password after logging in!')
    console.log('🔗 Login URL: http://localhost:3002/auth/login')
  } else {
    console.log('')
    console.log('❌ Password reset failed')
    process.exit(1)
  }
}

main().catch(console.error)