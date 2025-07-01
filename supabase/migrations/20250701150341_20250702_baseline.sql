-- Register previously applied migrations
INSERT INTO supabase_migrations.schema_migrations (version, statements)
VALUES 
  ('20240320000000', ARRAY['Manually applied: clean schema']),
  ('20250701120214', ARRAY['Manually applied: rewards system'])
ON CONFLICT (version) DO NOTHING;

-- Add unique constraint to prevent double bookings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_time_slot'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT unique_time_slot UNIQUE (time_slot_id);
  END IF;
END $$;

-- Add trigger to handle time slot status
CREATE OR REPLACE FUNCTION update_time_slot_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking is created, mark the time slot as booked
  IF TG_OP = 'INSERT' THEN
    UPDATE time_slots
    SET is_booked = true
    WHERE id = NEW.time_slot_id;
  -- When a booking is deleted, mark the time slot as available
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE time_slots
    SET is_booked = false
    WHERE id = OLD.time_slot_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_time_slot_status ON bookings;
CREATE TRIGGER booking_time_slot_status
AFTER INSERT OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_time_slot_status();

-- Add is_booked column to time_slots if it doesn't exist
ALTER TABLE time_slots
ADD COLUMN IF NOT EXISTS is_booked BOOLEAN DEFAULT false;

-- Update existing time slots based on bookings
UPDATE time_slots ts
SET is_booked = true
WHERE EXISTS (
  SELECT 1 FROM bookings b
  WHERE b.time_slot_id = ts.id
);

-- This is a baseline migration that captures the current production state
-- All future migrations should be applied on top of this

-- Drop all existing objects first
DROP TABLE IF EXISTS public.reward_transactions CASCADE;
DROP TABLE IF EXISTS public.rewards CASCADE;
DROP TABLE IF EXISTS public.admin_notes CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.time_slots CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.vehicle_sizes CASCADE;
DROP TABLE IF EXISTS public.missing_vehicle_models CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE user_role AS ENUM ('customer', 'admin');

-- Create users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    role user_role DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create vehicle_sizes table
CREATE TABLE public.vehicle_sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT UNIQUE NOT NULL,
    description TEXT,
    price_pence INTEGER NOT NULL
);

-- Create vehicles table
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    registration TEXT NOT NULL,
    make TEXT,
    model TEXT,
    year TEXT,
    color TEXT,
    size_id UUID REFERENCES vehicle_sizes(id),
    dvla_data JSONB,
    photos TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create time_slots table
CREATE TABLE public.time_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(slot_date, slot_time)
);

-- Create bookings table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    vehicle_id UUID REFERENCES vehicles(id),
    time_slot_id UUID REFERENCES time_slots(id) UNIQUE,
    status booking_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    payment_method TEXT DEFAULT 'cash',
    total_price_pence INTEGER NOT NULL,
    booking_reference TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    email TEXT,
    full_name TEXT,
    phone TEXT
);

-- Create admin_notes table
CREATE TABLE public.admin_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create missing_vehicle_models table
CREATE TABLE public.missing_vehicle_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make TEXT,
    model TEXT,
    registration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create rewards table
CREATE TABLE public.rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) UNIQUE,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create reward_transactions table
CREATE TABLE public.reward_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    booking_id UUID REFERENCES bookings(id),
    points INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_slot_id ON bookings(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration);
CREATE INDEX IF NOT EXISTS idx_vehicles_size_id ON vehicles(size_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_slot_date ON time_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_time_slots_slot_time ON time_slots(slot_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_user_id ON reward_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_booking_id ON reward_transactions(booking_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE missing_vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can create users"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own vehicles"
  ON vehicles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vehicles"
  ON vehicles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles"
  ON vehicles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Vehicle sizes are readable by all"
  ON vehicle_sizes FOR SELECT
  USING (true);

CREATE POLICY "Time slots are readable by all"
  ON time_slots FOR SELECT
  USING (true);

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (
    auth.uid() = user_id OR
    user_id IS NULL
  );

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Insert standard vehicle sizes
INSERT INTO vehicle_sizes (label, description, price_pence)
VALUES 
    ('Small', 'Compact cars and small hatchbacks', 5500),
    ('Medium', 'Family cars and small SUVs', 6000),
    ('Large', 'Large SUVs and executive cars', 6500),
    ('Extra Large', 'Luxury cars and vans', 7000)
ON CONFLICT (label) 
DO UPDATE SET 
    description = EXCLUDED.description,
    price_pence = EXCLUDED.price_pence;
