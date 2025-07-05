-- Ensure the time_slots table has the correct schema
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(slot_date, slot_time)
);

-- Update any existing slots without is_available
UPDATE time_slots
SET is_available = true
WHERE is_available IS NULL;

-- Enable RLS
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

-- Recreate the public read policy
DROP POLICY IF EXISTS time_slots_public_read ON time_slots;
CREATE POLICY time_slots_public_read ON time_slots
  FOR SELECT
  TO public
  USING (true);

-- Create policy for service role to manage time slots
DROP POLICY IF EXISTS time_slots_service_manage ON time_slots;
CREATE POLICY time_slots_service_manage ON time_slots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true); 