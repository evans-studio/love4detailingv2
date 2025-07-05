# Production Database Fixes - CORRECTED VERSION

Based on the errors from the first run, here are the corrected scripts. Only run the ones that had errors.

## Fix 1: Drop Materialized View and Fix time_slots Schema

```sql
-- First drop the materialized view that depends on is_booked
DROP MATERIALIZED VIEW IF EXISTS calendar_availability_view CASCADE;

-- Now we can safely drop the is_booked column
ALTER TABLE time_slots DROP COLUMN IF EXISTS is_booked;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Update existing records
UPDATE time_slots 
SET is_available = false 
WHERE id IN (
    SELECT ts.id 
    FROM time_slots ts
    INNER JOIN bookings b ON b.time_slot_id = ts.id
    WHERE b.status IN ('confirmed', 'completed')
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_time_slots_availability 
ON time_slots(slot_date, is_available) 
WHERE is_available = true;
```

**Comment any errors here:**


---

## Fix 2: Corrected generate_week_slots Function

```sql
-- Create the generate_week_slots function (fixed variable naming)
CREATE OR REPLACE FUNCTION generate_week_slots(start_date DATE)
RETURNS TABLE(date DATE, slots_generated INTEGER, message TEXT) AS $$
DECLARE
    work_date DATE;
    day_of_week INTEGER;
    is_working_day BOOLEAN;
    max_slots INTEGER;
    slot_count INTEGER;
    slot_time TEXT;
BEGIN
    work_date := start_date;
    
    FOR i IN 0..6 LOOP
        day_of_week := EXTRACT(DOW FROM work_date);
        
        -- Get weekly template for this day
        SELECT working_day, max_slots INTO is_working_day, max_slots
        FROM weekly_schedule_template 
        WHERE day_of_week = EXTRACT(DOW FROM work_date);
        
        -- Default to working day with 5 slots if no template
        IF NOT FOUND THEN
            is_working_day := CASE WHEN day_of_week IN (1,2,3,4,5) THEN true ELSE false END;
            max_slots := 5;
        END IF;
        
        -- Insert or update daily availability
        INSERT INTO daily_availability (date, available_slots, working_day)
        VALUES (work_date, max_slots, is_working_day)
        ON CONFLICT (date) DO UPDATE SET
            available_slots = EXCLUDED.available_slots,
            working_day = EXCLUDED.working_day,
            updated_at = NOW();
        
        slot_count := 0;
        
        IF is_working_day THEN
            -- Generate time slots (10:00, 12:00, 14:00, 16:00, 18:00)
            FOR slot_num IN 1..max_slots LOOP
                slot_time := CASE slot_num
                    WHEN 1 THEN '10:00'
                    WHEN 2 THEN '12:00'
                    WHEN 3 THEN '14:00'
                    WHEN 4 THEN '16:00'
                    WHEN 5 THEN '18:00'
                    ELSE '10:00'
                END;
                
                INSERT INTO time_slots (slot_date, slot_time, slot_number, is_available, created_at)
                VALUES (work_date, slot_time, slot_num, true, NOW())
                ON CONFLICT (slot_date, slot_number) DO NOTHING;
                
                slot_count := slot_count + 1;
            END LOOP;
        END IF;
        
        RETURN QUERY SELECT work_date, slot_count, 
                     CASE WHEN is_working_day 
                          THEN slot_count || ' slots generated' 
                          ELSE 'Non-working day' 
                     END;
        
        work_date := work_date + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Comment any errors here:**


---

## Fix 3: Grant Permissions for Corrected Functions

```sql
-- Grant function permissions (only for functions that exist)
GRANT EXECUTE ON FUNCTION check_slot_availability(date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION create_anonymous_booking(text, text, text, uuid, uuid, text, numeric) TO anon;
GRANT EXECUTE ON FUNCTION create_anonymous_booking(text, text, text, uuid, uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION create_anonymous_booking(text, text, text, uuid, uuid, text, numeric) TO service_role;

-- Grant permission for generate_week_slots if it was created successfully above
GRANT EXECUTE ON FUNCTION generate_week_slots(date) TO service_role;
```

**Comment any errors here:**


---

## Fix 4: Recreate Materialized View (if needed)

```sql
-- Only run this if you had a materialized view before that we dropped
-- Recreate the materialized view using is_available instead of is_booked
CREATE MATERIALIZED VIEW IF NOT EXISTS calendar_availability_view AS
SELECT 
    ts.slot_date,
    ts.slot_time,
    ts.slot_number,
    ts.is_available,
    COUNT(b.id) as booking_count,
    da.working_day,
    da.available_slots
FROM time_slots ts
LEFT JOIN bookings b ON ts.id = b.time_slot_id AND b.status IN ('confirmed', 'completed')
LEFT JOIN daily_availability da ON ts.slot_date = da.date
GROUP BY ts.slot_date, ts.slot_time, ts.slot_number, ts.is_available, da.working_day, da.available_slots
ORDER BY ts.slot_date, ts.slot_number;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_calendar_availability_date 
ON calendar_availability_view(slot_date);

-- Grant permissions on the materialized view
GRANT SELECT ON calendar_availability_view TO service_role;
GRANT SELECT ON calendar_availability_view TO authenticated;
```

**Comment any errors here:**


---

## Final Verification Script

```sql
-- Verify everything is working
SELECT 'Functions created' as status, count(*) as count
FROM information_schema.routines 
WHERE routine_name IN ('generate_week_slots', 'check_slot_availability', 'create_anonymous_booking')
AND routine_schema = 'public'

UNION ALL

SELECT 'time_slots has is_available' as status, count(*) as count
FROM information_schema.columns
WHERE table_name = 'time_slots' 
AND column_name = 'is_available'
AND table_schema = 'public'

UNION ALL

SELECT 'time_slots no longer has is_booked' as status, count(*) as count
FROM information_schema.columns
WHERE table_name = 'time_slots' 
AND column_name = 'is_booked'
AND table_schema = 'public'

UNION ALL

SELECT 'weekly template records' as status, count(*) as count
FROM weekly_schedule_template

UNION ALL

SELECT 'daily availability records' as status, count(*) as count
FROM daily_availability;
```

**Comment any errors here:**

Functions created - 4
time_slots has is_available - 1
time_slots no longer has is_booked - 0
weekly template records - 7
daily availability records - 0
---

## Summary of Issues Fixed:

1. **Materialized View Dependency**: Dropped `calendar_availability_view` that was blocking the `is_booked` column removal
2. **Function Variable Conflict**: Changed `current_date` variable name to `work_date` to avoid PostgreSQL keyword conflict
3. **Function Permissions**: Only granted permissions on functions that actually exist
4. **Recreated Materialized View**: Using `is_available` instead of `is_booked`

Run these corrected scripts in order and let me know if you get any new errors!