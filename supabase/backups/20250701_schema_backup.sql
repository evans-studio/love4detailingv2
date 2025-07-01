-- Backup of current schema and data as of July 1, 2025
-- This file represents the state after manual migrations and setup

-- Types
CREATE TYPE IF NOT EXISTS booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE IF NOT EXISTS payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE IF NOT EXISTS user_role AS ENUM ('customer', 'admin');

-- Base Tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    role user_role DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS vehicle_sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT UNIQUE NOT NULL,
    price_pence INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS vehicles (
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

CREATE TABLE IF NOT EXISTS time_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    vehicle_id UUID REFERENCES vehicles(id),
    time_slot_id UUID REFERENCES time_slots(id),
    status booking_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    payment_method TEXT DEFAULT 'cash',
    total_price_pence INTEGER NOT NULL,
    booking_reference TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS admin_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS missing_vehicle_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make TEXT,
    model TEXT,
    registration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Rewards System Tables
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    points INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'bronze',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS reward_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    booking_id UUID REFERENCES bookings(id),
    points INTEGER NOT NULL,
    type TEXT CHECK (type IN ('earned', 'redeemed')),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_slot_id ON bookings(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration);
CREATE INDEX IF NOT EXISTS idx_vehicles_size_id ON vehicles(size_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_slot_date ON time_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_time_slots_slot_time ON time_slots(slot_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_user_id ON reward_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_booking_id ON reward_transactions(booking_id);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE missing_vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;

-- Base RLS Policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view their own vehicles" ON vehicles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bookings" ON bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view time slots" ON time_slots
    FOR SELECT USING (true);

CREATE POLICY "Only admins can view admin notes" ON admin_notes
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    ));

CREATE POLICY "Only admins can view missing vehicle models" ON missing_vehicle_models
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    ));

CREATE POLICY "Everyone can view vehicle sizes" ON vehicle_sizes
    FOR SELECT USING (true);

-- Rewards RLS Policies
CREATE POLICY "Users can view their own rewards" ON rewards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own reward transactions" ON reward_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert reward transactions" ON reward_transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update rewards" ON rewards
    FOR ALL USING (true);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_booking_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slot_date < current_date THEN
        RAISE EXCEPTION 'Cannot book appointments in the past';
    END IF;
    
    IF NEW.slot_date = current_date AND NEW.slot_time <= current_time THEN
        RAISE EXCEPTION 'Cannot book appointments for times that have already passed';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    NEW.booking_reference = 'BK-' || to_char(NEW.created_at, 'YYYYMMDD') || '-' || 
        substr(md5(NEW.id::text), 1, 6);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_time_slot_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE time_slots
        SET is_available = false
        WHERE id = NEW.time_slot_id;
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status = 'cancelled') THEN
        UPDATE time_slots
        SET is_available = true
        WHERE id = OLD.time_slot_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_reward_tier(points INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF points >= 1000 THEN
        RETURN 'gold';
    ELSIF points >= 500 THEN
        RETURN 'silver';
    ELSE
        RETURN 'bronze';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_reward_tier()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tier = calculate_reward_tier(NEW.points);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_sizes_updated_at
    BEFORE UPDATE ON vehicle_sizes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_slots_updated_at
    BEFORE UPDATE ON time_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_notes_updated_at
    BEFORE UPDATE ON admin_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER validate_booking_time_trigger
    BEFORE INSERT OR UPDATE ON time_slots
    FOR EACH ROW
    EXECUTE FUNCTION validate_booking_time();

CREATE TRIGGER generate_booking_reference_trigger
    BEFORE INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION generate_booking_reference();

CREATE TRIGGER update_time_slot_availability_trigger
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_time_slot_availability();

CREATE TRIGGER update_rewards_updated_at
    BEFORE UPDATE ON rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reward_tier_trigger
    BEFORE INSERT OR UPDATE OF points ON rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_reward_tier();

-- Standard Vehicle Sizes Data
INSERT INTO vehicle_sizes (label, price_pence)
VALUES 
    ('Small', 4999),
    ('Medium', 5999),
    ('Large', 7999),
    ('Extra Large', 9999)
ON CONFLICT (label) 
DO UPDATE SET 
    price_pence = EXCLUDED.price_pence,
    updated_at = TIMEZONE('utc', NOW()); 