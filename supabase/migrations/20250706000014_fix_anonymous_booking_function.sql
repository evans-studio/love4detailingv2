-- Drop all versions of create_anonymous_booking function
DROP FUNCTION IF EXISTS create_anonymous_booking(text, text, text, uuid, uuid, text, numeric);
DROP FUNCTION IF EXISTS create_anonymous_booking(text, text, text, uuid, uuid, uuid, integer, text, text, text);
DROP FUNCTION IF EXISTS create_anonymous_booking(text, text, text, uuid, uuid, integer, text, text, text);
DROP FUNCTION IF EXISTS create_anonymous_booking(uuid, uuid, integer, varchar, varchar, varchar);
DROP FUNCTION IF EXISTS create_anonymous_booking(uuid, uuid, integer, varchar, varchar, varchar, varchar);

-- Create the latest version of create_anonymous_booking function
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
SET search_path = public
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
COMMENT ON FUNCTION create_anonymous_booking IS 'Creates a booking for anonymous users with proper slot availability validation';

-- Function to generate initial available slots
DO $$
DECLARE
    v_start_date DATE := CURRENT_DATE;
    v_end_date DATE := CURRENT_DATE + INTERVAL '30 days';
    v_current_date DATE := v_start_date;
    v_slot_start TIME;
    v_slot_end TIME;
    v_slot_duration INTERVAL := '2 hours';
BEGIN
    -- Generate slots for each day
    WHILE v_current_date <= v_end_date LOOP
        -- Skip Sundays (day of week 0)
        IF EXTRACT(DOW FROM v_current_date) != 0 THEN
            v_slot_start := '09:00:00';
            
            -- Generate slots throughout the day
            WHILE v_slot_start <= '15:00:00' LOOP  -- Last slot starts at 3 PM
                v_slot_end := v_slot_start + v_slot_duration;
                
                INSERT INTO available_slots (
                    slot_date,
                    start_time,
                    end_time,
                    max_bookings,
                    current_bookings,
                    is_blocked
                ) VALUES (
                    v_current_date,
                    v_slot_start,
                    v_slot_end,
                    1,  -- One booking per slot
                    0,  -- No current bookings
                    FALSE
                );
                
                v_slot_start := v_slot_start + v_slot_duration;
            END LOOP;
        END IF;
        
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
END $$; 