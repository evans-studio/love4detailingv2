-- Fix booking creation error by updating create_enhanced_booking function
-- to use process_booking_transaction instead of non-existent comprehensive_create_booking

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

-- Create table for logging unmatched vehicles
CREATE TABLE IF NOT EXISTS unmatched_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    customer_email TEXT,
    user_id UUID REFERENCES users(id),
    booking_id UUID REFERENCES bookings(id),
    suggested_size vehicle_size NOT NULL DEFAULT 'medium',
    admin_reviewed BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_unmatched_vehicles_make_model ON unmatched_vehicles(make, model);
CREATE INDEX IF NOT EXISTS idx_unmatched_vehicles_admin_reviewed ON unmatched_vehicles(admin_reviewed);

-- Improve the detect_vehicle_size function to log unknown vehicles
CREATE OR REPLACE FUNCTION detect_vehicle_size(
    p_make TEXT,
    p_model TEXT,
    p_year INTEGER DEFAULT NULL
) RETURNS TABLE (
    detected_size vehicle_size,
    source_type TEXT,
    detection_info JSONB
) AS $$
DECLARE
    v_size vehicle_size;
    v_source TEXT;
    v_info JSONB;
    v_registry_size vehicle_size;
    v_unknown_logged BOOLEAN := FALSE;
BEGIN
    -- Clean and normalize inputs
    p_make := TRIM(UPPER(p_make));
    p_model := TRIM(UPPER(p_model));

    -- First: Check vehicle model registry
    SELECT default_size INTO v_registry_size
    FROM vehicle_model_registry
    WHERE UPPER(make) = p_make AND UPPER(model) = p_model
    AND verified = TRUE;

    IF v_registry_size IS NOT NULL THEN
        v_size := v_registry_size;
        v_source := 'registry';
        v_info := jsonb_build_object(
            'source', 'vehicle_model_registry',
            'make', p_make,
            'model', p_model,
            'verified', true
        );
    ELSE
        -- Second: Use intelligent defaults based on make/model patterns
        CASE 
            -- Small vehicles
            WHEN p_make = 'SMART' OR 
                 (p_make = 'MINI' AND p_model NOT LIKE '%COUNTRYMAN%') OR
                 (p_make = 'FIAT' AND p_model IN ('500', 'PANDA')) OR
                 (p_make = 'TOYOTA' AND p_model IN ('AYGO', 'IQ')) OR
                 (p_make = 'CITROEN' AND p_model IN ('C1', 'C2')) OR
                 (p_make = 'PEUGEOT' AND p_model IN ('107', '108')) OR
                 (p_make = 'FORD' AND p_model = 'KA') THEN
                v_size := 'small';
                v_source := 'pattern_match';

            -- Large vehicles  
            WHEN p_make IN ('AUDI', 'BMW', 'MERCEDES', 'MERCEDES-BENZ') AND 
                 (p_model LIKE '%X%' OR p_model LIKE '%Q%' OR p_model LIKE '%SUV%' OR 
                  p_model LIKE '%GLE%' OR p_model LIKE '%GLS%' OR p_model LIKE '%ML%') OR
                 (p_make = 'LAND ROVER') OR
                 (p_make = 'RANGE ROVER') OR
                 (p_make = 'VOLVO' AND p_model LIKE '%XC%') OR
                 (p_make = 'JEEP') OR
                 (p_model LIKE '%ESTATE%' OR p_model LIKE '%TOURING%') THEN
                v_size := 'large';
                v_source := 'pattern_match';

            -- Extra large vehicles
            WHEN p_make IN ('FERRARI', 'LAMBORGHINI', 'MASERATI', 'ASTON MARTIN', 'MCLAREN', 'ROLLS-ROYCE', 'BENTLEY') OR
                 (p_make = 'PORSCHE' AND p_model IN ('CAYENNE', 'MACAN')) OR
                 (p_make = 'BMW' AND p_model LIKE '%X7%') OR
                 (p_make = 'MERCEDES-BENZ' AND p_model LIKE '%GLS%') OR
                 (p_make = 'AUDI' AND p_model LIKE '%Q8%') THEN
                v_size := 'extra_large';
                v_source := 'pattern_match';

            -- Default to medium for unknown vehicles
            ELSE
                v_size := 'medium';
                v_source := 'default_fallback';
                v_unknown_logged := TRUE;
        END CASE;

        -- Log unknown vehicles for admin review
        IF v_unknown_logged THEN
            INSERT INTO unmatched_vehicles (make, model, year, suggested_size)
            VALUES (p_make, p_model, p_year, v_size)
            ON CONFLICT DO NOTHING;
        END IF;

        v_info := jsonb_build_object(
            'source', v_source,
            'make', p_make,
            'model', p_model,
            'year', p_year,
            'pattern_matched', v_source = 'pattern_match',
            'unknown_logged', v_unknown_logged
        );
    END IF;

    RETURN QUERY SELECT v_size, v_source, v_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up admin users for testing
-- Update existing users or create placeholder records for admin access
DO $$
BEGIN
    -- Update zell@love4detailing.com to admin role if exists
    UPDATE users 
    SET role = 'admin', updated_at = NOW()
    WHERE email = 'zell@love4detailing.com';
    
    -- Update paul@evans-studio.co.uk to super_admin role if exists  
    UPDATE users 
    SET role = 'super_admin', updated_at = NOW()
    WHERE email = 'paul@evans-studio.co.uk';
    
    -- If users don't exist yet, they will be created with customer role on first login
    -- and can be manually updated to admin roles later
END $$; 