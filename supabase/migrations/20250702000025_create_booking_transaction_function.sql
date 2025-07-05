-- Create a comprehensive booking transaction function that bypasses trigger issues
CREATE OR REPLACE FUNCTION create_booking_transaction(
    p_vehicle_registration TEXT,
    p_vehicle_make TEXT,
    p_vehicle_model TEXT,
    p_vehicle_year TEXT,
    p_vehicle_color TEXT,
    p_vehicle_size_id UUID,
    p_time_slot_id UUID,
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_total_price_pence INTEGER
) RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_vehicle_id UUID;
    v_booking_id UUID;
    v_booking_ref TEXT;
    v_is_new_user BOOLEAN := false;
    v_result JSON;
BEGIN
    -- Check if time slot is available
    IF NOT EXISTS (
        SELECT 1 FROM time_slots 
        WHERE id = p_time_slot_id 
        AND is_booked = false
    ) THEN
        RAISE EXCEPTION 'Time slot is not available';
    END IF;

    -- Check if user already exists
    SELECT id INTO v_user_id
    FROM users
    WHERE email = p_email;

    IF v_user_id IS NULL THEN
        -- Create new auth user
        BEGIN
            INSERT INTO auth.users (
                email,
                email_confirmed_at,
                raw_user_meta_data
            ) VALUES (
                p_email,
                NOW(),
                json_build_object(
                    'first_name', p_first_name,
                    'last_name', p_last_name,
                    'phone', p_phone
                )
            ) RETURNING id INTO v_user_id;
        EXCEPTION
            WHEN OTHERS THEN
                -- If auth user creation fails, create a UUID for the public user record
                v_user_id := gen_random_uuid();
        END;

        -- Create user profile
        INSERT INTO users (
            id,
            email,
            full_name,
            phone,
            role
        ) VALUES (
            v_user_id,
            p_email,
            p_first_name || ' ' || p_last_name,
            p_phone,
            'customer'
        );

        v_is_new_user := true;
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
        UPPER(p_vehicle_registration),
        p_vehicle_make,
        p_vehicle_model,
        p_vehicle_year,
        p_vehicle_color,
        p_vehicle_size_id,
        v_user_id
    ) RETURNING id INTO v_vehicle_id;

    -- Generate booking reference
    v_booking_ref := 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- Create booking record
    INSERT INTO bookings (
        user_id,
        vehicle_id,
        time_slot_id,
        total_price_pence,
        email,
        full_name,
        phone,
        status,
        payment_status,
        payment_method,
        booking_reference
    ) VALUES (
        v_user_id,
        v_vehicle_id,
        p_time_slot_id,
        p_total_price_pence,
        p_email,
        p_first_name || ' ' || p_last_name,
        p_phone,
        'pending',
        'pending',
        'cash',
        v_booking_ref
    ) RETURNING id INTO v_booking_id;

    -- Mark time slot as booked
    UPDATE time_slots
    SET is_booked = true
    WHERE id = p_time_slot_id;

    -- Build result JSON
    v_result := json_build_object(
        'booking_id', v_booking_id,
        'booking_reference', v_booking_ref,
        'user_id', v_user_id,
        'is_new_user', v_is_new_user
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE EXCEPTION 'Booking transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;