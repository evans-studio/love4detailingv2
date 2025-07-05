-- First, add the new column
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS is_booked BOOLEAN DEFAULT false;

-- Copy inverted values from is_available to is_booked
UPDATE time_slots SET is_booked = NOT is_available;

-- Drop the old column
ALTER TABLE time_slots DROP COLUMN is_available;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_time_slots_is_booked ON time_slots(is_booked);

-- Update RLS policies to use is_booked
DROP POLICY IF EXISTS time_slots_public_read ON time_slots;
CREATE POLICY time_slots_public_read ON time_slots
  FOR SELECT
  TO public
  USING (true);

-- Update service role policy
DROP POLICY IF EXISTS time_slots_service_manage ON time_slots;
CREATE POLICY time_slots_service_manage ON time_slots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true); 