-- Booking Functions for Love4Detailing v2.0
-- This migration implements the booking transaction functions

-- Booking transaction function for atomic operations
CREATE OR REPLACE FUNCTION create_booking_transaction(
    p_customer_email VARCHAR,
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR,
    p_service_id UUID,
    p_slot_id UUID,
    p_vehicle_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_payment_method payment_method DEFAULT 'cash'
) RETURNS TABLE (
    booking_id UUID,
    booking_reference VARCHAR,
    total_price INTEGER
) AS $$
DECLARE
    v_booking_id UUID;
    v_booking_reference VARCHAR;
    v_vehicle_size vehicle_size;
    v_service_price INTEGER;
    v_user_exists BOOLEAN;
    v_slot_available BOOLEAN;
BEGIN
    -- Start transaction
    BEGIN
        -- Check if slot is available
        SELECT (current_bookings < max_bookings AND NOT is_blocked)
        INTO v_slot_available
        FROM available_slots
        WHERE id = p_slot_id;

        IF NOT v_slot_available THEN
            RAISE EXCEPTION 'Selected time slot is not available';
        END IF;

        -- Lock the slot to prevent double booking
        INSERT INTO booking_locks (slot_id, session_id, expires_at)
        VALUES (p_slot_id, gen_random_uuid()::text, NOW() + INTERVAL '5 minutes')
        ON CONFLICT DO NOTHING;

        -- Get vehicle size if vehicle provided
        IF p_vehicle_id IS NOT NULL THEN
            SELECT size INTO v_vehicle_size
            FROM vehicles
            WHERE id = p_vehicle_id;
        ELSE
            -- Default to medium if no vehicle
            v_vehicle_size := 'medium';
        END IF;

        -- Get service price
        SELECT price_pence INTO v_service_price
        FROM service_pricing
        WHERE service_id = p_service_id
        AND vehicle_size = v_vehicle_size;

        IF v_service_price IS NULL THEN
            RAISE EXCEPTION 'Service pricing not found for vehicle size: %', v_vehicle_size;
        END IF;

        -- Generate booking reference
        v_booking_reference := generate_booking_reference();

        -- Create booking
        INSERT INTO bookings (
            booking_reference,
            user_id,
            customer_email,
            customer_name,
            customer_phone,
            vehicle_id,
            service_id,
            slot_id,
            payment_method,
            service_price_pence,
            total_price_pence,
            status
        ) VALUES (
            v_booking_reference,
            p_user_id,
            p_customer_email,
            p_customer_name,
            p_customer_phone,
            p_vehicle_id,
            p_service_id,
            p_slot_id,
            p_payment_method,
            v_service_price,
            v_service_price,
            'pending'
        ) RETURNING id INTO v_booking_id;

        -- Update slot availability
        UPDATE available_slots
        SET current_bookings = current_bookings + 1
        WHERE id = p_slot_id
        AND current_bookings < max_bookings;

        -- Clean up lock
        DELETE FROM booking_locks
        WHERE slot_id = p_slot_id;

        -- Create or update customer rewards if user exists
        IF p_user_id IS NOT NULL THEN
            INSERT INTO customer_rewards (user_id, customer_email, total_points, points_lifetime)
            VALUES (p_user_id, p_customer_email, 0, 0)
            ON CONFLICT (user_id) DO NOTHING;
        ELSE
            -- For anonymous bookings, create by email
            INSERT INTO customer_rewards (customer_email, total_points, points_lifetime)
            VALUES (p_customer_email, 0, 0)
            ON CONFLICT (customer_email) DO NOTHING;
        END IF;

        -- Return results
        RETURN QUERY
        SELECT v_booking_id, v_booking_reference, v_service_price;

    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback by cleaning up lock
            DELETE FROM booking_locks WHERE slot_id = p_slot_id;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get available slots with service duration
CREATE OR REPLACE FUNCTION get_available_slots_for_date(
    p_date DATE,
    p_service_id UUID DEFAULT NULL
) RETURNS TABLE (
    slot_id UUID,
    slot_date DATE,
    start_time TIME,
    end_time TIME,
    available BOOLEAN,
    current_bookings INTEGER,
    max_bookings INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.slot_date,
        s.start_time,
        s.end_time,
        (s.current_bookings < s.max_bookings AND NOT s.is_blocked) as available,
        s.current_bookings,
        s.max_bookings
    FROM available_slots s
    WHERE s.slot_date = p_date
    AND s.slot_date >= CURRENT_DATE
    ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update booking status with automatic timestamp
CREATE OR REPLACE FUNCTION update_booking_status(
    p_booking_id UUID,
    p_new_status booking_status,
    p_reason TEXT DEFAULT NULL
) RETURNS TABLE (
    booking_id UUID,
    old_status booking_status,
    new_status booking_status,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_old_status booking_status;
    v_updated_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status
    FROM bookings
    WHERE id = p_booking_id;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Booking not found: %', p_booking_id;
    END IF;

    -- Update booking with appropriate timestamp
    UPDATE bookings
    SET 
        status = p_new_status,
        confirmed_at = CASE WHEN p_new_status = 'confirmed' THEN NOW() ELSE confirmed_at END,
        started_at = CASE WHEN p_new_status = 'in_progress' THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
        cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
        cancellation_reason = CASE WHEN p_new_status = 'cancelled' THEN p_reason ELSE cancellation_reason END,
        updated_at = NOW()
    WHERE id = p_booking_id
    RETURNING updated_at INTO v_updated_at;

    -- If booking is completed, award points
    IF p_new_status = 'completed' THEN
        PERFORM award_booking_points(p_booking_id);
    END IF;

    RETURN QUERY
    SELECT p_booking_id, v_old_status, p_new_status, v_updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award points for completed bookings
CREATE OR REPLACE FUNCTION award_booking_points(p_booking_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_booking_record RECORD;
    v_points_to_award INTEGER;
    v_reward_id UUID;
    v_new_total INTEGER;
    v_new_tier reward_tier;
BEGIN
    -- Get booking details
    SELECT 
        b.user_id,
        b.customer_email,
        b.total_price_pence,
        b.status
    INTO v_booking_record
    FROM bookings b
    WHERE b.id = p_booking_id
    AND b.status = 'completed';

    IF v_booking_record IS NULL THEN
        RETURN 0;
    END IF;

    -- Calculate points (1 point per pound spent)
    v_points_to_award := FLOOR(v_booking_record.total_price_pence / 100);

    -- Get or create customer rewards record
    IF v_booking_record.user_id IS NOT NULL THEN
        -- Registered user
        SELECT id INTO v_reward_id
        FROM customer_rewards
        WHERE user_id = v_booking_record.user_id;
    ELSE
        -- Anonymous booking
        SELECT id INTO v_reward_id
        FROM customer_rewards
        WHERE customer_email = v_booking_record.customer_email
        AND user_id IS NULL;
    END IF;

    -- Update rewards
    UPDATE customer_rewards
    SET 
        total_points = total_points + v_points_to_award,
        points_lifetime = points_lifetime + v_points_to_award,
        updated_at = NOW()
    WHERE id = v_reward_id
    RETURNING total_points INTO v_new_total;

    -- Calculate new tier
    v_new_tier := calculate_reward_tier(v_new_total);

    -- Update tier if changed
    UPDATE customer_rewards
    SET 
        current_tier = v_new_tier,
        tier_progress = v_new_total
    WHERE id = v_reward_id;

    -- Record transaction
    INSERT INTO reward_transactions (
        customer_reward_id,
        booking_id,
        transaction_type,
        points_amount,
        description
    ) VALUES (
        v_reward_id,
        p_booking_id,
        'earned',
        v_points_to_award,
        'Points earned from completed booking'
    );

    RETURN v_points_to_award;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate reward tier based on points
CREATE OR REPLACE FUNCTION calculate_reward_tier(p_points INTEGER)
RETURNS reward_tier AS $$
BEGIN
    IF p_points >= 3000 THEN
        RETURN 'platinum';
    ELSIF p_points >= 1500 THEN
        RETURN 'gold';
    ELSIF p_points >= 500 THEN
        RETURN 'silver';
    ELSE
        RETURN 'bronze';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get user booking history
CREATE OR REPLACE FUNCTION get_user_booking_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    booking_id UUID,
    booking_reference VARCHAR,
    service_name VARCHAR,
    vehicle_info TEXT,
    slot_datetime TIMESTAMP WITH TIME ZONE,
    status booking_status,
    total_price_pence INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.booking_reference,
        s.name,
        CASE 
            WHEN v.id IS NOT NULL THEN 
                v.make || ' ' || v.model || ' (' || v.registration || ')'
            ELSE 
                'Vehicle details not available'
        END,
        (sl.slot_date + sl.start_time)::TIMESTAMP WITH TIME ZONE,
        b.status,
        b.total_price_pence,
        b.created_at
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN available_slots sl ON b.slot_id = sl.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = p_user_id
    ORDER BY b.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired booking locks (should be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM booking_locks
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_booking_transaction TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_available_slots_for_date TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_booking_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_booking_history TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_locks TO authenticated;