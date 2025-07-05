# Production Database Fixes for Vercel Deployment

Execute these SQL scripts in your **Supabase SQL Editor** in order. Comment at the end of each script if you get errors.

## Script 1: Check Current Database State

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('daily_availability', 'weekly_schedule_template', 'time_slots');

-- Check if functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('generate_week_slots', 'check_slot_availability', 'create_anonymous_booking'); -- check_slot_availability, check_slot_availability 

-- Check time_slots table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'time_slots'
AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Comment any errors here:**


---

## Script 2: Create daily_availability Table

```sql
-- Create daily_availability table if it doesn't exist
CREATE TABLE IF NOT EXISTS daily_availability (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    available_slots INTEGER NOT NULL DEFAULT 5,
    working_day BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE daily_availability ENABLE ROW LEVEL SECURITY;
```

**Comment any errors here:**


---

## Script 3: Create weekly_schedule_template Table

```sql
-- Create weekly_schedule_template table if it doesn't exist
CREATE TABLE IF NOT EXISTS weekly_schedule_template (
    id SERIAL PRIMARY KEY,
    day_of_week INTEGER NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6),
    working_day BOOLEAN NOT NULL DEFAULT true,
    max_slots INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE weekly_schedule_template ENABLE ROW LEVEL SECURITY;
```

**Comment any errors here:**


---

## Script 4: Fix time_slots Table Schema

```sql
-- Fix time_slots table schema
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

-- Fix time_slots table schema = ERROR:  2BP01: cannot drop column is_booked of table time_slots because other objects depend on it
DETAIL:  materialized view calendar_availability_view depends on column is_booked of table time_slots
HINT:  Use DROP ... CASCADE to drop the dependent objects too.

---

## Script 5: Create generate_week_slots Function

```sql
-- Create the generate_week_slots function
CREATE OR REPLACE FUNCTION generate_week_slots(start_date DATE)
RETURNS TABLE(date DATE, slots_generated INTEGER, message TEXT) AS $$
DECLARE
    current_date DATE;
    day_of_week INTEGER;
    is_working_day BOOLEAN;
    max_slots INTEGER;
    slot_count INTEGER;
    slot_time TEXT;
BEGIN
    current_date := start_date;
    
    FOR i IN 0..6 LOOP
        day_of_week := EXTRACT(DOW FROM current_date);
        
        -- Get weekly template for this day
        SELECT working_day, max_slots INTO is_working_day, max_slots
        FROM weekly_schedule_template 
        WHERE day_of_week = EXTRACT(DOW FROM current_date);
        
        -- Default to working day with 5 slots if no template
        IF NOT FOUND THEN
            is_working_day := CASE WHEN day_of_week IN (1,2,3,4,5) THEN true ELSE false END;
            max_slots := 5;
        END IF;
        
        -- Insert or update daily availability
        INSERT INTO daily_availability (date, available_slots, working_day)
        VALUES (current_date, max_slots, is_working_day)
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
                VALUES (current_date, slot_time, slot_num, true, NOW())
                ON CONFLICT (slot_date, slot_number) DO NOTHING;
                
                slot_count := slot_count + 1;
            END LOOP;
        END IF;
        
        RETURN QUERY SELECT current_date, slot_count, 
                     CASE WHEN is_working_day 
                          THEN slot_count || ' slots generated' 
                          ELSE 'Non-working day' 
                     END;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Comment any errors here:**
ERROR:  42601: syntax error at or near "current_date"
LINE 11:     current_date := start_date;
             ^

---

## Script 6: Create check_slot_availability Function

```sql
-- Create check_slot_availability function
CREATE OR REPLACE FUNCTION check_slot_availability(check_date DATE, check_slot_number INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    slot_available BOOLEAN;
BEGIN
    -- Check if slot exists and is available
    SELECT is_available INTO slot_available
    FROM time_slots 
    WHERE slot_date = check_date 
    AND slot_number = check_slot_number;
    
    RETURN COALESCE(slot_available, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Comment any errors here:**


---

## Script 7: Create/Update create_anonymous_booking Function

```sql
-- Create or update create_anonymous_booking function
CREATE OR REPLACE FUNCTION create_anonymous_booking(
    p_full_name text,
    p_email text,
    p_phone text,
    p_time_slot_id uuid,
    p_vehicle_id uuid,
    p_service_type text,
    p_total_amount numeric
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id uuid;
    v_booking_reference text;
    v_user_id uuid;
    v_time_slot record;
BEGIN
    -- Validate time slot availability
    SELECT * INTO v_time_slot
    FROM time_slots 
    WHERE id = p_time_slot_id 
    AND is_available = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Time slot is not available');
    END IF;

    -- Generate booking reference
    v_booking_reference := 'L4D' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                          LPAD((EXTRACT(EPOCH FROM NOW())::bigint % 10000)::text, 4, '0');

    -- Check if user exists
    SELECT id INTO v_user_id FROM users WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        -- Create anonymous user
        INSERT INTO users (email, full_name, phone, role, created_at, updated_at)
        VALUES (p_email, p_full_name, p_phone, 'customer', NOW(), NOW())
        RETURNING id INTO v_user_id;
    END IF;

    -- Create booking
    INSERT INTO bookings (
        user_id,
        time_slot_id,
        vehicle_id,
        service_type,
        status,
        total_amount,
        booking_reference,
        customer_name,
        email,
        phone,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        p_time_slot_id,
        p_vehicle_id,
        p_service_type,
        'confirmed',
        p_total_amount,
        v_booking_reference,
        p_full_name,
        p_email,
        p_phone,
        NOW(),
        NOW()
    ) RETURNING id INTO v_booking_id;

    -- Mark time slot as unavailable
    UPDATE time_slots 
    SET is_available = false 
    WHERE id = p_time_slot_id;

    RETURN json_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'booking_reference', v_booking_reference,
        'user_id', v_user_id
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', 'Failed to create booking: ' || SQLERRM);
END;
$$;
```

**Comment any errors here:**


---

## Script 8: Drop Existing RLS Policies

```sql
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can read daily_availability" ON daily_availability;
DROP POLICY IF EXISTS "Admins can modify daily_availability" ON daily_availability;
DROP POLICY IF EXISTS "Admins can read weekly_schedule_template" ON weekly_schedule_template;
DROP POLICY IF EXISTS "Admins can modify weekly_schedule_template" ON weekly_schedule_template;
DROP POLICY IF EXISTS "Users can view available time slots" ON time_slots;
DROP POLICY IF EXISTS "Service role can manage all time slots" ON time_slots;
DROP POLICY IF EXISTS "Admins can view all time slots" ON time_slots;
```

**Comment any errors here:**


---

## Script 9: Create RLS Policies for daily_availability

```sql
-- Create RLS policies for daily_availability
CREATE POLICY "Service role and admins can read daily_availability" ON daily_availability
    FOR SELECT
    USING (
        current_setting('role') = 'service_role'
        OR
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM auth.users au 
                WHERE au.id = auth.uid() 
                AND au.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

CREATE POLICY "Service role and admins can modify daily_availability" ON daily_availability
    FOR ALL
    USING (
        current_setting('role') = 'service_role'
        OR
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM auth.users au 
                WHERE au.id = auth.uid() 
                AND au.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );
```

**Comment any errors here:**

both already exist
---

## Script 10: Create RLS Policies for weekly_schedule_template

```sql
-- Create RLS policies for weekly_schedule_template
CREATE POLICY "Service role and admins can read weekly_schedule_template" ON weekly_schedule_template
    FOR SELECT
    USING (
        current_setting('role') = 'service_role'
        OR
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM auth.users au 
                WHERE au.id = auth.uid() 
                AND au.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

CREATE POLICY "Service role and admins can modify weekly_schedule_template" ON weekly_schedule_template
    FOR ALL
    USING (
        current_setting('role') = 'service_role'
        OR
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM auth.users au 
                WHERE au.id = auth.uid() 
                AND au.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );
```

**Comment any errors here:**

both already exist
---

## Script 11: Create RLS Policies for time_slots

```sql
-- Create RLS policies for time_slots
CREATE POLICY "Users can view available time slots" ON time_slots
    FOR SELECT
    USING (is_available = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage all time slots" ON time_slots
    FOR ALL
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can view all time slots" ON time_slots
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users au 
            WHERE au.id = auth.uid() 
            AND au.raw_user_meta_data->>'role' = 'admin'
        )
    );
```

**Comment any errors here:**


---

## Script 12: Grant Function Permissions

```sql
-- Grant function permissions
GRANT EXECUTE ON FUNCTION generate_week_slots(date) TO service_role;
GRANT EXECUTE ON FUNCTION check_slot_availability(date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION create_anonymous_booking(text, text, text, uuid, uuid, text, numeric) TO anon;
GRANT EXECUTE ON FUNCTION create_anonymous_booking(text, text, text, uuid, uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION create_anonymous_booking(text, text, text, uuid, uuid, text, numeric) TO service_role;
```

**Comment any errors here:**
ERROR:  42883: function generate_week_slots(date) does not exist

---

## Script 13: Grant Table Permissions

```sql
-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_availability TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON weekly_schedule_template TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON time_slots TO service_role;
```

**Comment any errors here:**


---

## Script 14: Insert Default Weekly Schedule Template

```sql
-- Insert default weekly schedule template
INSERT INTO weekly_schedule_template (day_of_week, working_day, max_slots) VALUES
(0, false, 0), -- Sunday
(1, true, 5),  -- Monday
(2, true, 5),  -- Tuesday
(3, true, 5),  -- Wednesday
(4, true, 5),  -- Thursday
(5, true, 5),  -- Friday
(6, false, 0)  -- Saturday
ON CONFLICT (day_of_week) DO UPDATE SET
    working_day = EXCLUDED.working_day,
    max_slots = EXCLUDED.max_slots,
    updated_at = NOW();
```

**Comment any errors here:**


---

## Final Test Script

```sql
-- Test that everything is working
SELECT 'daily_availability table' as test, count(*) as records FROM daily_availability
UNION ALL
SELECT 'weekly_schedule_template table' as test, count(*) as records FROM weekly_schedule_template
UNION ALL
SELECT 'time_slots with is_available' as test, count(*) as records FROM time_slots WHERE is_available IS NOT NULL;

-- Test function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('generate_week_slots', 'check_slot_availability', 'create_anonymous_booking')
AND routine_schema = 'public';
```

**Comment any errors here:**


---

**Instructions:**
1. Run each script in order
2. If you get an error, copy the error message and add it as a comment after the script
3. Continue with the next script even if one fails
4. After running all scripts, let me know which ones had errors so I can fix them