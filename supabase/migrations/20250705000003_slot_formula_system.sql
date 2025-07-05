-- Slot Formula System Implementation
-- Working Hours: 10:00-18:00, Max 5 slots/day, 30min travel buffer

-- Drop existing constraints if they exist
ALTER TABLE time_slots DROP CONSTRAINT IF EXISTS time_slots_slot_number_check;

-- Enhance time_slots table with formula constraints
ALTER TABLE time_slots 
ADD COLUMN IF NOT EXISTS slot_number INTEGER,
ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true,
ADD CONSTRAINT time_slots_slot_number_check CHECK (slot_number >= 1 AND slot_number <= 5);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_time_slots_date_slot ON time_slots(slot_date, slot_number);

-- Daily availability configuration
CREATE TABLE IF NOT EXISTS daily_availability (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    available_slots INTEGER DEFAULT 5 CHECK (available_slots >= 0 AND available_slots <= 5),
    working_day BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date)
);

-- Weekly schedule template (for recurring schedules)
CREATE TABLE IF NOT EXISTS weekly_schedule_template (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
    max_slots INTEGER DEFAULT 5 CHECK (max_slots >= 0 AND max_slots <= 5),
    working_day BOOLEAN DEFAULT true,
    start_time TIME DEFAULT '10:00:00',
    end_time TIME DEFAULT '18:00:00',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(day_of_week)
);

-- Insert default weekly template (Monday-Friday working days)
INSERT INTO weekly_schedule_template (day_of_week, working_day, max_slots, start_time, end_time)
VALUES 
    (1, true, 5, '10:00:00', '18:00:00'),  -- Monday
    (2, true, 5, '10:00:00', '18:00:00'),  -- Tuesday
    (3, true, 5, '10:00:00', '18:00:00'),  -- Wednesday
    (4, true, 5, '10:00:00', '18:00:00'),  -- Thursday
    (5, true, 5, '10:00:00', '18:00:00'),  -- Friday
    (6, false, 0, '10:00:00', '18:00:00'), -- Saturday
    (0, false, 0, '10:00:00', '18:00:00')  -- Sunday
ON CONFLICT (day_of_week) DO NOTHING;

-- Update existing time_slots with slot numbers based on time
UPDATE time_slots 
SET slot_number = CASE 
    WHEN slot_time = '10:00:00' THEN 1
    WHEN slot_time = '11:30:00' THEN 2
    WHEN slot_time = '13:00:00' THEN 3
    WHEN slot_time = '14:30:00' THEN 4
    WHEN slot_time = '16:00:00' THEN 5
    ELSE slot_number
END
WHERE slot_number IS NULL;

-- Add RLS policies for new tables
ALTER TABLE daily_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedule_template ENABLE ROW LEVEL SECURITY;

-- Policies for daily_availability
CREATE POLICY "Admin can manage daily availability" ON daily_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policies for weekly_schedule_template  
CREATE POLICY "Admin can manage weekly schedule" ON weekly_schedule_template
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Function to generate slots for a week based on template
CREATE OR REPLACE FUNCTION generate_week_slots(start_date DATE)
RETURNS TABLE(
    generated_date DATE,
    generated_slots INTEGER,
    message TEXT
) AS $$
DECLARE
    current_date DATE;
    day_template RECORD;
    slot_count INTEGER;
    slot_num INTEGER;
    slot_times TIME[] := ARRAY['10:00:00', '11:30:00', '13:00:00', '14:30:00', '16:00:00'];
BEGIN
    -- Loop through 7 days
    FOR i IN 0..6 LOOP
        current_date := start_date + i;
        
        -- Get template for this day of week
        SELECT * INTO day_template 
        FROM weekly_schedule_template 
        WHERE day_of_week = EXTRACT(DOW FROM current_date);
        
        IF day_template.working_day THEN
            -- Insert daily availability record
            INSERT INTO daily_availability (date, available_slots, working_day)
            VALUES (current_date, day_template.max_slots, true)
            ON CONFLICT (date) 
            DO UPDATE SET available_slots = day_template.max_slots, working_day = true;
            
            -- Generate time slots
            FOR slot_num IN 1..day_template.max_slots LOOP
                INSERT INTO time_slots (slot_date, slot_time, slot_number, is_available, buffer_minutes)
                VALUES (current_date, slot_times[slot_num], slot_num, true, 30)
                ON CONFLICT (slot_date, slot_time) DO NOTHING;
            END LOOP;
            
            slot_count := day_template.max_slots;
        ELSE
            -- Non-working day
            INSERT INTO daily_availability (date, available_slots, working_day)
            VALUES (current_date, 0, false)
            ON CONFLICT (date) 
            DO UPDATE SET available_slots = 0, working_day = false;
            
            slot_count := 0;
        END IF;
        
        RETURN QUERY SELECT current_date, slot_count, 
                     CASE WHEN day_template.working_day 
                          THEN 'Generated ' || slot_count || ' slots'
                          ELSE 'Non-working day' 
                     END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check slot availability 
CREATE OR REPLACE FUNCTION check_slot_availability(check_date DATE, check_slot_number INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    is_working_day BOOLEAN;
    max_slots INTEGER;
    existing_booking_count INTEGER;
BEGIN
    -- Check if it's a working day and get max slots
    SELECT working_day, available_slots 
    INTO is_working_day, max_slots
    FROM daily_availability 
    WHERE date = check_date;
    
    -- If no config exists, check template
    IF NOT FOUND THEN
        SELECT working_day, max_slots 
        INTO is_working_day, max_slots
        FROM weekly_schedule_template 
        WHERE day_of_week = EXTRACT(DOW FROM check_date);
    END IF;
    
    -- Return false if not working day or slot exceeds max
    IF NOT is_working_day OR check_slot_number > max_slots THEN
        RETURN false;
    END IF;
    
    -- Check if slot exists and is available
    IF NOT EXISTS (
        SELECT 1 FROM time_slots 
        WHERE slot_date = check_date 
        AND slot_number = check_slot_number 
        AND is_available = true
    ) THEN
        RETURN false;
    END IF;
    
    -- Check for existing bookings
    SELECT COUNT(*) INTO existing_booking_count
    FROM bookings 
    WHERE booking_date = check_date 
    AND time_slot = check_slot_number
    AND status NOT IN ('cancelled');
    
    RETURN existing_booking_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;