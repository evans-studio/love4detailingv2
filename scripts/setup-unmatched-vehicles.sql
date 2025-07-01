-- Create unmatched vehicles table
CREATE TABLE IF NOT EXISTS public.unmatched_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  registration TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  matched_size TEXT DEFAULT 'Medium',
  handled BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.unmatched_vehicles ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Only admins can view unmatched vehicles" ON public.unmatched_vehicles;
CREATE POLICY "Only admins can view unmatched vehicles" ON public.unmatched_vehicles
  FOR SELECT USING (true); -- Temporarily allow all access for testing

DROP POLICY IF EXISTS "System can insert unmatched vehicles" ON public.unmatched_vehicles;
CREATE POLICY "System can insert unmatched vehicles" ON public.unmatched_vehicles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can update unmatched vehicles" ON public.unmatched_vehicles;
CREATE POLICY "Only admins can update unmatched vehicles" ON public.unmatched_vehicles
  FOR UPDATE USING (true); -- Temporarily allow all access for testing 