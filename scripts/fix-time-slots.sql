-- Begin transaction
BEGIN;

-- Update is_booked based on is_available for future slots only
UPDATE time_slots
SET is_booked = NOT is_available
WHERE slot_date >= CURRENT_DATE
AND (slot_date > CURRENT_DATE OR (slot_date = CURRENT_DATE AND slot_time > CURRENT_TIME));

-- Drop the old is_available column
ALTER TABLE time_slots DROP COLUMN is_available;

-- Add index for performance if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                  WHERE schemaname = 'public' 
                  AND tablename = 'time_slots' 
                  AND indexname = 'idx_time_slots_is_booked') THEN
        CREATE INDEX idx_time_slots_is_booked ON time_slots(is_booked);
    END IF;
END $$;

-- Update RLS policies
DROP POLICY IF EXISTS time_slots_public_read ON time_slots;
CREATE POLICY time_slots_public_read ON time_slots
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS time_slots_service_manage ON time_slots;
CREATE POLICY time_slots_service_manage ON time_slots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify the changes - show only future slots
SELECT 
    slot_date,
    slot_time,
    is_booked,
    created_at,
    updated_at
FROM time_slots
WHERE slot_date >= CURRENT_DATE
AND (slot_date > CURRENT_DATE OR (slot_date = CURRENT_DATE AND slot_time > CURRENT_TIME))
ORDER BY slot_date, slot_time
LIMIT 5;

COMMIT; 