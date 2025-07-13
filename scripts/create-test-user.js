#!/usr/bin/env node

/**
 * Create a test user for real-time testing
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables manually
const envLocal = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
const envVars = {}
envLocal.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    envVars[key] = value
  }
})

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

async function createTestUser() {
  console.log('🔐 Creating test user...')
  
  try {
    // Create test user with auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'testuser@example.com',
      password: 'password123',
      email_confirm: true
    })
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      return
    }
    
    console.log('✅ Test user created:', authData.user.id)
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: 'testuser@example.com',
        full_name: 'Test User',
        role: 'user'
      })
    
    if (profileError) {
      console.error('❌ Profile error:', profileError)
      return
    }
    
    console.log('✅ Test profile created')
    console.log('📝 Test user ID:', authData.user.id)
    
    return authData.user.id
    
  } catch (error) {
    console.error('❌ Failed to create test user:', error)
  }
}

// Run if called directly
if (require.main === module) {
  createTestUser().then((userId) => {
    console.log('\n🎉 Test user ready!')
    console.log('User ID:', userId)
    process.exit(0)
  })
}

module.exports = createTestUser