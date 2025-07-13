#!/usr/bin/env node

/**
 * Test Email Reset Script
 * Tests if password reset emails are being sent
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

async function testEmailReset() {
  const email = 'paul@evans-studio.co.uk'
  
  console.log('📧 Testing password reset email...')
  console.log('📧 Email:', email)
  console.log('🔗 Redirect URL: http://localhost:3002/auth/update-password')
  console.log('')
  
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3002/auth/update-password'
    })
    
    if (error) {
      console.error('❌ Email reset failed:', error.message)
      console.log('')
      console.log('💡 Possible causes:')
      console.log('1. Supabase email templates not configured')
      console.log('2. Email service (Resend) not properly integrated')
      console.log('3. Email going to spam folder')
      console.log('4. Rate limiting on email sends')
      console.log('')
      console.log('🔧 Solutions:')
      console.log('1. Check Supabase dashboard > Authentication > Email Templates')
      console.log('2. Check Resend dashboard for delivery status')
      console.log('3. Check spam folder')
      console.log('4. Use direct password reset: node scripts/direct-password-reset.js')
      return false
    }
    
    console.log('✅ Password reset email sent successfully!')
    console.log('📬 Check your email inbox and spam folder')
    console.log('⏰ Email should arrive within 1-2 minutes')
    console.log('')
    console.log('💡 If you don\'t receive the email:')
    console.log('1. Check spam folder')
    console.log('2. Try a different email address')
    console.log('3. Use direct password reset: node scripts/direct-password-reset.js')
    
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

testEmailReset().catch(console.error)