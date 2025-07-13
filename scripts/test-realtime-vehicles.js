#!/usr/bin/env node

/**
 * Test script to verify real-time vehicle subscriptions
 * This script will create, update, and delete a vehicle to test real-time events
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

// Test user ID (created by create-test-user.js)
const TEST_USER_ID = '5484f028-fa35-4cec-9f28-c97fecfbc45c'

async function testRealTimeVehicles() {
  console.log('🚀 Testing real-time vehicle subscriptions...')
  
  try {
    // 1. Create a test vehicle
    console.log('\n1. Creating test vehicle...')
    const { data: createData, error: createError } = await supabase
      .from('vehicles')
      .insert({
        user_id: TEST_USER_ID,
        registration: 'RT01 TEST',
        make: 'Test',
        model: 'Vehicle',
        year: 2023,
        color: 'Blue',
        size: 'medium',
        is_active: true
      })
      .select()
      .single()
    
    if (createError) {
      console.error('❌ Create error:', createError)
      return
    }
    
    console.log('✅ Vehicle created:', createData.id)
    const vehicleId = createData.id
    
    // Wait a moment for real-time event to propagate
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 2. Update the vehicle
    console.log('\n2. Updating test vehicle...')
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({
        color: 'Red',
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId)
    
    if (updateError) {
      console.error('❌ Update error:', updateError)
      return
    }
    
    console.log('✅ Vehicle updated')
    
    // Wait a moment for real-time event to propagate
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 3. Delete the vehicle
    console.log('\n3. Deleting test vehicle...')
    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)
    
    if (deleteError) {
      console.error('❌ Delete error:', deleteError)
      return
    }
    
    console.log('✅ Vehicle deleted')
    
    console.log('\n🎉 Real-time test completed successfully!')
    console.log('📝 Check your browser console for real-time events')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testRealTimeVehicles().then(() => {
  console.log('\n✨ Test finished. Check browser console for real-time events.')
  process.exit(0)
})