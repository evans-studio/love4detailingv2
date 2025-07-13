const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load environment variables manually
const envPath = '.env.local'
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...values] = line.split('=')
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join('=').trim()
      }
    }
  })
}

// Test the password setup flow
async function testPasswordSetup() {
  console.log('🧪 Testing password setup flow...')
  
  // Test user data
  const testEmail = 'test-password-setup@example.com'
  const testPassword = 'TestPassword123!'
  
  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing environment variables')
      console.log('NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
      return
    }
    
    // Create service role client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    console.log('1. Creating test user without password...')
    
    // First, clean up any existing user
    try {
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(testEmail)
      if (existingUser.user) {
        await supabase.auth.admin.deleteUser(existingUser.user.id)
        console.log('   Cleaned up existing user')
      }
    } catch (e) {
      // User doesn't exist, continue
    }
    
    // Create new user without password
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      email_confirm: false,
      user_metadata: {
        name: 'Test User',
        phone: '1234567890',
        created_via: 'test_script'
      }
    })
    
    if (createError) {
      console.error('❌ Failed to create user:', createError)
      return
    }
    
    console.log('✅ User created:', newUser.user.id)
    
    // Test the password setup API
    console.log('2. Testing password setup API...')
    
    const response = await fetch('http://localhost:3001/api/auth/setup-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Password setup API failed:', errorData)
      return
    }
    
    const result = await response.json()
    console.log('✅ Password setup API success:', result)
    
    // Test sign in with new password
    console.log('3. Testing sign in with new password...')
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError)
      return
    }
    
    console.log('✅ Sign in successful:', signInData.user.id)
    
    // Clean up
    console.log('4. Cleaning up test user...')
    await supabase.auth.admin.deleteUser(newUser.user.id)
    console.log('✅ Test user cleaned up')
    
    console.log('🎉 Password setup flow test completed successfully!')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

// Run the test
testPasswordSetup()