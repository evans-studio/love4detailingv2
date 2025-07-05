-- Update RLS policies for vehicles
DROP POLICY IF EXISTS "Allow anonymous vehicle creation" ON vehicles;
CREATE POLICY "Allow anonymous vehicle creation" ON vehicles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Update RLS policies for bookings
DROP POLICY IF EXISTS "Allow anonymous booking creation" ON bookings;
CREATE POLICY "Allow anonymous booking creation" ON bookings
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Update RLS policies for time_slots
DROP POLICY IF EXISTS "Allow public time slot access" ON time_slots;
CREATE POLICY "Allow public time slot access" ON time_slots
  FOR ALL
  TO public
  USING (true);

-- Update RLS policies for vehicle_sizes
DROP POLICY IF EXISTS "Allow public vehicle size access" ON vehicle_sizes;
CREATE POLICY "Allow public vehicle size access" ON vehicle_sizes
  FOR ALL
  TO public
  USING (true);

-- Update the anonymous booking function to use SECURITY DEFINER and explicit schema
CREATE OR REPLACE FUNCTION public.create_anonymous_booking(
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
        SELECT 1 FROM public.time_slots 
        WHERE id = p_time_slot_id 
        AND is_available = true
    ) THEN
        RAISE EXCEPTION 'Time slot is not available';
    END IF;

    -- Create vehicle record
    INSERT INTO public.vehicles (
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
    INSERT INTO public.bookings (
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION public.create_anonymous_booking TO public; 