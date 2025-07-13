-- Simplified Schedule Management System
-- Based on schedule.md requirements for easy slot management

-- ===== SIMPLE SLOT MANAGEMENT PROCEDURES =====

-- Add individual booking slot (like adding a calendar event)
CREATE OR REPLACE FUNCTION add_booking_slot(
    p_slot_date DATE,
    p_start_time TIME,
    p_duration_minutes INTEGER DEFAULT 120,
    p_max_bookings INTEGER DEFAULT 1
) RETURNS TABLE (
    slot_id UUID,
    slot_date DATE,
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_slot_id UUID;
    v_end_time TIME;
    v_conflict_count INTEGER;
BEGIN
    -- Calculate end time
    v_end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Check for conflicts (overlapping slots on same date)
    SELECT COUNT(*) INTO v_conflict_count
    FROM available_slots
    WHERE slot_date = p_slot_date
    AND (
        (p_start_time >= start_time AND p_start_time < end_time) OR
        (v_end_time > start_time AND v_end_time <= end_time) OR
        (p_start_time <= start_time AND v_end_time >= end_time)
    );
    
    IF v_conflict_count > 0 THEN
        RETURN QUERY SELECT 
            NULL::UUID, p_slot_date, p_start_time, v_end_time, p_duration_minutes,
            FALSE, 'Time slot conflicts with existing booking slot'::TEXT;
        RETURN;
    END IF;
    
    -- Create the slot
    INSERT INTO available_slots (
        slot_date,
        start_time,
        end_time,
        max_bookings,
        current_bookings,
        is_blocked
    ) VALUES (
        p_slot_date,
        p_start_time,
        v_end_time,
        p_max_bookings,
        0,
        FALSE
    ) RETURNING id INTO v_slot_id;
    
    RETURN QUERY SELECT 
        v_slot_id, p_slot_date, p_start_time, v_end_time, p_duration_minutes,
        TRUE, 'Booking slot created successfully'::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            NULL::UUID, p_slot_date, p_start_time, v_end_time, p_duration_minutes,
            FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Edit existing booking slot
CREATE OR REPLACE FUNCTION edit_booking_slot(
    p_slot_id UUID,
    p_start_time TIME DEFAULT NULL,
    p_duration_minutes INTEGER DEFAULT NULL,
    p_max_bookings INTEGER DEFAULT NULL
) RETURNS TABLE (
    slot_id UUID,
    slot_date DATE,
    start_time TIME,
    end_time TIME,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_slot RECORD;
    v_new_start_time TIME;
    v_new_end_time TIME;
    v_new_max_bookings INTEGER;
    v_conflict_count INTEGER;
BEGIN
    -- Get existing slot
    SELECT * INTO v_slot FROM available_slots WHERE id = p_slot_id;
    
    IF v_slot.id IS NULL THEN
        RETURN QUERY SELECT 
            p_slot_id, NULL::DATE, NULL::TIME, NULL::TIME,
            FALSE, 'Booking slot not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if slot has bookings and we're changing time
    IF v_slot.current_bookings > 0 AND (p_start_time IS NOT NULL OR p_duration_minutes IS NOT NULL) THEN
        RETURN QUERY SELECT 
            p_slot_id, v_slot.slot_date, v_slot.start_time, v_slot.end_time,
            FALSE, 'Cannot change time of slot with existing bookings'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate new values
    v_new_start_time := COALESCE(p_start_time, v_slot.start_time);
    v_new_end_time := CASE 
        WHEN p_duration_minutes IS NOT NULL THEN 
            v_new_start_time + (p_duration_minutes || ' minutes')::INTERVAL
        WHEN p_start_time IS NOT NULL THEN
            p_start_time + (EXTRACT(EPOCH FROM (v_slot.end_time - v_slot.start_time))/60)::INTEGER * INTERVAL '1 minute'
        ELSE v_slot.end_time
    END;
    v_new_max_bookings := COALESCE(p_max_bookings, v_slot.max_bookings);
    
    -- Check for conflicts if time is changing
    IF p_start_time IS NOT NULL OR p_duration_minutes IS NOT NULL THEN
        SELECT COUNT(*) INTO v_conflict_count
        FROM available_slots
        WHERE slot_date = v_slot.slot_date
        AND id != p_slot_id
        AND (
            (v_new_start_time >= start_time AND v_new_start_time < end_time) OR
            (v_new_end_time > start_time AND v_new_end_time <= end_time) OR
            (v_new_start_time <= start_time AND v_new_end_time >= end_time)
        );
        
        IF v_conflict_count > 0 THEN
            RETURN QUERY SELECT 
                p_slot_id, v_slot.slot_date, v_slot.start_time, v_slot.end_time,
                FALSE, 'New time conflicts with existing booking slot'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Update the slot
    UPDATE available_slots
    SET 
        start_time = v_new_start_time,
        end_time = v_new_end_time,
        max_bookings = v_new_max_bookings,
        updated_at = NOW()
    WHERE id = p_slot_id;
    
    RETURN QUERY SELECT 
        p_slot_id, v_slot.slot_date, v_new_start_time, v_new_end_time,
        TRUE, 'Booking slot updated successfully'::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            p_slot_id, NULL::DATE, NULL::TIME, NULL::TIME,
            FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete booking slot
CREATE OR REPLACE FUNCTION delete_booking_slot(
    p_slot_id UUID
) RETURNS TABLE (
    slot_id UUID,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_current_bookings INTEGER;
BEGIN
    -- Check if slot has bookings
    SELECT current_bookings INTO v_current_bookings
    FROM available_slots
    WHERE id = p_slot_id;
    
    IF v_current_bookings IS NULL THEN
        RETURN QUERY SELECT p_slot_id, FALSE, 'Booking slot not found'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_bookings > 0 THEN
        RETURN QUERY SELECT p_slot_id, FALSE, 'Cannot delete slot with existing bookings'::TEXT;
        RETURN;
    END IF;
    
    -- Delete the slot
    DELETE FROM available_slots WHERE id = p_slot_id;
    
    RETURN QUERY SELECT p_slot_id, TRUE, 'Booking slot deleted successfully'::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT p_slot_id, FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get slots for a specific day (for day view)
CREATE OR REPLACE FUNCTION get_day_slots(
    p_date DATE
) RETURNS TABLE (
    slot_id UUID,
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER,
    max_bookings INTEGER,
    current_bookings INTEGER,
    is_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.start_time,
        s.end_time,
        EXTRACT(EPOCH FROM (s.end_time - s.start_time))::INTEGER / 60 as duration_minutes,
        s.max_bookings,
        s.current_bookings,
        (s.current_bookings < s.max_bookings AND NOT s.is_blocked) as is_available
    FROM available_slots s
    WHERE s.slot_date = p_date
    ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get week overview (for week view)
CREATE OR REPLACE FUNCTION get_week_overview(
    p_week_start DATE
) RETURNS TABLE (
    day_date DATE,
    day_name TEXT,
    is_working_day BOOLEAN,
    total_slots INTEGER,
    available_slots INTEGER,
    booked_slots INTEGER
) AS $$
DECLARE
    v_date DATE;
    v_day_name TEXT;
    v_total INTEGER;
    v_available INTEGER;
    v_booked INTEGER;
BEGIN
    -- Loop through 7 days starting from week_start
    FOR i IN 0..6 LOOP
        v_date := p_week_start + i;
        v_day_name := TO_CHAR(v_date, 'Day');
        
        -- Get slot statistics for this day
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE current_bookings < max_bookings AND NOT is_blocked),
            COUNT(*) FILTER (WHERE current_bookings > 0)
        INTO v_total, v_available, v_booked
        FROM available_slots
        WHERE slot_date = v_date;
        
        RETURN QUERY SELECT 
            v_date,
            TRIM(v_day_name),
            (v_total > 0) as is_working_day,
            COALESCE(v_total, 0),
            COALESCE(v_available, 0),
            COALESCE(v_booked, 0);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Copy slots from one day to another (or multiple days)
CREATE OR REPLACE FUNCTION copy_slots_to_days(
    p_source_date DATE,
    p_target_dates DATE[]
) RETURNS TABLE (
    target_date DATE,
    slots_copied INTEGER,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_target_date DATE;
    v_source_slot RECORD;
    v_slots_copied INTEGER;
    v_conflict_count INTEGER;
BEGIN
    -- Loop through target dates
    FOREACH v_target_date IN ARRAY p_target_dates LOOP
        v_slots_copied := 0;
        
        -- Check if target date already has slots
        SELECT COUNT(*) INTO v_conflict_count
        FROM available_slots
        WHERE slot_date = v_target_date;
        
        IF v_conflict_count > 0 THEN
            RETURN QUERY SELECT 
                v_target_date, 0, FALSE, 
                'Target date already has slots. Delete existing slots first.'::TEXT;
            CONTINUE;
        END IF;
        
        -- Copy each slot from source date
        FOR v_source_slot IN 
            SELECT start_time, end_time, max_bookings
            FROM available_slots
            WHERE slot_date = p_source_date
            ORDER BY start_time
        LOOP
            INSERT INTO available_slots (
                slot_date,
                start_time,
                end_time,
                max_bookings,
                current_bookings,
                is_blocked
            ) VALUES (
                v_target_date,
                v_source_slot.start_time,
                v_source_slot.end_time,
                v_source_slot.max_bookings,
                0,
                FALSE
            );
            
            v_slots_copied := v_slots_copied + 1;
        END LOOP;
        
        RETURN QUERY SELECT 
            v_target_date, v_slots_copied, TRUE,
            format('Copied %s slots to %s', v_slots_copied, v_target_date)::TEXT;
    END LOOP;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            v_target_date, 0, FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle working day (enable/disable all slots for a day)
CREATE OR REPLACE FUNCTION toggle_working_day(
    p_date DATE,
    p_is_working BOOLEAN
) RETURNS TABLE (
    day_date DATE,
    is_working BOOLEAN,
    slots_affected INTEGER,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_slots_affected INTEGER;
BEGIN
    IF p_is_working THEN
        -- Enable day - unblock all slots
        UPDATE available_slots
        SET is_blocked = FALSE, block_reason = NULL, updated_at = NOW()
        WHERE slot_date = p_date;
        
        GET DIAGNOSTICS v_slots_affected = ROW_COUNT;
        
        RETURN QUERY SELECT 
            p_date, TRUE, v_slots_affected, TRUE,
            format('Enabled %s slots for %s', v_slots_affected, p_date)::TEXT;
    ELSE
        -- Disable day - block all slots (but don't delete)
        UPDATE available_slots
        SET is_blocked = TRUE, block_reason = 'Day closed', updated_at = NOW()
        WHERE slot_date = p_date;
        
        GET DIAGNOSTICS v_slots_affected = ROW_COUNT;
        
        RETURN QUERY SELECT 
            p_date, FALSE, v_slots_affected, TRUE,
            format('Disabled %s slots for %s', v_slots_affected, p_date)::TEXT;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            p_date, p_is_working, 0, FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for all new functions
GRANT EXECUTE ON FUNCTION add_booking_slot(DATE, TIME, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION add_booking_slot(DATE, TIME, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION edit_booking_slot(UUID, TIME, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION edit_booking_slot(UUID, TIME, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION delete_booking_slot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_booking_slot(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_day_slots(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_day_slots(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION get_week_overview(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_week_overview(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION copy_slots_to_days(DATE, DATE[]) TO authenticated;
GRANT EXECUTE ON FUNCTION copy_slots_to_days(DATE, DATE[]) TO service_role;
GRANT EXECUTE ON FUNCTION toggle_working_day(DATE, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_working_day(DATE, BOOLEAN) TO service_role;
