-- Admin Stored Procedures for Love4Detailing Admin Dashboard
-- This migration implements all admin-specific stored procedures

-- ===== ADMIN SCHEDULE MANAGEMENT =====

-- Update admin weekly schedule
CREATE OR REPLACE FUNCTION update_admin_schedule(
    p_admin_id UUID,
    p_schedule_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_schedule_item RECORD;
    v_affected_rows INTEGER := 0;
    v_result JSONB;
BEGIN
    -- Verify admin permissions
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_admin_id 
        AND role IN ('admin', 'super_admin')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Unauthorized: Admin privileges required'
        );
    END IF;

    -- Process each day in the schedule data
    FOR v_schedule_item IN 
        SELECT * FROM jsonb_to_recordset(p_schedule_data) AS x(
            day_of_week INTEGER,
            is_working_day BOOLEAN,
            start_time TIME,
            end_time TIME,
            max_slots_per_hour INTEGER,
            break_times JSONB,
            notes TEXT
        )
    LOOP
        -- Update or insert schedule configuration
        INSERT INTO admin_schedule_config (
            day_of_week,
            is_working_day,
            start_time,
            end_time,
            max_slots_per_hour,
            break_times,
            notes
        ) VALUES (
            v_schedule_item.day_of_week,
            v_schedule_item.is_working_day,
            v_schedule_item.start_time,
            v_schedule_item.end_time,
            COALESCE(v_schedule_item.max_slots_per_hour, 1),
            COALESCE(v_schedule_item.break_times, '[]'::jsonb),
            v_schedule_item.notes
        )
        ON CONFLICT (day_of_week) DO UPDATE SET
            is_working_day = EXCLUDED.is_working_day,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            max_slots_per_hour = EXCLUDED.max_slots_per_hour,
            break_times = EXCLUDED.break_times,
            notes = EXCLUDED.notes,
            updated_at = NOW();
        
        v_affected_rows := v_affected_rows + 1;
    END LOOP;

    -- Log the activity
    INSERT INTO admin_activity_log (
        admin_user_id,
        action_type,
        target_type,
        details
    ) VALUES (
        p_admin_id,
        'schedule_update',
        'schedule',
        jsonb_build_object(
            'days_updated', v_affected_rows,
            'schedule_data', p_schedule_data
        )
    );

    -- Regenerate available slots for the next 30 days based on new schedule
    PERFORM sync_schedule_with_available_slots();

    v_result := jsonb_build_object(
        'success', true,
        'message', format('Updated schedule for %s days', v_affected_rows),
        'days_updated', v_affected_rows,
        'updated_at', NOW()
    );

    RETURN v_result;
END;
$$;

-- Get admin schedule configuration
CREATE OR REPLACE FUNCTION get_admin_schedule()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_schedule JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'day_of_week', day_of_week,
            'day_name', CASE day_of_week
                WHEN 0 THEN 'Sunday'
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                WHEN 6 THEN 'Saturday'
            END,
            'is_working_day', is_working_day,
            'start_time', start_time,
            'end_time', end_time,
            'max_slots_per_hour', max_slots_per_hour,
            'break_times', break_times,
            'notes', notes,
            'updated_at', updated_at
        ) ORDER BY day_of_week
    ) INTO v_schedule
    FROM admin_schedule_config;

    RETURN COALESCE(v_schedule, '[]'::jsonb);
END;
$$;

-- Sync admin schedule with available slots
CREATE OR REPLACE FUNCTION sync_schedule_with_available_slots()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_config RECORD;
    v_date DATE;
    v_time TIME;
    v_end_date DATE := CURRENT_DATE + INTERVAL '30 days';
BEGIN
    -- Delete future slots that don't match the current schedule
    DELETE FROM available_slots 
    WHERE slot_date >= CURRENT_DATE
    AND NOT EXISTS (
        SELECT 1 FROM admin_schedule_config 
        WHERE day_of_week = EXTRACT(DOW FROM slot_date)
        AND is_working_day = true
    );

    -- Generate new slots based on current schedule
    FOR v_config IN 
        SELECT * FROM admin_schedule_config 
        WHERE is_working_day = true
    LOOP
        -- Generate slots for each day matching this day_of_week
        FOR v_date IN 
            SELECT generate_series(
                CURRENT_DATE,
                v_end_date,
                '1 day'::interval
            )::date
            WHERE EXTRACT(DOW FROM generate_series(
                CURRENT_DATE,
                v_end_date,
                '1 day'::interval
            )) = v_config.day_of_week
        LOOP
            -- Generate hourly slots within working hours
            FOR v_time IN 
                SELECT generate_series(
                    v_config.start_time,
                    v_config.end_time - INTERVAL '1 hour',
                    '1 hour'::interval
                )::time
            LOOP
                -- Insert slot if it doesn't exist
                INSERT INTO available_slots (
                    slot_date,
                    start_time,
                    end_time,
                    max_bookings,
                    current_bookings,
                    is_blocked
                ) VALUES (
                    v_date,
                    v_time,
                    v_time + INTERVAL '1 hour',
                    v_config.max_slots_per_hour,
                    0,
                    false
                )
                ON CONFLICT (slot_date, start_time) DO UPDATE SET
                    max_bookings = EXCLUDED.max_bookings,
                    updated_at = NOW();
            END LOOP;
        END LOOP;
    END LOOP;
END;
$$;

-- ===== ADMIN BOOKING MANAGEMENT =====

-- Get admin booking dashboard
CREATE OR REPLACE FUNCTION get_admin_booking_dashboard(
    p_admin_id UUID,
    p_date_filter DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_todays_bookings JSONB;
    v_upcoming_bookings JSONB;
    v_stats JSONB;
    v_result JSONB;
BEGIN
    -- Verify admin permissions
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_admin_id 
        AND role IN ('admin', 'staff', 'super_admin')
    ) THEN
        RETURN jsonb_build_object(
            'error', 'Unauthorized access'
        );
    END IF;

    -- Get today's bookings
    SELECT jsonb_agg(
        jsonb_build_object(
            'booking_id', b.id,
            'booking_reference', b.booking_reference,
            'customer_name', b.customer_name,
            'customer_phone', b.customer_phone,
            'customer_email', b.customer_email,
            'service_name', s.name,
            'vehicle_details', jsonb_build_object(
                'registration', v.registration,
                'make', v.make,
                'model', v.model,
                'color', v.color
            ),
            'slot_time', jsonb_build_object(
                'start_time', slot.start_time,
                'end_time', slot.end_time
            ),
            'total_price_pence', b.total_price_pence,
            'status', b.status,
            'payment_method', b.payment_method,
            'special_requests', b.special_requests,
            'created_at', b.created_at,
            'estimated_duration', sp.duration_minutes
        ) ORDER BY slot.start_time
    ) INTO v_todays_bookings
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN available_slots slot ON b.slot_id = slot.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    LEFT JOIN service_pricing sp ON sp.service_id = s.id AND sp.vehicle_size = v.size
    WHERE slot.slot_date = p_date_filter;

    -- Get upcoming bookings (next 7 days)
    SELECT jsonb_agg(
        jsonb_build_object(
            'booking_id', b.id,
            'booking_reference', b.booking_reference,
            'customer_name', b.customer_name,
            'service_name', s.name,
            'slot_date', slot.slot_date,
            'start_time', slot.start_time,
            'status', b.status,
            'total_price_pence', b.total_price_pence
        ) ORDER BY slot.slot_date, slot.start_time
    ) INTO v_upcoming_bookings
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN available_slots slot ON b.slot_id = slot.id
    WHERE slot.slot_date > p_date_filter
    AND slot.slot_date <= p_date_filter + INTERVAL '7 days'
    AND b.status NOT IN ('cancelled', 'completed');

    -- Get daily statistics
    SELECT jsonb_build_object(
        'total_bookings_today', COUNT(*),
        'confirmed_bookings', COUNT(*) FILTER (WHERE b.status = 'confirmed'),
        'pending_bookings', COUNT(*) FILTER (WHERE b.status = 'pending'),
        'completed_bookings', COUNT(*) FILTER (WHERE b.status = 'completed'),
        'total_revenue_today_pence', COALESCE(SUM(
            CASE WHEN b.status = 'completed' THEN b.total_price_pence ELSE 0 END
        ), 0),
        'average_booking_value_pence', COALESCE(AVG(b.total_price_pence), 0)
    ) INTO v_stats
    FROM bookings b
    JOIN available_slots slot ON b.slot_id = slot.id
    WHERE slot.slot_date = p_date_filter;

    -- Build result
    v_result := jsonb_build_object(
        'date', p_date_filter,
        'todays_bookings', COALESCE(v_todays_bookings, '[]'::jsonb),
        'upcoming_bookings', COALESCE(v_upcoming_bookings, '[]'::jsonb),
        'statistics', v_stats,
        'generated_at', NOW()
    );

    RETURN v_result;
END;
$$;

-- Update booking status (admin action)
CREATE OR REPLACE FUNCTION admin_update_booking_status(
    p_admin_id UUID,
    p_booking_id UUID,
    p_new_status TEXT,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_old_status TEXT;
    v_booking_ref TEXT;
    v_customer_email TEXT;
    v_result JSONB;
BEGIN
    -- Verify admin permissions
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_admin_id 
        AND role IN ('admin', 'staff', 'super_admin')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Unauthorized: Admin privileges required'
        );
    END IF;

    -- Get current booking info
    SELECT status, booking_reference, customer_email 
    INTO v_old_status, v_booking_ref, v_customer_email
    FROM bookings 
    WHERE id = p_booking_id;

    IF v_old_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Booking not found'
        );
    END IF;

    -- Update booking status
    UPDATE bookings 
    SET 
        status = p_new_status::booking_status,
        completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE id = p_booking_id;

    -- Add admin note if provided
    IF p_notes IS NOT NULL THEN
        INSERT INTO admin_notes (
            booking_id,
            admin_user_id,
            note_type,
            title,
            content,
            is_private
        ) VALUES (
            p_booking_id,
            p_admin_id,
            'status_change',
            format('Status changed: %s → %s', v_old_status, p_new_status),
            p_notes,
            false
        );
    END IF;

    -- Log the activity
    INSERT INTO admin_activity_log (
        admin_user_id,
        action_type,
        target_type,
        target_id,
        details
    ) VALUES (
        p_admin_id,
        'booking_modified',
        'booking',
        p_booking_id,
        jsonb_build_object(
            'old_status', v_old_status,
            'new_status', p_new_status,
            'booking_reference', v_booking_ref,
            'notes', p_notes
        )
    );

    v_result := jsonb_build_object(
        'success', true,
        'message', format('Booking %s status updated to %s', v_booking_ref, p_new_status),
        'old_status', v_old_status,
        'new_status', p_new_status,
        'updated_at', NOW()
    );

    RETURN v_result;
END;
$$;

-- ===== CUSTOMER MANAGEMENT =====

-- Get customer profile with admin view
CREATE OR REPLACE FUNCTION get_customer_profile_admin(
    p_admin_id UUID,
    p_customer_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_customer_data JSONB;
    v_booking_history JSONB;
    v_vehicles JSONB;
    v_admin_notes JSONB;
    v_statistics JSONB;
    v_result JSONB;
BEGIN
    -- Verify admin permissions
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_admin_id 
        AND role IN ('admin', 'staff', 'super_admin')
    ) THEN
        RETURN jsonb_build_object(
            'error', 'Unauthorized access'
        );
    END IF;

    -- Get customer profile data
    SELECT jsonb_build_object(
        'user_id', u.id,
        'email', u.email,
        'full_name', u.full_name,
        'phone', u.phone,
        'role', u.role,
        'is_active', u.is_active,
        'email_verified_at', u.email_verified_at,
        'marketing_opt_in', u.marketing_opt_in,
        'service_preferences', u.service_preferences,
        'preferred_communication', u.preferred_communication,
        'last_login_at', u.last_login_at,
        'created_at', u.created_at,
        'reward_info', CASE WHEN cr.id IS NOT NULL THEN
            jsonb_build_object(
                'total_points', cr.total_points,
                'current_tier', cr.current_tier,
                'points_lifetime', cr.points_lifetime
            )
        ELSE NULL END
    ) INTO v_customer_data
    FROM users u
    LEFT JOIN customer_rewards cr ON cr.user_id = u.id
    WHERE u.id = p_customer_id;

    -- Get booking history
    SELECT jsonb_agg(
        jsonb_build_object(
            'booking_id', b.id,
            'booking_reference', b.booking_reference,
            'service_name', s.name,
            'slot_date', slot.slot_date,
            'start_time', slot.start_time,
            'status', b.status,
            'total_price_pence', b.total_price_pence,
            'payment_method', b.payment_method,
            'vehicle_registration', v.registration,
            'completed_at', b.completed_at,
            'created_at', b.created_at
        ) ORDER BY b.created_at DESC
    ) INTO v_booking_history
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN available_slots slot ON b.slot_id = slot.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = p_customer_id;

    -- Get customer vehicles
    SELECT jsonb_agg(
        jsonb_build_object(
            'vehicle_id', v.id,
            'registration', v.registration,
            'make', v.make,
            'model', v.model,
            'year', v.year,
            'color', v.color,
            'size', v.size,
            'is_active', v.is_active,
            'last_service_date', v.last_service_date,
            'created_at', v.created_at
        ) ORDER BY v.created_at DESC
    ) INTO v_vehicles
    FROM vehicles v
    WHERE v.user_id = p_customer_id;

    -- Get admin notes for this customer
    SELECT jsonb_agg(
        jsonb_build_object(
            'note_id', an.id,
            'title', an.title,
            'content', an.content,
            'note_type', an.note_type,
            'priority', an.priority,
            'tags', an.tags,
            'admin_name', u.full_name,
            'created_at', an.created_at
        ) ORDER BY an.created_at DESC
    ) INTO v_admin_notes
    FROM admin_notes an
    JOIN users u ON an.admin_user_id = u.id
    WHERE an.customer_user_id = p_customer_id;

    -- Calculate customer statistics
    SELECT jsonb_build_object(
        'total_bookings', COUNT(b.id),
        'completed_bookings', COUNT(*) FILTER (WHERE b.status = 'completed'),
        'cancelled_bookings', COUNT(*) FILTER (WHERE b.status = 'cancelled'),
        'total_spent_pence', COALESCE(SUM(
            CASE WHEN b.status = 'completed' THEN b.total_price_pence ELSE 0 END
        ), 0),
        'average_booking_value_pence', COALESCE(AVG(
            CASE WHEN b.status = 'completed' THEN b.total_price_pence ELSE NULL END
        ), 0),
        'first_booking_date', MIN(b.created_at),
        'last_booking_date', MAX(b.created_at),
        'customer_lifetime_months', EXTRACT(
            MONTH FROM AGE(NOW(), MIN(b.created_at))
        ) + EXTRACT(YEAR FROM AGE(NOW(), MIN(b.created_at))) * 12
    ) INTO v_statistics
    FROM bookings b
    WHERE b.user_id = p_customer_id;

    -- Build comprehensive result
    v_result := jsonb_build_object(
        'customer_profile', v_customer_data,
        'booking_history', COALESCE(v_booking_history, '[]'::jsonb),
        'vehicles', COALESCE(v_vehicles, '[]'::jsonb),
        'admin_notes', COALESCE(v_admin_notes, '[]'::jsonb),
        'statistics', v_statistics,
        'generated_at', NOW()
    );

    RETURN v_result;
END;
$$;

-- ===== ANALYTICS & INSIGHTS =====

-- Get admin analytics dashboard
CREATE OR REPLACE FUNCTION get_admin_analytics(
    p_admin_id UUID,
    p_period TEXT DEFAULT 'month', -- 'week', 'month', 'quarter', 'year'
    p_date_start DATE DEFAULT NULL,
    p_date_end DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_revenue_data JSONB;
    v_booking_stats JSONB;
    v_customer_insights JSONB;
    v_service_performance JSONB;
    v_result JSONB;
BEGIN
    -- Verify admin permissions
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_admin_id 
        AND role IN ('admin', 'super_admin')
    ) THEN
        RETURN jsonb_build_object(
            'error', 'Unauthorized access'
        );
    END IF;

    -- Set date ranges
    IF p_date_start IS NOT NULL AND p_date_end IS NOT NULL THEN
        v_start_date := p_date_start;
        v_end_date := p_date_end;
    ELSE
        CASE p_period
            WHEN 'week' THEN
                v_start_date := DATE_TRUNC('week', CURRENT_DATE);
                v_end_date := v_start_date + INTERVAL '6 days';
            WHEN 'month' THEN
                v_start_date := DATE_TRUNC('month', CURRENT_DATE);
                v_end_date := v_start_date + INTERVAL '1 month' - INTERVAL '1 day';
            WHEN 'quarter' THEN
                v_start_date := DATE_TRUNC('quarter', CURRENT_DATE);
                v_end_date := v_start_date + INTERVAL '3 months' - INTERVAL '1 day';
            WHEN 'year' THEN
                v_start_date := DATE_TRUNC('year', CURRENT_DATE);
                v_end_date := v_start_date + INTERVAL '1 year' - INTERVAL '1 day';
            ELSE
                v_start_date := DATE_TRUNC('month', CURRENT_DATE);
                v_end_date := v_start_date + INTERVAL '1 month' - INTERVAL '1 day';
        END CASE;
    END IF;

    -- Get revenue data with trends
    SELECT jsonb_build_object(
        'total_revenue_pence', COALESCE(SUM(
            CASE WHEN b.status = 'completed' THEN b.total_price_pence ELSE 0 END
        ), 0),
        'total_bookings', COUNT(*),
        'completed_bookings', COUNT(*) FILTER (WHERE b.status = 'completed'),
        'average_booking_value_pence', COALESCE(AVG(
            CASE WHEN b.status = 'completed' THEN b.total_price_pence ELSE NULL END
        ), 0),
        'daily_breakdown', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', daily.slot_date,
                    'revenue_pence', daily.daily_revenue,
                    'booking_count', daily.booking_count
                ) ORDER BY daily.slot_date
            )
            FROM (
                SELECT 
                    slot.slot_date,
                    COALESCE(SUM(
                        CASE WHEN b.status = 'completed' THEN b.total_price_pence ELSE 0 END
                    ), 0) as daily_revenue,
                    COUNT(b.id) as booking_count
                FROM available_slots slot
                LEFT JOIN bookings b ON b.slot_id = slot.id
                WHERE slot.slot_date BETWEEN v_start_date AND v_end_date
                GROUP BY slot.slot_date
            ) daily
        )
    ) INTO v_revenue_data
    FROM bookings b
    JOIN available_slots slot ON b.slot_id = slot.id
    WHERE slot.slot_date BETWEEN v_start_date AND v_end_date;

    -- Get service performance
    SELECT jsonb_agg(
        jsonb_build_object(
            'service_name', s.name,
            'booking_count', service_stats.booking_count,
            'total_revenue_pence', service_stats.total_revenue,
            'average_price_pence', service_stats.avg_price,
            'completion_rate', service_stats.completion_rate
        ) ORDER BY service_stats.booking_count DESC
    ) INTO v_service_performance
    FROM (
        SELECT 
            s.id,
            COUNT(b.id) as booking_count,
            COALESCE(SUM(
                CASE WHEN b.status = 'completed' THEN b.total_price_pence ELSE 0 END
            ), 0) as total_revenue,
            COALESCE(AVG(
                CASE WHEN b.status = 'completed' THEN b.total_price_pence ELSE NULL END
            ), 0) as avg_price,
            ROUND(
                COUNT(*) FILTER (WHERE b.status = 'completed')::DECIMAL / 
                NULLIF(COUNT(*), 0) * 100, 
                2
            ) as completion_rate
        FROM services s
        LEFT JOIN bookings b ON b.service_id = s.id
        LEFT JOIN available_slots slot ON b.slot_id = slot.id
        WHERE slot.slot_date BETWEEN v_start_date AND v_end_date OR slot.slot_date IS NULL
        GROUP BY s.id
    ) service_stats
    JOIN services s ON service_stats.id = s.id;

    -- Get customer insights
    SELECT jsonb_build_object(
        'new_customers', COUNT(DISTINCT b.user_id) FILTER (
            WHERE first_booking.first_date BETWEEN v_start_date AND v_end_date
        ),
        'returning_customers', COUNT(DISTINCT b.user_id) FILTER (
            WHERE first_booking.first_date < v_start_date
        ),
        'total_unique_customers', COUNT(DISTINCT b.user_id),
        'customer_retention_rate', ROUND(
            COUNT(DISTINCT b.user_id) FILTER (
                WHERE first_booking.first_date < v_start_date
            )::DECIMAL / 
            NULLIF(COUNT(DISTINCT b.user_id), 0) * 100,
            2
        )
    ) INTO v_customer_insights
    FROM bookings b
    JOIN available_slots slot ON b.slot_id = slot.id
    JOIN (
        SELECT 
            b.user_id,
            MIN(slot.slot_date) as first_date
        FROM bookings b
        JOIN available_slots slot ON b.slot_id = slot.id
        GROUP BY b.user_id
    ) first_booking ON first_booking.user_id = b.user_id
    WHERE slot.slot_date BETWEEN v_start_date AND v_end_date;

    -- Build comprehensive result
    v_result := jsonb_build_object(
        'period', p_period,
        'date_range', jsonb_build_object(
            'start_date', v_start_date,
            'end_date', v_end_date
        ),
        'revenue_analytics', v_revenue_data,
        'service_performance', COALESCE(v_service_performance, '[]'::jsonb),
        'customer_insights', v_customer_insights,
        'generated_at', NOW()
    );

    RETURN v_result;
END;
$$;

-- ===== PERMISSIONS =====

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_admin_schedule TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_schedule TO authenticated;
GRANT EXECUTE ON FUNCTION sync_schedule_with_available_slots TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_booking_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_booking_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_profile_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_analytics TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION update_admin_schedule IS 'Updates admin working schedule and syncs with available slots';
COMMENT ON FUNCTION get_admin_schedule IS 'Returns current admin schedule configuration';
COMMENT ON FUNCTION sync_schedule_with_available_slots IS 'Syncs admin schedule with available booking slots';
COMMENT ON FUNCTION get_admin_booking_dashboard IS 'Returns comprehensive booking dashboard for admin';
COMMENT ON FUNCTION admin_update_booking_status IS 'Updates booking status with admin audit trail';
COMMENT ON FUNCTION get_customer_profile_admin IS 'Returns detailed customer profile for admin view';
COMMENT ON FUNCTION get_admin_analytics IS 'Returns comprehensive analytics for admin dashboard'; 