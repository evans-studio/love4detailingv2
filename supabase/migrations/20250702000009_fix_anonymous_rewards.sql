-- Drop existing function
DROP FUNCTION IF EXISTS create_anonymous_booking;

-- Create function to handle anonymous booking creation
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

    -- Update time slot status
    UPDATE time_slots
    SET is_booked = true
    WHERE id = p_time_slot_id;

    RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION create_anonymous_booking TO public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_reward_transaction_trigger ON bookings;

-- Create function to handle reward transactions
CREATE OR REPLACE FUNCTION create_reward_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create reward transaction if the booking has a user_id
    IF NEW.user_id IS NOT NULL THEN
        -- Calculate points (10 points per £1)
        DECLARE
            points_earned INTEGER := (NEW.total_price_pence / 100) * 10;
        BEGIN
            -- Create reward transaction
            INSERT INTO reward_transactions (
                user_id,
                booking_id,
                points,
                type,
                description
            ) VALUES (
                NEW.user_id,
                NEW.id,
                points_earned,
                'earned',
                CONCAT('Points earned from booking ', NEW.booking_reference)
            );

            -- Update user's total points
            INSERT INTO rewards (user_id, points)
            VALUES (NEW.user_id, points_earned)
            ON CONFLICT (user_id)
            DO UPDATE SET points = rewards.points + points_earned;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reward transactions
CREATE TRIGGER create_reward_transaction_trigger
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION create_reward_transaction(); 