-- Vehicle Management Stored Procedures for Love4Detailing Database-First Architecture
-- Phase 2: Customer Profiles & Vehicle Management Implementation

-- ===== VEHICLE CRUD OPERATIONS =====

-- Create or update vehicle with intelligent size detection
CREATE OR REPLACE FUNCTION manage_vehicle(
    p_action TEXT, -- 'create', 'update', 'delete'
    p_vehicle_data JSONB,
    p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
    vehicle_id UUID,
    success BOOLEAN,
    message TEXT,
    vehicle_data JSONB,
    size_detection_info JSONB
) AS $$
DECLARE
    v_vehicle_id UUID;
    v_existing_vehicle RECORD;
    v_detected_size vehicle_size;
    v_size_source TEXT;
    v_vehicle_result JSONB;
    v_size_info JSONB;
BEGIN
    CASE p_action
        WHEN 'create' THEN
            -- Validate required fields
            IF NOT (p_vehicle_data ? 'registration' AND p_vehicle_data ? 'make' AND p_vehicle_data ? 'model') THEN
                RETURN QUERY SELECT 
                    NULL::UUID, FALSE, 
                    'Registration, make, and model are required'::TEXT,
                    '{}'::jsonb, '{}'::jsonb;
                RETURN;
            END IF;

            -- Check for duplicate registration for this user
            IF p_user_id IS NOT NULL THEN
                SELECT id INTO v_vehicle_id 
                FROM vehicles 
                WHERE UPPER(registration) = UPPER(p_vehicle_data->>'registration') 
                AND user_id = p_user_id 
                AND is_active = TRUE;
                
                IF v_vehicle_id IS NOT NULL THEN
                    RETURN QUERY SELECT 
                        v_vehicle_id, FALSE,
                        'Vehicle with this registration already exists'::TEXT,
                        '{}'::jsonb, '{}'::jsonb;
                    RETURN;
                END IF;
            END IF;

            -- Detect vehicle size
            SELECT * INTO v_detected_size, v_size_source, v_size_info
            FROM detect_vehicle_size(
                p_vehicle_data->>'make',
                p_vehicle_data->>'model',
                (p_vehicle_data->>'year')::INTEGER
            );

            -- Generate new vehicle ID
            v_vehicle_id := uuid_generate_v4();

            -- Create vehicle record
            INSERT INTO vehicles (
                id, user_id, registration, make, model, year, color,
                size, vehicle_type, special_requirements, notes, is_active,
                created_at, updated_at
            ) VALUES (
                v_vehicle_id,
                p_user_id,
                UPPER(TRIM(p_vehicle_data->>'registration')),
                TRIM(p_vehicle_data->>'make'),
                TRIM(p_vehicle_data->>'model'),
                COALESCE((p_vehicle_data->>'year')::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
                TRIM(p_vehicle_data->>'color'),
                v_detected_size,
                COALESCE(p_vehicle_data->>'vehicle_type', 'car'),
                p_vehicle_data->>'special_requirements',
                p_vehicle_data->>'notes',
                TRUE,
                NOW(), NOW()
            );

            -- Update vehicle model registry if this is a verified classification
            IF v_size_source = 'registry' OR v_size_source = 'json_data' THEN
                INSERT INTO vehicle_model_registry (make, model, default_size, verified, created_at)
                VALUES (
                    TRIM(p_vehicle_data->>'make'),
                    TRIM(p_vehicle_data->>'model'),
                    v_detected_size,
                    TRUE,
                    NOW()
                ) ON CONFLICT (make, model) DO UPDATE SET
                    default_size = EXCLUDED.default_size,
                    verified = TRUE,
                    updated_at = NOW();
            END IF;

        WHEN 'update' THEN
            v_vehicle_id := (p_vehicle_data->>'id')::UUID;
            
            -- Check vehicle exists and user has permission
            SELECT * INTO v_existing_vehicle FROM vehicles 
            WHERE id = v_vehicle_id 
            AND (user_id = p_user_id OR p_user_id IS NULL);
            
            IF v_existing_vehicle IS NULL THEN
                RETURN QUERY SELECT 
                    v_vehicle_id, FALSE,
                    'Vehicle not found or access denied'::TEXT,
                    '{}'::jsonb, '{}'::jsonb;
                RETURN;
            END IF;

            -- Re-detect size if make/model changed
            IF (p_vehicle_data ? 'make' OR p_vehicle_data ? 'model') THEN
                SELECT * INTO v_detected_size, v_size_source, v_size_info
                FROM detect_vehicle_size(
                    COALESCE(p_vehicle_data->>'make', v_existing_vehicle.make),
                    COALESCE(p_vehicle_data->>'model', v_existing_vehicle.model),
                    COALESCE((p_vehicle_data->>'year')::INTEGER, v_existing_vehicle.year)
                );
            ELSE
                v_detected_size := v_existing_vehicle.size;
                v_size_source := 'unchanged';
                v_size_info := jsonb_build_object('source', 'unchanged');
            END IF;

            -- Update vehicle record
            UPDATE vehicles SET
                registration = COALESCE(UPPER(TRIM(p_vehicle_data->>'registration')), registration),
                make = COALESCE(TRIM(p_vehicle_data->>'make'), make),
                model = COALESCE(TRIM(p_vehicle_data->>'model'), model),
                year = COALESCE((p_vehicle_data->>'year')::INTEGER, year),
                color = COALESCE(TRIM(p_vehicle_data->>'color'), color),
                size = v_detected_size,
                vehicle_type = COALESCE(p_vehicle_data->>'vehicle_type', vehicle_type),
                special_requirements = COALESCE(p_vehicle_data->>'special_requirements', special_requirements),
                notes = COALESCE(p_vehicle_data->>'notes', notes),
                updated_at = NOW()
            WHERE id = v_vehicle_id;

        WHEN 'delete' THEN
            v_vehicle_id := (p_vehicle_data->>'id')::UUID;
            
            -- Soft delete vehicle (set is_active = false)
            UPDATE vehicles SET 
                is_active = FALSE,
                updated_at = NOW()
            WHERE id = v_vehicle_id 
            AND (user_id = p_user_id OR p_user_id IS NULL);
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT 
                    v_vehicle_id, FALSE,
                    'Vehicle not found or access denied'::TEXT,
                    '{}'::jsonb, '{}'::jsonb;
                RETURN;
            END IF;

        ELSE
            RETURN QUERY SELECT 
                NULL::UUID, FALSE,
                'Invalid action. Use create, update, or delete'::TEXT,
                '{}'::jsonb, '{}'::jsonb;
            RETURN;
    END CASE;

    -- Get final vehicle data
    SELECT jsonb_build_object(
        'id', v.id,
        'user_id', v.user_id,
        'registration', v.registration,
        'make', v.make,
        'model', v.model,
        'year', v.year,
        'color', v.color,
        'size', v.size,
        'vehicle_type', v.vehicle_type,
        'special_requirements', v.special_requirements,
        'notes', v.notes,
        'is_active', v.is_active,
        'created_at', v.created_at,
        'updated_at', v.updated_at,
        'photo_count', COALESCE(photo_stats.photo_count, 0),
        'primary_photo_url', photo_stats.primary_photo_url
    ) INTO v_vehicle_result
    FROM vehicles v
    LEFT JOIN (
        SELECT 
            vehicle_id,
            COUNT(*) as photo_count,
            MAX(CASE WHEN is_primary THEN storage_path END) as primary_photo_url
        FROM vehicle_photos 
        WHERE vehicle_id = v_vehicle_id
        GROUP BY vehicle_id
    ) photo_stats ON photo_stats.vehicle_id = v.id
    WHERE v.id = v_vehicle_id;

    RETURN QUERY SELECT 
        v_vehicle_id,
        TRUE,
        format('Vehicle %s successfully', p_action),
        v_vehicle_result,
        COALESCE(v_size_info, jsonb_build_object('source', v_size_source, 'detected_size', v_detected_size));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Intelligent vehicle size detection function
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
            WHEN p_make IN ('BENTLEY', 'ROLLS-ROYCE', 'LAMBORGHINI', 'FERRARI', 'ASTON MARTIN') OR
                 (p_make = 'BMW' AND p_model IN ('X5', 'X6', 'X7')) OR
                 (p_make = 'MERCEDES-BENZ' AND p_model LIKE '%S-CLASS%') OR
                 (p_make = 'AUDI' AND p_model IN ('Q7', 'Q8', 'A8')) OR
                 (p_model LIKE '%VAN%' OR p_model LIKE '%TRUCK%') THEN
                v_size := 'extra_large';
                v_source := 'pattern_match';

            -- Default to medium for everything else
            ELSE
                v_size := 'medium';
                v_source := 'default';
        END CASE;

        v_info := jsonb_build_object(
            'source', v_source,
            'make', p_make,
            'model', p_model,
            'year', p_year,
            'pattern_matched', CASE WHEN v_source = 'pattern_match' THEN true ELSE false END
        );
    END IF;

    RETURN QUERY SELECT v_size, v_source, v_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user vehicles with enhanced information
CREATE OR REPLACE FUNCTION get_user_vehicles(
    p_user_id UUID,
    p_include_inactive BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
    vehicle_data JSONB,
    usage_statistics JSONB,
    recent_bookings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jsonb_build_object(
            'id', v.id,
            'registration', v.registration,
            'make', v.make,
            'model', v.model,
            'year', v.year,
            'color', v.color,
            'size', v.size,
            'vehicle_type', v.vehicle_type,
            'special_requirements', v.special_requirements,
            'notes', v.notes,
            'is_active', v.is_active,
            'created_at', v.created_at,
            'updated_at', v.updated_at,
            'photo_count', COALESCE(photos.photo_count, 0),
            'primary_photo_url', photos.primary_photo_url
        ) as vehicle_data,
        
        jsonb_build_object(
            'total_bookings', COALESCE(stats.total_bookings, 0),
            'completed_bookings', COALESCE(stats.completed_bookings, 0),
            'total_spent_pence', COALESCE(stats.total_spent_pence, 0),
            'last_service_date', stats.last_service_date,
            'next_recommended_service', stats.last_service_date + INTERVAL '3 months'
        ) as usage_statistics,
        
        COALESCE(recent.recent_bookings, '[]'::jsonb) as recent_bookings
        
    FROM vehicles v
    
    LEFT JOIN (
        SELECT 
            vehicle_id,
            COUNT(*) as photo_count,
            MAX(CASE WHEN is_primary THEN storage_path END) as primary_photo_url
        FROM vehicle_photos 
        GROUP BY vehicle_id
    ) photos ON photos.vehicle_id = v.id
    
    LEFT JOIN (
        SELECT 
            vehicle_id,
            COUNT(*) as total_bookings,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
            SUM(CASE WHEN status = 'completed' THEN total_price_pence END) as total_spent_pence,
            MAX(CASE WHEN status = 'completed' THEN completed_at END) as last_service_date
        FROM bookings 
        WHERE vehicle_id IS NOT NULL
        GROUP BY vehicle_id
    ) stats ON stats.vehicle_id = v.id
    
    LEFT JOIN (
        SELECT 
            vehicle_id,
            jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'booking_reference', booking_reference,
                    'service_name', (SELECT name FROM services WHERE id = service_id),
                    'status', status,
                    'slot_date', (SELECT slot_date FROM available_slots WHERE id = slot_id),
                    'total_price_pence', total_price_pence,
                    'created_at', created_at
                ) ORDER BY created_at DESC
            ) as recent_bookings
        FROM bookings 
        WHERE vehicle_id IS NOT NULL
        AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY vehicle_id
    ) recent ON recent.vehicle_id = v.id
    
    WHERE v.user_id = p_user_id
    AND (v.is_active = TRUE OR p_include_inactive = TRUE)
    ORDER BY v.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== VEHICLE PHOTO MANAGEMENT =====

-- Manage vehicle photos
CREATE OR REPLACE FUNCTION manage_vehicle_photo(
    p_action TEXT, -- 'upload', 'delete', 'set_primary'
    p_vehicle_id UUID,
    p_user_id UUID,
    p_photo_data JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (
    photo_id UUID,
    success BOOLEAN,
    message TEXT,
    photo_data JSONB
) AS $$
DECLARE
    v_photo_id UUID;
    v_vehicle_owner UUID;
    v_photo_result JSONB;
    v_storage_path TEXT;
BEGIN
    -- Verify vehicle ownership
    SELECT user_id INTO v_vehicle_owner FROM vehicles 
    WHERE id = p_vehicle_id AND is_active = TRUE;
    
    IF v_vehicle_owner IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, FALSE,
            'Vehicle not found'::TEXT, '{}'::jsonb;
        RETURN;
    END IF;
    
    IF v_vehicle_owner != p_user_id THEN
        RETURN QUERY SELECT 
            NULL::UUID, FALSE,
            'Access denied'::TEXT, '{}'::jsonb;
        RETURN;
    END IF;

    CASE p_action
        WHEN 'upload' THEN
            v_photo_id := uuid_generate_v4();
            v_storage_path := format('vehicles/%s/photos/%s', p_vehicle_id, v_photo_id);
            
            -- Check photo limit (max 10 photos per vehicle)
            IF (SELECT COUNT(*) FROM vehicle_photos WHERE vehicle_id = p_vehicle_id) >= 10 THEN
                RETURN QUERY SELECT 
                    NULL::UUID, FALSE,
                    'Maximum 10 photos allowed per vehicle'::TEXT, '{}'::jsonb;
                RETURN;
            END IF;
            
            -- Insert photo record
            INSERT INTO vehicle_photos (
                id, vehicle_id, storage_path, filename, file_size,
                is_primary, created_at
            ) VALUES (
                v_photo_id,
                p_vehicle_id,
                v_storage_path,
                p_photo_data->>'filename',
                (p_photo_data->>'file_size')::INTEGER,
                COALESCE((p_photo_data->>'is_primary')::BOOLEAN, 
                    (SELECT COUNT(*) FROM vehicle_photos WHERE vehicle_id = p_vehicle_id) = 0),
                NOW()
            );
            
        WHEN 'delete' THEN
            v_photo_id := (p_photo_data->>'photo_id')::UUID;
            
            -- Delete photo record
            DELETE FROM vehicle_photos 
            WHERE id = v_photo_id 
            AND vehicle_id = p_vehicle_id;
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT 
                    v_photo_id, FALSE,
                    'Photo not found'::TEXT, '{}'::jsonb;
                RETURN;
            END IF;
            
        WHEN 'set_primary' THEN
            v_photo_id := (p_photo_data->>'photo_id')::UUID;
            
            -- First, unset all primary flags for this vehicle
            UPDATE vehicle_photos SET is_primary = FALSE 
            WHERE vehicle_id = p_vehicle_id;
            
            -- Set the specified photo as primary
            UPDATE vehicle_photos SET is_primary = TRUE 
            WHERE id = v_photo_id AND vehicle_id = p_vehicle_id;
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT 
                    v_photo_id, FALSE,
                    'Photo not found'::TEXT, '{}'::jsonb;
                RETURN;
            END IF;
            
        ELSE
            RETURN QUERY SELECT 
                NULL::UUID, FALSE,
                'Invalid action. Use upload, delete, or set_primary'::TEXT, '{}'::jsonb;
            RETURN;
    END CASE;

    -- Get photo data for response
    SELECT jsonb_build_object(
        'id', vp.id,
        'vehicle_id', vp.vehicle_id,
        'storage_path', vp.storage_path,
        'filename', vp.filename,
        'file_size', vp.file_size,
        'is_primary', vp.is_primary,
        'created_at', vp.created_at
    ) INTO v_photo_result
    FROM vehicle_photos vp
    WHERE vp.id = v_photo_id;

    RETURN QUERY SELECT 
        v_photo_id,
        TRUE,
        format('Photo %s successful', p_action),
        COALESCE(v_photo_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== VEHICLE MODEL REGISTRY MANAGEMENT =====

-- Admin function to manage vehicle model registry
CREATE OR REPLACE FUNCTION manage_vehicle_registry(
    p_action TEXT, -- 'add', 'update', 'verify', 'bulk_update'
    p_registry_data JSONB,
    p_admin_user_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    affected_count INTEGER,
    registry_data JSONB
) AS $$
DECLARE
    v_admin_role user_role;
    v_affected_count INTEGER := 0;
    v_result JSONB;
BEGIN
    -- Verify admin permissions
    SELECT role INTO v_admin_role FROM users WHERE id = p_admin_user_id;
    
    IF v_admin_role NOT IN ('admin', 'super_admin') THEN
        RETURN QUERY SELECT 
            FALSE, 'Admin access required'::TEXT, 0, '{}'::jsonb;
        RETURN;
    END IF;

    CASE p_action
        WHEN 'add' THEN
            INSERT INTO vehicle_model_registry (
                make, model, default_size, verified, notes, created_at
            ) VALUES (
                UPPER(TRIM(p_registry_data->>'make')),
                UPPER(TRIM(p_registry_data->>'model')),
                (p_registry_data->>'default_size')::vehicle_size,
                COALESCE((p_registry_data->>'verified')::BOOLEAN, TRUE),
                p_registry_data->>'notes',
                NOW()
            ) ON CONFLICT (make, model) DO UPDATE SET
                default_size = EXCLUDED.default_size,
                verified = EXCLUDED.verified,
                notes = EXCLUDED.notes,
                updated_at = NOW();
            
            v_affected_count := 1;
            
        WHEN 'bulk_update' THEN
            -- Process array of vehicle registry entries
            WITH registry_updates AS (
                SELECT 
                    UPPER(TRIM(value->>'make')) as make,
                    UPPER(TRIM(value->>'model')) as model,
                    (value->>'default_size')::vehicle_size as default_size,
                    COALESCE((value->>'verified')::BOOLEAN, TRUE) as verified
                FROM jsonb_array_elements(p_registry_data->'entries') AS value
            )
            INSERT INTO vehicle_model_registry (make, model, default_size, verified, created_at)
            SELECT make, model, default_size, verified, NOW()
            FROM registry_updates
            ON CONFLICT (make, model) DO UPDATE SET
                default_size = EXCLUDED.default_size,
                verified = EXCLUDED.verified,
                updated_at = NOW();
            
            GET DIAGNOSTICS v_affected_count = ROW_COUNT;
            
        ELSE
            RETURN QUERY SELECT 
                FALSE, 'Invalid action'::TEXT, 0, '{}'::jsonb;
            RETURN;
    END CASE;

    -- Build response data
    v_result := jsonb_build_object(
        'action', p_action,
        'affected_count', v_affected_count,
        'admin_user_id', p_admin_user_id,
        'timestamp', NOW()
    );

    RETURN QUERY SELECT 
        TRUE, 
        format('%s completed successfully', p_action),
        v_affected_count,
        v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== GRANTS AND SECURITY =====

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION manage_vehicle(TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_vehicle_size(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_vehicles(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION manage_vehicle_photo(TEXT, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION manage_vehicle_registry(TEXT, JSONB, UUID) TO authenticated;

-- Grant service role access for server-side operations
GRANT EXECUTE ON FUNCTION manage_vehicle(TEXT, JSONB, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION detect_vehicle_size(TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_vehicles(UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION manage_vehicle_photo(TEXT, UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION manage_vehicle_registry(TEXT, JSONB, UUID) TO service_role;