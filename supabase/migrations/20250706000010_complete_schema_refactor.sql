-- Complete Database Schema Refactor for Love4Detailing v2.0
-- This migration implements the complete schema as outlined in db-fix.md

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create all enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM (
            'pending', 'confirmed', 'in_progress', 
            'completed', 'cancelled', 'no_show'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'pending', 'processing', 'completed', 
            'failed', 'refunded', 'cancelled'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM (
            'cash', 'card', 'bank_transfer', 'loyalty_points'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'customer', 'admin', 'staff', 'super_admin'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_size') THEN
        CREATE TYPE vehicle_size AS ENUM (
            'small', 'medium', 'large', 'extra_large'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_tier') THEN
        CREATE TYPE reward_tier AS ENUM (
            'bronze', 'silver', 'gold', 'platinum'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_transaction_type') THEN
        CREATE TYPE reward_transaction_type AS ENUM (
            'earned', 'redeemed', 'expired', 'adjusted'
        );
    END IF;
END $$;

-- Create services table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_duration_minutes INTEGER NOT NULL DEFAULT 120,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create service pricing table
CREATE TABLE IF NOT EXISTS service_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    vehicle_size vehicle_size NOT NULL,
    price_pence INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_id, vehicle_size)
);

-- Create available_slots table
CREATE TABLE IF NOT EXISTS available_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_bookings INTEGER DEFAULT 1,
    current_bookings INTEGER DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(slot_date, start_time)
);

-- Create booking_locks table for preventing double bookings
CREATE TABLE IF NOT EXISTS booking_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id UUID REFERENCES available_slots(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    registration VARCHAR(20) NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER,
    color VARCHAR(30),
    size vehicle_size NOT NULL DEFAULT 'medium',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(registration, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create vehicle_photos table
CREATE TABLE IF NOT EXISTS vehicle_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vehicle_model_registry table
CREATE TABLE IF NOT EXISTS vehicle_model_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    default_size vehicle_size NOT NULL DEFAULT 'medium',
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(make, model)
);

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role DEFAULT 'customer',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE RESTRICT,
    slot_id UUID REFERENCES available_slots(id) ON DELETE RESTRICT,
    status booking_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    payment_method payment_method DEFAULT 'cash',
    service_price_pence INTEGER NOT NULL,
    discount_pence INTEGER DEFAULT 0,
    total_price_pence INTEGER NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customer_rewards table
CREATE TABLE IF NOT EXISTS customer_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_email VARCHAR(255) NOT NULL,
    total_points INTEGER DEFAULT 0,
    points_pending INTEGER DEFAULT 0,
    points_lifetime INTEGER DEFAULT 0,
    current_tier reward_tier DEFAULT 'bronze',
    tier_progress INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(customer_email)
);

-- Create reward_transactions table
CREATE TABLE IF NOT EXISTS reward_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_reward_id UUID REFERENCES customer_rewards(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    transaction_type reward_transaction_type NOT NULL,
    points_amount INTEGER NOT NULL,
    description TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_config table
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration);
CREATE INDEX IF NOT EXISTS idx_available_slots_date ON available_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_customer_reward_id ON reward_transactions(customer_reward_id);
CREATE INDEX IF NOT EXISTS idx_booking_locks_expires_at ON booking_locks(expires_at);

-- Create views for common queries
CREATE OR REPLACE VIEW booking_summaries AS
SELECT 
    b.id,
    b.booking_reference,
    b.customer_email,
    b.customer_name,
    b.customer_phone,
    b.status,
    b.payment_status,
    b.payment_method,
    b.total_price_pence,
    b.confirmed_at,
    b.started_at,
    b.completed_at,
    b.cancelled_at,
    b.cancellation_reason,
    b.notes,
    b.created_at,
    b.updated_at,
    s.name as service_name,
    s.code as service_code,
    v.registration as vehicle_registration,
    v.make as vehicle_make,
    v.model as vehicle_model,
    v.size as vehicle_size,
    sl.slot_date,
    sl.start_time,
    sl.end_time,
    u.full_name as user_full_name,
    u.role as user_role
FROM bookings b
JOIN services s ON b.service_id = s.id
JOIN available_slots sl ON b.slot_id = sl.id
LEFT JOIN vehicles v ON b.vehicle_id = v.id
LEFT JOIN users u ON b.user_id = u.id;

CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.phone,
    u.role,
    u.is_active,
    u.created_at,
    u.last_login_at,
    COALESCE(cr.total_points, 0) as total_points,
    COALESCE(cr.current_tier, 'bronze') as current_tier,
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_price_pence END), 0) as total_spent_pence,
    MAX(b.completed_at) as last_service_date,
    COUNT(v.id) as total_vehicles
FROM users u
LEFT JOIN customer_rewards cr ON u.id = cr.user_id
LEFT JOIN bookings b ON u.id = b.user_id
LEFT JOIN vehicles v ON u.id = v.user_id AND v.is_active = true
GROUP BY u.id, u.email, u.full_name, u.phone, u.role, u.is_active, u.created_at, u.last_login_at, cr.total_points, cr.current_tier;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_pricing_updated_at ON service_pricing;
CREATE TRIGGER update_service_pricing_updated_at 
    BEFORE UPDATE ON service_pricing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_available_slots_updated_at ON available_slots;
CREATE TRIGGER update_available_slots_updated_at 
    BEFORE UPDATE ON available_slots 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON vehicles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_rewards_updated_at ON customer_rewards;
CREATE TRIGGER update_customer_rewards_updated_at 
    BEFORE UPDATE ON customer_rewards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicle_model_registry_updated_at ON vehicle_model_registry;
CREATE TRIGGER update_vehicle_model_registry_updated_at 
    BEFORE UPDATE ON vehicle_model_registry 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at 
    BEFORE UPDATE ON system_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Clean up expired booking locks
CREATE OR REPLACE FUNCTION cleanup_expired_booking_locks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM booking_locks
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS VARCHAR AS $$
DECLARE
    ref VARCHAR;
    counter INTEGER;
BEGIN
    -- Generate reference in format BK-YYYYMMDD-NNNN
    SELECT COALESCE(MAX(CAST(SUBSTRING(booking_reference FROM 12) AS INTEGER)), 0) + 1
    INTO counter
    FROM bookings
    WHERE booking_reference LIKE 'BK-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
    
    ref := 'BK-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    
    RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Vehicles: users can manage their own vehicles
CREATE POLICY "Users can view own vehicles" ON vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vehicles" ON vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vehicles" ON vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vehicles" ON vehicles FOR DELETE USING (auth.uid() = user_id);

-- Anonymous vehicle creation for booking flow
CREATE POLICY "Allow anonymous vehicle creation" ON vehicles FOR INSERT WITH CHECK (user_id IS NULL);

-- Bookings: users can view their own bookings, staff can view all
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (
    auth.uid() = user_id OR 
    customer_email = auth.email() OR
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'staff', 'super_admin')
    )
);

CREATE POLICY "Users can create bookings" ON bookings FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    customer_email = auth.email() OR
    user_id IS NULL  -- Allow anonymous bookings
);

CREATE POLICY "Admin can manage all bookings" ON bookings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'staff', 'super_admin')
    )
);

-- Customer rewards: users can view their own rewards
CREATE POLICY "Users can view own rewards" ON customer_rewards FOR SELECT USING (
    auth.uid() = user_id OR 
    customer_email = auth.email()
);

CREATE POLICY "System can manage rewards" ON customer_rewards FOR ALL USING (
    auth.uid() = user_id OR 
    customer_email = auth.email() OR
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'staff', 'super_admin')
    )
);

-- Reward transactions: users can view their own transactions
CREATE POLICY "Users can view own reward transactions" ON reward_transactions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM customer_rewards cr 
        WHERE cr.id = customer_reward_id 
        AND (cr.user_id = auth.uid() OR cr.customer_email = auth.email())
    )
);

-- Vehicle photos: users can manage their own vehicle photos
CREATE POLICY "Users can view own vehicle photos" ON vehicle_photos FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM vehicles v 
        WHERE v.id = vehicle_id 
        AND v.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert own vehicle photos" ON vehicle_photos FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM vehicles v 
        WHERE v.id = vehicle_id 
        AND v.user_id = auth.uid()
    )
);

-- Public read access for service data
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view services" ON services FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view service pricing" ON service_pricing FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view available slots" ON available_slots FOR SELECT USING (true);
CREATE POLICY "Public can view system config" ON system_config FOR SELECT USING (is_active = true);

-- Admin policies for service management
CREATE POLICY "Admin can manage services" ON services FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Admin can manage service pricing" ON service_pricing FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Admin can manage available slots" ON available_slots FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'staff', 'super_admin')
    )
);

CREATE POLICY "Admin can manage system config" ON system_config FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- Booking locks: allow system to manage locks
ALTER TABLE booking_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage booking locks" ON booking_locks FOR ALL USING (true);

-- Vehicle model registry: allow system to manage registry
ALTER TABLE vehicle_model_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view vehicle registry" ON vehicle_model_registry FOR SELECT USING (true);
CREATE POLICY "System can manage vehicle registry" ON vehicle_model_registry FOR ALL USING (true);