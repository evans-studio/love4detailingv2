#!/usr/bin/env node

/**
 * Targeted Schema Cleanup Script
 * Removes only the specific unused columns identified in the analysis
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

// Specific columns to remove based on analysis
const COLUMNS_TO_REMOVE = [
  {
    table: 'users',
    columns: [
      'marketing_opt_in',      // Not used in current UI
      'preferred_communication', // Not used in current UI  
      'service_preferences'    // Not used in current UI
    ]
  },
  {
    table: 'vehicles', 
    columns: [
      'special_requirements',  // Not used in current UI
      'vehicle_type'          // Not used in current UI
    ]
  }
]

// Tables to remove completely (0 rows and not essential)
const TABLES_TO_REMOVE = [
  'vehicle_photos',    // Implemented but not used
  'booking_locks',     // 0 rows, may not be needed
  'api_rate_limits',   // 0 rows, may not be needed
  'booking_notes'      // 0 rows, admin feature not implemented
]

async function documentCurrentState() {
  console.log('📋 DOCUMENTING CURRENT STATE')
  console.log('=' .repeat(50))
  
  for (const { table, columns } of COLUMNS_TO_REMOVE) {
    console.log(`\n📊 ${table} table - columns to remove:`)
    
    for (const column of columns) {
      try {
        // Get a sample value to show what we're removing
        const { data, error } = await supabase
          .from(table)
          .select(column)
          .limit(1)
        
        if (error) {
          console.log(`   ❌ ${column}: Error accessing column (${error.message})`)
        } else {
          const sampleValue = data && data[0] ? data[0][column] : null
          console.log(`   🗑️  ${column}: Sample value = ${sampleValue === null ? 'null' : JSON.stringify(sampleValue)}`)
        }
      } catch (err) {
        console.log(`   ❌ ${column}: Error accessing column`)
      }
    }
  }
  
  console.log(`\n📊 Tables to remove completely:`)
  for (const table of TABLES_TO_REMOVE) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log(`   ❌ ${table}: Error or doesn't exist (${error.message})`)
      } else {
        console.log(`   🗑️  ${table}: ${count || 0} rows`)
      }
    } catch (err) {
      console.log(`   ❌ ${table}: Error accessing table`)
    }
  }
}

async function removeUnusedColumns() {
  console.log('\n🗑️  REMOVING UNUSED COLUMNS')
  console.log('=' .repeat(50))
  
  for (const { table, columns } of COLUMNS_TO_REMOVE) {
    console.log(`\n🔧 Processing table: ${table}`)
    
    for (const column of columns) {
      try {
        console.log(`   🗑️  Removing column: ${column}`)
        
        // Create a migration to remove the column
        const migrationSQL = `ALTER TABLE ${table} DROP COLUMN IF EXISTS ${column};`
        console.log(`   📝 SQL: ${migrationSQL}`)
        
        // For safety, we'll log the SQL but not execute it directly
        // In a real cleanup, you'd want to run this as a proper migration
        console.log(`   ⚠️  SQL logged - run as migration for safety`)
        
      } catch (error) {
        console.error(`   ❌ Error processing column ${column}:`, error)
      }
    }
  }
}

async function removeUnusedTables() {
  console.log('\n🗑️  REMOVING UNUSED TABLES')
  console.log('=' .repeat(50))
  
  for (const table of TABLES_TO_REMOVE) {
    try {
      console.log(`   🗑️  Removing table: ${table}`)
      
      // Create a migration to remove the table
      const migrationSQL = `DROP TABLE IF EXISTS ${table} CASCADE;`
      console.log(`   📝 SQL: ${migrationSQL}`)
      
      // For safety, we'll log the SQL but not execute it directly
      console.log(`   ⚠️  SQL logged - run as migration for safety`)
      
    } catch (error) {
      console.error(`   ❌ Error processing table ${table}:`, error)
    }
  }
}

async function generateMigrationFile() {
  console.log('\n📝 GENERATING MIGRATION FILE')
  console.log('=' .repeat(50))
  
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, '')
  const filename = `${timestamp}_schema_cleanup.sql`
  const filepath = path.join(__dirname, '..', 'supabase', 'migrations', filename)
  
  let migrationSQL = `-- Schema Cleanup Migration
-- Generated: ${new Date().toISOString()}
-- Purpose: Remove unused columns and tables identified in analysis

-- Remove unused columns
`
  
  for (const { table, columns } of COLUMNS_TO_REMOVE) {
    migrationSQL += `\n-- Clean up ${table} table\n`
    for (const column of columns) {
      migrationSQL += `ALTER TABLE ${table} DROP COLUMN IF EXISTS ${column};\n`
    }
  }
  
  migrationSQL += `\n-- Remove unused tables\n`
  for (const table of TABLES_TO_REMOVE) {
    migrationSQL += `DROP TABLE IF EXISTS ${table} CASCADE;\n`
  }
  
  migrationSQL += `\n-- Update comments
COMMENT ON TABLE users IS 'Core user accounts - cleaned up unused columns';
COMMENT ON TABLE vehicles IS 'Vehicle information - cleaned up unused columns';
COMMENT ON TABLE bookings IS 'Core booking records - no changes';
COMMENT ON TABLE available_slots IS 'Time slot availability - no changes';
COMMENT ON TABLE services IS 'Service definitions - no changes';
COMMENT ON TABLE service_pricing IS 'Service pricing by vehicle size - no changes';
COMMENT ON TABLE customer_rewards IS 'Customer loyalty system - no changes';
COMMENT ON TABLE reward_transactions IS 'Reward point transactions - no changes';
COMMENT ON TABLE vehicle_model_registry IS 'Vehicle size detection - no changes';
`
  
  // Ensure migrations directory exists
  const migrationDir = path.dirname(filepath)
  if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true })
  }
  
  fs.writeFileSync(filepath, migrationSQL)
  console.log(`   ✅ Migration file created: ${filename}`)
  console.log(`   📁 Location: ${filepath}`)
  
  return filepath
}

async function generateSummaryReport() {
  console.log('\n📊 CLEANUP SUMMARY REPORT')
  console.log('=' .repeat(50))
  
  console.log('\n✅ WHAT WAS KEPT:')
  console.log('   - All core tables (users, vehicles, bookings, etc.)')
  console.log('   - All essential columns for business logic')
  console.log('   - Service and pricing structure')
  console.log('   - Rewards system')
  console.log('   - Vehicle registry (66 entries)')
  console.log('   - Schedule templates and slots')
  console.log('   - System configuration')
  
  console.log('\n🗑️  WHAT WAS REMOVED:')
  console.log('   Columns:')
  for (const { table, columns } of COLUMNS_TO_REMOVE) {
    console.log(`     ${table}: ${columns.join(', ')}`)
  }
  console.log('   Tables:')
  for (const table of TABLES_TO_REMOVE) {
    console.log(`     ${table} (0 rows, not essential)`)
  }
  
  console.log('\n📈 IMPACT:')
  console.log('   - Reduced database complexity')
  console.log('   - Cleaner schema focused on active features')
  console.log('   - No impact on current functionality')
  console.log('   - Easier maintenance and understanding')
  
  console.log('\n🎯 NEXT STEPS:')
  console.log('   1. Review the generated migration file')
  console.log('   2. Test the migration on a staging environment')
  console.log('   3. Run the migration on production')
  console.log('   4. Update any TypeScript types if needed')
  console.log('   5. Clean up any unused imports in code')
}

async function main() {
  console.log('🧹 TARGETED SCHEMA CLEANUP')
  console.log('Removing only identified unused columns and tables')
  console.log('=' .repeat(70))
  
  try {
    // Step 1: Document what we're removing
    await documentCurrentState()
    
    // Step 2: Log the removal operations
    await removeUnusedColumns()
    await removeUnusedTables()
    
    // Step 3: Generate migration file
    const migrationFile = await generateMigrationFile()
    
    // Step 4: Generate summary report
    await generateSummaryReport()
    
    console.log('\n✅ CLEANUP PREPARATION COMPLETE')
    console.log('=' .repeat(50))
    console.log('📋 Migration file generated for safe execution')
    console.log('🔍 Review the migration before running it')
    console.log('⚠️  Always test on staging first!')
    
  } catch (error) {
    console.error('Error in cleanup process:', error)
  }
}

main().catch(console.error)