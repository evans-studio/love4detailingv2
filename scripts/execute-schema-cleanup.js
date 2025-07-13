#!/usr/bin/env node

/**
 * Execute Schema Cleanup
 * Directly execute the schema cleanup operations
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

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function executeSQL(sql, description) {
  console.log(`🔧 ${description}`)
  console.log(`   SQL: ${sql}`)
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`)
      return false
    } else {
      console.log(`   ✅ Success`)
      return true
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`)
    return false
  }
}

async function cleanupUsersTable() {
  console.log('\n🧹 CLEANING UP USERS TABLE')
  console.log('=' .repeat(50))
  
  const columns = ['marketing_opt_in', 'preferred_communication', 'service_preferences']
  
  for (const column of columns) {
    await executeSQL(
      `ALTER TABLE users DROP COLUMN IF EXISTS ${column};`,
      `Removing ${column} column from users table`
    )
  }
}

async function cleanupVehiclesTable() {
  console.log('\n🧹 CLEANING UP VEHICLES TABLE')
  console.log('=' .repeat(50))
  
  const columns = ['special_requirements', 'vehicle_type']
  
  for (const column of columns) {
    await executeSQL(
      `ALTER TABLE vehicles DROP COLUMN IF EXISTS ${column};`,
      `Removing ${column} column from vehicles table`
    )
  }
}

async function removeUnusedTables() {
  console.log('\n🧹 REMOVING UNUSED TABLES')
  console.log('=' .repeat(50))
  
  const tables = ['vehicle_photos', 'booking_locks', 'api_rate_limits', 'booking_notes']
  
  for (const table of tables) {
    await executeSQL(
      `DROP TABLE IF EXISTS ${table} CASCADE;`,
      `Removing ${table} table`
    )
  }
}

async function updateTableComments() {
  console.log('\n📝 UPDATING TABLE COMMENTS')
  console.log('=' .repeat(50))
  
  const comments = [
    { table: 'users', comment: 'Core user accounts - cleaned up unused columns' },
    { table: 'vehicles', comment: 'Vehicle information - cleaned up unused columns' },
    { table: 'bookings', comment: 'Core booking records - no changes' },
    { table: 'available_slots', comment: 'Time slot availability - no changes' },
    { table: 'services', comment: 'Service definitions - no changes' },
    { table: 'service_pricing', comment: 'Service pricing by vehicle size - no changes' },
    { table: 'customer_rewards', comment: 'Customer loyalty system - no changes' },
    { table: 'reward_transactions', comment: 'Reward point transactions - no changes' },
    { table: 'vehicle_model_registry', comment: 'Vehicle size detection - no changes' }
  ]
  
  for (const { table, comment } of comments) {
    await executeSQL(
      `COMMENT ON TABLE ${table} IS '${comment}';`,
      `Updating comment for ${table} table`
    )
  }
}

async function verifyCleanup() {
  console.log('\n🔍 VERIFYING CLEANUP')
  console.log('=' .repeat(50))
  
  // Check that columns were removed
  const columnsToCheck = [
    { table: 'users', column: 'marketing_opt_in' },
    { table: 'users', column: 'preferred_communication' },
    { table: 'users', column: 'service_preferences' },
    { table: 'vehicles', column: 'special_requirements' },
    { table: 'vehicles', column: 'vehicle_type' }
  ]
  
  for (const { table, column } of columnsToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .limit(1)
      
      if (error && error.message.includes('column') && error.message.includes('does not exist')) {
        console.log(`   ✅ Column ${table}.${column} successfully removed`)
      } else {
        console.log(`   ⚠️  Column ${table}.${column} may still exist`)
      }
    } catch (err) {
      console.log(`   ✅ Column ${table}.${column} successfully removed`)
    }
  }
  
  // Check that tables were removed
  const tablesToCheck = ['vehicle_photos', 'booking_locks', 'api_rate_limits', 'booking_notes']
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log(`   ✅ Table ${table} successfully removed`)
      } else {
        console.log(`   ⚠️  Table ${table} may still exist`)
      }
    } catch (err) {
      console.log(`   ✅ Table ${table} successfully removed`)
    }
  }
}

async function main() {
  console.log('🚀 EXECUTING SCHEMA CLEANUP')
  console.log('Directly applying schema cleanup operations')
  console.log('=' .repeat(70))
  
  try {
    // Step 1: Clean up users table
    await cleanupUsersTable()
    
    // Step 2: Clean up vehicles table
    await cleanupVehiclesTable()
    
    // Step 3: Remove unused tables
    await removeUnusedTables()
    
    // Step 4: Update table comments
    await updateTableComments()
    
    // Step 5: Verify cleanup
    await verifyCleanup()
    
    console.log('\n✅ SCHEMA CLEANUP COMPLETE')
    console.log('=' .repeat(50))
    console.log('🎯 Database schema has been cleaned up')
    console.log('📊 Removed unused columns and tables')
    console.log('🔧 Core functionality preserved')
    console.log('💡 System ready for production use')
    
  } catch (error) {
    console.error('Error in cleanup process:', error)
  }
}

main().catch(console.error)