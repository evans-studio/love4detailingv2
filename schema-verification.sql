-- Schema Verification Script Based on quick-fix.md
-- Step 1: Verify Current Schema

-- Check Available Slots Table Structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'available_slots' 
ORDER BY ordinal_position;

-- Check Bookings Table Structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;

-- Check if reschedule_requests table exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'reschedule_requests' 
ORDER BY ordinal_position;

-- Verify Migration History
SELECT version, name, executed_at
FROM supabase_migrations.schema_migrations 
ORDER BY executed_at DESC 
LIMIT 10;