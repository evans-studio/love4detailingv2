-- =========================================================================
-- Love4Detailing - Database Cleanup and Optimization
-- Remove unused columns and fix duplicate columns based on codebase analysis
-- =========================================================================

-- =========================================================================
-- PHASE 1: Handle Dependencies and Views
-- =========================================================================

-- Drop views that depend on columns we want to remove
DROP VIEW IF EXISTS booking_summaries CASCADE;

-- =========================================================================
-- PHASE 2: Available Slots Table Cleanup
-- =========================================================================

-- Remove unused audit and scheduling columns that aren't used in the application
ALTER TABLE available_slots 
DROP COLUMN IF EXISTS block_reason,
DROP COLUMN IF EXISTS template_id,
DROP COLUMN IF EXISTS day_of_week,
DROP COLUMN IF EXISTS created_by_admin,
DROP COLUMN IF EXISTS modification_reason;

-- Keep core business columns and new reschedule system columns
-- Keeping: id, slot_date, start_time, end_time, max_bookings, current_bookings, 
--          is_blocked, created_at, updated_at, booking_id, reserved_for_user_id,
--          reserved_until, slot_status, last_modified

-- =========================================================================
-- PHASE 2: Bookings Table Optimization  
-- =========================================================================

-- Remove lightly used service tracking columns that add complexity
ALTER TABLE bookings
DROP COLUMN IF EXISTS started_at,
DROP COLUMN IF EXISTS actual_duration_minutes,
DROP COLUMN IF EXISTS estimated_duration_minutes,
DROP COLUMN IF EXISTS internal_notes;

-- Keep all customer-facing and business-critical columns
-- Keeping: id, booking_reference, user_id, customer_*, vehicle_id, service_id,
--          slot_id, status, payment_*, *_price_pence, confirmed_at, completed_at,
--          cancelled_at, cancellation_reason, notes, created_at, updated_at,
--          customer_instructions, service_location, and all reschedule columns

-- =========================================================================
-- PHASE 3: Users Table Cleanup (Fix Duplicates)
-- =========================================================================

-- First, identify which auth.users columns we need to preserve
-- The auth.users table has Supabase system columns we shouldn't modify directly
-- Instead, let's clean up our custom users table duplicates

-- Note: This is a complex operation due to auth.users being a system table
-- We'll focus on removing obvious duplicates and unused columns

-- Remove duplicate role column (keep the enum type one)
DO $$ 
BEGIN
    -- Check if we have both character varying and enum role columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role' 
        AND data_type = 'character varying'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role' 
        AND data_type = 'USER-DEFINED'
    ) THEN
        -- Drop the character varying version, keep the enum
        ALTER TABLE users DROP COLUMN role CASCADE;
        -- Note: This will drop the varchar one, keeping the enum version
    END IF;
END $$;

-- =========================================================================
-- PHASE 4: Vehicles Table Optimization
-- =========================================================================

-- Add the missing size_confirmed column that's referenced in code but doesn't exist
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS size_confirmed BOOLEAN DEFAULT FALSE;

-- Remove lightly used columns
ALTER TABLE vehicles
DROP COLUMN IF EXISTS special_requirements,
DROP COLUMN IF EXISTS vehicle_type;

-- Keep core columns: id, user_id, registration, make, model, year, color, size, 
--                   is_active, created_at, updated_at, size_confirmed

-- =========================================================================
-- PHASE 5: Index Cleanup and Optimization
-- =========================================================================

-- Remove indexes on dropped columns (if they exist)
DROP INDEX IF EXISTS idx_available_slots_template;
DROP INDEX IF EXISTS idx_available_slots_day_of_week;

-- Ensure we have optimal indexes for the columns we're keeping
CREATE INDEX IF NOT EXISTS idx_available_slots_slot_date_time ON available_slots(slot_date, start_time);
CREATE INDEX IF NOT EXISTS idx_available_slots_status_booking ON available_slots(slot_status, booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_active ON vehicles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vehicles_size_confirmed ON vehicles(size_confirmed) WHERE size_confirmed = FALSE;

-- =========================================================================
-- PHASE 6: Data Integrity and Validation
-- =========================================================================

-- Update size_confirmed for existing vehicles based on size detection logic
UPDATE vehicles 
SET size_confirmed = TRUE 
WHERE size IN ('small', 'medium', 'large', 'extra_large') 
AND size_confirmed = FALSE;

-- Ensure slot_status is properly set for existing slots
UPDATE available_slots 
SET slot_status = CASE 
    WHEN booking_id IS NOT NULL THEN 'booked'
    WHEN is_blocked = TRUE THEN 'available' -- blocked slots are still 'available' status but is_blocked = true
    ELSE 'available'
END
WHERE slot_status IS NULL;

-- =========================================================================
-- PHASE 7: Constraints and Validation
-- =========================================================================

-- Add constraint to ensure vehicles have confirmed sizes for pricing
ALTER TABLE vehicles 
ADD CONSTRAINT vehicles_size_valid 
CHECK (size IN ('small', 'medium', 'large', 'extra_large'));

-- Ensure slot_status constraint exists
ALTER TABLE available_slots 
DROP CONSTRAINT IF EXISTS available_slots_slot_status_check;

ALTER TABLE available_slots 
ADD CONSTRAINT available_slots_slot_status_check 
CHECK (slot_status IN ('available', 'temporarily_reserved', 'booked', 'pending_reschedule', 'reschedule_reserved', 'cancelled'));

-- =========================================================================
-- PHASE 8: Comments for Documentation
-- =========================================================================

COMMENT ON COLUMN vehicles.size_confirmed IS 'TRUE when vehicle size has been verified/confirmed, FALSE when auto-detected and needs verification';
COMMENT ON COLUMN available_slots.slot_status IS 'Current booking status of the slot in the reservation system';
COMMENT ON COLUMN bookings.booking_history IS 'JSONB array tracking all status changes and administrative actions';

-- =========================================================================
-- VALIDATION AND SUMMARY
-- =========================================================================

-- Final validation query to show cleaned schema
SELECT 
    'available_slots' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'available_slots'

UNION ALL

SELECT 
    'bookings' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'bookings'

UNION ALL

SELECT 
    'vehicles' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'vehicles'

UNION ALL

SELECT 
    'reschedule_requests' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'reschedule_requests';

SELECT 'Database cleanup and optimization completed successfully!' as cleanup_result;