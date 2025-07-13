-- Migration: Simplify Slot Status System
-- Date: 2025-07-13T10:43:34.022Z
-- Description: Migrate from complex booking counters to simple slot_status enum

BEGIN;

-- Description: This migration simplifies the slot availability system by:
-- 1. Ensuring slot_status column exists with proper constraints
-- 2. Syncing slot_status with current booking state  
-- 3. Setting up for future removal of redundant columns


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
