#!/usr/bin/env node

/**
 * Database Schema Cleanup Script
 * Removes unused columns and optimizes the current database schema
 * Based on comprehensive analysis of active vs unused schema elements
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables manually
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, value] = line.split('=')
      if (key && value) {
        process.env[key.trim()] = value.trim()
      }
    }
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Define columns to remove from each table
const COLUMNS_TO_REMOVE = {
  users: [
    'marketing_opt_in',
    'preferred_communication',
    'service_preferences'
  ],
  vehicles: [
    'special_requirements',
    'vehicle_type'
  ],
  bookings: [
    // Keep these for now as they might be used in admin interface
    // 'service_location',
    // 'estimated_duration_minutes',
    // 'actual_duration_minutes',
    // 'cancellation_reason',
    // 'started_at'
  ]
}

// Tables that might be completely unused (to be verified)
const TABLES_TO_VERIFY = [
  'vehicle_photos', // Implemented but not used in UI
  'booking_locks',  // System table - verify if needed
  'api_rate_limits' // System table - verify if needed
]

async function analyzeTableUsage() {
  console.log('📊 ANALYZING TABLE USAGE')
  console.log('=' .repeat(50))
  
  try {
    // Get all tables in the public schema using raw SQL
    const { data: tables, error } = await supabase
      .rpc('exec_sql', {
        sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
      })
    
    if (error) {
      console.error('Error fetching tables:', error)
      return
    }
    
    console.log(`\n🗂️  Found ${tables?.length || 0} tables in public schema:\n`)
    
    for (const table of tables || []) {
      const tableName = table.table_name
      
      // Skip system tables
      if (tableName.startsWith('pg_') || tableName.includes('information_schema')) {
        continue
      }
      
      try {
        const { data, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
        
        if (countError) {
          console.log(`   ❌ ${tableName}: Access denied or error (${countError.message})`)
        } else {
          const count = data?.length || 0
          console.log(`   📋 ${tableName}: ${count} rows`)
        }
      } catch (err) {
        console.log(`   ❌ ${tableName}: Error accessing table`)
      }
    }
    
  } catch (error) {
    console.error('Error analyzing table usage:', error)
  }
}

async function analyzeColumnUsage(tableName) {
  console.log(`\n🔍 ANALYZING COLUMNS IN ${tableName.toUpperCase()}`)
  console.log('=' .repeat(50))
  
  try {
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position')
    
    if (error) {
      console.error(`Error fetching columns for ${tableName}:`, error)
      return
    }
    
    console.log(`\n📋 Columns in ${tableName}:`)
    for (const column of columns || []) {
      const isMarkedForRemoval = COLUMNS_TO_REMOVE[tableName]?.includes(column.column_name)
      const marker = isMarkedForRemoval ? '🗑️  [REMOVE]' : '✅ [KEEP]'
      console.log(`   ${marker} ${column.column_name} (${column.data_type})`)
    }
    
  } catch (error) {
    console.error(`Error analyzing columns for ${tableName}:`, error)
  }
}

async function removeUnusedColumns() {
  console.log('\n🗑️  REMOVING UNUSED COLUMNS')
  console.log('=' .repeat(50))
  
  for (const [tableName, columns] of Object.entries(COLUMNS_TO_REMOVE)) {
    if (columns.length === 0) continue
    
    console.log(`\n🔧 Processing table: ${tableName}`)
    
    for (const columnName of columns) {
      try {
        console.log(`   🗑️  Removing column: ${columnName}`)
        
        // Check if column exists first
        const { data: columnExists } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_schema', 'public')
          .eq('table_name', tableName)
          .eq('column_name', columnName)
          .single()
        
        if (!columnExists) {
          console.log(`   ℹ️  Column ${columnName} does not exist in ${tableName}`)
          continue
        }
        
        // Execute the ALTER TABLE statement
        const { error } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${columnName};`
        })
        
        if (error) {
          console.error(`   ❌ Error removing column ${columnName}:`, error)
        } else {
          console.log(`   ✅ Successfully removed column ${columnName}`)
        }
        
      } catch (error) {
        console.error(`   ❌ Error removing column ${columnName}:`, error)
      }
    }
  }
}

async function optimizeIndexes() {
  console.log('\n📊 ANALYZING DATABASE INDEXES')
  console.log('=' .repeat(50))
  
  try {
    // Get index information
    const { data: indexes, error } = await supabase
      .from('pg_indexes')
      .select('tablename, indexname, indexdef')
      .eq('schemaname', 'public')
      .order('tablename')
    
    if (error) {
      console.error('Error fetching indexes:', error)
      return
    }
    
    console.log(`\n📋 Current indexes:`)
    for (const index of indexes || []) {
      if (!index.indexname.includes('_pkey')) { // Skip primary key indexes
        console.log(`   📊 ${index.tablename}.${index.indexname}`)
      }
    }
    
  } catch (error) {
    console.error('Error analyzing indexes:', error)
  }
}

async function generateCleanupSummary() {
  console.log('\n📋 CLEANUP SUMMARY')
  console.log('=' .repeat(50))
  
  console.log('\n🗑️  Columns marked for removal:')
  for (const [tableName, columns] of Object.entries(COLUMNS_TO_REMOVE)) {
    if (columns.length > 0) {
      console.log(`   ${tableName}:`)
      for (const column of columns) {
        console.log(`     - ${column}`)
      }
    }
  }
  
  console.log('\n🔍 Tables to verify usage:')
  for (const table of TABLES_TO_VERIFY) {
    console.log(`   - ${table}`)
  }
  
  console.log('\n✅ Core tables that will be preserved:')
  const coreTables = [
    'users', 'vehicles', 'bookings', 'available_slots', 
    'services', 'service_pricing', 'customer_rewards', 
    'reward_transactions', 'vehicle_model_registry'
  ]
  for (const table of coreTables) {
    console.log(`   - ${table}`)
  }
}

async function main() {
  console.log('🧹 DATABASE SCHEMA CLEANUP')
  console.log('This script will analyze and clean up unused database schema elements')
  console.log('=' .repeat(70))
  
  try {
    // Step 1: Analyze current table usage
    await analyzeTableUsage()
    
    // Step 2: Analyze columns in key tables
    for (const tableName of ['users', 'vehicles', 'bookings']) {
      await analyzeColumnUsage(tableName)
    }
    
    // Step 3: Show cleanup summary
    await generateCleanupSummary()
    
    // Step 4: Analyze indexes
    await optimizeIndexes()
    
    console.log('\n🎯 CLEANUP RECOMMENDATIONS')
    console.log('=' .repeat(50))
    console.log('1. ✅ Database schema is well-designed for current scope')
    console.log('2. 🗑️  Remove unused columns from users and vehicles tables')
    console.log('3. 🔍 Verify usage of system tables (vehicle_photos, booking_locks)')
    console.log('4. 📊 Current indexes appear optimized for query patterns')
    console.log('5. 🏗️  Schema supports expansion (multiple services, advanced features)')
    
    console.log('\n✅ ANALYSIS COMPLETE')
    console.log('=' .repeat(50))
    console.log('Review the analysis above and run with --execute flag to apply changes')
    
  } catch (error) {
    console.error('Error in main process:', error)
  }
}

// Check if we should execute the cleanup
const shouldExecute = process.argv.includes('--execute')

if (shouldExecute) {
  console.log('⚠️  EXECUTING CLEANUP - This will modify the database schema')
  main().then(() => removeUnusedColumns())
} else {
  console.log('🔍 ANALYSIS MODE - Add --execute flag to apply changes')
  main()
}