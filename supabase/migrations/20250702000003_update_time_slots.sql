-- Add is_available column to time_slots table
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Create a function to update is_available based on bookings
CREATE OR REPLACE FUNCTION update_time_slot_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Update is_available when a booking is added or removed
  IF TG_OP = 'INSERT' THEN
    UPDATE time_slots 
    SET is_available = false 
    WHERE id = NEW.time_slot_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE time_slots 
    SET is_available = true 
    WHERE id = OLD.time_slot_id 
    AND NOT EXISTS (
      SELECT 1 FROM bookings 
      WHERE time_slot_id = OLD.time_slot_id
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_time_slot_availability_trigger ON bookings;

-- Create trigger for bookings table
CREATE TRIGGER update_time_slot_availability_trigger
AFTER INSERT OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_time_slot_availability();

-- Enable RLS on time_slots table
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS time_slots_public_read ON time_slots;

-- Create policy to allow public read access to time_slots
CREATE POLICY time_slots_public_read ON time_slots
  FOR SELECT
  TO public
  USING (true);

-- Update existing time slots availability based on current bookings
UPDATE time_slots ts
SET is_available = NOT EXISTS (
  SELECT 1 FROM bookings b 
  WHERE b.time_slot_id = ts.id
); 