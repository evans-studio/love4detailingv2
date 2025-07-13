-- Enhanced Booking Stored Procedures for Love4Detailing Database-First Architecture
-- Phase 3: Core Booking Logic - Advanced Features

-- ===== ENHANCED BOOKING MANAGEMENT =====

-- Get enhanced available slots with intelligent recommendations
CREATE OR REPLACE FUNCTION get_enhanced_available_slots(
    p_date_start DATE,
    p_date_end DATE,
    p_service_id UUID DEFAULT NULL,
    p_vehicle_size vehicle_size DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
    slot_id UUID,
    slot_date DATE,
    start_time TIME,
    end_time TIME,
    available_capacity INTEGER,
    max_capacity INTEGER,
    service_duration INTEGER,
    recommended BOOLEAN,
    peak_hours BOOLEAN,
    weather_dependent BOOLEAN,
    pricing_info JSONB
) AS $$
DECLARE
    v_service_id UUID;
    v_vehicle_size vehicle_size;
BEGIN
    -- Default to Full Valet service if not specified
    IF p_service_id IS NULL THEN
        SELECT id INTO v_service_id FROM services WHERE code = 'full_valet' AND is_active = TRUE LIMIT 1;
    ELSE
        v_service_id := p_service_id;
    END IF;
    
    -- Default to medium vehicle size if not specified
    v_vehicle_size := COALESCE(p_vehicle_size, 'medium');

    RETURN QUERY
    SELECT 
        s.id,
        s.slot_date,
        s.start_time,
        s.end_time,
        (s.max_bookings - s.current_bookings) as available_capacity,
        s.max_bookings,
        COALESCE(srv.base_duration_minutes, 120) as service_duration,
        
        -- Recommendation logic
        CASE 
            WHEN EXTRACT(DOW FROM s.slot_date) IN (2, 3, 4) AND s.start_time BETWEEN '10:00' AND '14:00' THEN TRUE
            ELSE FALSE
        END as recommended,
        
        -- Peak hours (Friday/Saturday/Sunday or 9-11am, 2-4pm on weekdays)
        CASE 
            WHEN EXTRACT(DOW FROM s.slot_date) IN (0, 5, 6) THEN TRUE
            WHEN s.start_time BETWEEN '09:00' AND '11:00' OR s.start_time BETWEEN '14:00' AND '16:00' THEN TRUE
            ELSE FALSE
        END as peak_hours,
        
        -- Weather dependent (outdoor services)
        TRUE as weather_dependent,
        
        -- Pricing information
        CASE 
            WHEN pricing.price_pence IS NOT NULL THEN
                jsonb_build_object(
                    'base_price_pence', pricing.price_pence,
                    'duration_minutes', pricing.duration_minutes,
                    'vehicle_size', v_vehicle_size,
                    'peak_surcharge_pence', CASE WHEN EXTRACT(DOW FROM s.slot_date) IN (0, 5, 6) THEN (pricing.price_pence * 0.1)::INTEGER ELSE 0 END,
                    'total_price_pence', pricing.price_pence + CASE WHEN EXTRACT(DOW FROM s.slot_date) IN (0, 5, 6) THEN (pricing.price_pence * 0.1)::INTEGER ELSE 0 END
                )
            ELSE '{}'::jsonb
        END as pricing_info
        
    FROM available_slots s
    LEFT JOIN services srv ON srv.id = v_service_id
    LEFT JOIN service_pricing pricing ON pricing.service_id = v_service_id AND pricing.vehicle_size = v_vehicle_size
    WHERE s.slot_date BETWEEN p_date_start AND p_date_end
    AND s.slot_date >= CURRENT_DATE
    AND NOT s.is_blocked
    AND s.current_bookings < s.max_bookings
    ORDER BY s.slot_date, s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create comprehensive booking with enhanced features
CREATE OR REPLACE FUNCTION create_enhanced_booking(
    p_booking_data JSONB
) RETURNS TABLE (
    booking_id UUID,
    booking_reference VARCHAR,
    success BOOLEAN,
    message TEXT,
    booking_details JSONB,
    next_steps JSONB
) AS $$
DECLARE
    v_booking_result RECORD;
    v_booking_details JSONB;
    v_next_steps JSONB;
    v_user_id UUID;
    v_vehicle_id UUID;
    v_customer_email TEXT;
    v_is_repeat_customer BOOLEAN := FALSE;
    v_reward_points INTEGER := 0;
    v_pricing_result RECORD;
BEGIN
    -- Extract key information
    v_user_id := (p_booking_data->>'user_id')::UUID;
    v_customer_email := p_booking_data->>'customer_email';

    -- Check if this is a repeat customer
    IF v_customer_email IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM bookings 
            WHERE customer_email = v_customer_email 
            AND status IN ('completed', 'confirmed')
        ) INTO v_is_repeat_customer;
    END IF;

    -- Handle vehicle registration/selection
    IF p_booking_data ? 'vehicle_data' AND (p_booking_data->'vehicle_data') IS NOT NULL THEN
        -- Create or update vehicle
        SELECT vehicle_id, success INTO v_vehicle_id, v_booking_result.success
        FROM manage_vehicle(
            CASE WHEN (p_booking_data->'vehicle_data'->>'id') IS NOT NULL THEN 'update' ELSE 'create' END,
            p_booking_data->'vehicle_data',
            v_user_id
        );
        
        IF NOT v_booking_result.success THEN
            RETURN QUERY SELECT 
                NULL::UUID, NULL::VARCHAR, FALSE,
                'Vehicle registration failed'::TEXT,
                '{}'::jsonb, '{}'::jsonb;
            RETURN;
        END IF;
    ELSE
        v_vehicle_id := (p_booking_data->>'vehicle_id')::UUID;
    END IF;

    -- Calculate final pricing with any applicable discounts
    SELECT * INTO v_pricing_result
    FROM calculate_enhanced_pricing(
        (p_booking_data->>'service_id')::UUID,
        (p_booking_data->>'vehicle_size')::vehicle_size,
        (p_booking_data->>'slot_date')::DATE,
        v_is_repeat_customer,
        v_user_id
    );

    -- Create the booking
    SELECT * INTO v_booking_result
    FROM process_booking_transaction(
        jsonb_build_object(
            'email', p_booking_data->>'customer_email',
            'name', p_booking_data->>'customer_name',
            'phone', p_booking_data->>'customer_phone',
            'user_id', v_user_id
        ),
        jsonb_build_object(
            'id', v_vehicle_id,
            'registration', p_booking_data->'vehicle_data'->>'registration',
            'make', p_booking_data->'vehicle_data'->>'make',
            'model', p_booking_data->'vehicle_data'->>'model',
            'size', p_booking_data->>'vehicle_size'
        ),
        jsonb_build_object(
            'slot_id', p_booking_data->>'slot_id',
            'service_id', p_booking_data->>'service_id',
            'payment_method', COALESCE(p_booking_data->>'payment_method', 'cash'),
            'total_price_pence', v_pricing_result.total_price_pence,
            'special_requests', p_booking_data->>'special_requests'
        )
    );

    IF NOT v_booking_result.success THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::VARCHAR, FALSE,
            v_booking_result.message,
            '{}'::jsonb, '{}'::jsonb;
        RETURN;
    END IF;

    -- Calculate reward points if applicable
    IF v_user_id IS NOT NULL THEN
        v_reward_points := (v_pricing_result.total_price_pence / 100); -- 1 point per £1
        
        PERFORM update_customer_rewards(
            v_user_id,
            v_reward_points,
            'earned',
            v_booking_result.booking_id,
            format('Points earned from booking %s', v_booking_result.booking_reference)
        );
    END IF;

    -- Build comprehensive booking details
    SELECT jsonb_build_object(
        'booking_id', b.id,
        'booking_reference', b.booking_reference,
        'service_name', s.name,
        'customer_name', b.customer_name,
        'customer_email', b.customer_email,
        'vehicle_registration', v.registration,
        'vehicle_details', format('%s %s %s', v.make, v.model, v.year),
        'slot_date', sl.slot_date,
        'slot_time', format('%s - %s', sl.start_time, sl.end_time),
        'duration_minutes', sp.duration_minutes,
        'total_price_pence', b.total_price_pence,
        'payment_method', b.payment_method,
        'status', b.status,
        'is_repeat_customer', v_is_repeat_customer,
        'reward_points_earned', v_reward_points,
        'special_requests', b.special_requests
    ) INTO v_booking_details
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN available_slots sl ON b.slot_id = sl.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    LEFT JOIN service_pricing sp ON sp.service_id = s.id AND sp.vehicle_size = v.size
    WHERE b.id = v_booking_result.booking_id;

    -- Build next steps guidance
    v_next_steps := jsonb_build_object(
        'confirmation_sent', TRUE,
        'payment_required', CASE WHEN (p_booking_data->>'payment_method') = 'cash' THEN FALSE ELSE TRUE END,
        'preparation_tips', jsonb_build_array(
            'Please ensure your vehicle is accessible',
            'Remove all personal items from the vehicle',
            'If possible, park in a shaded area'
        ),
        'contact_info', jsonb_build_object(
            'phone', '+44 7xxx xxx xxx',
            'email', 'info@love4detailing.co.uk'
        ),
        'cancellation_policy', 'Free cancellation up to 24 hours before your appointment',
        'weather_policy', 'Service may be rescheduled in case of severe weather conditions'
    );

    RETURN QUERY SELECT 
        v_booking_result.booking_id,
        v_booking_result.booking_reference,
        TRUE,
        'Booking created successfully',
        v_booking_details,
        v_next_steps;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate enhanced pricing with discounts and surcharges
CREATE OR REPLACE FUNCTION calculate_enhanced_pricing(
    p_service_id UUID,
    p_vehicle_size vehicle_size,
    p_slot_date DATE DEFAULT NULL,
    p_is_repeat_customer BOOLEAN DEFAULT FALSE,
    p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
    base_price_pence INTEGER,
    surcharges_pence INTEGER,
    discounts_pence INTEGER,
    total_price_pence INTEGER,
    duration_minutes INTEGER,
    pricing_breakdown JSONB
) AS $$
DECLARE
    v_base_price INTEGER;
    v_duration INTEGER;
    v_surcharges INTEGER := 0;
    v_discounts INTEGER := 0;
    v_breakdown JSONB;
    v_user_tier reward_tier;
    v_is_weekend BOOLEAN;
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

    -- Check if weekend/peak time
    IF p_slot_date IS NOT NULL THEN
        v_is_weekend := EXTRACT(DOW FROM p_slot_date) IN (0, 5, 6);
        
        -- Weekend surcharge (10%)
        IF v_is_weekend THEN
            v_surcharges := v_surcharges + (v_base_price * 0.1)::INTEGER;
        END IF;
    END IF;

    -- Get user tier for discounts
    IF p_user_id IS NOT NULL THEN
        SELECT current_tier INTO v_user_tier
        FROM customer_rewards
        WHERE user_id = p_user_id;
    END IF;

    -- Apply tier discounts
    CASE v_user_tier
        WHEN 'silver' THEN
            v_discounts := v_discounts + (v_base_price * 0.05)::INTEGER; -- 5%
        WHEN 'gold' THEN
            v_discounts := v_discounts + (v_base_price * 0.10)::INTEGER; -- 10%
        WHEN 'platinum' THEN
            v_discounts := v_discounts + (v_base_price * 0.15)::INTEGER; -- 15%
        ELSE
            -- Bronze or no tier - no discount
            NULL;
    END CASE;

    -- Repeat customer discount (5% if not already tier discount)
    IF p_is_repeat_customer AND (v_user_tier IS NULL OR v_user_tier = 'bronze') THEN
        v_discounts := v_discounts + (v_base_price * 0.05)::INTEGER;
    END IF;

    -- Build pricing breakdown
    v_breakdown := jsonb_build_object(
        'base_service', jsonb_build_object(
            'service_id', p_service_id,
            'vehicle_size', p_vehicle_size,
            'price_pence', v_base_price,
            'duration_minutes', v_duration
        ),
        'surcharges', jsonb_build_object(
            'weekend_surcharge', CASE WHEN v_is_weekend THEN (v_base_price * 0.1)::INTEGER ELSE 0 END
        ),
        'discounts', jsonb_build_object(
            'tier_discount', CASE 
                WHEN v_user_tier = 'silver' THEN (v_base_price * 0.05)::INTEGER
                WHEN v_user_tier = 'gold' THEN (v_base_price * 0.10)::INTEGER  
                WHEN v_user_tier = 'platinum' THEN (v_base_price * 0.15)::INTEGER
                ELSE 0
            END,
            'repeat_customer_discount', CASE 
                WHEN p_is_repeat_customer AND (v_user_tier IS NULL OR v_user_tier = 'bronze') 
                THEN (v_base_price * 0.05)::INTEGER 
                ELSE 0 
            END
        ),
        'user_tier', COALESCE(v_user_tier, 'bronze'),
        'is_repeat_customer', p_is_repeat_customer,
        'calculated_at', NOW()
    );

    RETURN QUERY
    SELECT 
        v_base_price,
        v_surcharges,
        v_discounts,
        v_base_price + v_surcharges - v_discounts,
        v_duration,
        v_breakdown;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user booking history with analytics
CREATE OR REPLACE FUNCTION get_user_booking_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    booking_data JSONB,
    analytics JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH booking_details AS (
        SELECT 
            b.id,
            b.booking_reference,
            b.status,
            b.payment_status,
            b.total_price_pence,
            b.confirmed_at,
            b.completed_at,
            b.cancelled_at,
            b.created_at,
            s.name as service_name,
            s.code as service_code,
            v.registration,
            v.make,
            v.model,
            v.size as vehicle_size,
            sl.slot_date,
            sl.start_time,
            sl.end_time,
            b.special_requests,
            b.notes
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        JOIN available_slots sl ON b.slot_id = sl.id
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.user_id = p_user_id
        ORDER BY b.created_at DESC
        LIMIT p_limit OFFSET p_offset
    ),
    user_analytics AS (
        SELECT 
            COUNT(*) as total_bookings,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
            SUM(CASE WHEN status = 'completed' THEN total_price_pence END) as total_spent_pence,
            AVG(CASE WHEN status = 'completed' THEN total_price_pence END) as avg_booking_value_pence,
            MAX(CASE WHEN status = 'completed' THEN completed_at END) as last_service_date,
            COUNT(DISTINCT EXTRACT(YEAR FROM created_at)) as years_as_customer
        FROM bookings
        WHERE user_id = p_user_id
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'id', bd.id,
                'reference', bd.booking_reference,
                'status', bd.status,
                'payment_status', bd.payment_status,
                'total_price_pence', bd.total_price_pence,
                'service_name', bd.service_name,
                'vehicle_registration', bd.registration,
                'vehicle_details', CASE 
                    WHEN bd.make IS NOT NULL THEN format('%s %s', bd.make, bd.model)
                    ELSE 'Vehicle details not available'
                END,
                'slot_date', bd.slot_date,
                'slot_time', format('%s - %s', bd.start_time, bd.end_time),
                'confirmed_at', bd.confirmed_at,
                'completed_at', bd.completed_at,
                'created_at', bd.created_at,
                'special_requests', bd.special_requests
            ) ORDER BY bd.created_at DESC
        ) as booking_data,
        
        (SELECT jsonb_build_object(
            'total_bookings', ua.total_bookings,
            'completed_bookings', ua.completed_bookings,
            'cancelled_bookings', ua.cancelled_bookings,
            'completion_rate', CASE 
                WHEN ua.total_bookings > 0 
                THEN ROUND((ua.completed_bookings::DECIMAL / ua.total_bookings) * 100, 1)
                ELSE 0 
            END,
            'total_spent_pence', COALESCE(ua.total_spent_pence, 0),
            'avg_booking_value_pence', COALESCE(ua.avg_booking_value_pence, 0),
            'last_service_date', ua.last_service_date,
            'years_as_customer', ua.years_as_customer
        ) FROM user_analytics ua) as analytics
        
    FROM booking_details bd
    CROSS JOIN user_analytics ua;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== BOOKING MANAGEMENT & ADMIN FUNCTIONS =====

-- Cancel booking with enhanced logic
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id UUID,
    p_reason TEXT,
    p_cancelled_by UUID DEFAULT NULL,
    p_refund_amount_pence INTEGER DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    refund_processed BOOLEAN,
    points_adjustment INTEGER
) AS $$
DECLARE
    v_booking RECORD;
    v_cancellation_hours INTEGER;
    v_refund_amount INTEGER := 0;
    v_points_adjustment INTEGER := 0;
    v_can_cancel BOOLEAN := TRUE;
BEGIN
    -- Get booking details
    SELECT * INTO v_booking 
    FROM bookings b
    JOIN available_slots sl ON b.slot_id = sl.id
    WHERE b.id = p_booking_id;
    
    IF v_booking IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Booking not found'::TEXT, FALSE, 0;
        RETURN;
    END IF;
    
    IF v_booking.status = 'cancelled' THEN
        RETURN QUERY SELECT FALSE, 'Booking is already cancelled'::TEXT, FALSE, 0;
        RETURN;
    END IF;
    
    -- Calculate hours until appointment
    v_cancellation_hours := EXTRACT(EPOCH FROM (
        (v_booking.slot_date + v_booking.start_time) - NOW()
    )) / 3600;
    
    -- Determine refund amount and policies
    IF v_cancellation_hours >= 24 THEN
        v_refund_amount := v_booking.total_price_pence; -- Full refund
    ELSIF v_cancellation_hours >= 2 THEN
        v_refund_amount := (v_booking.total_price_pence * 0.5)::INTEGER; -- 50% refund
    ELSE
        v_refund_amount := 0; -- No refund
    END IF;
    
    -- Override with manual refund amount if provided (admin)
    IF p_refund_amount_pence IS NOT NULL AND p_cancelled_by IS NOT NULL THEN
        v_refund_amount := p_refund_amount_pence;
    END IF;
    
    -- Update booking status
    UPDATE bookings SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    -- Release the slot
    UPDATE available_slots SET
        current_bookings = current_bookings - 1
    WHERE id = v_booking.slot_id;
    
    -- Handle reward points adjustment (remove earned points)
    IF v_booking.user_id IS NOT NULL THEN
        v_points_adjustment := -(v_booking.total_price_pence / 100);
        
        PERFORM update_customer_rewards(
            v_booking.user_id,
            v_points_adjustment,
            'adjusted',
            p_booking_id,
            format('Points removed due to booking cancellation: %s', p_reason)
        );
    END IF;
    
    RETURN QUERY SELECT 
        TRUE,
        format('Booking cancelled successfully. Refund: £%.2f', v_refund_amount::DECIMAL / 100),
        v_refund_amount > 0,
        v_points_adjustment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== GRANTS AND SECURITY =====

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_enhanced_available_slots(DATE, DATE, UUID, vehicle_size, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_enhanced_booking(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_enhanced_pricing(UUID, vehicle_size, DATE, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_booking_history(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_booking(UUID, TEXT, UUID, INTEGER) TO authenticated;

-- Grant service role access for server-side operations
GRANT EXECUTE ON FUNCTION get_enhanced_available_slots(DATE, DATE, UUID, vehicle_size, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION create_enhanced_booking(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION calculate_enhanced_pricing(UUID, vehicle_size, DATE, BOOLEAN, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_booking_history(UUID, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cancel_booking(UUID, TEXT, UUID, INTEGER) TO service_role;