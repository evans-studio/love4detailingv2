-- Fix vehicle pricing system by improving vehicle_model_registry and size detection

-- Add trim field to vehicle_model_registry table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vehicle_model_registry' AND column_name = 'trim') THEN
        ALTER TABLE vehicle_model_registry ADD COLUMN trim TEXT;
        -- Create unique constraint on make, model, trim
        ALTER TABLE vehicle_model_registry DROP CONSTRAINT IF EXISTS vehicle_model_registry_make_model_key;
        ALTER TABLE vehicle_model_registry ADD CONSTRAINT vehicle_model_registry_make_model_trim_key 
            UNIQUE (make, model, trim);
    END IF;
END $$;

-- Improved vehicle size detection that prioritizes exact matches including trim
CREATE OR REPLACE FUNCTION detect_vehicle_size(
    p_make TEXT,
    p_model TEXT,
    p_year INTEGER DEFAULT NULL,
    p_trim TEXT DEFAULT NULL
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
BEGIN
    -- Clean and normalize inputs
    p_make := TRIM(UPPER(p_make));
    p_model := TRIM(UPPER(p_model));
    p_trim := CASE WHEN p_trim IS NULL OR TRIM(p_trim) = '' THEN NULL ELSE TRIM(UPPER(p_trim)) END;

    -- First: Check vehicle model registry with exact trim match
    IF p_trim IS NOT NULL THEN
        SELECT default_size INTO v_registry_size
        FROM vehicle_model_registry
        WHERE UPPER(make) = p_make 
        AND UPPER(model) = p_model
        AND UPPER(COALESCE(trim, '')) = p_trim
        AND verified = TRUE
        LIMIT 1;
    END IF;

    -- Second: Check registry without trim if no exact match found
    IF v_registry_size IS NULL THEN
        SELECT default_size INTO v_registry_size
        FROM vehicle_model_registry
        WHERE UPPER(make) = p_make 
        AND UPPER(model) = p_model
        AND verified = TRUE
        ORDER BY (CASE WHEN trim IS NULL THEN 1 ELSE 2 END) -- Prefer entries without trim as fallback
        LIMIT 1;
    END IF;

    IF v_registry_size IS NOT NULL THEN
        v_size := v_registry_size;
        v_source := 'registry_exact';
        v_info := jsonb_build_object(
            'source', 'vehicle_model_registry',
            'make', p_make,
            'model', p_model,
            'trim', p_trim,
            'verified', true,
            'match_type', CASE WHEN p_trim IS NOT NULL THEN 'exact_with_trim' ELSE 'exact_no_trim' END
        );
    ELSE
        -- Third: Use intelligent defaults based on make/model patterns
        CASE 
            -- Small vehicles
            WHEN p_make = 'SMART' OR 
                 (p_make = 'MINI' AND p_model NOT LIKE '%COUNTRYMAN%') OR
                 (p_make = 'FIAT' AND p_model IN ('500', 'PANDA')) OR
                 (p_make = 'TOYOTA' AND p_model IN ('AYGO', 'IQ')) OR
                 (p_make = 'CITROEN' AND p_model IN ('C1', 'C2')) OR
                 (p_make = 'PEUGEOT' AND p_model IN ('107', '108')) OR
                 (p_make = 'FORD' AND p_model = 'KA') OR
                 (p_make = 'HYUNDAI' AND p_model = 'I10') OR
                 (p_make = 'KIA' AND p_model = 'PICANTO') OR
                 (p_make = 'SUZUKI' AND p_model = 'ALTO') OR
                 (p_make = 'NISSAN' AND p_model = 'MICRA') THEN
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
                 (p_model LIKE '%ESTATE%' OR p_model LIKE '%TOURING%') OR
                 (p_make = 'TOYOTA' AND p_model = 'RAV4') OR
                 (p_make = 'HONDA' AND p_model = 'CR-V') OR
                 (p_make = 'NISSAN' AND p_model = 'QASHQAI') OR
                 (p_make = 'FORD' AND p_model = 'KUGA') OR
                 (p_make = 'HYUNDAI' AND p_model = 'TUCSON') OR
                 (p_make = 'KIA' AND p_model = 'SPORTAGE') THEN
                v_size := 'large';
                v_source := 'pattern_match';

            -- Extra large vehicles
            WHEN p_make IN ('BENTLEY', 'ROLLS-ROYCE', 'LAMBORGHINI', 'FERRARI', 'ASTON MARTIN', 'MASERATI', 'LOTUS') OR
                 (p_make = 'BMW' AND p_model IN ('X5', 'X6', 'X7', 'I7', '7 SERIES')) OR
                 (p_make = 'MERCEDES-BENZ' AND (p_model LIKE '%S-CLASS%' OR p_model LIKE '%GLS%')) OR
                 (p_make = 'AUDI' AND p_model IN ('Q7', 'Q8', 'A8')) OR
                 (p_model LIKE '%VAN%' OR p_model LIKE '%TRUCK%' OR p_model LIKE '%TRANSIT%' OR p_model LIKE '%SPRINTER%') THEN
                v_size := 'extra_large';
                v_source := 'pattern_match';

            -- Default to medium for everything else
            ELSE
                v_size := 'medium';
                v_source := 'default_fallback';
        END CASE;

        -- Log unknown vehicle for admin review
        INSERT INTO unmatched_vehicles (make, model, trim, year, detected_size, detection_source, created_at)
        VALUES (p_make, p_model, p_trim, p_year, v_size, v_source, NOW())
        ON CONFLICT DO NOTHING;

        v_info := jsonb_build_object(
            'source', v_source,
            'make', p_make,
            'model', p_model,
            'trim', p_trim,
            'year', p_year,
            'pattern_matched', CASE WHEN v_source = 'pattern_match' THEN true ELSE false END,
            'logged_for_review', true
        );
    END IF;

    RETURN QUERY SELECT v_size, v_source, v_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced pricing calculation that properly uses vehicle size
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
GRANT EXECUTE ON FUNCTION detect_vehicle_size(TEXT, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_vehicle_size(TEXT, TEXT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION calculate_enhanced_pricing(UUID, vehicle_size, DATE, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_enhanced_pricing(UUID, vehicle_size, DATE, BOOLEAN, UUID) TO service_role; 