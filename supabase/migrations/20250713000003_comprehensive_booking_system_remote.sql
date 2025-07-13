-- =========================================================================
-- Love4Detailing - Comprehensive Booking System Implementation
-- Remote Database Migration - Based on quick-fix.md verification
-- =========================================================================

-- Add missing columns to available_slots table
ALTER TABLE available_slots 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reserved_for_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS slot_status TEXT DEFAULT 'available',
ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_modified TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS modification_reason TEXT,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS max_bookings INTEGER DEFAULT 1;

-- Add constraint for slot_status
ALTER TABLE available_slots 
DROP CONSTRAINT IF EXISTS available_slots_slot_status_check;

ALTER TABLE available_slots 
ADD CONSTRAINT available_slots_slot_status_check 
CHECK (slot_status IN ('available', 'temporarily_reserved', 'booked', 'pending_reschedule', 'reschedule_reserved', 'cancelled'));

-- Ensure current_bookings has proper default
ALTER TABLE available_slots 
ALTER COLUMN current_bookings SET DEFAULT 0;

-- Update end_time based on start_time + 2 hours (standard service duration)
UPDATE available_slots 
SET end_time = (start_time::time + interval '2 hours')::time 
WHERE end_time IS NULL;

-- Add missing columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS original_slot_id UUID REFERENCES available_slots(id),
ADD COLUMN IF NOT EXISTS current_slot_id UUID REFERENCES available_slots(id),
ADD COLUMN IF NOT EXISTS booking_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status_change_reason TEXT,
ADD COLUMN IF NOT EXISTS created_from_reschedule BOOLEAN DEFAULT FALSE;

-- Update current_slot_id to match slot_id for existing bookings
UPDATE bookings 
SET current_slot_id = slot_id, original_slot_id = slot_id 
WHERE current_slot_id IS NULL AND slot_id IS NOT NULL;

-- Create reschedule_requests table
CREATE TABLE IF NOT EXISTS reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_slot_id UUID NOT NULL REFERENCES available_slots(id),
  requested_slot_id UUID NOT NULL REFERENCES available_slots(id),
  original_date DATE NOT NULL,
  original_time TIME NOT NULL,
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'expired')),
  admin_notes TEXT,
  temporary_reservation_id UUID,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for reschedule_requests
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reschedule requests
CREATE POLICY "Users can view own reschedule requests" 
ON reschedule_requests FOR SELECT 
USING (customer_id = auth.uid());

-- Policy: Users can create reschedule requests for their bookings
CREATE POLICY "Users can create reschedule requests" 
ON reschedule_requests FOR INSERT 
WITH CHECK (customer_id = auth.uid());

-- Policy: Admins can view all reschedule requests
CREATE POLICY "Admins can view all reschedule requests" 
ON reschedule_requests FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_available_slots_status ON available_slots(slot_status);
CREATE INDEX IF NOT EXISTS idx_available_slots_booking ON available_slots(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_available_slots_reserved ON available_slots(reserved_for_user_id, reserved_until) WHERE reserved_for_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_available_slots_date_time ON available_slots(slot_date, start_time);

CREATE INDEX IF NOT EXISTS idx_bookings_current_slot ON bookings(current_slot_id) WHERE current_slot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_original_slot ON bookings(original_slot_id) WHERE original_slot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_status_change ON bookings(last_status_change);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);

CREATE INDEX IF NOT EXISTS idx_reschedule_requests_booking ON reschedule_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_customer ON reschedule_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_expires ON reschedule_requests(expires_at) WHERE status = 'pending';

-- Migrate existing data
-- Update available_slots to link existing bookings
UPDATE available_slots 
SET 
  booking_id = bookings.id,
  slot_status = CASE 
    WHEN bookings.status::text = 'confirmed' THEN 'booked'
    WHEN bookings.status::text = 'cancelled' THEN 'available'
    ELSE 'booked'
  END,
  current_bookings = 1,
  last_modified = NOW(),
  modification_reason = 'Migrated existing booking relationship'
FROM bookings 
WHERE available_slots.id = bookings.slot_id
AND available_slots.booking_id IS NULL;

-- Set available_slots without bookings to available status
UPDATE available_slots 
SET 
  slot_status = 'available',
  current_bookings = 0,
  last_modified = NOW(),
  modification_reason = 'Set as available - no linked booking'
WHERE booking_id IS NULL AND slot_status IS NULL;

-- Create stored procedure for temporary reservations
CREATE OR REPLACE FUNCTION create_temporary_reservation(
  p_slot_id UUID,
  p_user_id UUID,
  p_duration_minutes INTEGER DEFAULT 10
) RETURNS BOOLEAN AS $$
DECLARE
  reservation_expires TIMESTAMPTZ;
BEGIN
  reservation_expires := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;
  
  -- Check if slot is available
  IF EXISTS (
    SELECT 1 FROM available_slots 
    WHERE id = p_slot_id 
    AND slot_status = 'available'
    AND (current_bookings < max_bookings OR max_bookings IS NULL)
  ) THEN
    -- Create temporary reservation
    UPDATE available_slots 
    SET 
      reserved_for_user_id = p_user_id,
      reserved_until = reservation_expires,
      slot_status = 'temporarily_reserved',
      last_modified = NOW(),
      modification_reason = 'Temporary reservation for booking process'
    WHERE id = p_slot_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION create_temporary_reservation TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE reschedule_requests IS 'Tracks all booking reschedule requests with complete slot management';
COMMENT ON COLUMN available_slots.slot_status IS 'Current status of the slot in the booking lifecycle';
COMMENT ON COLUMN available_slots.booking_id IS 'Direct link to the booking occupying this slot';
COMMENT ON COLUMN bookings.booking_history IS 'JSON array tracking all status changes and reasons';

SELECT 'Comprehensive booking system successfully deployed to remote Supabase!' as migration_result;