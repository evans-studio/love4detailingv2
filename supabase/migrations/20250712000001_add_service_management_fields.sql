-- Add missing fields to services table for comprehensive service management
-- This migration adds fields required for the Service Management System
-- while preserving all existing data and functionality

-- Add new columns to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;

-- Create index for display_order to optimize service ordering queries
CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(display_order ASC, created_at ASC);

-- Create index for active services with display order
CREATE INDEX IF NOT EXISTS idx_services_active_ordered ON services(is_active, display_order ASC) WHERE is_active = true;

-- Update existing Full Valet service with comprehensive information
UPDATE services 
SET 
  short_description = 'Complete interior and exterior car detailing service',
  display_order = 1,
  features = '[
    "Complete exterior wash and wax",
    "Full interior vacuum and clean",
    "Dashboard and console detailing",
    "Window cleaning (inside and out)",
    "Tyre cleaning and shine",
    "Door frame and jamb cleaning",
    "Air freshener application",
    "Quality guarantee"
  ]'::jsonb
WHERE code = 'FULL_VALET' AND short_description IS NULL;

-- If no Full Valet service exists, create it with comprehensive configuration
INSERT INTO services (
  name, 
  code, 
  description, 
  short_description,
  base_duration_minutes,
  display_order,
  features,
  is_active
)
SELECT 
  'Full Valet',
  'FULL_VALET',
  'Our premium full valet service provides complete interior and exterior car detailing. We clean every surface of your vehicle to the highest standard, leaving it spotless inside and out. Perfect for maintaining your car''s appearance and value.',
  'Complete interior and exterior car detailing service',
  150,
  1,
  '[
    "Complete exterior wash and wax",
    "Full interior vacuum and clean", 
    "Dashboard and console detailing",
    "Window cleaning (inside and out)",
    "Tyre cleaning and shine",
    "Door frame and jamb cleaning",
    "Air freshener application",
    "Quality guarantee"
  ]'::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE code = 'FULL_VALET'
);

-- Update service_pricing table to ensure Full Valet has all vehicle size pricing
-- Insert missing pricing records for Full Valet if they don't exist
WITH full_valet_service AS (
  SELECT id FROM services WHERE code = 'FULL_VALET' LIMIT 1
),
required_pricing AS (
  SELECT 
    fv.id as service_id,
    vs.size_name,
    vs.price_pence,
    vs.duration_minutes
  FROM full_valet_service fv
  CROSS JOIN (
    VALUES 
      ('small', 4500, 120),      -- £45 for small vehicles
      ('medium', 6000, 135),     -- £60 for medium vehicles  
      ('large', 7500, 150),      -- £75 for large vehicles
      ('extra_large', 8500, 180) -- £85 for extra large vehicles
  ) AS vs(size_name, price_pence, duration_minutes)
)
INSERT INTO service_pricing (
  service_id,
  vehicle_size,
  price_pence,
  duration_minutes,
  is_active
)
SELECT 
  rp.service_id,
  rp.size_name::vehicle_size,
  rp.price_pence,
  rp.duration_minutes,
  true
FROM required_pricing rp
WHERE NOT EXISTS (
  SELECT 1 
  FROM service_pricing sp 
  WHERE sp.service_id = rp.service_id 
  AND sp.vehicle_size = rp.size_name::vehicle_size
);

-- Add comment to document the migration
COMMENT ON COLUMN services.short_description IS 'Brief service description for cards and service lists';
COMMENT ON COLUMN services.display_order IS 'Order in which services appear in lists (lower numbers first)';
COMMENT ON COLUMN services.features IS 'JSON array of service features and inclusions';

-- Verify the migration by checking service structure
DO $$
DECLARE
    service_count INTEGER;
    pricing_count INTEGER;
BEGIN
    -- Check services table
    SELECT COUNT(*) INTO service_count FROM services WHERE code = 'FULL_VALET';
    
    -- Check pricing table
    SELECT COUNT(*) INTO pricing_count 
    FROM service_pricing sp
    JOIN services s ON sp.service_id = s.id
    WHERE s.code = 'FULL_VALET';
    
    -- Log migration results
    RAISE NOTICE 'Service Management Migration Complete:';
    RAISE NOTICE '- Full Valet services found: %', service_count;
    RAISE NOTICE '- Pricing records for Full Valet: %', pricing_count;
    
    IF service_count = 0 THEN
        RAISE WARNING 'No Full Valet service found - this may indicate an issue';
    END IF;
    
    IF pricing_count < 4 THEN
        RAISE WARNING 'Full Valet missing pricing for some vehicle sizes (found %, expected 4)', pricing_count;
    END IF;
END $$;