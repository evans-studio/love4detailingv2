-- Migration: Remove Redundant Booking Counter Columns
-- Date: 2025-07-13T10:55:00.000Z
-- Description: Remove max_bookings, current_bookings, and is_blocked columns after slot_status migration

BEGIN;

-- Description: This migration cleans up redundant columns now that we use the simplified slot_status system
-- The slot_status enum ('available', 'booked', 'blocked') replaces:
-- - current_bookings (replaced by slot_status = 'booked')
-- - max_bookings (not needed - each slot is either available or booked) 
-- - is_blocked (replaced by slot_status = 'blocked')

-- Step 1: Verify slot_status column exists and has proper data
-- This should pass since we applied the previous migration
DO $$
BEGIN
    -- Check if slot_status column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'available_slots' 
        AND column_name = 'slot_status'
    ) THEN
        RAISE EXCEPTION 'slot_status column does not exist. Run previous migration first.';
    END IF;
    
    -- Check if all slots have a valid slot_status
    IF EXISTS (
        SELECT 1 FROM available_slots 
        WHERE slot_status IS NULL 
        OR slot_status NOT IN ('available', 'booked', 'blocked')
    ) THEN
        RAISE EXCEPTION 'Some slots have invalid slot_status values. Fix data before removing old columns.';
    END IF;
    
    RAISE NOTICE 'Validation passed: slot_status column exists and all slots have valid status values';
END $$;

-- Step 2: Drop the sync trigger first (it references the columns we're removing)
DROP TRIGGER IF EXISTS trigger_sync_slot_status ON available_slots;
DROP FUNCTION IF EXISTS sync_slot_status();

-- Step 3: Remove redundant columns
-- Remove current_bookings column
ALTER TABLE available_slots DROP COLUMN IF EXISTS current_bookings;

-- Remove max_bookings column  
ALTER TABLE available_slots DROP COLUMN IF EXISTS max_bookings;

-- Remove is_blocked column
ALTER TABLE available_slots DROP COLUMN IF EXISTS is_blocked;

-- Step 4: Add comment to document the simplified schema
COMMENT ON TABLE available_slots IS 
'Simplified time slot availability table using slot_status enum. Each slot can be: available, booked, or blocked.';

-- Step 5: Ensure we have proper indexes for the simplified system
CREATE INDEX IF NOT EXISTS idx_available_slots_status_date 
ON available_slots(slot_status, slot_date);

CREATE INDEX IF NOT EXISTS idx_available_slots_date_time 
ON available_slots(slot_date, start_time);

-- Step 6: Add a function to update slot status when bookings change
-- This replaces the old booking counter logic
CREATE OR REPLACE FUNCTION update_slot_status_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- When a booking is created for a slot, mark it as booked
    IF TG_OP = 'INSERT' AND NEW.slot_id IS NOT NULL THEN
        UPDATE available_slots 
        SET slot_status = 'booked', last_modified = NOW()
        WHERE id = NEW.slot_id;
    END IF;
    
    -- When a booking is deleted, mark slot as available (unless manually blocked)
    IF TG_OP = 'DELETE' AND OLD.slot_id IS NOT NULL THEN
        -- Only set to available if no other bookings exist for this slot
        UPDATE available_slots 
        SET slot_status = 'available', last_modified = NOW()
        WHERE id = OLD.slot_id 
        AND NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE slot_id = OLD.slot_id 
            AND status IN ('confirmed', 'in_progress')
            AND id != OLD.id
        );
    END IF;
    
    -- When booking status changes, update slot accordingly
    IF TG_OP = 'UPDATE' AND NEW.slot_id IS NOT NULL THEN
        -- If booking was cancelled, check if slot should be available
        IF OLD.status IN ('confirmed', 'in_progress') AND NEW.status = 'cancelled' THEN
            UPDATE available_slots 
            SET slot_status = 'available', last_modified = NOW()
            WHERE id = NEW.slot_id 
            AND NOT EXISTS (
                SELECT 1 FROM bookings 
                WHERE slot_id = NEW.slot_id 
                AND status IN ('confirmed', 'in_progress')
                AND id != NEW.id
            );
        END IF;
        
        -- If booking was reactivated, mark slot as booked
        IF OLD.status = 'cancelled' AND NEW.status IN ('confirmed', 'in_progress') THEN
            UPDATE available_slots 
            SET slot_status = 'booked', last_modified = NOW()
            WHERE id = NEW.slot_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update slot status based on bookings
DROP TRIGGER IF EXISTS trigger_update_slot_on_booking_insert ON bookings;
DROP TRIGGER IF EXISTS trigger_update_slot_on_booking_update ON bookings;
DROP TRIGGER IF EXISTS trigger_update_slot_on_booking_delete ON bookings;

CREATE TRIGGER trigger_update_slot_on_booking_insert
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_slot_status_on_booking();

CREATE TRIGGER trigger_update_slot_on_booking_update
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_slot_status_on_booking();

CREATE TRIGGER trigger_update_slot_on_booking_delete
    AFTER DELETE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_slot_status_on_booking();

COMMIT;

-- Migration completed successfully
-- Next steps:
-- 1. Update application code to use slot_status instead of booking counters
-- 2. Test slot booking and cancellation functionality
-- 3. Verify slot status updates automatically when bookings change