-- =========================================================================
-- Love4Detailing - Fix RLS Policies for Users Table
-- Ensure RLS policies allow users to read their own profiles
-- =========================================================================

-- Check and update RLS policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;

-- Create proper RLS policies
CREATE POLICY "Users can view own profile" 
ON users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON users FOR UPDATE 
USING (auth.uid() = id);

-- Allow authenticated users to read basic user info (needed for middleware)
CREATE POLICY "Allow authenticated users to read user roles" 
ON users FOR SELECT 
USING (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Also check customer_rewards policies
DROP POLICY IF EXISTS "Users can view own rewards" ON customer_rewards;
DROP POLICY IF EXISTS "Users can update own rewards" ON customer_rewards;

CREATE POLICY "Users can view own rewards" 
ON customer_rewards FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards" 
ON customer_rewards FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow admins to manage all data
CREATE POLICY "Admins can manage all users" 
ON users FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can manage all rewards" 
ON customer_rewards FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Ensure RLS is enabled on customer_rewards too
ALTER TABLE customer_rewards ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON users TO authenticated;
GRANT SELECT, UPDATE ON customer_rewards TO authenticated;

SELECT 'RLS policies updated successfully!' as result;