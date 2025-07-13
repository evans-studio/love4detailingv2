-- Comprehensive Stored Procedures for Love4Detailing Database-First Architecture
-- This migration implements all the stored procedures outlined in new-db.md

-- ===== BOOKING MANAGEMENT PROCEDURES =====

-- Get available slots with service duration consideration
CREATE OR REPLACE FUNCTION get_available_slots(
    p_date_start DATE,
    p_date_end DATE,
    p_service_id UUID DEFAULT NULL
) RETURNS TABLE (
    slot_id UUID,
    slot_date DATE,
    start_time TIME,
    end_time TIME,
    available_capacity INTEGER,
    max_capacity INTEGER,
    service_duration INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.slot_date,
        s.start_time,
        s.end_time,
        (s.max_bookings - s.current_bookings) as available_capacity,
        s.max_bookings,
        COALESCE(srv.base_duration_minutes, 120) as service_duration
    FROM available_slots s
    LEFT JOIN services srv ON srv.id = p_service_id
    WHERE s.slot_date BETWEEN p_date_start AND p_date_end
    AND s.slot_date >= CURRENT_DATE
    AND NOT s.is_blocked
    AND s.current_bookings < s.max_bookings
    ORDER BY s.slot_date, s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate dynamic service pricing
CREATE OR REPLACE FUNCTION calculate_service_pricing(
    p_service_id UUID,
    p_vehicle_size vehicle_size,
    p_add_ons JSONB DEFAULT '[]'::jsonb
) RETURNS TABLE (
    base_price_pence INTEGER,
    add_on_price_pence INTEGER,
    total_price_pence INTEGER,
    duration_minutes INTEGER,
    pricing_breakdown JSONB
) AS $$
DECLARE
    v_base_price INTEGER;
    v_duration INTEGER;
    v_add_on_total INTEGER := 0;
    v_breakdown JSONB := '{}';
BEGIN
    -- Get base service pricing
    SELECT sp.price_pence, sp.duration_minutes 
    INTO v_base_price, v_duration
    FROM service_pricing sp
    WHERE sp.service_id = p_service_id 
    AND sp.vehicle_size = p_vehicle_size
    AND sp.is_active = TRUE;

    IF v_base_price IS NULL THEN
        RAISE EXCEPTION 'No pricing found for service % and vehicle size %', p_service_id, p_vehicle_size;
    END IF;

    -- Build pricing breakdown
    v_breakdown := jsonb_build_object(
        'base_service', jsonb_build_object(
            'service_id', p_service_id,
            'vehicle_size', p_vehicle_size,
            'price_pence', v_base_price,
            'duration_minutes', v_duration
        ),
        'add_ons', p_add_ons,
        'calculated_at', NOW()
    );

    -- TODO: Add-ons calculation would go here when add-ons table is implemented
    
    RETURN QUERY
    SELECT 
        v_base_price,
        v_add_on_total,
        v_base_price + v_add_on_total,
        v_duration,
        v_breakdown;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process complete booking transaction
CREATE OR REPLACE FUNCTION process_booking_transaction(
    p_customer_data JSONB,
    p_vehicle_data JSONB,
    p_booking_data JSONB
) RETURNS TABLE (
    booking_id UUID,
    booking_reference VARCHAR,
    total_price_pence INTEGER,
    estimated_duration INTEGER,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_booking_id UUID;
    v_booking_ref VARCHAR;
    v_vehicle_id UUID;
    v_user_id UUID;
    v_slot_id UUID;
    v_service_id UUID;
    v_pricing_result RECORD;
    v_customer_email TEXT;
    v_customer_name TEXT;
    v_customer_phone TEXT;
    v_vehicle_size vehicle_size;
    v_payment_method payment_method;
    v_slot_available BOOLEAN;
BEGIN
    -- Extract data from JSON parameters
    v_customer_email := p_customer_data->>'email';
    v_customer_name := p_customer_data->>'name';
    v_customer_phone := p_customer_data->>'phone';
    v_user_id := (p_customer_data->>'user_id')::UUID;
    
    v_slot_id := (p_booking_data->>'slot_id')::UUID;
    v_service_id := (p_booking_data->>'service_id')::UUID;
    v_payment_method := (p_booking_data->>'payment_method')::payment_method;
    
    v_vehicle_size := (p_vehicle_data->>'size')::vehicle_size;

    -- Validate slot availability
    SELECT (current_bookings < max_bookings AND NOT is_blocked)
    INTO v_slot_available
    FROM available_slots
    WHERE id = v_slot_id;

    IF NOT v_slot_available THEN
        RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR, 0, 0, FALSE, 'Selected time slot is not available';
        RETURN;
    END IF;

    -- Create/get vehicle record
    IF p_vehicle_data->>'id' IS NOT NULL THEN
        v_vehicle_id := (p_vehicle_data->>'id')::UUID;
    ELSE
        INSERT INTO vehicles (
            user_id,
            registration,
            make,
            model,
            year,
            color,
            size
        ) VALUES (
            v_user_id,
            p_vehicle_data->>'registration',
            p_vehicle_data->>'make',
            p_vehicle_data->>'model',
            (p_vehicle_data->>'year')::INTEGER,
            p_vehicle_data->>'color',
            v_vehicle_size
        ) RETURNING id INTO v_vehicle_id;
    END IF;

    -- Calculate pricing
    SELECT * INTO v_pricing_result
    FROM calculate_service_pricing(
        v_service_id,
        v_vehicle_size,
        COALESCE(p_booking_data->'add_ons', '[]'::jsonb)
    );

    -- Generate booking reference
    v_booking_ref := generate_booking_reference();

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
        v_booking_ref,
        v_user_id,
        v_customer_email,
        v_customer_name,
        v_customer_phone,
        v_vehicle_id,
        v_service_id,
        v_slot_id,
        COALESCE(v_payment_method, 'cash'),
        v_pricing_result.total_price_pence,
        v_pricing_result.total_price_pence,
        'pending'
    ) RETURNING id INTO v_booking_id;

    -- Update slot availability
    UPDATE available_slots
    SET current_bookings = current_bookings + 1
    WHERE id = v_slot_id;

    -- Create/update customer rewards
    IF v_user_id IS NOT NULL THEN
        INSERT INTO customer_rewards (user_id, customer_email, total_points, points_lifetime)
        VALUES (v_user_id, v_customer_email, 0, 0)
        ON CONFLICT (user_id) DO NOTHING;
    ELSE
        INSERT INTO customer_rewards (customer_email, total_points, points_lifetime)
        VALUES (v_customer_email, 0, 0)
        ON CONFLICT (customer_email) DO NOTHING;
    END IF;

    RETURN QUERY SELECT 
        v_booking_id,
        v_booking_ref,
        v_pricing_result.total_price_pence,
        v_pricing_result.duration_minutes,
        TRUE,
        'Booking created successfully'::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            NULL::UUID,
            NULL::VARCHAR,
            0,
            0,
            FALSE,
            SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== CUSTOMER REWARDS PROCEDURES =====

-- Update customer rewards with points and tier calculation
CREATE OR REPLACE FUNCTION update_customer_rewards(
    p_user_id UUID,
    p_points_earned INTEGER,
    p_transaction_type reward_transaction_type,
    p_booking_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS TABLE (
    reward_id UUID,
    new_total_points INTEGER,
    previous_tier reward_tier,
    new_tier reward_tier,
    tier_upgraded BOOLEAN
) AS $$
DECLARE
    v_reward_id UUID;
    v_customer_email TEXT;
    v_old_points INTEGER;
    v_new_points INTEGER;
    v_old_tier reward_tier;
    v_new_tier reward_tier;
BEGIN
    -- Get customer email for fallback
    SELECT email INTO v_customer_email 
    FROM users 
    WHERE id = p_user_id;

    -- Get or create customer rewards record
    INSERT INTO customer_rewards (user_id, customer_email, total_points, points_lifetime)
    VALUES (p_user_id, v_customer_email, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Get current state
    SELECT id, total_points, current_tier
    INTO v_reward_id, v_old_points, v_old_tier
    FROM customer_rewards
    WHERE user_id = p_user_id;

    -- Calculate new points based on transaction type
    v_new_points := CASE 
        WHEN p_transaction_type = 'earned' THEN v_old_points + p_points_earned
        WHEN p_transaction_type = 'redeemed' THEN v_old_points - p_points_earned
        WHEN p_transaction_type = 'adjusted' THEN v_old_points + p_points_earned
        ELSE v_old_points
    END;

    -- Ensure points don't go negative
    v_new_points := GREATEST(v_new_points, 0);

    -- Calculate new tier
    v_new_tier := calculate_reward_tier(v_new_points);

    -- Update rewards record
    UPDATE customer_rewards
    SET 
        total_points = v_new_points,
        points_lifetime = CASE 
            WHEN p_transaction_type = 'earned' THEN points_lifetime + p_points_earned
            ELSE points_lifetime
        END,
        current_tier = v_new_tier,
        tier_progress = v_new_points,
        updated_at = NOW()
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
        p_transaction_type,
        p_points_earned,
        COALESCE(p_description, 'Points ' || p_transaction_type::text)
    );

    RETURN QUERY SELECT 
        v_reward_id,
        v_new_points,
        v_old_tier,
        v_new_tier,
        v_new_tier != v_old_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get customer tier benefits
CREATE OR REPLACE FUNCTION get_customer_tier_benefits(
    p_user_id UUID
) RETURNS TABLE (
    current_tier reward_tier,
    total_points INTEGER,
    points_to_next_tier INTEGER,
    tier_benefits JSONB,
    transaction_history JSONB
) AS $$
DECLARE
    v_customer_rewards RECORD;
    v_next_tier_threshold INTEGER;
    v_benefits JSONB;
    v_history JSONB;
BEGIN
    -- Get customer rewards data
    SELECT * INTO v_customer_rewards
    FROM customer_rewards
    WHERE user_id = p_user_id;

    IF v_customer_rewards IS NULL THEN
        -- Return default bronze tier for new customers
        v_benefits := jsonb_build_object(
            'tier', 'bronze',
            'discount_percentage', 0,
            'priority_booking', false,
            'free_services_per_year', 0
        );
        
        RETURN QUERY SELECT 
            'bronze'::reward_tier,
            0,
            500, -- Points needed for silver
            v_benefits,
            '[]'::jsonb;
        RETURN;
    END IF;

    -- Calculate points to next tier
    v_next_tier_threshold := CASE v_customer_rewards.current_tier
        WHEN 'bronze' THEN 500
        WHEN 'silver' THEN 1500
        WHEN 'gold' THEN 3000
        ELSE 0 -- Platinum is max tier
    END;

    -- Build tier benefits JSON
    v_benefits := jsonb_build_object(
        'tier', v_customer_rewards.current_tier,
        'discount_percentage', CASE v_customer_rewards.current_tier
            WHEN 'bronze' THEN 0
            WHEN 'silver' THEN 5
            WHEN 'gold' THEN 10
            WHEN 'platinum' THEN 15
        END,
        'priority_booking', v_customer_rewards.current_tier IN ('gold', 'platinum'),
        'free_services_per_year', CASE v_customer_rewards.current_tier
            WHEN 'bronze' THEN 0
            WHEN 'silver' THEN 0
            WHEN 'gold' THEN 1
            WHEN 'platinum' THEN 2
        END
    );

    -- Get recent transaction history
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', rt.created_at,
            'type', rt.transaction_type,
            'points', rt.points_amount,
            'description', rt.description
        ) ORDER BY rt.created_at DESC
    ) INTO v_history
    FROM reward_transactions rt
    WHERE rt.customer_reward_id = v_customer_rewards.id
    AND rt.created_at >= NOW() - INTERVAL '6 months'
    LIMIT 20;

    RETURN QUERY SELECT 
        v_customer_rewards.current_tier,
        v_customer_rewards.total_points,
        GREATEST(0, v_next_tier_threshold - v_customer_rewards.total_points),
        v_benefits,
        COALESCE(v_history, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_slots TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calculate_service_pricing TO authenticated, anon;
GRANT EXECUTE ON FUNCTION process_booking_transaction TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_customer_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_tier_benefits TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_available_slots IS 'Returns available booking slots within date range with capacity information';
COMMENT ON FUNCTION calculate_service_pricing IS 'Calculates dynamic pricing for services based on vehicle size and add-ons';
COMMENT ON FUNCTION process_booking_transaction IS 'Processes complete booking transaction atomically';
COMMENT ON FUNCTION update_customer_rewards IS 'Updates customer rewards points and tier with transaction logging';
COMMENT ON FUNCTION get_customer_tier_benefits IS 'Returns customer tier information, benefits, and transaction history';