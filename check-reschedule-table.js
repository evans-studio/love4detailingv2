#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRescheduleTable() {
  console.log('🔍 CHECKING RESCHEDULE_REQUESTS TABLE')
  console.log('=' .repeat(40))
  
  try {
    // Check if reschedule_requests table exists
    const { data, error } = await supabase
      .from('reschedule_requests')
      .select('*')
      .limit(1)
      
    if (error) {
      console.log('❌ reschedule_requests table does not exist or has issues:', error.message)
      return false
    }
    
    console.log('✅ reschedule_requests table exists')
    console.log('📊 Sample data:', data)
    
    // Check the schema by trying to get column info
    const { data: sample } = await supabase
      .from('reschedule_requests')
      .select('*')
      .limit(1)
      .single()
      
    if (sample) {
      console.log('\n📋 Table columns:')
      Object.keys(sample).forEach(col => {
        console.log(`   - ${col}`)
      })
    } else {
      console.log('\n📋 Table is empty, checking schema with SELECT *')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Error checking table:', error.message)
    return false
  }
}

checkRescheduleTable()
  .then(exists => {
    if (!exists) {
      console.log('\n🛠️  Need to create reschedule_requests table')
    }
    process.exit(0)
  })
  .catch(e => { 
    console.error(e)
    process.exit(1)
  })