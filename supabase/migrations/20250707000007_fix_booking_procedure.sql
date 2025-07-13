-- Fix ambiguous column reference in create_enhanced_booking function

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
    v_vehicle_success BOOLEAN;
    v_customer_data JSONB;
    v_vehicle_data JSONB;
    v_booking_request JSONB;
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

    -- Prepare customer data
    v_customer_data := jsonb_build_object(
        'email', p_booking_data->>'customer_email',
        'name', p_booking_data->>'customer_name',
        'phone', p_booking_data->>'customer_phone',
        'user_id', v_user_id
    );

    -- Prepare vehicle data
    IF p_booking_data ? 'vehicle_data' AND (p_booking_data->'vehicle_data') IS NOT NULL THEN
        v_vehicle_data := p_booking_data->'vehicle_data';
        -- Add vehicle size to vehicle data
        v_vehicle_data := v_vehicle_data || jsonb_build_object('size', p_booking_data->>'vehicle_size');
    ELSE
        -- For existing vehicle, we need to get the vehicle data
        SELECT jsonb_build_object(
            'id', v.id,
            'registration', v.registration,
            'make', v.make,
            'model', v.model,
            'year', v.year,
            'color', v.color,
            'size', v.size
        ) INTO v_vehicle_data
        FROM vehicles v
        WHERE v.id = (p_booking_data->>'vehicle_id')::UUID;
        
        IF v_vehicle_data IS NULL THEN
            RETURN QUERY SELECT 
                NULL::UUID, NULL::VARCHAR, FALSE,
                'Vehicle not found'::TEXT,
                '{}'::jsonb, '{}'::jsonb;
            RETURN;
        END IF;
    END IF;

    -- Prepare booking request data
    v_booking_request := jsonb_build_object(
        'slot_id', p_booking_data->>'slot_id',
        'service_id', p_booking_data->>'service_id',
        'payment_method', COALESCE(p_booking_data->>'payment_method', 'cash'),
        'add_ons', COALESCE(p_booking_data->'add_ons', '[]'::jsonb)
    );

    -- Create the booking using process_booking_transaction
    SELECT * INTO v_booking_result
    FROM process_booking_transaction(
        v_customer_data,
        v_vehicle_data,
        v_booking_request
    );

    -- Check if booking creation succeeded
    IF NOT v_booking_result.success THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::VARCHAR, FALSE,
            v_booking_result.message::TEXT,
            '{}'::jsonb, '{}'::jsonb;
        RETURN;
    END IF;

    -- Calculate reward points for this booking
    IF v_user_id IS NOT NULL THEN
        v_reward_points := (v_booking_result.total_price_pence / 100); -- 1 point per £1
        
        -- Add reward points
        INSERT INTO reward_transactions (
            customer_reward_id,
            booking_id,
            transaction_type,
            points_change,
            description
        ) 
        SELECT 
            cr.id,
            v_booking_result.booking_id,
            'earned',
            v_reward_points,
            format('Points earned for booking %s', v_booking_result.booking_reference)
        FROM customer_rewards cr 
        WHERE cr.user_id = v_user_id
        ON CONFLICT DO NOTHING;
        
        -- Update total points
        UPDATE customer_rewards 
        SET 
            total_points = total_points + v_reward_points,
            points_lifetime = points_lifetime + v_reward_points,
            current_tier = CASE 
                WHEN points_lifetime + v_reward_points >= 3000 THEN 'platinum'
                WHEN points_lifetime + v_reward_points >= 1500 THEN 'gold'
                WHEN points_lifetime + v_reward_points >= 500 THEN 'silver'
                ELSE 'bronze'
            END,
            updated_at = NOW()
        WHERE user_id = v_user_id;
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
        'duration_minutes', v_booking_result.estimated_duration,
        'total_price_pence', b.total_price_pence,
        'payment_method', b.payment_method,
        'status', b.status,
        'is_repeat_customer', v_is_repeat_customer,
        'reward_points_earned', v_reward_points,
        'special_requests', p_booking_data->>'special_requests'
    ) INTO v_booking_details
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN available_slots sl ON b.slot_id = sl.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
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