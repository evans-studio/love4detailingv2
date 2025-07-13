-- Schedule Management and Analytics Stored Procedures
-- Part 2 of comprehensive database-first architecture procedures

-- ===== SCHEDULE MANAGEMENT PROCEDURES =====

-- Update schedule availability with template support
CREATE OR REPLACE FUNCTION update_schedule_availability(
    p_template_id UUID,
    p_date_overrides JSONB DEFAULT '[]'::jsonb
) RETURNS TABLE (
    slots_created INTEGER,
    slots_updated INTEGER,
    date_range_start DATE,
    date_range_end DATE,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_slots_created INTEGER := 0;
    v_slots_updated INTEGER := 0;
    v_start_date DATE := CURRENT_DATE;
    v_end_date DATE := CURRENT_DATE + INTERVAL '30 days';
    v_override RECORD;
BEGIN
    -- Generate slots from template for next 30 days
    SELECT generate_slots_from_template(p_template_id, v_start_date, v_end_date) 
    INTO v_slots_created;

    -- Apply date-specific overrides if provided
    IF jsonb_array_length(p_date_overrides) > 0 THEN
        FOR v_override IN 
            SELECT * FROM jsonb_to_recordset(p_date_overrides) AS x(
                override_date DATE,
                is_blocked BOOLEAN,
                block_reason TEXT,
                max_bookings INTEGER
            )
        LOOP
            UPDATE available_slots
            SET 
                is_blocked = COALESCE(v_override.is_blocked, is_blocked),
                block_reason = COALESCE(v_override.block_reason, block_reason),
                max_bookings = COALESCE(v_override.max_bookings, max_bookings),
                updated_at = NOW()
            WHERE slot_date = v_override.override_date;
            
            GET DIAGNOSTICS v_slots_updated = ROW_COUNT;
        END LOOP;
    END IF;

    RETURN QUERY SELECT 
        v_slots_created,
        v_slots_updated,
        v_start_date,
        v_end_date,
        TRUE,
        format('Created %s slots, updated %s slots', v_slots_created, v_slots_updated)::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            0, 0, v_start_date, v_end_date, FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Manage working hours with day-specific configuration
CREATE OR REPLACE FUNCTION manage_working_hours(
    p_day_of_week INTEGER,
    p_time_slots JSONB,
    p_template_id UUID DEFAULT NULL
) RETURNS TABLE (
    slots_affected INTEGER,
    template_id UUID,
    day_configured INTEGER,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_template_id UUID;
    v_slot RECORD;
    v_slots_affected INTEGER := 0;
BEGIN
    -- Get or create default template
    IF p_template_id IS NULL THEN
        SELECT id INTO v_template_id 
        FROM schedule_templates 
        WHERE name = 'Default Weekly Schedule' 
        AND is_active = TRUE;
        
        IF v_template_id IS NULL THEN
            INSERT INTO schedule_templates (name, description, is_active)
            VALUES ('Default Weekly Schedule', 'System generated default schedule', TRUE)
            RETURNING id INTO v_template_id;
        END IF;
    ELSE
        v_template_id := p_template_id;
    END IF;

    -- Clear existing slots for this day
    DELETE FROM schedule_slots 
    WHERE template_id = v_template_id 
    AND day_of_week = p_day_of_week;

    -- Insert new time slots for the day
    FOR v_slot IN 
        SELECT * FROM jsonb_to_recordset(p_time_slots) AS x(
            start_time TIME,
            end_time TIME,
            max_bookings INTEGER
        )
    LOOP
        INSERT INTO schedule_slots (
            template_id,
            day_of_week,
            start_time,
            end_time,
            max_bookings,
            is_active
        ) VALUES (
            v_template_id,
            p_day_of_week,
            v_slot.start_time,
            v_slot.end_time,
            COALESCE(v_slot.max_bookings, 1),
            TRUE
        );
        
        v_slots_affected := v_slots_affected + 1;
    END LOOP;

    RETURN QUERY SELECT 
        v_slots_affected,
        v_template_id,
        p_day_of_week,
        TRUE,
        format('Configured %s slots for day %s', v_slots_affected, p_day_of_week)::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            0, v_template_id, p_day_of_week, FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== ANALYTICS & REPORTING PROCEDURES =====

-- Get comprehensive booking analytics
CREATE OR REPLACE FUNCTION get_booking_analytics(
    p_date_start DATE,
    p_date_end DATE,
    p_group_by TEXT DEFAULT 'day'
) RETURNS TABLE (
    period_label TEXT,
    total_bookings INTEGER,
    completed_bookings INTEGER,
    cancelled_bookings INTEGER,
    total_revenue_pence INTEGER,
    average_booking_value_pence INTEGER,
    capacity_utilization_percent NUMERIC,
    top_service JSONB,
    customer_insights JSONB
) AS $$
DECLARE
    v_group_format TEXT;
    v_group_trunc TEXT;
BEGIN
    -- Set grouping format based on parameter
    CASE p_group_by
        WHEN 'day' THEN 
            v_group_format := 'YYYY-MM-DD';
            v_group_trunc := 'day';
        WHEN 'week' THEN 
            v_group_format := 'YYYY-"W"WW';
            v_group_trunc := 'week';
        WHEN 'month' THEN 
            v_group_format := 'YYYY-MM';
            v_group_trunc := 'month';
        ELSE 
            v_group_format := 'YYYY-MM-DD';
            v_group_trunc := 'day';
    END CASE;

    RETURN QUERY
    WITH booking_stats AS (
        SELECT 
            TO_CHAR(DATE_TRUNC(v_group_trunc, b.created_at::date), v_group_format) as period,
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE b.status = 'completed') as completed_count,
            COUNT(*) FILTER (WHERE b.status = 'cancelled') as cancelled_count,
            SUM(b.total_price_pence) FILTER (WHERE b.status = 'completed') as revenue,
            AVG(b.total_price_pence) FILTER (WHERE b.status = 'completed') as avg_value
        FROM bookings b
        WHERE b.created_at::date BETWEEN p_date_start AND p_date_end
        GROUP BY DATE_TRUNC(v_group_trunc, b.created_at::date)
    ),
    capacity_stats AS (
        SELECT 
            TO_CHAR(DATE_TRUNC(v_group_trunc, sl.slot_date), v_group_format) as period,
            SUM(sl.max_bookings) as total_capacity,
            SUM(sl.current_bookings) as used_capacity
        FROM available_slots sl
        WHERE sl.slot_date BETWEEN p_date_start AND p_date_end
        GROUP BY DATE_TRUNC(v_group_trunc, sl.slot_date)
    ),
    service_stats AS (
        SELECT 
            TO_CHAR(DATE_TRUNC(v_group_trunc, b.created_at::date), v_group_format) as period,
            s.name as service_name,
            COUNT(*) as service_count,
            ROW_NUMBER() OVER (PARTITION BY TO_CHAR(DATE_TRUNC(v_group_trunc, b.created_at::date), v_group_format) ORDER BY COUNT(*) DESC) as rank
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE b.created_at::date BETWEEN p_date_start AND p_date_end
        AND b.status IN ('completed', 'confirmed', 'in_progress')
        GROUP BY DATE_TRUNC(v_group_trunc, b.created_at::date), s.name
    )
    SELECT 
        bs.period,
        COALESCE(bs.total_count, 0)::INTEGER,
        COALESCE(bs.completed_count, 0)::INTEGER,
        COALESCE(bs.cancelled_count, 0)::INTEGER,
        COALESCE(bs.revenue, 0)::INTEGER,
        COALESCE(bs.avg_value, 0)::INTEGER,
        CASE 
            WHEN cs.total_capacity > 0 THEN 
                ROUND((cs.used_capacity::NUMERIC / cs.total_capacity::NUMERIC) * 100, 2)
            ELSE 0
        END as utilization,
        CASE 
            WHEN ss.service_name IS NOT NULL THEN
                jsonb_build_object(
                    'name', ss.service_name,
                    'bookings', ss.service_count
                )
            ELSE '{}'::jsonb
        END as top_service,
        jsonb_build_object(
            'new_customers', 0, -- TODO: Calculate new vs returning customers
            'repeat_rate', 0
        ) as customer_insights
    FROM booking_stats bs
    LEFT JOIN capacity_stats cs ON bs.period = cs.period
    LEFT JOIN service_stats ss ON bs.period = ss.period AND ss.rank = 1
    ORDER BY bs.period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get revenue dashboard data
CREATE OR REPLACE FUNCTION get_revenue_dashboard(
    p_period TEXT DEFAULT 'month'
) RETURNS TABLE (
    period_label TEXT,
    total_revenue_pence INTEGER,
    booking_count INTEGER,
    average_booking_value_pence INTEGER,
    revenue_growth_percent NUMERIC,
    top_performing_service JSONB,
    revenue_by_vehicle_size JSONB,
    monthly_trend JSONB
) AS $$
DECLARE
    v_current_start DATE;
    v_current_end DATE;
    v_previous_start DATE;
    v_previous_end DATE;
BEGIN
    -- Set date ranges based on period
    CASE p_period
        WHEN 'week' THEN
            v_current_start := DATE_TRUNC('week', CURRENT_DATE);
            v_current_end := v_current_start + INTERVAL '6 days';
            v_previous_start := v_current_start - INTERVAL '7 days';
            v_previous_end := v_current_start - INTERVAL '1 day';
        WHEN 'month' THEN
            v_current_start := DATE_TRUNC('month', CURRENT_DATE);
            v_current_end := v_current_start + INTERVAL '1 month' - INTERVAL '1 day';
            v_previous_start := v_current_start - INTERVAL '1 month';
            v_previous_end := v_current_start - INTERVAL '1 day';
        WHEN 'year' THEN
            v_current_start := DATE_TRUNC('year', CURRENT_DATE);
            v_current_end := v_current_start + INTERVAL '1 year' - INTERVAL '1 day';
            v_previous_start := v_current_start - INTERVAL '1 year';
            v_previous_end := v_current_start - INTERVAL '1 day';
        ELSE
            v_current_start := DATE_TRUNC('month', CURRENT_DATE);
            v_current_end := v_current_start + INTERVAL '1 month' - INTERVAL '1 day';
            v_previous_start := v_current_start - INTERVAL '1 month';
            v_previous_end := v_current_start - INTERVAL '1 day';
    END CASE;

    RETURN QUERY
    WITH current_period AS (
        SELECT 
            COUNT(*) as booking_count,
            SUM(total_price_pence) as total_revenue,
            AVG(total_price_pence) as avg_value
        FROM bookings
        WHERE status = 'completed'
        AND completed_at::date BETWEEN v_current_start AND v_current_end
    ),
    previous_period AS (
        SELECT 
            SUM(total_price_pence) as prev_revenue
        FROM bookings
        WHERE status = 'completed'
        AND completed_at::date BETWEEN v_previous_start AND v_previous_end
    ),
    top_service AS (
        SELECT 
            s.name,
            COUNT(*) as service_bookings,
            SUM(b.total_price_pence) as service_revenue
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE b.status = 'completed'
        AND b.completed_at::date BETWEEN v_current_start AND v_current_end
        GROUP BY s.name
        ORDER BY service_revenue DESC
        LIMIT 1
    ),
    vehicle_size_revenue AS (
        SELECT 
            jsonb_object_agg(
                v.size,
                revenue_data
            ) as size_breakdown
        FROM (
            SELECT 
                v.size,
                jsonb_build_object(
                    'count', COUNT(*),
                    'revenue_pence', SUM(b.total_price_pence)
                ) as revenue_data
            FROM bookings b
            JOIN vehicles v ON b.vehicle_id = v.id
            WHERE b.status = 'completed'
            AND b.completed_at::date BETWEEN v_current_start AND v_current_end
            GROUP BY v.size
        ) v
    )
    SELECT 
        TO_CHAR(v_current_start, 'YYYY-MM-DD') || ' to ' || TO_CHAR(v_current_end, 'YYYY-MM-DD'),
        COALESCE(cp.total_revenue, 0)::INTEGER,
        COALESCE(cp.booking_count, 0)::INTEGER,
        COALESCE(cp.avg_value, 0)::INTEGER,
        CASE 
            WHEN pp.prev_revenue > 0 THEN
                ROUND(((cp.total_revenue - pp.prev_revenue)::NUMERIC / pp.prev_revenue::NUMERIC) * 100, 2)
            ELSE 0
        END as growth,
        CASE 
            WHEN ts.name IS NOT NULL THEN
                jsonb_build_object(
                    'name', ts.name,
                    'bookings', ts.service_bookings,
                    'revenue_pence', ts.service_revenue
                )
            ELSE '{}'::jsonb
        END as top_service,
        COALESCE(vsr.size_breakdown, '{}'::jsonb),
        '[]'::jsonb as monthly_trend -- TODO: Implement 12-month trend
    FROM current_period cp
    CROSS JOIN previous_period pp
    LEFT JOIN top_service ts ON TRUE
    LEFT JOIN vehicle_size_revenue vsr ON TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get operational metrics
CREATE OR REPLACE FUNCTION get_operational_metrics()
RETURNS TABLE (
    total_customers INTEGER,
    active_bookings INTEGER,
    completion_rate NUMERIC,
    average_service_duration INTEGER,
    capacity_utilization JSONB,
    customer_satisfaction JSONB,
    staff_efficiency JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH metrics AS (
        SELECT 
            COUNT(DISTINCT u.id) as customer_count,
            COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'in_progress')) as active_count,
            COUNT(*) FILTER (WHERE b.status = 'completed') as completed_count,
            COUNT(*) FILTER (WHERE b.status != 'cancelled') as total_non_cancelled,
            AVG(EXTRACT(EPOCH FROM (b.completed_at - b.started_at))/60) FILTER (WHERE b.status = 'completed') as avg_duration
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.created_at >= CURRENT_DATE - INTERVAL '30 days'
    ),
    capacity_data AS (
        SELECT 
            SUM(max_bookings) as total_capacity,
            SUM(current_bookings) as used_capacity
        FROM available_slots
        WHERE slot_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    )
    SELECT 
        m.customer_count::INTEGER,
        m.active_count::INTEGER,
        CASE 
            WHEN m.total_non_cancelled > 0 THEN
                ROUND((m.completed_count::NUMERIC / m.total_non_cancelled::NUMERIC) * 100, 2)
            ELSE 0
        END as completion_rate,
        COALESCE(m.avg_duration, 0)::INTEGER,
        jsonb_build_object(
            'total_capacity', cd.total_capacity,
            'used_capacity', cd.used_capacity,
            'utilization_percent', 
            CASE 
                WHEN cd.total_capacity > 0 THEN
                    ROUND((cd.used_capacity::NUMERIC / cd.total_capacity::NUMERIC) * 100, 2)
                ELSE 0
            END
        ) as capacity_info,
        jsonb_build_object(
            'satisfaction_score', 4.5,
            'reviews_count', 0
        ) as satisfaction_info, -- TODO: Implement when reviews system exists
        jsonb_build_object(
            'average_bookings_per_day', 0,
            'efficiency_score', 85
        ) as efficiency_info -- TODO: Implement staff tracking
    FROM metrics m
    CROSS JOIN capacity_data cd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_schedule_availability TO authenticated;
GRANT EXECUTE ON FUNCTION manage_working_hours TO authenticated;
GRANT EXECUTE ON FUNCTION get_booking_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_operational_metrics TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION update_schedule_availability IS 'Updates schedule availability from templates with date-specific overrides';
COMMENT ON FUNCTION manage_working_hours IS 'Configures working hours for specific days with time slot management';
COMMENT ON FUNCTION get_booking_analytics IS 'Returns comprehensive booking analytics with grouping options';
COMMENT ON FUNCTION get_revenue_dashboard IS 'Returns revenue dashboard data with growth analysis';
COMMENT ON FUNCTION get_operational_metrics IS 'Returns operational metrics including capacity and efficiency data';