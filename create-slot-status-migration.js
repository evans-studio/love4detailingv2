#!/usr/bin/env node

/**
 * Create Migration for Slot Status Simplification
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function generateSlotStatusMigration() {
  console.log('📝 GENERATING SLOT STATUS MIGRATION')
  console.log('=' .repeat(40))
  
  try {
    // Step 1: Check current database state
    console.log('\n🔍 1. Checking current database state...')
    
    // Check if slot_status column exists
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'available_slots' })
      .then(() => ({ data: null, error: null })) // RPC doesn't exist, use direct query
      .catch(() => ({ data: null, error: null }))
    
    // Get sample data to understand current structure
    const { data: sampleSlot } = await supabase
      .from('available_slots')
      .select('*')
      .limit(1)
    
    const hasSlotStatus = sampleSlot && sampleSlot[0] && 'slot_status' in sampleSlot[0]
    const hasCurrentBookings = sampleSlot && sampleSlot[0] && 'current_bookings' in sampleSlot[0]
    const hasMaxBookings = sampleSlot && sampleSlot[0] && 'max_bookings' in sampleSlot[0]
    const hasIsBlocked = sampleSlot && sampleSlot[0] && 'is_blocked' in sampleSlot[0]
    
    console.log('📊 Current table structure:')
    console.log(`   slot_status column: ${hasSlotStatus ? '✅ EXISTS' : '❌ MISSING'}`)
    console.log(`   current_bookings column: ${hasCurrentBookings ? '✅ EXISTS' : '❌ MISSING'}`)
    console.log(`   max_bookings column: ${hasMaxBookings ? '✅ EXISTS' : '❌ MISSING'}`)
    console.log(`   is_blocked column: ${hasIsBlocked ? '✅ EXISTS' : '❌ MISSING'}`)
    
    if (sampleSlot && sampleSlot[0]) {
      console.log('\n📋 Sample slot data:')
      Object.keys(sampleSlot[0]).forEach(key => {
        console.log(`   ${key}: ${typeof sampleSlot[0][key]} (${sampleSlot[0][key]})`)
      })
    }
    
    // Step 2: Generate migration based on current state
    console.log('\n📝 2. Generating migration SQL...')
    
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').slice(0, 14)
    const migrationFileName = `${timestamp}_simplify_slot_status_system.sql`
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', migrationFileName)
    
    let migrationSQL = `-- Migration: Simplify Slot Status System
-- Date: ${new Date().toISOString()}
-- Description: Migrate from complex booking counters to simple slot_status enum

BEGIN;

-- Description: This migration simplifies the slot availability system by:
-- 1. Ensuring slot_status column exists with proper constraints
-- 2. Syncing slot_status with current booking state  
-- 3. Setting up for future removal of redundant columns

`
    
    // Add slot_status column if it doesn't exist
    if (!hasSlotStatus) {
      migrationSQL += `
-- Step 1: Add slot_status column if it doesn't exist
ALTER TABLE available_slots 
ADD COLUMN IF NOT EXISTS slot_status TEXT 
CHECK (slot_status IN ('available', 'booked', 'blocked'));

-- Set default values based on existing data
UPDATE available_slots 
SET slot_status = 
  CASE 
    WHEN is_blocked = true THEN 'blocked'
    WHEN current_bookings >= max_bookings THEN 'booked'
    ELSE 'available'
  END
WHERE slot_status IS NULL;

-- Make slot_status required
ALTER TABLE available_slots 
ALTER COLUMN slot_status SET NOT NULL;

-- Set default for future inserts
ALTER TABLE available_slots 
ALTER COLUMN slot_status SET DEFAULT 'available';

`
    } else {
      migrationSQL += `
-- Step 1: slot_status column already exists, ensure proper constraints
-- Update any existing constraints
ALTER TABLE available_slots 
DROP CONSTRAINT IF EXISTS available_slots_slot_status_check;

ALTER TABLE available_slots 
ADD CONSTRAINT available_slots_slot_status_check 
CHECK (slot_status IN ('available', 'booked', 'blocked'));

-- Ensure NOT NULL constraint
ALTER TABLE available_slots 
ALTER COLUMN slot_status SET NOT NULL;

-- Set default for future inserts
ALTER TABLE available_slots 
ALTER COLUMN slot_status SET DEFAULT 'available';

`
    }
    
    // Always sync the slot_status with current state
    migrationSQL += `
-- Step 2: Sync slot_status with actual booking state
-- This ensures consistency between old and new systems
UPDATE available_slots 
SET slot_status = 
  CASE 
    WHEN is_blocked = true THEN 'blocked'
    WHEN current_bookings >= max_bookings THEN 'booked'
    ELSE 'available'
  END,
  last_modified = NOW()
WHERE slot_status != 
  CASE 
    WHEN is_blocked = true THEN 'blocked'
    WHEN current_bookings >= max_bookings THEN 'booked'
    ELSE 'available'
  END;

-- Step 3: Add index for better performance on slot_status queries
CREATE INDEX IF NOT EXISTS idx_available_slots_status 
ON available_slots(slot_status);

CREATE INDEX IF NOT EXISTS idx_available_slots_date_status 
ON available_slots(slot_date, slot_status);

-- Step 4: Add comment to document the simplified system
COMMENT ON COLUMN available_slots.slot_status IS 
'Simplified slot availability status: available, booked, or blocked. Replaces complex current_bookings/max_bookings logic.';

-- Step 5: Create function to automatically update slot_status when booking changes
CREATE OR REPLACE FUNCTION sync_slot_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically sync slot_status when old fields change
  NEW.slot_status := 
    CASE 
      WHEN NEW.is_blocked = true THEN 'blocked'
      WHEN NEW.current_bookings >= NEW.max_bookings THEN 'booked'
      ELSE 'available'
    END;
  
  NEW.last_modified := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep slot_status in sync
DROP TRIGGER IF EXISTS trigger_sync_slot_status ON available_slots;
CREATE TRIGGER trigger_sync_slot_status
  BEFORE UPDATE ON available_slots
  FOR EACH ROW
  EXECUTE FUNCTION sync_slot_status();

COMMIT;

-- Migration completed successfully
-- Next steps:
-- 1. Update application code to use slot_status instead of booking counters
-- 2. Test thoroughly with the new simplified system
-- 3. In future migration, remove redundant columns: current_bookings, max_bookings, is_blocked
`
    
    // Step 3: Write migration file
    console.log(`\n💾 3. Writing migration file: ${migrationFileName}`)
    
    // Ensure migrations directory exists
    const migrationDir = path.dirname(migrationPath)
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true })
    }
    
    fs.writeFileSync(migrationPath, migrationSQL)
    
    console.log(`✅ Migration file created: ${migrationPath}`)
    console.log(`📏 Migration size: ${(migrationSQL.length / 1024).toFixed(1)} KB`)
    
    // Step 4: Show next steps
    console.log('\n🚀 4. Next Steps:')
    console.log('1. Review the migration file')
    console.log('2. Run: npx supabase db push')
    console.log('3. Or run: npx supabase migration up')
    console.log('4. Verify changes in Supabase dashboard')
    
    console.log('\n📋 Migration Summary:')
    console.log(`   📁 File: ${migrationFileName}`)
    console.log(`   🎯 Purpose: Simplify slot availability system`)
    console.log(`   ✅ Adds/ensures slot_status column with constraints`)
    console.log(`   🔄 Syncs slot_status with current booking state`)
    console.log(`   📈 Adds performance indexes`)
    console.log(`   🔄 Adds auto-sync trigger for backwards compatibility`)
    
    return migrationPath
    
  } catch (error) {
    console.error('\n❌ Error generating migration:', error.message)
    throw error
  }
}

// Run migration generation
if (require.main === module) {
  generateSlotStatusMigration()
    .then((migrationPath) => {
      console.log('\n✅ Migration generation completed')
      console.log(`📁 Created: ${path.basename(migrationPath)}`)
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Migration generation failed:', error)
      process.exit(1)
    })
}

module.exports = { generateSlotStatusMigration }