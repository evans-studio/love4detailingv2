-- Drop existing functions that have conflicting return types
DROP FUNCTION IF EXISTS calculate_enhanced_pricing(UUID, vehicle_size, DATE, BOOLEAN, UUID);
DROP FUNCTION IF EXISTS detect_vehicle_size(TEXT, TEXT, INTEGER, TEXT);

-- Recreate calculate_enhanced_pricing function with correct return type
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
    -- Get base price for service
    SELECT 
        COALESCE(sp.price_pence, s.base_price_pence) INTO v_base_price
    FROM services s
    LEFT JOIN service_pricing sp ON sp.service_id = s.id AND sp.vehicle_size = p_vehicle_size
    WHERE s.id = p_service_id;
    
    IF v_base_price IS NULL THEN
        -- Fallback pricing based on vehicle size if no specific pricing found
        CASE p_vehicle_size
            WHEN 'small' THEN v_base_price := 1500; -- £15.00
            WHEN 'medium' THEN v_base_price := 2000; -- £20.00  
            WHEN 'large' THEN v_base_price := 2500; -- £25.00
            WHEN 'extra_large' THEN v_base_price := 3500; -- £35.00
            ELSE v_base_price := 2000; -- Default £20.00
        END CASE;
    END IF;

    -- Apply size multiplier (this is already included in service_pricing but kept for compatibility)
    CASE p_vehicle_size
        WHEN 'small' THEN v_size_multiplier := 0.8;
        WHEN 'medium' THEN v_size_multiplier := 1.0;
        WHEN 'large' THEN v_size_multiplier := 1.3;
        WHEN 'extra_large' THEN v_size_multiplier := 1.8;
        ELSE v_size_multiplier := 1.0;
    END CASE;

    -- Calculate final price with size multiplier
    v_final_price := ROUND(v_base_price * v_size_multiplier);

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_enhanced_pricing(UUID, vehicle_size, DATE, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_enhanced_pricing(UUID, vehicle_size, DATE, BOOLEAN, UUID) TO service_role;
