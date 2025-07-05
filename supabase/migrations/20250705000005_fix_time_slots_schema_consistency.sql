-- Fix time_slots table schema consistency
-- This migration resolves conflicts between is_available and is_booked columns

-- First, ensure we have the correct structure
-- Drop any conflicting columns and standardize on is_available
ALTER TABLE time_slots DROP COLUMN IF EXISTS is_booked;

-- Ensure is_available column exists with proper default
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Update any existing records to ensure proper availability state
-- Mark slots as unavailable if they have confirmed bookings
UPDATE time_slots 
SET is_available = false 
WHERE id IN (
    SELECT ts.id 
    FROM time_slots ts
    INNER JOIN bookings b ON b.time_slot_id = ts.id
    WHERE b.status IN ('confirmed', 'completed')
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_time_slots_availability 
ON time_slots(slot_date, is_available) 
WHERE is_available = true;

-- Update the create_anonymous_booking function to use consistent column names
CREATE OR REPLACE FUNCTION create_anonymous_booking(
    p_full_name text,
    p_email text,
    p_phone text,
    p_time_slot_id uuid,
    p_vehicle_id uuid,
    p_service_type text,
    p_total_amount numeric
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id uuid;
    v_booking_reference text;
    v_user_id uuid;
    v_time_slot record;
BEGIN
    -- Validate time slot availability
    SELECT * INTO v_time_slot
    FROM time_slots 
    WHERE id = p_time_slot_id 
    AND is_available = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Time slot is not available');
    END IF;

    -- Generate booking reference
    v_booking_reference := 'L4D' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                          LPAD((EXTRACT(EPOCH FROM NOW())::bigint % 10000)::text, 4, '0');

    -- Check if user exists
    SELECT id INTO v_user_id FROM users WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        -- Create anonymous user
        INSERT INTO users (email, full_name, phone, role, created_at, updated_at)
        VALUES (p_email, p_full_name, p_phone, 'customer', NOW(), NOW())
        RETURNING id INTO v_user_id;
    END IF;

    -- Create booking
    INSERT INTO bookings (
        user_id,
        time_slot_id,
        vehicle_id,
        service_type,
        status,
        total_amount,
        booking_reference,
        customer_name,
        email,
        phone,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        p_time_slot_id,
        p_vehicle_id,
        p_service_type,
        'confirmed',
        p_total_amount,
        v_booking_reference,
        p_full_name,
        p_email,
        p_phone,
        NOW(),
        NOW()
    ) RETURNING id INTO v_booking_id;

    -- Mark time slot as unavailable
    UPDATE time_slots 
    SET is_available = false 
    WHERE id = p_time_slot_id;

    RETURN json_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'booking_reference', v_booking_reference,
        'user_id', v_user_id
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', 'Failed to create booking: ' || SQLERRM);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_anonymous_booking(text, text, text, uuid, uuid, text, numeric) TO anon;
GRANT EXECUTE ON FUNCTION create_anonymous_booking(text, text, text, uuid, uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION create_anonymous_booking(text, text, text, uuid, uuid, text, numeric) TO service_role;

-- Add comment for documentation
COMMENT ON COLUMN time_slots.is_available IS 'Indicates if the time slot is available for booking. False when slot is booked or unavailable.';
COMMENT ON FUNCTION create_anonymous_booking IS 'Creates a booking for anonymous users with proper slot availability validation';

-- Ensure RLS policies use correct column name
DROP POLICY IF EXISTS "Users can view available time slots" ON time_slots;
CREATE POLICY "Users can view available time slots" ON time_slots
    FOR SELECT
    USING (is_available = true OR auth.uid() IS NOT NULL);

-- Add policy for service role to manage all slots
CREATE POLICY "Service role can manage all time slots" ON time_slots
    FOR ALL
    USING (current_setting('role') = 'service_role');

-- Ensure admins can see all slots
CREATE POLICY "Admins can view all time slots" ON time_slots
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users au 
            WHERE au.id = auth.uid() 
            AND au.raw_user_meta_data->>'role' = 'admin'
        )
    );