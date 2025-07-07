-- Enterprise Schema Extension for Love4Detailing v2.0 Rebuild
-- This migration adds the new tables required by the comprehensive rebuild specification

-- Create schedule_templates table for recurring schedule patterns
CREATE TABLE IF NOT EXISTS schedule_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schedule_slots table for template-based time slots
CREATE TABLE IF NOT EXISTS schedule_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES schedule_templates(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_bookings INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, day_of_week, start_time)
);

-- Create booking_notes table for internal notes and customer communication
CREATE TABLE IF NOT EXISTS booking_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    note_type VARCHAR(50) NOT NULL CHECK (note_type IN ('internal', 'customer', 'system')),
    content TEXT NOT NULL,
    is_visible_to_customer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_rate_limits table for API security and throttling
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- IP address, user ID, or API key
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identifier, endpoint, window_start)
);

-- Add new columns to existing tables for enhanced functionality

-- Add template_id to available_slots for linking to schedule templates
ALTER TABLE available_slots ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES schedule_templates(id) ON DELETE SET NULL;
ALTER TABLE available_slots ADD COLUMN IF NOT EXISTS day_of_week INTEGER;

-- Add enhanced booking fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_instructions TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_location TEXT;

-- Add enhanced user fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_communication VARCHAR(50) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS service_preferences JSONB;

-- Add enhanced vehicle fields
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50); -- 'car', 'van', 'motorcycle', etc.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS special_requirements TEXT;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_schedule_templates_active ON schedule_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_template_day ON schedule_slots(template_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_active ON schedule_slots(is_active);
CREATE INDEX IF NOT EXISTS idx_booking_notes_booking_id ON booking_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_notes_type ON booking_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_identifier ON api_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_endpoint ON api_rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON api_rate_limits(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_available_slots_template ON available_slots(template_id);
CREATE INDEX IF NOT EXISTS idx_available_slots_day_of_week ON available_slots(day_of_week);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_schedule_templates_updated_at 
    BEFORE UPDATE ON schedule_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_slots_updated_at 
    BEFORE UPDATE ON schedule_slots 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_notes_updated_at 
    BEFORE UPDATE ON booking_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_rate_limits_updated_at 
    BEFORE UPDATE ON api_rate_limits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on new tables
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schedule_templates
CREATE POLICY "Public can view active schedule templates" ON schedule_templates
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admin can manage schedule templates" ON schedule_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for schedule_slots
CREATE POLICY "Public can view active schedule slots" ON schedule_slots
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admin can manage schedule slots" ON schedule_slots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for booking_notes
CREATE POLICY "Users can view their booking notes" ON booking_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = booking_id 
            AND (b.user_id = auth.uid() OR b.customer_email = auth.email())
        ) OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'staff', 'super_admin')
        )
    );

CREATE POLICY "Staff can manage booking notes" ON booking_notes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'staff', 'super_admin')
        )
    );

-- RLS Policies for api_rate_limits
CREATE POLICY "System can manage rate limits" ON api_rate_limits
    FOR ALL USING (TRUE); -- This table is managed by the system

-- Functions for enhanced functionality

-- Function to generate available slots from templates
CREATE OR REPLACE FUNCTION generate_slots_from_template(
    template_id UUID,
    start_date DATE,
    end_date DATE
) RETURNS INTEGER AS $$
DECLARE
    slot_record RECORD;
    current_date DATE;
    slot_count INTEGER := 0;
BEGIN
    -- Loop through each day in the date range
    current_date := start_date;
    
    WHILE current_date <= end_date LOOP
        -- Get template slots for this day of week
        FOR slot_record IN 
            SELECT * FROM schedule_slots 
            WHERE schedule_slots.template_id = generate_slots_from_template.template_id
            AND day_of_week = EXTRACT(DOW FROM current_date)
            AND is_active = TRUE
        LOOP
            -- Insert slot if it doesn't already exist
            INSERT INTO available_slots (
                slot_date,
                start_time,
                end_time,
                max_bookings,
                current_bookings,
                template_id,
                day_of_week,
                is_blocked
            ) VALUES (
                current_date,
                slot_record.start_time,
                slot_record.end_time,
                slot_record.max_bookings,
                0,
                slot_record.template_id,
                slot_record.day_of_week,
                FALSE
            ) ON CONFLICT (slot_date, start_time) DO NOTHING;
            
            slot_count := slot_count + 1;
        END LOOP;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN slot_count;
END;
$$ LANGUAGE plpgsql;

-- Function to add booking note
CREATE OR REPLACE FUNCTION add_booking_note(
    p_booking_id UUID,
    p_author_id UUID,
    p_note_type VARCHAR,
    p_content TEXT,
    p_visible_to_customer BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
    note_id UUID;
BEGIN
    INSERT INTO booking_notes (
        booking_id,
        author_id,
        note_type,
        content,
        is_visible_to_customer
    ) VALUES (
        p_booking_id,
        p_author_id,
        p_note_type,
        p_content,
        p_visible_to_customer
    ) RETURNING id INTO note_id;
    
    RETURN note_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier VARCHAR,
    p_endpoint VARCHAR,
    p_limit INTEGER,
    p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
    window_end TIMESTAMP WITH TIME ZONE;
BEGIN
    window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    window_end := NOW();
    
    -- Get current count for this identifier/endpoint combination
    SELECT COALESCE(SUM(request_count), 0) INTO current_count
    FROM api_rate_limits
    WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start >= (NOW() - (p_window_minutes || ' minutes')::INTERVAL)
    AND is_blocked = FALSE;
    
    -- Check if limit exceeded
    IF current_count >= p_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Record this request
    INSERT INTO api_rate_limits (
        identifier,
        endpoint,
        request_count,
        window_start,
        window_end
    ) VALUES (
        p_identifier,
        p_endpoint,
        1,
        window_start,
        window_end
    ) ON CONFLICT (identifier, endpoint, window_start) DO UPDATE SET
        request_count = api_rate_limits.request_count + 1,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update booking_summaries view to include new fields
DROP VIEW IF EXISTS booking_summaries;
CREATE VIEW booking_summaries AS
SELECT 
    b.id,
    b.booking_reference,
    b.customer_email,
    b.customer_name,
    b.customer_phone,
    b.status,
    b.payment_status,
    b.payment_method,
    b.total_price_pence,
    b.confirmed_at,
    b.started_at,
    b.completed_at,
    b.cancelled_at,
    b.cancellation_reason,
    b.notes,
    b.internal_notes,
    b.customer_instructions,
    b.estimated_duration_minutes,
    b.actual_duration_minutes,
    b.service_location,
    b.created_at,
    b.updated_at,
    s.name as service_name,
    s.code as service_code,
    v.registration as vehicle_registration,
    v.make as vehicle_make,
    v.model as vehicle_model,
    v.size as vehicle_size,
    v.vehicle_type,
    sl.slot_date,
    sl.start_time,
    sl.end_time,
    sl.template_id,
    st.name as template_name,
    u.full_name as user_full_name,
    u.role as user_role,
    COUNT(bn.id) as note_count
FROM bookings b
JOIN services s ON b.service_id = s.id
JOIN available_slots sl ON b.slot_id = sl.id
LEFT JOIN schedule_templates st ON sl.template_id = st.id
LEFT JOIN vehicles v ON b.vehicle_id = v.id
LEFT JOIN users u ON b.user_id = u.id
LEFT JOIN booking_notes bn ON b.id = bn.booking_id
GROUP BY b.id, s.id, v.id, sl.id, st.id, u.id;

-- Insert default schedule template
INSERT INTO schedule_templates (name, description, is_active) VALUES
    ('Default Weekly Schedule', 'Standard 9-5 weekday schedule with 2-hour slots', TRUE)
ON CONFLICT DO NOTHING;

-- Insert default schedule slots for the template
DO $$
DECLARE
    template_id UUID;
    slot_start TIME;
    slot_end TIME;
    current_day INTEGER;
BEGIN
    -- Get the default template ID
    SELECT id INTO template_id FROM schedule_templates WHERE name = 'Default Weekly Schedule';
    
    -- Generate slots for Monday through Saturday (1-6)
    FOR current_day IN 1..6 LOOP
        slot_start := '09:00:00';
        
        -- Generate 2-hour slots from 9 AM to 5 PM
        WHILE slot_start <= '15:00:00' LOOP
            slot_end := slot_start + INTERVAL '2 hours';
            
            INSERT INTO schedule_slots (
                template_id,
                day_of_week,
                start_time,
                end_time,
                max_bookings,
                is_active
            ) VALUES (
                template_id,
                current_day,
                slot_start,
                slot_end,
                1,
                TRUE
            ) ON CONFLICT (template_id, day_of_week, start_time) DO NOTHING;
            
            slot_start := slot_start + INTERVAL '2 hours';
        END LOOP;
    END LOOP;
END $$;

-- Clean up expired rate limit records
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_rate_limits
    WHERE window_end < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;