-- =========================================================================
-- Love4Detailing - Fix RLS Infinite Recursion
-- Simplify RLS policies to avoid recursion issues
-- =========================================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to read user roles" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Temporarily disable RLS to avoid recursion issues
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" 
ON users FOR SELECT 
USING (auth.uid() = id);

-- Allow users to update their own profile  
CREATE POLICY "Users can update own profile" 
ON users FOR UPDATE 
USING (auth.uid() = id);

-- Allow service role to access all users (for admin operations)
CREATE POLICY "Service role can access all users" 
ON users FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- For customer_rewards, keep it simple
DROP POLICY IF EXISTS "Users can view own rewards" ON customer_rewards;
DROP POLICY IF EXISTS "Users can update own rewards" ON customer_rewards;
DROP POLICY IF EXISTS "Admins can manage all rewards" ON customer_rewards;

ALTER TABLE customer_rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rewards" 
ON customer_rewards FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards" 
ON customer_rewards FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can access all rewards" 
ON customer_rewards FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant basic permissions
GRANT SELECT, UPDATE ON users TO authenticated;
GRANT SELECT, UPDATE ON customer_rewards TO authenticated;

SELECT 'RLS recursion issue fixed!' as result;