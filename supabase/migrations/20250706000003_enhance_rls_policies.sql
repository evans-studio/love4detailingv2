-- Comprehensive Row Level Security (RLS) Policy Enhancement
-- This migration ensures all tables have proper access control as specified in the audit

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE missing_vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmatched_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedule_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_locks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them consistently
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;

DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can manage own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Service role can manage all vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admins can view all vehicles" ON vehicles;

DROP POLICY IF EXISTS "Everyone can view vehicle sizes" ON vehicle_sizes;
DROP POLICY IF EXISTS "Service role can manage vehicle sizes" ON vehicle_sizes;
DROP POLICY IF EXISTS "Admins can manage vehicle sizes" ON vehicle_sizes;

DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Service role can manage all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can manage bookings" ON bookings;

-- USERS table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Service role can manage all users" ON users
    FOR ALL
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users au 
            WHERE au.id = auth.uid() 
            AND au.raw_user_meta_data->>'role' = 'admin'
        )
        OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage users" ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users au 
            WHERE au.id = auth.uid() 
            AND au.raw_user_meta_data->>'role' = 'admin'
        )
        OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- VEHICLES table policies
CREATE POLICY "Users can view own vehicles" ON vehicles
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own vehicles" ON vehicles
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all vehicles" ON vehicles
    FOR ALL
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can view all vehicles" ON vehicles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- VEHICLE_SIZES table policies (public read, admin write)
CREATE POLICY "Everyone can view vehicle sizes" ON vehicle_sizes
    FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage vehicle sizes" ON vehicle_sizes
    FOR ALL
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can manage vehicle sizes" ON vehicle_sizes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- BOOKINGS table policies
CREATE POLICY "Users can view own bookings" ON bookings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Anonymous users can create bookings" ON bookings
    FOR INSERT
    WITH CHECK (true); -- Anonymous booking creation allowed

CREATE POLICY "Users can create bookings" ON bookings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Service role can manage all bookings" ON bookings
    FOR ALL
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can view all bookings" ON bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage bookings" ON bookings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- TIME_SLOTS table policies (public read for availability, admin write)
CREATE POLICY "Everyone can view available time slots" ON time_slots
    FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage all time slots" ON time_slots
    FOR ALL
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can manage time slots" ON time_slots
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- REWARDS table policies (public read, admin write)
CREATE POLICY "Everyone can view rewards" ON rewards
    FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage rewards" ON rewards
    FOR ALL
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can manage rewards" ON rewards
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- REWARD_TRANSACTIONS table policies
CREATE POLICY "Users can view own reward transactions" ON reward_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all reward transactions" ON reward_transactions
    FOR ALL
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can view all reward transactions" ON reward_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- LOYALTY_POINTS table policies
CREATE POLICY "Users can view own loyalty points" ON loyalty_points
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all loyalty points" ON loyalty_points
    FOR ALL
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can view all loyalty points" ON loyalty_points
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- ADMIN_NOTES table policies (admin only)
CREATE POLICY "Admins can manage admin notes" ON admin_notes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

CREATE POLICY "Service role can manage admin notes" ON admin_notes
    FOR ALL
    USING (current_setting('role') = 'service_role');

-- MISSING_VEHICLE_MODELS table policies (service role and admin only)
CREATE POLICY "Service role can manage missing vehicle models" ON missing_vehicle_models
    FOR ALL
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can view missing vehicle models" ON missing_vehicle_models
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- UNMATCHED_VEHICLES table policies (admin only)
CREATE POLICY "Admins can manage unmatched vehicles" ON unmatched_vehicles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

CREATE POLICY "Service role can manage unmatched vehicles" ON unmatched_vehicles
    FOR ALL
    USING (current_setting('role') = 'service_role');

-- DAILY_AVAILABILITY table policies (public read, admin write)
CREATE POLICY "Everyone can view daily availability" ON daily_availability
    FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage daily availability" ON daily_availability
    FOR ALL
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can manage daily availability" ON daily_availability
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- WEEKLY_SCHEDULE_TEMPLATE table policies (public read, admin write)
CREATE POLICY "Everyone can view weekly schedule template" ON weekly_schedule_template
    FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage weekly schedule template" ON weekly_schedule_template
    FOR ALL
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can manage weekly schedule template" ON weekly_schedule_template
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- BOOKING_LOCKS table policies (service role only for booking flow)
CREATE POLICY "Service role can manage booking locks" ON booking_locks
    FOR ALL
    USING (current_setting('role') = 'service_role');

-- Grant necessary permissions to anon and authenticated roles
GRANT SELECT ON vehicle_sizes TO anon, authenticated;
GRANT SELECT ON time_slots TO anon, authenticated;
GRANT SELECT ON daily_availability TO anon, authenticated;
GRANT SELECT ON weekly_schedule_template TO anon, authenticated;
GRANT SELECT ON rewards TO anon, authenticated;

-- Grant INSERT permission for anonymous booking creation
GRANT INSERT ON bookings TO anon;
GRANT INSERT ON users TO anon;
GRANT INSERT ON vehicles TO anon;

-- Ensure service role has full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Add comments for documentation
COMMENT ON POLICY "Users can view own profile" ON users IS 
'Users can only view their own profile data';

COMMENT ON POLICY "Anonymous users can create bookings" ON bookings IS 
'Allows anonymous users to create bookings during the booking flow';

COMMENT ON POLICY "Everyone can view available time slots" ON time_slots IS 
'Public read access for checking availability during booking';

COMMENT ON POLICY "Admins can manage unmatched vehicles" ON unmatched_vehicles IS 
'Allows admins to review and resolve unmatched vehicle registrations';