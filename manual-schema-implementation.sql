-- Manual Schema Implementation based on quick-fix.md
-- Adding missing columns and tables that weren't properly applied

-- =========================================================================
-- ADD MISSING AVAILABLE SLOTS COLUMNS
-- =========================================================================

-- Add booking relationship column
ALTER TABLE available_slots 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id);

-- Add temporary reservation columns
ALTER TABLE available_slots 
ADD COLUMN IF NOT EXISTS reserved_for_user_id UUID REFERENCES users(id);

ALTER TABLE available_slots 
ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMPTZ;

-- Add status tracking
ALTER TABLE available_slots 
ADD COLUMN IF NOT EXISTS slot_status TEXT DEFAULT 'available';

-- Add modification tracking
ALTER TABLE available_slots 
ADD COLUMN IF NOT EXISTS last_modified TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE available_slots 
ADD COLUMN IF NOT EXISTS modification_reason TEXT;

-- Update end_time for existing slots (2-hour duration) 
-- Note: end_time already exists, just ensure it's populated
UPDATE available_slots 
SET end_time = (start_time::time + INTERVAL '2 hours')::time
WHERE end_time IS NULL;

-- =========================================================================
-- ADD MISSING BOOKINGS COLUMNS  
-- =========================================================================

-- Add slot relationship columns
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS original_slot_id UUID REFERENCES available_slots(id);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS current_slot_id UUID REFERENCES available_slots(id);

-- Add history tracking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_history JSONB DEFAULT '[]'::jsonb;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;

-- Add status tracking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS status_change_reason TEXT;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS created_from_reschedule BOOLEAN DEFAULT FALSE;

-- =========================================================================
-- CREATE RESCHEDULE REQUESTS TABLE
-- =========================================================================

-- Create reschedule_requests table if missing
CREATE TABLE IF NOT EXISTS reschedule_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id),
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
    responded_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- ADD CONSTRAINTS AND INDEXES
-- =========================================================================

-- Add slot_status constraint
ALTER TABLE available_slots 
DROP CONSTRAINT IF EXISTS available_slots_slot_status_check;

ALTER TABLE available_slots 
ADD CONSTRAINT available_slots_slot_status_check 
CHECK (slot_status IN ('available', 'temporarily_reserved', 'booked', 'pending_reschedule', 'reschedule_reserved', 'cancelled'));

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_available_slots_status ON available_slots(slot_status);
CREATE INDEX IF NOT EXISTS idx_available_slots_booking ON available_slots(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_available_slots_reserved ON available_slots(reserved_for_user_id, reserved_until) WHERE reserved_for_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_current_slot ON bookings(current_slot_id) WHERE current_slot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_original_slot ON bookings(original_slot_id) WHERE original_slot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_status_change ON bookings(last_status_change);

CREATE INDEX IF NOT EXISTS idx_reschedule_requests_booking ON reschedule_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_customer ON reschedule_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON reschedule_requests(status);

-- =========================================================================
-- ENABLE RLS FOR RESCHEDULE REQUESTS
-- =========================================================================

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

-- =========================================================================
-- POPULATE DEFAULT DATA
-- =========================================================================

-- Update current_slot_id to match slot_id for existing bookings
UPDATE bookings 
SET current_slot_id = slot_id, original_slot_id = slot_id 
WHERE current_slot_id IS NULL AND slot_id IS NOT NULL;

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

-- =========================================================================
-- VALIDATION QUERIES
-- =========================================================================

-- Verify all new columns exist
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('available_slots', 'bookings', 'reschedule_requests')
    AND column_name IN (
        'booking_id', 'reserved_for_user_id', 'slot_status',
        'original_slot_id', 'current_slot_id', 'booking_history'
    )
ORDER BY table_name, column_name;