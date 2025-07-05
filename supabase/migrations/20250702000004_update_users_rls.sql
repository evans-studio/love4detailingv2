-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS users_public_read ON users;
DROP POLICY IF EXISTS users_self_update ON users;
DROP POLICY IF EXISTS users_self_read ON users;
DROP POLICY IF EXISTS users_service_manage ON users;

-- Create policy to allow public read access to minimal user data
CREATE POLICY users_public_read ON users
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow authenticated users to update their own data
CREATE POLICY users_self_update ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create policy to allow authenticated users to read their own data
CREATE POLICY users_self_read ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create policy to allow service role to manage all user data
CREATE POLICY users_service_manage ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true); 