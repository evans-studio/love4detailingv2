-- Enable RLS on vehicles table (if not already enabled)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous vehicle creation" ON vehicles;
DROP POLICY IF EXISTS "Allow public read access to vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow authenticated users to manage their vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow service role full access" ON vehicles;

-- Create policy to allow anonymous users to create vehicles
CREATE POLICY "Allow anonymous vehicle creation" ON vehicles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy to allow public read access to vehicles
CREATE POLICY "Allow public read access to vehicles" ON vehicles
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow authenticated users to manage their vehicles
CREATE POLICY "Allow authenticated users to manage their vehicles" ON vehicles
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_id IS NULL
  )
  WITH CHECK (
    user_id = auth.uid() OR
    user_id IS NULL
  );

-- Create policy to allow service role full access
CREATE POLICY "Allow service role full access" ON vehicles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true); 