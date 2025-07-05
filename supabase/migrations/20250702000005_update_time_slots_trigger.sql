-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS update_time_slot_availability_trigger ON bookings;
DROP FUNCTION IF EXISTS update_time_slot_availability();

-- Create an updated function that doesn't need users table access
CREATE OR REPLACE FUNCTION update_time_slot_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Mark the slot as unavailable when a booking is created
    UPDATE time_slots 
    SET is_available = false 
    WHERE id = NEW.time_slot_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Mark the slot as available when a booking is deleted (if no other bookings exist)
    UPDATE time_slots 
    SET is_available = true 
    WHERE id = OLD.time_slot_id 
    AND NOT EXISTS (
      SELECT 1 FROM bookings 
      WHERE time_slot_id = OLD.time_slot_id 
      AND id != OLD.id
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER; -- Run as the function owner to avoid permission issues

-- Recreate the trigger
CREATE TRIGGER update_time_slot_availability_trigger
AFTER INSERT OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_time_slot_availability(); 