-- Fix toggle_working_day function to properly handle working day logic
-- The issue was that the function only blocked/unblocked existing slots
-- but didn't create/delete slots to represent working vs non-working days

-- Create a proper working_days table to track working day status
CREATE TABLE IF NOT EXISTS working_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_date DATE NOT NULL UNIQUE,
    is_working_day BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE working_days ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "working_days_admin_access" ON working_days FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Grant permissions
GRANT ALL ON working_days TO authenticated;
GRANT ALL ON working_days TO service_role;

-- Updated toggle_working_day function
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
    v_existing_slots INTEGER;
BEGIN
    -- Count existing slots for this date
    SELECT COUNT(*) INTO v_existing_slots
    FROM available_slots
    WHERE slot_date = p_date;
    
    -- Insert or update working day record
    INSERT INTO working_days (day_date, is_working_day)
    VALUES (p_date, p_is_working)
    ON CONFLICT (day_date) 
    DO UPDATE SET 
        is_working_day = p_is_working,
        updated_at = NOW();
    
    IF p_is_working THEN
        -- Enable day - unblock all slots
        UPDATE available_slots
        SET is_blocked = FALSE, block_reason = NULL, updated_at = NOW()
        WHERE slot_date = p_date;
        
        GET DIAGNOSTICS v_slots_affected = ROW_COUNT;
        
        -- If no slots exist, create default slots for working day
        IF v_existing_slots = 0 THEN
            -- Create default working day slots (9AM, 11AM, 1PM, 3PM)
            INSERT INTO available_slots (slot_date, start_time, end_time, max_bookings, current_bookings, is_blocked)
            VALUES 
                (p_date, '09:00:00', '11:00:00', 1, 0, FALSE),
                (p_date, '11:00:00', '13:00:00', 1, 0, FALSE),
                (p_date, '13:00:00', '15:00:00', 1, 0, FALSE),
                (p_date, '15:00:00', '17:00:00', 1, 0, FALSE);
            
            v_slots_affected := 4;
        END IF;
        
        RETURN QUERY SELECT 
            p_date, TRUE, v_slots_affected, TRUE,
            format('Enabled working day with %s slots for %s', v_slots_affected, p_date)::TEXT;
    ELSE
        -- Disable day - block all slots (but don't delete them)
        UPDATE available_slots
        SET is_blocked = TRUE, block_reason = 'Day closed', updated_at = NOW()
        WHERE slot_date = p_date;
        
        GET DIAGNOSTICS v_slots_affected = ROW_COUNT;
        
        RETURN QUERY SELECT 
            p_date, FALSE, v_slots_affected, TRUE,
            format('Disabled working day - blocked %s slots for %s', v_slots_affected, p_date)::TEXT;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            p_date, p_is_working, 0, FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated get_week_overview function to use working_days table
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
    v_is_working BOOLEAN;
    v_total INTEGER;
    v_available INTEGER;
    v_booked INTEGER;
BEGIN
    -- Loop through 7 days starting from week_start
    FOR i IN 0..6 LOOP
        v_date := p_week_start + i;
        v_day_name := TO_CHAR(v_date, 'Day');
        
        -- Check if it's a working day (from working_days table or default to having slots)
        SELECT is_working_day INTO v_is_working
        FROM working_days
        WHERE day_date = v_date;
        
        -- If no record in working_days, default based on existing slots
        IF v_is_working IS NULL THEN
            SELECT COUNT(*) > 0 INTO v_is_working
            FROM available_slots
            WHERE slot_date = v_date AND NOT is_blocked;
        END IF;
        
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
            COALESCE(v_is_working, FALSE),
            COALESCE(v_total, 0),
            COALESCE(v_available, 0),
            COALESCE(v_booked, 0);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for updated functions
GRANT EXECUTE ON FUNCTION toggle_working_day(DATE, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_working_day(DATE, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION get_week_overview(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_week_overview(DATE) TO service_role;