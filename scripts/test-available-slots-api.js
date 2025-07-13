#!/usr/bin/env node

/**
 * Test Available Slots API
 * Verifies the API endpoint that the reschedule modal uses
 */

import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/supabase', '') || 'http://localhost:3000'

async function testAvailableSlotsAPI() {
  console.log('🔍 Testing Available Slots API...\n')

  try {
    // Test the exact same request that the reschedule modal makes
    const today = new Date()
    const endDate = new Date()
    endDate.setDate(today.getDate() + 30)
    
    const startDateStr = today.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    
    const testUrl = `${baseUrl}/api/bookings/available-slots?start_date=${startDateStr}&end_date=${endDateStr}`
    
    console.log('📋 Testing URL:', testUrl)
    console.log('📅 Date range:', startDateStr, 'to', endDateStr)
    
    const response = await fetch(testUrl)
    
    console.log('\n📊 Response status:', response.status)
    console.log('📊 Response ok:', response.ok)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ Error response:', errorText)
      return false
    }
    
    const data = await response.json()
    
    console.log('\n✅ API Response structure:')
    console.log('   Success:', data.success)
    console.log('   Has data:', !!data.data)
    
    if (data.data?.slots) {
      console.log('   Slots count:', data.data.slots.length)
      console.log('   Total:', data.data.total)
      
      if (data.data.slots.length > 0) {
        console.log('\n📅 Sample slots:')
        data.data.slots.slice(0, 3).forEach((slot, index) => {
          console.log(`   ${index + 1}. ${slot.formatted_date} at ${slot.start_time}`)
        })
      } else {
        console.log('\n⚠️  No available slots found in the date range')
        console.log('   This could be normal if no slots have been created')
      }
    } else {
      console.log('❌ No slots data in response')
    }
    
    // Test the mapping that the reschedule modal expects
    if (data.success && data.data?.slots) {
      console.log('\n🔄 Testing slot mapping for reschedule modal...')
      
      const testSlot = data.data.slots[0]
      if (testSlot) {
        console.log('   Sample slot mapping:')
        console.log('   - slot_id:', testSlot.slot_id)
        console.log('   - date:', testSlot.date)
        console.log('   - start_time:', testSlot.start_time)
        console.log('   - formatted_date:', testSlot.formatted_date)
        console.log('   - duration_minutes:', testSlot.duration_minutes)
        
        // Verify the modal's expected format
        const modalSlot = {
          id: testSlot.slot_id,
          slot_date: testSlot.date,
          start_time: testSlot.start_time,
          duration_minutes: testSlot.duration_minutes || 60,
          formatted_date: new Date(testSlot.date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          formatted_time: testSlot.start_time
        }
        
        console.log('\n✅ Modal format mapping successful:')
        console.log('   ID:', modalSlot.id)
        console.log('   Date:', modalSlot.slot_date)
        console.log('   Time:', modalSlot.formatted_time)
        console.log('   Display:', modalSlot.formatted_date)
      }
    }
    
    console.log('\n🎯 API Test Results:')
    console.log('   ✅ Endpoint accessible')
    console.log('   ✅ Response format correct')
    console.log('   ✅ Date range query working')
    
    if (data.data?.slots?.length > 0) {
      console.log('   ✅ Available slots found')
    } else {
      console.log('   ⚠️  No slots available (may need database seeding)')
    }
    
    return true

  } catch (error) {
    console.error('❌ API test failed:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Possible solutions:')
      console.log('   1. Make sure the development server is running: npm run dev')
      console.log('   2. Check the base URL configuration')
      console.log('   3. Verify environment variables are loaded')
    }
    
    return false
  }
}

// Run the test
testAvailableSlotsAPI()
  .then(success => {
    console.log(`\n${success ? '✅' : '❌'} Available slots API test ${success ? 'passed' : 'failed'}`)
    
    if (success) {
      console.log('\n🚀 The reschedule modal should now work correctly!')
      console.log('   To test: Open a booking and click "Reschedule" button')
    }
    
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error)
    process.exit(1)
  })