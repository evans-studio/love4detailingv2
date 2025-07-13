#!/usr/bin/env node

/**
 * Test script to verify real-time reconnection works correctly
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

// Test user ID
const TEST_USER_ID = '5484f028-fa35-4cec-9f28-c97fecfbc45c'

async function testRealtimeReconnection() {
  console.log('🔄 Testing real-time reconnection...')
  
  let connectionCount = 0
  let disconnectionCount = 0
  
  // Set up a subscription that will track connection status
  const channel = supabase
    .channel(`test-reconnection-${TEST_USER_ID}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'vehicles',
      filter: `user_id=eq.${TEST_USER_ID}`,
    }, (payload) => {
      console.log('📦 Received real-time event:', payload.eventType)
    })
    .subscribe((status) => {
      console.log(`📡 Connection status: ${status}`)
      
      if (status === 'SUBSCRIBED') {
        connectionCount++
        console.log(`✅ Connected (${connectionCount} times)`)
      } else if (status === 'CLOSED') {
        disconnectionCount++
        console.log(`❌ Disconnected (${disconnectionCount} times)`)
      } else if (status === 'CHANNEL_ERROR') {
        console.log('💥 Channel error occurred')
      }
    })

  // Test by creating/updating/deleting vehicles to trigger events
  console.log('\n🚀 Creating test vehicles to trigger events...')
  
  for (let i = 0; i < 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          user_id: TEST_USER_ID,
          registration: `TEST${i}`,
          make: 'Test',
          model: 'Vehicle',
          year: 2023,
          color: 'Blue',
          size: 'medium',
          is_active: true
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating vehicle:', error)
      } else {
        console.log(`✅ Created vehicle ${i + 1}:`, data.registration)
        
        // Wait a bit then delete it
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const { error: deleteError } = await supabase
          .from('vehicles')
          .delete()
          .eq('id', data.id)
        
        if (deleteError) {
          console.error('Error deleting vehicle:', deleteError)
        } else {
          console.log(`🗑️  Deleted vehicle ${i + 1}`)
        }
      }
    } catch (error) {
      console.error('Test error:', error)
    }
  }
  
  console.log('\n📊 Test Summary:')
  console.log(`Connections: ${connectionCount}`)
  console.log(`Disconnections: ${disconnectionCount}`)
  
  // Cleanup
  await new Promise(resolve => setTimeout(resolve, 2000))
  supabase.removeChannel(channel)
  console.log('🧹 Cleaned up test subscription')
}

// Run the test
testRealtimeReconnection().then(() => {
  console.log('\n✨ Reconnection test completed!')
  process.exit(0)
}).catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})