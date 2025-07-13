#!/usr/bin/env node

/**
 * Direct Password Reset Script
 * Allows direct password reset without email verification
 * Use this when email delivery is not working
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

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
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, resolve)
  })
}

async function directPasswordReset() {
  try {
    console.log('🔑 Direct Password Reset Tool')
    console.log('==============================')
    console.log('')
    
    const email = await askQuestion('Enter email address: ')
    const newPassword = await askQuestion('Enter new password: ')
    
    console.log('')
    console.log('🔄 Resetting password for:', email)
    
    // Get user by email
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers()
    
    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError.message)
      return false
    }
    
    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.error('❌ User not found:', email)
      return false
    }
    
    // Update password directly
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )
    
    if (updateError) {
      console.error('❌ Error updating password:', updateError.message)
      return false
    }
    
    console.log('✅ Password reset successfully!')
    console.log('📝 Login details:')
    console.log('   Email:', email)
    console.log('   Password:', newPassword)
    console.log('')
    console.log('🔗 Login URL: http://localhost:3002/auth/login')
    
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

async function main() {
  const success = await directPasswordReset()
  rl.close()
  
  if (!success) {
    process.exit(1)
  }
}

main().catch(console.error)