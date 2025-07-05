-- Fix RLS policies for admin availability management
-- This migration fixes the circular dependency issue where admin endpoints
-- can't access the users table to verify admin permissions

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can read daily_availability" ON daily_availability;
DROP POLICY IF EXISTS "Admins can modify daily_availability" ON daily_availability;
DROP POLICY IF EXISTS "Admins can read weekly_schedule_template" ON weekly_schedule_template;
DROP POLICY IF EXISTS "Admins can modify weekly_schedule_template" ON weekly_schedule_template;

-- Create new policies that work with service role access
-- These policies allow service role access (used by admin API endpoints)
-- and also allow authenticated users with admin role

-- Daily availability policies
CREATE POLICY "Service role and admins can read daily_availability" ON daily_availability
    FOR SELECT
    USING (
        -- Allow service role (bypass RLS)
        current_setting('role') = 'service_role'
        OR
        -- Allow admin users
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
        -- Allow service role (bypass RLS)
        current_setting('role') = 'service_role'
        OR
        -- Allow admin users
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM auth.users au 
                WHERE au.id = auth.uid() 
                AND au.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- Weekly schedule template policies
CREATE POLICY "Service role and admins can read weekly_schedule_template" ON weekly_schedule_template
    FOR SELECT
    USING (
        -- Allow service role (bypass RLS)
        current_setting('role') = 'service_role'
        OR
        -- Allow admin users
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
        -- Allow service role (bypass RLS)
        current_setting('role') = 'service_role'
        OR
        -- Allow admin users
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM auth.users au 
                WHERE au.id = auth.uid() 
                AND au.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- Grant necessary permissions for admin functions
-- These functions need to be accessible by service role
GRANT EXECUTE ON FUNCTION generate_weekly_time_slots(date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION update_daily_availability(date, boolean, integer) TO service_role;

-- Ensure proper permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_availability TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON weekly_schedule_template TO service_role;
GRANT USAGE ON SEQUENCE daily_availability_id_seq TO service_role;
GRANT USAGE ON SEQUENCE weekly_schedule_template_id_seq TO service_role;

-- Add comment for documentation
COMMENT ON POLICY "Service role and admins can read daily_availability" ON daily_availability IS 
'Allows service role (for admin API endpoints) and authenticated admin users to read daily availability data';

COMMENT ON POLICY "Service role and admins can modify daily_availability" ON daily_availability IS 
'Allows service role (for admin API endpoints) and authenticated admin users to modify daily availability data';

COMMENT ON POLICY "Service role and admins can read weekly_schedule_template" ON weekly_schedule_template IS 
'Allows service role (for admin API endpoints) and authenticated admin users to read weekly schedule templates';

COMMENT ON POLICY "Service role and admins can modify weekly_schedule_template" ON weekly_schedule_template IS 
'Allows service role (for admin API endpoints) and authenticated admin users to modify weekly schedule templates';