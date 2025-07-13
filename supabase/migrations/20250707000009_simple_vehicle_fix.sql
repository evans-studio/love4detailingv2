-- Simple fix for vehicle management function - remove notes column references

DROP FUNCTION IF EXISTS manage_vehicle(TEXT, JSONB, UUID);

CREATE OR REPLACE FUNCTION manage_vehicle(
    p_action TEXT,
    p_vehicle_data JSONB,
    p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
    vehicle_id UUID,
    success BOOLEAN,
    message TEXT,
    vehicle_details JSONB
) AS $$
DECLARE
    v_vehicle_id UUID;
    v_existing_vehicle RECORD;
    v_size vehicle_size;
    v_result JSONB;
BEGIN
    -- Validate action
    IF p_action NOT IN ('create', 'update', 'delete', 'activate', 'deactivate') THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Invalid action specified', '{}'::JSONB;
        RETURN;
    END IF;

    -- Handle different actions
    CASE p_action
        WHEN 'create' THEN
            -- Validate required fields for creation
            IF NOT (p_vehicle_data ? 'registration' AND p_vehicle_data ? 'make' AND p_vehicle_data ? 'model') THEN
                RETURN QUERY SELECT NULL::UUID, FALSE, 'Missing required vehicle information (registration, make, model)', '{}'::JSONB;
                RETURN;
            END IF;

            -- Check for existing vehicle with same registration and active status
            SELECT v.id INTO v_existing_vehicle
            FROM vehicles v 
            WHERE v.registration = UPPER(p_vehicle_data->>'registration') 
            AND v.is_active = TRUE
            AND (p_user_id IS NULL OR v.user_id = p_user_id);

            IF v_existing_vehicle.id IS NOT NULL THEN
                RETURN QUERY SELECT v_existing_vehicle.id, FALSE, 'Vehicle with this registration already exists', '{}'::JSONB;
                RETURN;
            END IF;

            -- Determine vehicle size using intelligent detection
            SELECT detected_size INTO v_size 
            FROM detect_vehicle_size(
                p_vehicle_data->>'make',
                p_vehicle_data->>'model',
                COALESCE((p_vehicle_data->>'year')::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
            );

            -- Create new vehicle
            INSERT INTO vehicles (
                user_id, registration, make, model, year, color, 
                size, special_requirements, is_active,
                created_at, updated_at
            ) VALUES (
                p_user_id,
                UPPER(p_vehicle_data->>'registration'),
                p_vehicle_data->>'make',
                p_vehicle_data->>'model',
                COALESCE((p_vehicle_data->>'year')::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
                p_vehicle_data->>'color',
                v_size,
                p_vehicle_data->>'special_requirements',
                TRUE,
                NOW(),
                NOW()
            ) RETURNING id INTO v_vehicle_id;

        WHEN 'update' THEN
            -- Get vehicle ID from data or parameter
            v_vehicle_id := COALESCE(
                (p_vehicle_data->>'id')::UUID,
                (p_vehicle_data->>'vehicle_id')::UUID
            );

            IF v_vehicle_id IS NULL THEN
                RETURN QUERY SELECT NULL::UUID, FALSE, 'Vehicle ID is required for update', '{}'::JSONB;
                RETURN;
            END IF;

            -- Check vehicle exists and user has permission
            SELECT * INTO v_existing_vehicle 
            FROM vehicles v 
            WHERE v.id = v_vehicle_id 
            AND (p_user_id IS NULL OR v.user_id = p_user_id);

            IF v_existing_vehicle.id IS NULL THEN
                RETURN QUERY SELECT NULL::UUID, FALSE, 'Vehicle not found or access denied', '{}'::JSONB;
                RETURN;
            END IF;

            -- Re-detect size if make/model changed
            IF p_vehicle_data ? 'make' OR p_vehicle_data ? 'model' THEN
                SELECT detected_size INTO v_size 
                FROM detect_vehicle_size(
                    COALESCE(p_vehicle_data->>'make', v_existing_vehicle.make),
                    COALESCE(p_vehicle_data->>'model', v_existing_vehicle.model),
                    COALESCE((p_vehicle_data->>'year')::INTEGER, v_existing_vehicle.year)
                );
            ELSE
                v_size := v_existing_vehicle.size;
            END IF;

            -- Update vehicle
            UPDATE vehicles SET
                registration = COALESCE(UPPER(p_vehicle_data->>'registration'), registration),
                make = COALESCE(p_vehicle_data->>'make', make),
                model = COALESCE(p_vehicle_data->>'model', model),
                year = COALESCE((p_vehicle_data->>'year')::INTEGER, year),
                color = COALESCE(p_vehicle_data->>'color', color),
                size = v_size,
                special_requirements = COALESCE(p_vehicle_data->>'special_requirements', special_requirements),
                updated_at = NOW()
            WHERE id = v_vehicle_id;

        WHEN 'delete' THEN
            v_vehicle_id := COALESCE(
                (p_vehicle_data->>'id')::UUID,
                (p_vehicle_data->>'vehicle_id')::UUID
            );

            IF v_vehicle_id IS NULL THEN
                RETURN QUERY SELECT NULL::UUID, FALSE, 'Vehicle ID is required for deletion', '{}'::JSONB;
                RETURN;
            END IF;

            -- Soft delete (deactivate) the vehicle
            UPDATE vehicles SET 
                is_active = FALSE,
                updated_at = NOW()
            WHERE id = v_vehicle_id 
            AND (p_user_id IS NULL OR user_id = p_user_id);

            IF NOT FOUND THEN
                RETURN QUERY SELECT NULL::UUID, FALSE, 'Vehicle not found or access denied', '{}'::JSONB;
                RETURN;
            END IF;

        WHEN 'activate', 'deactivate' THEN
            v_vehicle_id := COALESCE(
                (p_vehicle_data->>'id')::UUID,
                (p_vehicle_data->>'vehicle_id')::UUID
            );

            IF v_vehicle_id IS NULL THEN
                RETURN QUERY SELECT NULL::UUID, FALSE, 'Vehicle ID is required', '{}'::JSONB;
                RETURN;
            END IF;

            UPDATE vehicles SET 
                is_active = CASE WHEN p_action = 'activate' THEN TRUE ELSE FALSE END,
                updated_at = NOW()
            WHERE id = v_vehicle_id 
            AND (p_user_id IS NULL OR user_id = p_user_id);

            IF NOT FOUND THEN
                RETURN QUERY SELECT NULL::UUID, FALSE, 'Vehicle not found or access denied', '{}'::JSONB;
                RETURN;
            END IF;
    END CASE;

    -- Build vehicle details response
    SELECT jsonb_build_object(
        'id', v.id,
        'registration', v.registration,
        'make', v.make,
        'model', v.model,
        'year', v.year,
        'color', v.color,
        'size', v.size,
        'special_requirements', v.special_requirements,
        'is_active', v.is_active,
        'created_at', v.created_at,
        'updated_at', v.updated_at
    ) INTO v_result
    FROM vehicles v 
    WHERE v.id = v_vehicle_id;

    RETURN QUERY SELECT v_vehicle_id, TRUE, format('%s completed successfully', p_action), v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;