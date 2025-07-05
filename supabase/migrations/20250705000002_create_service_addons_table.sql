-- Create service addons table for additional services and pricing

CREATE TABLE IF NOT EXISTS service_addons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_pence INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE service_addons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin management and public read access
CREATE POLICY "Admin full access to service addons" ON service_addons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Public read access to active addons (for customer-facing features)
CREATE POLICY "Public read access to active addons" ON service_addons
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Add updated_at trigger
CREATE TRIGGER update_service_addons_updated_at BEFORE UPDATE ON service_addons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default service addons
INSERT INTO service_addons (name, description, price_pence, is_active) VALUES
  ('Pet Hair Removal', 'Deep cleaning to remove pet hair from seats and carpets', 1500, true),
  ('Wax Protection', 'Premium wax coating for paint protection and shine', 2000, true),
  ('Interior Sanitization', 'Complete interior sanitization and odor elimination', 1000, true),
  ('Engine Bay Cleaning', 'Professional engine bay cleaning and degreasing', 3000, true)
ON CONFLICT DO NOTHING;