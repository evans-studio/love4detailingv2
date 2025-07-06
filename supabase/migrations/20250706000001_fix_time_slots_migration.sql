-- Fix time_slots migration issue: is_booked → is_available
-- This migration resolves the dependency conflict with calendar_availability_view

-- First, drop the dependent materialized view that uses the old column
DROP MATERIALIZED VIEW IF EXISTS calendar_availability_view CASCADE;

-- Now we can safely drop the old column and add the new one
ALTER TABLE time_slots DROP COLUMN IF EXISTS is_booked CASCADE;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Update existing records based on booking status
UPDATE time_slots 
SET is_available = false 
WHERE id IN (
    SELECT ts.id 
    FROM time_slots ts
    INNER JOIN bookings b ON b.time_slot_id = ts.id
    WHERE b.status IN ('confirmed', 'completed')
);

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_time_slots_availability 
ON time_slots(slot_date, is_available) 
WHERE is_available = true;

-- Recreate the calendar availability view with the correct column
CREATE MATERIALIZED VIEW calendar_availability_view AS
SELECT 
    ts.slot_date,
    ts.slot_time,
    ts.slot_number,
    ts.is_available,
    COUNT(b.id) as booking_count,
    CASE 
        WHEN ts.is_available = false THEN 'booked'
        WHEN ts.is_available = true THEN 'available'
        ELSE 'unavailable'
    END as status
FROM time_slots ts
LEFT JOIN bookings b ON ts.id = b.time_slot_id AND b.status IN ('confirmed', 'completed')
GROUP BY ts.id, ts.slot_date, ts.slot_time, ts.slot_number, ts.is_available
ORDER BY ts.slot_date, ts.slot_number;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_calendar_availability_date 
ON calendar_availability_view(slot_date);

-- Grant permissions
GRANT SELECT ON calendar_availability_view TO authenticated;
GRANT SELECT ON calendar_availability_view TO anon;
GRANT ALL ON calendar_availability_view TO service_role;

-- Add comment for documentation
COMMENT ON MATERIALIZED VIEW calendar_availability_view IS 
'Provides computed real-time availability for the booking system. Refresh periodically or via triggers.';

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_calendar_availability()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW calendar_availability_view;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the refresh function
GRANT EXECUTE ON FUNCTION refresh_calendar_availability() TO service_role;