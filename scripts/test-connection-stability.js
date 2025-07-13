#!/usr/bin/env node

/**
 * Test script to verify real-time connection stability improvements
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

async function testConnectionStability() {
  console.log('🔍 Testing real-time connection stability...')
  
  let lastHeartbeat = Date.now()
  let connectionEvents = []
  
  // Set up a long-running subscription
  const channel = supabase
    .channel(`stability-test-${TEST_USER_ID}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'vehicles',
      filter: `user_id=eq.${TEST_USER_ID}`,
    }, (payload) => {
      lastHeartbeat = Date.now()
      console.log(`💓 Heartbeat at ${new Date().toLocaleTimeString()} - Event: ${payload.eventType}`)
    })
    .subscribe((status) => {
      const timestamp = new Date().toLocaleTimeString()
      connectionEvents.push({ status, timestamp })
      console.log(`📡 [${timestamp}] Connection status: ${status}`)
      
      if (status === 'SUBSCRIBED') {
        lastHeartbeat = Date.now()
        console.log('✅ Successfully connected to real-time')
      } else if (status === 'CLOSED') {
        console.log('❌ Connection closed')
      } else if (status === 'CHANNEL_ERROR') {
        console.log('💥 Channel error - connection failed')
      }
    })

  // Monitor connection health
  const healthMonitor = setInterval(() => {
    const now = Date.now()
    const timeSinceHeartbeat = now - lastHeartbeat
    const minutes = Math.floor(timeSinceHeartbeat / 60000)
    const seconds = Math.floor((timeSinceHeartbeat % 60000) / 1000)
    
    console.log(`⏱️  Time since last heartbeat: ${minutes}m ${seconds}s`)
    
    if (timeSinceHeartbeat > 120000) { // 2 minutes
      console.log('⚠️  Connection appears stale (no heartbeat for 2+ minutes)')
    }
  }, 30000)

  // Create test events to generate heartbeats
  console.log('\n🎯 Creating test events to generate heartbeats...')
  
  for (let i = 0; i < 5; i++) {
    await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
    
    try {
      console.log(`📝 Creating test vehicle ${i + 1}...`)
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          user_id: TEST_USER_ID,
          registration: `STAB${i}`,
          make: 'Stability',
          model: 'Test',
          year: 2023,
          color: 'Green',
          size: 'medium',
          is_active: true
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error creating vehicle:', error)
      } else {
        console.log(`✅ Created vehicle: ${data.registration}`)
        
        // Wait then delete
        await new Promise(resolve => setTimeout(resolve, 2000))
        await supabase.from('vehicles').delete().eq('id', data.id)
        console.log(`🗑️  Deleted vehicle: ${data.registration}`)
      }
    } catch (error) {
      console.error('❌ Test error:', error)
    }
  }
  
  // Clean up
  clearInterval(healthMonitor)
  await new Promise(resolve => setTimeout(resolve, 5000))
  supabase.removeChannel(channel)
  
  console.log('\n📊 Connection Events Summary:')
  connectionEvents.forEach((event, index) => {
    console.log(`${index + 1}. [${event.timestamp}] ${event.status}`)
  })
  
  console.log('\n✅ Connection stability test completed!')
}

// Run the test
testConnectionStability().then(() => {
  console.log('\n🎉 All tests completed!')
  process.exit(0)
}).catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})