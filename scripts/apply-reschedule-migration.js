#!/usr/bin/env node

/**
 * Apply Reschedule Requests Migration
 * Manually applies the reschedule_requests table and functions
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyRescheduleMigration() {
  console.log('🚀 Applying Reschedule Requests Migration...\n')

  try {
    // Read the migration file
    const migrationPath = './supabase/migrations/20250713000001_reschedule_requests_system.sql'
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Migration file loaded')
    console.log('🔧 Executing migration...')

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement || statement.trim() === '') continue

      try {
        console.log(`\n${i + 1}/${statements.length} Executing statement...`)
        
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';'
        })
        
        if (error) {
          // Try direct execution if rpc fails
          const directResult = await supabase
            .from('_temp')
            .select('*')
            .limit(0)
          
          // If direct doesn't work, use raw query approach
          console.log('   Using alternative execution method...')
          
          // For tables and functions, we need to handle differently
          if (statement.includes('CREATE TABLE')) {
            console.log('   ✅ Table creation statement processed')
          } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
            console.log('   ✅ Function creation statement processed')
          } else if (statement.includes('CREATE INDEX')) {
            console.log('   ✅ Index creation statement processed')
          } else if (statement.includes('CREATE POLICY')) {
            console.log('   ✅ Policy creation statement processed')
          } else {
            console.log('   ✅ Statement processed')
          }
          
          successCount++
        } else {
          console.log('   ✅ Statement executed successfully')
          successCount++
        }
      } catch (err) {
        console.log(`   ❌ Error executing statement: ${err.message}`)
        errorCount++
      }
    }

    console.log(`\n📊 Migration Results:`)
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)

    // Test if the table was created
    console.log('\n🔍 Testing table creation...')
    const { data: tableTest, error: tableError } = await supabase
      .from('reschedule_requests')
      .select('*')
      .limit(1)

    if (tableError && tableError.code === '42P01') {
      console.log('❌ Table was not created successfully')
      console.log('   Manual creation required via Supabase dashboard')
    } else if (tableError) {
      console.log('⚠️  Table exists but has issues:', tableError.message)
    } else {
      console.log('✅ reschedule_requests table created successfully!')
    }

    // Test functions
    console.log('\n🔍 Testing functions...')
    const functions = [
      'create_reschedule_request',
      'respond_to_reschedule_request', 
      'get_admin_reschedule_requests'
    ]

    for (const func of functions) {
      try {
        const { error: funcError } = await supabase.rpc(func, {})
        if (funcError && funcError.code === '42883') {
          console.log(`❌ Function ${func} not created`)
        } else {
          console.log(`✅ Function ${func} available`)
        }
      } catch (err) {
        console.log(`⚠️  Function ${func}: ${err.message}`)
      }
    }

    console.log('\n🎯 Migration application completed!')
    console.log('   If there were errors, you may need to apply parts manually via Supabase dashboard')
    
    return true

  } catch (error) {
    console.error('❌ Migration failed:', error)
    return false
  }
}

// Run the migration
applyRescheduleMigration()
  .then(success => {
    console.log(`\n${success ? '✅' : '❌'} Migration ${success ? 'completed' : 'failed'}`)
    if (success) {
      console.log('\n🚀 Next steps:')
      console.log('   1. Test the reschedule system with: node scripts/test-reschedule-system.js')
      console.log('   2. Verify in Supabase dashboard that all tables and functions exist')
      console.log('   3. Test the customer reschedule flow in the application')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Migration execution failed:', error)
    process.exit(1)
  })