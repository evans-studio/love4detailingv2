-- Fix pricing function and regenerate current slots

-- Drop and recreate the pricing function with correct schema
DROP FUNCTION IF EXISTS calculate_enhanced_pricing(UUID, vehicle_size, DATE, BOOLEAN, UUID);

CREATE OR REPLACE FUNCTION calculate_enhanced_pricing(
    p_service_id UUID,
    p_vehicle_size vehicle_size,
    p_slot_date DATE DEFAULT NULL,
    p_is_repeat_customer BOOLEAN DEFAULT FALSE,
    p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
    base_price_pence INTEGER,
    size_multiplier DECIMAL,
    final_price_pence INTEGER,
    repeat_customer_discount_pence INTEGER,
    total_price_pence INTEGER,
    pricing_breakdown JSONB
) AS $$
DECLARE
    v_base_price INTEGER;
    v_size_multiplier DECIMAL := 1.0;
    v_repeat_discount_pct DECIMAL := 0.0;
    v_repeat_discount_amount INTEGER := 0;
    v_final_price INTEGER;
    v_total_price INTEGER;
    v_breakdown JSONB;
BEGIN
    -- Get base price for service from service_pricing table
    SELECT price_pence INTO v_base_price
    FROM service_pricing sp
    WHERE sp.service_id = p_service_id AND sp.vehicle_size = p_vehicle_size;
    
    IF v_base_price IS NULL THEN
        -- Fallback pricing based on vehicle size if no specific pricing found
        CASE p_vehicle_size
            WHEN 'small' THEN v_base_price := 5000;      -- £50.00
            WHEN 'medium' THEN v_base_price := 6000;     -- £60.00  
            WHEN 'large' THEN v_base_price := 7000;      -- £70.00
            WHEN 'extra_large' THEN v_base_price := 8500; -- £85.00
            ELSE v_base_price := 6000; -- Default £60.00
        END CASE;
    END IF;

    -- Size multiplier is already included in service_pricing, so set to 1.0
    v_size_multiplier := 1.0;
    v_final_price := v_base_price;

    -- Apply repeat customer discount
    IF p_is_repeat_customer THEN
        v_repeat_discount_pct := 0.10; -- 10% discount
        v_repeat_discount_amount := ROUND(v_final_price * v_repeat_discount_pct);
    END IF;

    -- Calculate total price
    v_total_price := v_final_price - v_repeat_discount_amount;

    -- Ensure minimum price
    IF v_total_price < 1000 THEN -- Minimum £10.00
        v_total_price := 1000;
    END IF;

    -- Build pricing breakdown
    v_breakdown := jsonb_build_object(
        'base_price_pence', v_base_price,
        'vehicle_size', p_vehicle_size,
        'size_multiplier', v_size_multiplier,
        'price_after_size', v_final_price,
        'repeat_customer', p_is_repeat_customer,
        'discount_percentage', v_repeat_discount_pct,
        'discount_amount_pence', v_repeat_discount_amount,
        'final_total_pence', v_total_price,
        'calculation_date', COALESCE(p_slot_date, CURRENT_DATE),
        'pricing_source', 'enhanced_calculation'
    );

    RETURN QUERY SELECT 
        v_base_price,
        v_size_multiplier,
        v_final_price,
        v_repeat_discount_amount,
        v_total_price,
        v_breakdown;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Regenerate available slots for current dates (next 30 days from today)
DO $$
DECLARE
    iter_date DATE := CURRENT_DATE;
    end_date DATE := CURRENT_DATE + INTERVAL '30 days';
    slot_start TIME;
    slot_end TIME;
    slot_duration INTERVAL := '2 hours';
BEGIN
    -- Clear existing future slots from today onwards
    DELETE FROM available_slots WHERE slot_date >= CURRENT_DATE;
    
    -- Generate slots for each day
    WHILE iter_date <= end_date LOOP
        -- Skip Sundays (day of week 0)
        IF EXTRACT(DOW FROM iter_date) != 0 THEN
            slot_start := '09:00:00';
            
            -- Generate slots throughout the day
            WHILE slot_start <= '15:00:00' LOOP  -- Last slot starts at 3 PM
                slot_end := slot_start + slot_duration;
                
                INSERT INTO available_slots (
                    slot_date,
                    start_time,
                    end_time,
                    max_bookings,
                    current_bookings,
                    is_blocked
                ) VALUES (
                    iter_date,
                    slot_start,
                    slot_end,
                    1,  -- One booking per slot
                    0,  -- No current bookings
                    FALSE
                );
                
                slot_start := slot_start + slot_duration;
            END LOOP;
        END IF;
        
        iter_date := iter_date + INTERVAL '1 day';
    END LOOP;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_enhanced_pricing(UUID, vehicle_size, DATE, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_enhanced_pricing(UUID, vehicle_size, DATE, BOOLEAN, UUID) TO service_role;
