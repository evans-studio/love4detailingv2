-- Admin Schema Extensions for Love4Detailing Admin Dashboard
-- This migration adds tables and functionality required for comprehensive admin management

-- ===== ADMIN SCHEDULE CONFIGURATION =====

-- Admin schedule configuration table
CREATE TABLE admin_schedule_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    is_working_day BOOLEAN DEFAULT true,
    start_time TIME,
    end_time TIME,
    max_slots_per_hour INTEGER DEFAULT 1,
    break_times JSONB DEFAULT '[]'::jsonb, -- Array of break periods
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(day_of_week) -- Only one config per day
);

-- ===== BUSINESS POLICIES CONFIGURATION =====

-- Business policies configuration table
CREATE TABLE business_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_type TEXT NOT NULL, -- 'cancellation', 'rescheduling', 'service_area', 'travel_charges'
    policy_name TEXT NOT NULL,
    policy_rules JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== ADMIN ACTIVITY TRACKING =====

-- Admin activity tracking
CREATE TABLE admin_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES users(id),
    action_type TEXT NOT NULL, -- 'schedule_update', 'booking_modified', 'policy_change', 'customer_contact'
    target_type TEXT, -- 'booking', 'schedule', 'customer', 'policy', 'system'
    target_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== ADMIN NOTES SYSTEM =====

-- Admin notes for bookings and customers  
CREATE TABLE admin_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    customer_user_id UUID REFERENCES users(id),
    admin_user_id UUID REFERENCES users(id) NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'issue', 'preference', 'follow_up'
    title TEXT,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT true, -- Private to admin or visible to customer
    priority INTEGER DEFAULT 0, -- 0=normal, 1=high, 2=urgent
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== ADMIN DASHBOARD WIDGETS =====

-- Admin dashboard widget configuration
CREATE TABLE admin_dashboard_widgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES users(id),
    widget_type TEXT NOT NULL, -- 'todays_bookings', 'revenue_chart', 'customer_insights', 'weather'
    widget_config JSONB DEFAULT '{}'::jsonb,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 1,
    height INTEGER DEFAULT 1,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== ADMIN QUICK ACTIONS =====

-- Quick actions for admin efficiency
CREATE TABLE admin_quick_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES users(id),
    action_name TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'api_call', 'navigation', 'template'
    action_config JSONB NOT NULL,
    icon_name TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== INDEXES FOR PERFORMANCE =====

CREATE INDEX idx_admin_schedule_config_day ON admin_schedule_config(day_of_week);
CREATE INDEX idx_business_policies_type_active ON business_policies(policy_type, is_active);
CREATE INDEX idx_admin_activity_log_admin_user ON admin_activity_log(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_activity_log_target ON admin_activity_log(target_type, target_id);
CREATE INDEX idx_admin_notes_booking ON admin_notes(booking_id);
CREATE INDEX idx_admin_notes_customer ON admin_notes(customer_user_id);
CREATE INDEX idx_admin_notes_admin_date ON admin_notes(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_dashboard_widgets_user ON admin_dashboard_widgets(admin_user_id);
CREATE INDEX idx_admin_quick_actions_user_order ON admin_quick_actions(admin_user_id, display_order);

-- ===== ROW LEVEL SECURITY =====

-- Enable RLS on all admin tables
ALTER TABLE admin_schedule_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_quick_actions ENABLE ROW LEVEL SECURITY;

-- Admin schedule config policies
CREATE POLICY "Admin users can manage schedule config" ON admin_schedule_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Business policies policies
CREATE POLICY "Admin users can manage business policies" ON business_policies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Admin activity log policies
CREATE POLICY "Admin users can view their own activity" ON admin_activity_log
    FOR SELECT USING (admin_user_id = auth.uid());

CREATE POLICY "Admin users can insert activity" ON admin_activity_log
    FOR INSERT WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Super admins can view all activity" ON admin_activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Admin notes policies
CREATE POLICY "Admin users can manage notes they created" ON admin_notes
    FOR ALL USING (admin_user_id = auth.uid());

CREATE POLICY "Admin users can view all notes" ON admin_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'staff', 'super_admin')
        )
    );

-- Dashboard widgets policies
CREATE POLICY "Users can manage their own widgets" ON admin_dashboard_widgets
    FOR ALL USING (admin_user_id = auth.uid());

-- Quick actions policies
CREATE POLICY "Users can manage their own quick actions" ON admin_quick_actions
    FOR ALL USING (admin_user_id = auth.uid());

-- ===== TRIGGERS FOR UPDATED_AT =====

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_admin_schedule_config_updated_at 
    BEFORE UPDATE ON admin_schedule_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_policies_updated_at 
    BEFORE UPDATE ON business_policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_notes_updated_at 
    BEFORE UPDATE ON admin_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_dashboard_widgets_updated_at 
    BEFORE UPDATE ON admin_dashboard_widgets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== DEFAULT DATA =====

-- Insert default schedule configuration (Monday to Saturday)
INSERT INTO admin_schedule_config (day_of_week, is_working_day, start_time, end_time, max_slots_per_hour) VALUES
(1, true, '08:00', '18:00', 2), -- Monday
(2, true, '08:00', '18:00', 2), -- Tuesday  
(3, true, '08:00', '18:00', 2), -- Wednesday
(4, true, '08:00', '18:00', 2), -- Thursday
(5, true, '08:00', '18:00', 2), -- Friday
(6, true, '08:00', '16:00', 1), -- Saturday
(0, false, NULL, NULL, 0);      -- Sunday (closed)

-- Insert default business policies
INSERT INTO business_policies (policy_type, policy_name, policy_rules, created_by) VALUES
('cancellation', 'Standard Cancellation Policy', 
 '{"free_cancellation_hours": 24, "late_cancellation_fee_percent": 50, "no_show_fee_percent": 100}'::jsonb,
 NULL),
('rescheduling', 'Standard Rescheduling Policy',
 '{"max_reschedules": 2, "min_notice_hours": 12, "fee_after_limit": 10}'::jsonb,
 NULL),
('service_area', 'Standard Service Area',
 '{"base_radius_miles": 15, "extended_radius_miles": 25, "travel_charge_per_mile": 0.50}'::jsonb,
 NULL);

-- ===== HELPFUL COMMENTS =====

COMMENT ON TABLE admin_schedule_config IS 'Admin working schedule configuration by day of week';
COMMENT ON TABLE business_policies IS 'Configurable business policies for cancellations, service areas, etc.';
COMMENT ON TABLE admin_activity_log IS 'Audit trail of all admin actions for security and analytics';
COMMENT ON TABLE admin_notes IS 'Admin notes system for bookings and customer management';
COMMENT ON TABLE admin_dashboard_widgets IS 'Customizable dashboard widget layout per admin user';
COMMENT ON TABLE admin_quick_actions IS 'User-configurable quick action shortcuts for admin efficiency'; 