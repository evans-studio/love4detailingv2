-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous booking creation" ON bookings;

-- Create policy for anonymous booking creation
CREATE POLICY "Allow anonymous booking creation" ON bookings
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy for viewing bookings
CREATE POLICY "Allow viewing bookings" ON bookings
  FOR SELECT
  TO public
  USING (true);

-- Update the anonymous booking function
CREATE OR REPLACE FUNCTION create_anonymous_booking(
    p_vehicle_registration TEXT,
    p_vehicle_make TEXT,
    p_vehicle_model TEXT,
    p_vehicle_year TEXT,
    p_vehicle_color TEXT,
    p_vehicle_size_id UUID,
    p_time_slot_id UUID,
    p_total_price_pence INTEGER,
    p_email TEXT,
    p_full_name TEXT,
    p_phone TEXT
) RETURNS UUID AS $$
DECLARE
    v_vehicle_id UUID;
    v_booking_id UUID;
BEGIN
    -- Check if time slot is available
    IF NOT EXISTS (
        SELECT 1 FROM time_slots 
        WHERE id = p_time_slot_id 
        AND is_available = true
    ) THEN
        RAISE EXCEPTION 'Time slot is not available';
    END IF;

    -- Create vehicle record
    INSERT INTO vehicles (
        registration,
        make,
        model,
        year,
        color,
        size_id,
        user_id
    ) VALUES (
        p_vehicle_registration,
        p_vehicle_make,
        p_vehicle_model,
        p_vehicle_year,
        p_vehicle_color,
        p_vehicle_size_id,
        NULL -- Will be updated once user is created
    ) RETURNING id INTO v_vehicle_id;

    -- Create booking record
    INSERT INTO bookings (
        vehicle_id,
        time_slot_id,
        total_price_pence,
        email,
        full_name,
        phone,
        status,
        payment_status,
        booking_reference
    ) VALUES (
        v_vehicle_id,
        p_time_slot_id,
        p_total_price_pence,
        p_email,
        p_full_name,
        p_phone,
        'pending',
        'pending',
        CONCAT('BK-', TO_CHAR(NOW(), 'YYYYMMDD'), '-', LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'))
    ) RETURNING id INTO v_booking_id;

    RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION create_anonymous_booking TO public; 