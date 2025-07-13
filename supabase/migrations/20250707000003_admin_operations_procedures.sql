-- Admin Operations Stored Procedures
-- Part 3 of comprehensive database-first architecture procedures

-- ===== ADMIN BOOKING OPERATIONS =====

-- Create manual booking (admin-initiated)
CREATE OR REPLACE FUNCTION create_manual_booking(
    p_booking_details JSONB,
    p_admin_user_id UUID
) RETURNS TABLE (
    booking_id UUID,
    booking_reference VARCHAR,
    success BOOLEAN,
    message TEXT,
    admin_note_id UUID
) AS $$
DECLARE
    v_booking_result RECORD;
    v_admin_note_id UUID;
    v_admin_name TEXT;
BEGIN
    -- Get admin name for audit trail
    SELECT full_name INTO v_admin_name
    FROM users
    WHERE id = p_admin_user_id
    AND role IN ('admin', 'staff', 'super_admin');

    IF v_admin_name IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::VARCHAR, FALSE, 
            'Unauthorized: Admin privileges required'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Process booking using existing function
    SELECT * INTO v_booking_result
    FROM process_booking_transaction(
        p_booking_details->'customer_data',
        p_booking_details->'vehicle_data',
        p_booking_details->'booking_data'
    );

    IF v_booking_result.success THEN
        -- Add admin note about manual creation
        INSERT INTO booking_notes (
            booking_id,
            author_id,
            note_type,
            content,
            is_visible_to_customer
        ) VALUES (
            v_booking_result.booking_id,
            p_admin_user_id,
            'internal',
            format('Manual booking created by admin: %s', v_admin_name),
            FALSE
        ) RETURNING id INTO v_admin_note_id;

        -- Mark booking as confirmed if specified
        IF (p_booking_details->'booking_data'->>'auto_confirm')::BOOLEAN = TRUE THEN
            PERFORM update_booking_status(
                v_booking_result.booking_id,
                'confirmed',
                'Auto-confirmed by admin'
            );
        END IF;
    END IF;

    RETURN QUERY SELECT 
        v_booking_result.booking_id,
        v_booking_result.booking_reference,
        v_booking_result.success,
        v_booking_result.message,
        v_admin_note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Edit existing booking with audit trail
CREATE OR REPLACE FUNCTION edit_existing_booking(
    p_booking_id UUID,
    p_changes JSONB,
    p_admin_user_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS TABLE (
    booking_id UUID,
    changes_applied JSONB,
    success BOOLEAN,
    message TEXT,
    audit_note_id UUID
) AS $$
DECLARE
    v_booking RECORD;
    v_admin_name TEXT;
    v_changes_made JSONB := '{}';
    v_audit_note_id UUID;
    v_old_values JSONB;
    v_change_summary TEXT[];
BEGIN
    -- Verify admin permissions
    SELECT full_name INTO v_admin_name
    FROM users
    WHERE id = p_admin_user_id
    AND role IN ('admin', 'staff', 'super_admin');

    IF v_admin_name IS NULL THEN
        RETURN QUERY SELECT 
            p_booking_id, '{}'::jsonb, FALSE, 
            'Unauthorized: Admin privileges required'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Get current booking details
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
    
    IF v_booking IS NULL THEN
        RETURN QUERY SELECT 
            p_booking_id, '{}'::jsonb, FALSE, 
            'Booking not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Store old values for audit
    v_old_values := jsonb_build_object(
        'status', v_booking.status,
        'slot_id', v_booking.slot_id,
        'payment_status', v_booking.payment_status,
        'total_price_pence', v_booking.total_price_pence,
        'notes', v_booking.notes
    );

    -- Apply changes
    IF p_changes ? 'status' THEN
        UPDATE bookings 
        SET status = (p_changes->>'status')::booking_status,
            updated_at = NOW()
        WHERE id = p_booking_id;
        
        v_change_summary := array_append(v_change_summary, 
            format('Status: %s → %s', v_booking.status, p_changes->>'status'));
    END IF;

    IF p_changes ? 'payment_status' THEN
        UPDATE bookings 
        SET payment_status = (p_changes->>'payment_status')::payment_status,
            updated_at = NOW()
        WHERE id = p_booking_id;
            
        v_change_summary := array_append(v_change_summary, 
            format('Payment: %s → %s', v_booking.payment_status, p_changes->>'payment_status'));
    END IF;

    IF p_changes ? 'total_price_pence' THEN
        UPDATE bookings 
        SET total_price_pence = (p_changes->>'total_price_pence')::INTEGER,
            service_price_pence = (p_changes->>'total_price_pence')::INTEGER,
            updated_at = NOW()
        WHERE id = p_booking_id;
            
        v_change_summary := array_append(v_change_summary, 
            format('Price: %s → %s pence', v_booking.total_price_pence, p_changes->>'total_price_pence'));
    END IF;

    IF p_changes ? 'notes' THEN
        UPDATE bookings 
        SET notes = p_changes->>'notes',
            updated_at = NOW()
        WHERE id = p_booking_id;
            
        v_change_summary := array_append(v_change_summary, 'Notes updated');
    END IF;

    -- Create audit trail
    v_changes_made := jsonb_build_object(
        'old_values', v_old_values,
        'new_values', p_changes,
        'admin_user_id', p_admin_user_id,
        'admin_name', v_admin_name,
        'reason', p_reason,
        'timestamp', NOW()
    );

    INSERT INTO booking_notes (
        booking_id,
        author_id,
        note_type,
        content,
        is_visible_to_customer
    ) VALUES (
        p_booking_id,
        p_admin_user_id,
        'system',
        format('Booking modified by %s: %s%s', 
            v_admin_name, 
            array_to_string(v_change_summary, ', '),
            CASE WHEN p_reason IS NOT NULL THEN format('. Reason: %s', p_reason) ELSE '' END
        ),
        FALSE
    ) RETURNING id INTO v_audit_note_id;

    RETURN QUERY SELECT 
        p_booking_id,
        v_changes_made,
        TRUE,
        'Booking updated successfully'::TEXT,
        v_audit_note_id;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            p_booking_id, '{}'::jsonb, FALSE, SQLERRM::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== SERVICE CATALOG MANAGEMENT =====

-- Manage service catalog (CRUD operations)
CREATE OR REPLACE FUNCTION manage_service_catalog(
    p_action TEXT,
    p_service_data JSONB,
    p_admin_user_id UUID
) RETURNS TABLE (
    service_id UUID,
    action_performed TEXT,
    success BOOLEAN,
    message TEXT,
    affected_pricing_records INTEGER
) AS $$
DECLARE
    v_service_id UUID;
    v_admin_name TEXT;
    v_pricing_count INTEGER := 0;
    v_service_code TEXT;
BEGIN
    -- Verify admin permissions
    SELECT full_name INTO v_admin_name
    FROM users
    WHERE id = p_admin_user_id
    AND role IN ('admin', 'super_admin');

    IF v_admin_name IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, p_action, FALSE, 
            'Unauthorized: Super admin privileges required'::TEXT, 0;
        RETURN;
    END IF;

    CASE p_action
        WHEN 'create' THEN
            -- Create new service
            INSERT INTO services (
                code,
                name,
                description,
                base_duration_minutes,
                is_active
            ) VALUES (
                p_service_data->>'code',
                p_service_data->>'name',
                p_service_data->>'description',
                COALESCE((p_service_data->>'base_duration_minutes')::INTEGER, 120),
                COALESCE((p_service_data->>'is_active')::BOOLEAN, TRUE)
            ) RETURNING id INTO v_service_id;

            -- Create default pricing for all vehicle sizes if provided
            IF p_service_data ? 'pricing' THEN
                INSERT INTO service_pricing (service_id, vehicle_size, price_pence, duration_minutes)
                SELECT 
                    v_service_id,
                    (pricing_item->>'vehicle_size')::vehicle_size,
                    (pricing_item->>'price_pence')::INTEGER,
                    (pricing_item->>'duration_minutes')::INTEGER
                FROM jsonb_array_elements(p_service_data->'pricing') AS pricing_item;
                
                GET DIAGNOSTICS v_pricing_count = ROW_COUNT;
            END IF;

        WHEN 'update' THEN
            v_service_id := (p_service_data->>'id')::UUID;
            
            UPDATE services 
            SET 
                name = COALESCE(p_service_data->>'name', name),
                description = COALESCE(p_service_data->>'description', description),
                base_duration_minutes = COALESCE((p_service_data->>'base_duration_minutes')::INTEGER, base_duration_minutes),
                is_active = COALESCE((p_service_data->>'is_active')::BOOLEAN, is_active),
                updated_at = NOW()
            WHERE id = v_service_id;

            -- Update pricing if provided
            IF p_service_data ? 'pricing' THEN
                -- Delete existing pricing
                DELETE FROM service_pricing WHERE service_id = v_service_id;
                
                -- Insert new pricing
                INSERT INTO service_pricing (service_id, vehicle_size, price_pence, duration_minutes)
                SELECT 
                    v_service_id,
                    (pricing_item->>'vehicle_size')::vehicle_size,
                    (pricing_item->>'price_pence')::INTEGER,
                    (pricing_item->>'duration_minutes')::INTEGER
                FROM jsonb_array_elements(p_service_data->'pricing') AS pricing_item;
                
                GET DIAGNOSTICS v_pricing_count = ROW_COUNT;
            END IF;

        WHEN 'delete' THEN
            v_service_id := (p_service_data->>'id')::UUID;
            
            -- Soft delete by setting is_active = false
            UPDATE services 
            SET is_active = FALSE, updated_at = NOW()
            WHERE id = v_service_id;

            -- Deactivate associated pricing
            UPDATE service_pricing 
            SET is_active = FALSE, updated_at = NOW()
            WHERE service_id = v_service_id;
            
            GET DIAGNOSTICS v_pricing_count = ROW_COUNT;

        ELSE
            RETURN QUERY SELECT 
                NULL::UUID, p_action, FALSE, 
                'Invalid action. Use: create, update, or delete'::TEXT, 0;
            RETURN;
    END CASE;

    RETURN QUERY SELECT 
        v_service_id,
        p_action,
        TRUE,
        format('Service %s completed successfully', p_action)::TEXT,
        v_pricing_count;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            v_service_id, p_action, FALSE, SQLERRM::TEXT, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update pricing matrix with bulk changes
CREATE OR REPLACE FUNCTION update_pricing_matrix(
    p_pricing_changes JSONB,
    p_admin_user_id UUID
) RETURNS TABLE (
    records_updated INTEGER,
    services_affected INTEGER,
    success BOOLEAN,
    message TEXT,
    change_summary JSONB
) AS $$
DECLARE
    v_admin_name TEXT;
    v_records_updated INTEGER := 0;
    v_services_affected INTEGER := 0;
    v_change RECORD;
    v_affected_services UUID[];
    v_change_summary JSONB := '[]';
BEGIN
    -- Verify admin permissions
    SELECT full_name INTO v_admin_name
    FROM users
    WHERE id = p_admin_user_id
    AND role IN ('admin', 'super_admin');

    IF v_admin_name IS NULL THEN
        RETURN QUERY SELECT 
            0, 0, FALSE, 
            'Unauthorized: Admin privileges required'::TEXT, 
            '[]'::jsonb;
        RETURN;
    END IF;

    -- Process each pricing change
    FOR v_change IN 
        SELECT * FROM jsonb_to_recordset(p_pricing_changes) AS x(
            service_id UUID,
            vehicle_size vehicle_size,
            price_pence INTEGER,
            duration_minutes INTEGER,
            percentage_increase NUMERIC
        )
    LOOP
        IF v_change.percentage_increase IS NOT NULL THEN
            -- Apply percentage increase
            UPDATE service_pricing
            SET 
                price_pence = ROUND(price_pence * (1 + v_change.percentage_increase / 100)),
                updated_at = NOW()
            WHERE service_id = v_change.service_id
            AND (v_change.vehicle_size IS NULL OR vehicle_size = v_change.vehicle_size)
            AND is_active = TRUE;
        ELSE
            -- Apply direct price/duration update
            UPDATE service_pricing
            SET 
                price_pence = COALESCE(v_change.price_pence, price_pence),
                duration_minutes = COALESCE(v_change.duration_minutes, duration_minutes),
                updated_at = NOW()
            WHERE service_id = v_change.service_id
            AND vehicle_size = v_change.vehicle_size
            AND is_active = TRUE;
        END IF;

        GET DIAGNOSTICS v_records_updated = ROW_COUNT;
        
        -- Track affected service
        IF NOT (v_change.service_id = ANY(v_affected_services)) THEN
            v_affected_services := array_append(v_affected_services, v_change.service_id);
        END IF;

        -- Build change summary
        v_change_summary := v_change_summary || jsonb_build_object(
            'service_id', v_change.service_id,
            'vehicle_size', v_change.vehicle_size,
            'change_type', CASE 
                WHEN v_change.percentage_increase IS NOT NULL THEN 'percentage_increase'
                ELSE 'direct_update'
            END,
            'records_affected', v_records_updated
        );
    END LOOP;

    v_services_affected := array_length(v_affected_services, 1);

    RETURN QUERY SELECT 
        v_records_updated,
        COALESCE(v_services_affected, 0),
        TRUE,
        format('Updated %s pricing records across %s services', v_records_updated, v_services_affected)::TEXT,
        v_change_summary;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            0, 0, FALSE, SQLERRM::TEXT, '[]'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== CUSTOMER INSIGHTS =====

-- Get customer insights for admin dashboard
CREATE OR REPLACE FUNCTION get_customer_insights(
    p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
    customer_id UUID,
    customer_email TEXT,
    customer_name TEXT,
    total_bookings INTEGER,
    completed_bookings INTEGER,
    total_spent_pence INTEGER,
    loyalty_tier reward_tier,
    loyalty_points INTEGER,
    last_booking_date TIMESTAMP WITH TIME ZONE,
    customer_lifetime_value INTEGER,
    preferred_services JSONB,
    booking_frequency_days NUMERIC,
    risk_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH customer_stats AS (
        SELECT 
            COALESCE(b.user_id, cr.user_id) as customer_uuid,
            COALESCE(u.email, b.customer_email, cr.customer_email) as email,
            COALESCE(u.full_name, b.customer_name) as full_name,
            COUNT(b.id) as booking_count,
            COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed_count,
            SUM(b.total_price_pence) FILTER (WHERE b.status = 'completed') as total_spent,
            MAX(b.completed_at) as last_completed,
            MIN(b.created_at) as first_booking,
            COALESCE(cr.current_tier, 'bronze') as tier,
            COALESCE(cr.total_points, 0) as points
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN customer_rewards cr ON (cr.user_id = b.user_id OR cr.customer_email = b.customer_email)
        WHERE (p_user_id IS NULL OR b.user_id = p_user_id OR cr.user_id = p_user_id)
        GROUP BY 
            COALESCE(b.user_id, cr.user_id),
            COALESCE(u.email, b.customer_email, cr.customer_email),
            COALESCE(u.full_name, b.customer_name),
            cr.current_tier,
            cr.total_points
    ),
    service_preferences AS (
        SELECT 
            COALESCE(b.user_id, generate_random_uuid()) as customer_uuid,
            jsonb_agg(
                jsonb_build_object(
                    'service_name', s.name,
                    'booking_count', service_count
                ) ORDER BY service_count DESC
            ) as preferred_services_json
        FROM (
            SELECT 
                b.user_id,
                b.service_id,
                s.name,
                COUNT(*) as service_count
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE b.status = 'completed'
            GROUP BY b.user_id, b.service_id, s.name
        ) service_stats
        JOIN bookings b ON service_stats.user_id = b.user_id
        JOIN services s ON service_stats.service_id = s.id
        GROUP BY COALESCE(b.user_id, generate_random_uuid())
    )
    SELECT 
        cs.customer_uuid,
        cs.email,
        cs.full_name,
        cs.booking_count::INTEGER,
        cs.completed_count::INTEGER,
        COALESCE(cs.total_spent, 0)::INTEGER,
        cs.tier::reward_tier,
        cs.points::INTEGER,
        cs.last_completed,
        COALESCE(cs.total_spent, 0)::INTEGER as clv, -- Simple CLV calculation
        COALESCE(sp.preferred_services_json, '[]'::jsonb),
        CASE 
            WHEN cs.booking_count > 1 AND cs.first_booking IS NOT NULL THEN
                EXTRACT(days FROM (cs.last_completed - cs.first_booking)) / GREATEST(cs.booking_count - 1, 1)
            ELSE NULL
        END as frequency,
        CASE 
            WHEN cs.last_completed < NOW() - INTERVAL '6 months' THEN 80
            WHEN cs.last_completed < NOW() - INTERVAL '3 months' THEN 60
            WHEN cs.booking_count = 1 THEN 40
            ELSE 20
        END as risk_score
    FROM customer_stats cs
    LEFT JOIN service_preferences sp ON cs.customer_uuid = sp.customer_uuid
    ORDER BY cs.total_spent DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_manual_booking TO authenticated;
GRANT EXECUTE ON FUNCTION edit_existing_booking TO authenticated;
GRANT EXECUTE ON FUNCTION manage_service_catalog TO authenticated;
GRANT EXECUTE ON FUNCTION update_pricing_matrix TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_insights TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION create_manual_booking IS 'Creates bookings manually through admin interface with audit trail';
COMMENT ON FUNCTION edit_existing_booking IS 'Edits existing bookings with comprehensive audit logging';
COMMENT ON FUNCTION manage_service_catalog IS 'Manages service catalog with CRUD operations and pricing';
COMMENT ON FUNCTION update_pricing_matrix IS 'Updates service pricing with bulk changes and percentage increases';
COMMENT ON FUNCTION get_customer_insights IS 'Returns comprehensive customer analytics and insights';