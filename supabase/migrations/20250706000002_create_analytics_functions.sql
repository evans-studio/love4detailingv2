-- Create analytics functions for admin dashboard

-- Function to get daily booking statistics
CREATE OR REPLACE FUNCTION get_daily_booking_stats(start_date DATE, end_date DATE)
RETURNS TABLE(
    booking_date DATE,
    total_bookings INTEGER,
    completed_bookings INTEGER,
    total_revenue_pence INTEGER,
    average_booking_value_pence INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.created_at::DATE as booking_date,
        COUNT(*)::INTEGER as total_bookings,
        COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::INTEGER as completed_bookings,
        COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') THEN b.total_price_pence ELSE 0 END), 0)::INTEGER as total_revenue_pence,
        COALESCE(AVG(CASE WHEN b.status IN ('completed', 'confirmed') THEN b.total_price_pence ELSE NULL END), 0)::INTEGER as average_booking_value_pence
    FROM bookings b
    WHERE b.created_at::DATE BETWEEN start_date AND end_date
    GROUP BY b.created_at::DATE
    ORDER BY booking_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate weekly time slots with proper error handling
CREATE OR REPLACE FUNCTION generate_week_slots(start_date DATE)
RETURNS TABLE(generated_date DATE, slots_generated INTEGER, message TEXT) AS $$
DECLARE
    current_date_var DATE;
    day_of_week_var INTEGER;
    is_working_day BOOLEAN;
    max_slots_var INTEGER;
    slot_count INTEGER;
    slot_time_var TEXT;
BEGIN
    current_date_var := start_date;
    
    FOR i IN 0..6 LOOP
        day_of_week_var := EXTRACT(DOW FROM current_date_var);
        
        -- Get weekly template for this day
        SELECT working_day, max_slots INTO is_working_day, max_slots_var
        FROM weekly_schedule_template 
        WHERE day_of_week = day_of_week_var;
        
        -- Default to working day with 5 slots if no template
        IF NOT FOUND THEN
            is_working_day := CASE WHEN day_of_week_var IN (1,2,3,4,5) THEN true ELSE false END;
            max_slots_var := 5;
        END IF;
        
        -- Insert or update daily availability
        INSERT INTO daily_availability (date, available_slots, working_day)
        VALUES (current_date_var, max_slots_var, is_working_day)
        ON CONFLICT (date) DO UPDATE SET
            available_slots = EXCLUDED.available_slots,
            working_day = EXCLUDED.working_day,
            updated_at = NOW();
        
        slot_count := 0;
        
        IF is_working_day THEN
            -- Generate time slots (10:00, 11:30, 13:00, 14:30, 16:00)
            FOR slot_num IN 1..max_slots_var LOOP
                slot_time_var := CASE slot_num
                    WHEN 1 THEN '10:00:00'
                    WHEN 2 THEN '11:30:00'
                    WHEN 3 THEN '13:00:00'
                    WHEN 4 THEN '14:30:00'
                    WHEN 5 THEN '16:00:00'
                    ELSE '10:00:00'
                END;
                
                INSERT INTO time_slots (slot_date, slot_time, slot_number, is_available, created_at)
                VALUES (current_date_var, slot_time_var, slot_num, true, NOW())
                ON CONFLICT (slot_date, slot_number) DO NOTHING;
                
                slot_count := slot_count + 1;
            END LOOP;
        END IF;
        
        RETURN QUERY SELECT current_date_var, slot_count, 
                     CASE WHEN is_working_day 
                          THEN slot_count || ' slots generated' 
                          ELSE 'Non-working day' 
                     END;
        
        current_date_var := current_date_var + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check slot availability safely
CREATE OR REPLACE FUNCTION check_slot_availability(check_date DATE, check_slot_number INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    slot_available BOOLEAN;
BEGIN
    -- Check if slot exists and is available
    SELECT is_available INTO slot_available
    FROM time_slots 
    WHERE slot_date = check_date 
    AND slot_number = check_slot_number;
    
    RETURN COALESCE(slot_available, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award loyalty points after booking completion
CREATE OR REPLACE FUNCTION award_booking_points(user_id_param UUID, booking_id_param UUID)
RETURNS JSON AS $$
DECLARE
    points_awarded INTEGER := 100; -- Standard points per booking
    current_points INTEGER := 0;
    lifetime_points INTEGER := 0;
    new_tier TEXT;
BEGIN
    -- Get current points or initialize
    SELECT current_points, lifetime_points INTO current_points, lifetime_points
    FROM loyalty_points 
    WHERE user_id = user_id_param;
    
    IF NOT FOUND THEN
        current_points := 0;
        lifetime_points := 0;
    END IF;
    
    -- Update loyalty points
    INSERT INTO loyalty_points (user_id, current_points, lifetime_points, updated_at)
    VALUES (user_id_param, current_points + points_awarded, lifetime_points + points_awarded, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        current_points = loyalty_points.current_points + points_awarded,
        lifetime_points = loyalty_points.lifetime_points + points_awarded,
        updated_at = NOW();
    
    -- Create transaction record
    INSERT INTO reward_transactions (user_id, transaction_type, points, description, booking_id, created_at)
    VALUES (user_id_param, 'earned', points_awarded, 'Points earned from completed booking', booking_id_param, NOW());
    
    -- Determine new tier
    IF (current_points + points_awarded) >= 1000 THEN
        new_tier := 'gold';
    ELSIF (current_points + points_awarded) >= 500 THEN
        new_tier := 'silver';
    ELSE
        new_tier := 'bronze';
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'points_awarded', points_awarded,
        'new_total', current_points + points_awarded,
        'new_tier', new_tier
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', 'Failed to award points: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle vehicle size detection and unmatched tracking
CREATE OR REPLACE FUNCTION log_unmatched_vehicle(
    vehicle_id_param UUID,
    make_param TEXT,
    model_param TEXT,
    registration_param TEXT
) RETURNS VOID AS $$
BEGIN
    -- Insert into unmatched vehicles table for admin review
    INSERT INTO unmatched_vehicles (
        vehicle_id,
        make,
        model,
        registration,
        status,
        created_at
    ) VALUES (
        vehicle_id_param,
        make_param,
        model_param,
        registration_param,
        'pending',
        NOW()
    );
    
    -- Also log in missing vehicle models for frequency tracking
    INSERT INTO missing_vehicle_models (make, model, frequency, last_seen, created_at)
    VALUES (make_param, model_param, 1, NOW(), NOW())
    ON CONFLICT (make, model) DO UPDATE SET
        frequency = missing_vehicle_models.frequency + 1,
        last_seen = NOW();
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to the functions
GRANT EXECUTE ON FUNCTION get_daily_booking_stats(DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION generate_week_slots(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION check_slot_availability(DATE, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION award_booking_points(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION log_unmatched_vehicle(UUID, TEXT, TEXT, TEXT) TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION get_daily_booking_stats(DATE, DATE) IS 
'Returns daily booking statistics for analytics dashboard';

COMMENT ON FUNCTION generate_week_slots(DATE) IS 
'Generates time slots for a week starting from the given date';

COMMENT ON FUNCTION check_slot_availability(DATE, INTEGER) IS 
'Checks if a specific time slot is available for booking';

COMMENT ON FUNCTION award_booking_points(UUID, UUID) IS 
'Awards loyalty points to user after booking completion';

COMMENT ON FUNCTION log_unmatched_vehicle(UUID, TEXT, TEXT, TEXT) IS 
'Logs vehicles that could not be automatically matched to size database';