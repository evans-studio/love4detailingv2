-- Fix ambiguous column reference in add_booking_slot procedure

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
    FROM available_slots a
    WHERE a.slot_date = p_slot_date
    AND (
        (p_start_time >= a.start_time AND p_start_time < a.end_time) OR
        (v_end_time > a.start_time AND v_end_time <= a.end_time) OR
        (p_start_time <= a.start_time AND v_end_time >= a.end_time)
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
