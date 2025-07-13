#!/usr/bin/env node

/**
 * Test Login Script
 * Tests if login credentials work
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
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  const email = 'paul@evans-studio.co.uk'
  const password = 'TempPassword123!'
  
  console.log('🔐 Testing login credentials...')
  console.log('📧 Email:', email)
  console.log('🔑 Password:', password)
  console.log('')
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })
    
    if (error) {
      console.error('❌ Login failed:', error.message)
      console.log('')
      console.log('💡 Possible solutions:')
      console.log('1. Try the reset password page: http://localhost:3002/auth/reset-password')
      console.log('2. Run the direct password reset script: node scripts/direct-password-reset.js')
      console.log('3. Check if user exists in Supabase dashboard')
      return false
    }
    
    console.log('✅ Login successful!')
    console.log('👤 User ID:', data.user.id)
    console.log('📧 Email:', data.user.email)
    console.log('🔗 Login URL: http://localhost:3002/auth/login')
    console.log('')
    console.log('🎉 You can now login with these credentials!')
    
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

testLogin().catch(console.error)