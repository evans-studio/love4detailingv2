-- Create admin configuration tables for Love4Detailing

-- Business Hours Configuration
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  is_open BOOLEAN NOT NULL DEFAULT true,
  open_time TIME,
  close_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(day_of_week)
);

-- Holiday/Closure Configuration
CREATE TABLE IF NOT EXISTS business_closures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  closure_date DATE NOT NULL,
  reason TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Business Policies Configuration
CREATE TABLE IF NOT EXISTS business_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_key TEXT UNIQUE NOT NULL,
  policy_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add pricing configuration (extend vehicle_sizes or create separate pricing table)
-- We'll use the existing vehicle_sizes table and add flexibility

-- Admin Activity Log
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT, -- 'booking', 'user', 'policy', etc.
  target_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default business hours (9 AM - 5 PM, Monday to Friday)
INSERT INTO business_hours (day_of_week, is_open, open_time, close_time) VALUES
  (0, false, null, null), -- Sunday - closed
  (1, true, '09:00:00', '17:00:00'), -- Monday
  (2, true, '09:00:00', '17:00:00'), -- Tuesday
  (3, true, '09:00:00', '17:00:00'), -- Wednesday
  (4, true, '09:00:00', '17:00:00'), -- Thursday
  (5, true, '09:00:00', '17:00:00'), -- Friday
  (6, false, null, null) -- Saturday - closed
ON CONFLICT (day_of_week) DO NOTHING;

-- Insert default business policies
INSERT INTO business_policies (policy_key, policy_value, description) VALUES
  ('cancellation_window_hours', '{"value": 24}', 'Hours before booking that cancellation is allowed without penalty'),
  ('reschedule_window_hours', '{"value": 12}', 'Hours before booking that rescheduling is allowed'),
  ('reschedule_fee_pence', '{"value": 0}', 'Fee charged for rescheduling in pence'),
  ('late_cancellation_fee_pence', '{"value": 0}', 'Fee charged for late cancellation in pence'),
  ('terms_and_conditions', '{"value": "By booking with Love4Detailing, you agree to our terms of service and cancellation policy."}', 'Terms and conditions text'),
  ('cancellation_policy_text', '{"value": "Cancellations must be made at least 24 hours in advance. Late cancellations may incur a fee."}', 'Cancellation policy displayed to customers')
ON CONFLICT (policy_key) DO NOTHING;

-- Enable RLS on all new tables
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin-only access
CREATE POLICY "Admin full access to business hours" ON business_hours
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to business closures" ON business_closures
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to business policies" ON business_policies
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin read access to activity log" ON admin_activity_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Public read access to business hours and policies (for customer-facing features)
CREATE POLICY "Public read access to business hours" ON business_hours
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access to business policies" ON business_policies
  FOR SELECT TO anon, authenticated
  USING (policy_key IN ('terms_and_conditions', 'cancellation_policy_text'));

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_business_hours_updated_at BEFORE UPDATE ON business_hours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_closures_updated_at BEFORE UPDATE ON business_closures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_policies_updated_at BEFORE UPDATE ON business_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();