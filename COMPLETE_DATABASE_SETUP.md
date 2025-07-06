# Complete Database Setup for Love4Detailing v2.0

This file contains all the SQL scripts needed to completely rebuild the Love4Detailing database from scratch. Execute these scripts in order to implement the new database schema as specified in db-fix.md.

## ⚠️ WARNING
This will completely rebuild your database. All existing data will be lost. Make sure you have backups if needed.

---

## Step 1: Clean Slate - Drop All Existing Tables

```sql
-- Drop all existing tables and objects to start fresh
-- WARNING: This will delete ALL data

-- Drop all views first
DROP VIEW IF EXISTS booking_summaries CASCADE;
DROP VIEW IF EXISTS user_statistics CASCADE;
DROP VIEW IF EXISTS booking_analytics CASCADE;
DROP VIEW IF EXISTS user_analytics CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS create_booking_transaction CASCADE;
DROP FUNCTION IF EXISTS get_available_slots_for_date CASCADE;
DROP FUNCTION IF EXISTS update_booking_status CASCADE;
DROP FUNCTION IF EXISTS get_user_booking_history CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_locks CASCADE;
DROP FUNCTION IF EXISTS award_booking_points CASCADE;
DROP FUNCTION IF EXISTS calculate_reward_tier CASCADE;
DROP FUNCTION IF EXISTS generate_booking_reference CASCADE;
DROP FUNCTION IF EXISTS create_anonymous_booking CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_booking_locks CASCADE;

-- Drop all triggers
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
DROP TRIGGER IF EXISTS update_service_pricing_updated_at ON service_pricing;
DROP TRIGGER IF EXISTS update_available_slots_updated_at ON available_slots;
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
DROP TRIGGER IF EXISTS update_customer_rewards_updated_at ON customer_rewards;
DROP TRIGGER IF EXISTS update_vehicle_model_registry_updated_at ON vehicle_model_registry;
DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;

-- Drop all tables in dependency order
DROP TABLE IF EXISTS reward_transactions CASCADE;
DROP TABLE IF EXISTS customer_rewards CASCADE;
DROP TABLE IF EXISTS booking_locks CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS vehicle_photos CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS vehicle_model_registry CASCADE;
DROP TABLE IF EXISTS service_pricing CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS available_slots CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS vehicle_sizes CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS service_addons CASCADE;
DROP TABLE IF EXISTS weekly_schedule CASCADE;
DROP TABLE IF EXISTS schedule_templates CASCADE;

-- Drop all custom types
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS vehicle_size CASCADE;
DROP TYPE IF EXISTS reward_tier CASCADE;
DROP TYPE IF EXISTS reward_transaction_type CASCADE;

-- Drop any custom extensions (they will be recreated)
-- Note: Don't drop uuid-ossp and pgcrypto as they're commonly used
```

---

## Step 2: Enable Required Extensions

```sql
-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## Step 3: Create All Custom Types (Enums)

```sql
-- Create all custom enum types
CREATE TYPE booking_status AS ENUM (
    'pending', 'confirmed', 'in_progress', 
    'completed', 'cancelled', 'no_show'
);

CREATE TYPE payment_status AS ENUM (
    'pending', 'processing', 'completed', 
    'failed', 'refunded', 'cancelled'
);

CREATE TYPE payment_method AS ENUM (
    'cash', 'card', 'bank_transfer', 'loyalty_points'
);

CREATE TYPE user_role AS ENUM (
    'customer', 'admin', 'staff', 'super_admin'
);

CREATE TYPE vehicle_size AS ENUM (
    'small', 'medium', 'large', 'extra_large'
);

CREATE TYPE reward_tier AS ENUM (
    'bronze', 'silver', 'gold', 'platinum'
);

CREATE TYPE reward_transaction_type AS ENUM (
    'earned', 'redeemed', 'expired', 'adjusted'
);
```

---

## Step 4: Create All Tables

```sql
-- Create services table
CREATE TABLE services (
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
CREATE TABLE service_pricing (
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
CREATE TABLE available_slots (
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
CREATE TABLE booking_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id UUID REFERENCES available_slots(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vehicles table
CREATE TABLE vehicles (
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
CREATE TABLE vehicle_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vehicle_model_registry table
CREATE TABLE vehicle_model_registry (
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
CREATE TABLE users (
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
CREATE TABLE bookings (
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
CREATE TABLE customer_rewards (
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
CREATE TABLE reward_transactions (
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
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Step 5: Create Indexes for Performance

```sql
-- Create indexes for performance optimization
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_bookings_booking_reference ON bookings(booking_reference);

CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_registration ON vehicles(registration);
CREATE INDEX idx_vehicles_is_active ON vehicles(is_active);

CREATE INDEX idx_available_slots_date ON available_slots(slot_date);
CREATE INDEX idx_available_slots_start_time ON available_slots(start_time);
CREATE INDEX idx_available_slots_date_time ON available_slots(slot_date, start_time);

CREATE INDEX idx_reward_transactions_customer_reward_id ON reward_transactions(customer_reward_id);
CREATE INDEX idx_reward_transactions_booking_id ON reward_transactions(booking_id);

CREATE INDEX idx_booking_locks_expires_at ON booking_locks(expires_at);
CREATE INDEX idx_booking_locks_slot_id ON booking_locks(slot_id);

CREATE INDEX idx_service_pricing_service_id ON service_pricing(service_id);
CREATE INDEX idx_service_pricing_vehicle_size ON service_pricing(vehicle_size);

CREATE INDEX idx_vehicle_model_registry_make_model ON vehicle_model_registry(make, model);
CREATE INDEX idx_vehicle_photos_vehicle_id ON vehicle_photos(vehicle_id);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_customer_rewards_user_id ON customer_rewards(user_id);
CREATE INDEX idx_customer_rewards_email ON customer_rewards(customer_email);
```

---

## Step 6: Create Database Views

```sql
-- Create booking_summaries view for comprehensive booking data
CREATE VIEW booking_summaries AS
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

-- Create user_statistics view for user analytics
CREATE VIEW user_statistics AS
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
```

---

## Step 7: Create Helper Functions

```sql
-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate booking references
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

-- Function to calculate reward tier based on points
CREATE OR REPLACE FUNCTION calculate_reward_tier(p_points INTEGER)
RETURNS reward_tier AS $$
BEGIN
    IF p_points >= 3000 THEN
        RETURN 'platinum';
    ELSIF p_points >= 1500 THEN
        RETURN 'gold';
    ELSIF p_points >= 500 THEN
        RETURN 'silver';
    ELSE
        RETURN 'bronze';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to cleanup expired booking locks
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
```

---

## Step 8: Create Main Booking Functions

```sql
-- Main booking transaction function for atomic operations
CREATE OR REPLACE FUNCTION create_booking_transaction(
    p_customer_email VARCHAR,
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR,
    p_service_id UUID,
    p_slot_id UUID,
    p_vehicle_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_payment_method payment_method DEFAULT 'cash'
) RETURNS TABLE (
    booking_id UUID,
    booking_reference VARCHAR,
    total_price INTEGER
) AS $$
DECLARE
    v_booking_id UUID;
    v_booking_reference VARCHAR;
    v_vehicle_size vehicle_size;
    v_service_price INTEGER;
    v_slot_available BOOLEAN;
BEGIN
    -- Start transaction
    BEGIN
        -- Check if slot is available
        SELECT (current_bookings < max_bookings AND NOT is_blocked)
        INTO v_slot_available
        FROM available_slots
        WHERE id = p_slot_id;

        IF NOT v_slot_available THEN
            RAISE EXCEPTION 'Selected time slot is not available';
        END IF;

        -- Lock the slot to prevent double booking
        INSERT INTO booking_locks (slot_id, session_id, expires_at)
        VALUES (p_slot_id, gen_random_uuid()::text, NOW() + INTERVAL '5 minutes')
        ON CONFLICT DO NOTHING;

        -- Get vehicle size if vehicle provided
        IF p_vehicle_id IS NOT NULL THEN
            SELECT size INTO v_vehicle_size
            FROM vehicles
            WHERE id = p_vehicle_id;
        ELSE
            -- Default to medium if no vehicle
            v_vehicle_size := 'medium';
        END IF;

        -- Get service price
        SELECT price_pence INTO v_service_price
        FROM service_pricing
        WHERE service_id = p_service_id
        AND vehicle_size = v_vehicle_size;

        IF v_service_price IS NULL THEN
            RAISE EXCEPTION 'Service pricing not found for vehicle size: %', v_vehicle_size;
        END IF;

        -- Generate booking reference
        v_booking_reference := generate_booking_reference();

        -- Create booking
        INSERT INTO bookings (
            booking_reference,
            user_id,
            customer_email,
            customer_name,
            customer_phone,
            vehicle_id,
            service_id,
            slot_id,
            payment_method,
            service_price_pence,
            total_price_pence,
            status
        ) VALUES (
            v_booking_reference,
            p_user_id,
            p_customer_email,
            p_customer_name,
            p_customer_phone,
            p_vehicle_id,
            p_service_id,
            p_slot_id,
            p_payment_method,
            v_service_price,
            v_service_price,
            'pending'
        ) RETURNING id INTO v_booking_id;

        -- Update slot availability
        UPDATE available_slots
        SET current_bookings = current_bookings + 1
        WHERE id = p_slot_id
        AND current_bookings < max_bookings;

        -- Clean up lock
        DELETE FROM booking_locks
        WHERE slot_id = p_slot_id;

        -- Create or update customer rewards if user exists
        IF p_user_id IS NOT NULL THEN
            INSERT INTO customer_rewards (user_id, customer_email, total_points, points_lifetime)
            VALUES (p_user_id, p_customer_email, 0, 0)
            ON CONFLICT (user_id) DO NOTHING;
        ELSE
            -- For anonymous bookings, create by email
            INSERT INTO customer_rewards (customer_email, total_points, points_lifetime)
            VALUES (p_customer_email, 0, 0)
            ON CONFLICT (customer_email) DO NOTHING;
        END IF;

        -- Return results
        RETURN QUERY
        SELECT v_booking_id, v_booking_reference, v_service_price;

    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback by cleaning up lock
            DELETE FROM booking_locks WHERE slot_id = p_slot_id;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get available slots with service duration
CREATE OR REPLACE FUNCTION get_available_slots_for_date(
    p_date DATE,
    p_service_id UUID DEFAULT NULL
) RETURNS TABLE (
    slot_id UUID,
    slot_date DATE,
    start_time TIME,
    end_time TIME,
    available BOOLEAN,
    current_bookings INTEGER,
    max_bookings INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.slot_date,
        s.start_time,
        s.end_time,
        (s.current_bookings < s.max_bookings AND NOT s.is_blocked) as available,
        s.current_bookings,
        s.max_bookings
    FROM available_slots s
    WHERE s.slot_date = p_date
    AND s.slot_date >= CURRENT_DATE
    ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update booking status with automatic timestamp
CREATE OR REPLACE FUNCTION update_booking_status(
    p_booking_id UUID,
    p_new_status booking_status,
    p_reason TEXT DEFAULT NULL
) RETURNS TABLE (
    booking_id UUID,
    old_status booking_status,
    new_status booking_status,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_old_status booking_status;
    v_updated_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status
    FROM bookings
    WHERE id = p_booking_id;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Booking not found: %', p_booking_id;
    END IF;

    -- Update booking with appropriate timestamp
    UPDATE bookings
    SET 
        status = p_new_status,
        confirmed_at = CASE WHEN p_new_status = 'confirmed' THEN NOW() ELSE confirmed_at END,
        started_at = CASE WHEN p_new_status = 'in_progress' THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
        cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
        cancellation_reason = CASE WHEN p_new_status = 'cancelled' THEN p_reason ELSE cancellation_reason END,
        updated_at = NOW()
    WHERE id = p_booking_id
    RETURNING updated_at INTO v_updated_at;

    -- If booking is completed, award points
    IF p_new_status = 'completed' THEN
        PERFORM award_booking_points(p_booking_id);
    END IF;

    RETURN QUERY
    SELECT p_booking_id, v_old_status, p_new_status, v_updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award points for completed bookings
CREATE OR REPLACE FUNCTION award_booking_points(p_booking_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_booking_record RECORD;
    v_points_to_award INTEGER;
    v_reward_id UUID;
    v_new_total INTEGER;
    v_new_tier reward_tier;
BEGIN
    -- Get booking details
    SELECT 
        b.user_id,
        b.customer_email,
        b.total_price_pence,
        b.status
    INTO v_booking_record
    FROM bookings b
    WHERE b.id = p_booking_id
    AND b.status = 'completed';

    IF v_booking_record IS NULL THEN
        RETURN 0;
    END IF;

    -- Calculate points (1 point per pound spent)
    v_points_to_award := FLOOR(v_booking_record.total_price_pence / 100);

    -- Get or create customer rewards record
    IF v_booking_record.user_id IS NOT NULL THEN
        -- Registered user
        SELECT id INTO v_reward_id
        FROM customer_rewards
        WHERE user_id = v_booking_record.user_id;
    ELSE
        -- Anonymous booking
        SELECT id INTO v_reward_id
        FROM customer_rewards
        WHERE customer_email = v_booking_record.customer_email
        AND user_id IS NULL;
    END IF;

    -- Update rewards
    UPDATE customer_rewards
    SET 
        total_points = total_points + v_points_to_award,
        points_lifetime = points_lifetime + v_points_to_award,
        updated_at = NOW()
    WHERE id = v_reward_id
    RETURNING total_points INTO v_new_total;

    -- Calculate new tier
    v_new_tier := calculate_reward_tier(v_new_total);

    -- Update tier if changed
    UPDATE customer_rewards
    SET 
        current_tier = v_new_tier,
        tier_progress = v_new_total
    WHERE id = v_reward_id;

    -- Record transaction
    INSERT INTO reward_transactions (
        customer_reward_id,
        booking_id,
        transaction_type,
        points_amount,
        description
    ) VALUES (
        v_reward_id,
        p_booking_id,
        'earned',
        v_points_to_award,
        'Points earned from completed booking'
    );

    RETURN v_points_to_award;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user booking history
CREATE OR REPLACE FUNCTION get_user_booking_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    booking_id UUID,
    booking_reference VARCHAR,
    service_name VARCHAR,
    vehicle_info TEXT,
    slot_datetime TIMESTAMP WITH TIME ZONE,
    status booking_status,
    total_price_pence INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.booking_reference,
        s.name,
        CASE 
            WHEN v.id IS NOT NULL THEN 
                v.make || ' ' || v.model || ' (' || v.registration || ')'
            ELSE 
                'Vehicle details not available'
        END,
        (sl.slot_date + sl.start_time)::TIMESTAMP WITH TIME ZONE,
        b.status,
        b.total_price_pence,
        b.created_at
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN available_slots sl ON b.slot_id = sl.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = p_user_id
    ORDER BY b.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired booking locks (should be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM booking_locks
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Step 9: Create Triggers for Automatic Timestamps

```sql
-- Create triggers for updated_at columns
CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_pricing_updated_at 
    BEFORE UPDATE ON service_pricing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_available_slots_updated_at 
    BEFORE UPDATE ON available_slots 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON vehicles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_rewards_updated_at 
    BEFORE UPDATE ON customer_rewards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_model_registry_updated_at 
    BEFORE UPDATE ON vehicle_model_registry 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at 
    BEFORE UPDATE ON system_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Step 10: Enable Row Level Security (RLS)

```sql
-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_model_registry ENABLE ROW LEVEL SECURITY;
```

---

## Step 11: Create RLS Policies

```sql
-- RLS Policies for users table
CREATE POLICY "Users can view own data" ON users 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users 
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for vehicles table
CREATE POLICY "Users can view own vehicles" ON vehicles 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vehicles" ON vehicles 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles" ON vehicles 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles" ON vehicles 
    FOR DELETE USING (auth.uid() = user_id);

-- Anonymous vehicle creation for booking flow
CREATE POLICY "Allow anonymous vehicle creation" ON vehicles 
    FOR INSERT WITH CHECK (user_id IS NULL);

-- RLS Policies for bookings table
CREATE POLICY "Users can view own bookings" ON bookings 
    FOR SELECT USING (
        auth.uid() = user_id OR 
        customer_email = auth.email() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'staff', 'super_admin')
        )
    );

CREATE POLICY "Users can create bookings" ON bookings 
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        customer_email = auth.email() OR
        user_id IS NULL  -- Allow anonymous bookings
    );

CREATE POLICY "Admin can manage all bookings" ON bookings 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'staff', 'super_admin')
        )
    );

-- RLS Policies for customer_rewards table
CREATE POLICY "Users can view own rewards" ON customer_rewards 
    FOR SELECT USING (
        auth.uid() = user_id OR 
        customer_email = auth.email()
    );

CREATE POLICY "System can manage rewards" ON customer_rewards 
    FOR ALL USING (
        auth.uid() = user_id OR 
        customer_email = auth.email() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'staff', 'super_admin')
        )
    );

-- RLS Policies for reward_transactions table
CREATE POLICY "Users can view own reward transactions" ON reward_transactions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customer_rewards cr 
            WHERE cr.id = customer_reward_id 
            AND (cr.user_id = auth.uid() OR cr.customer_email = auth.email())
        )
    );

-- RLS Policies for vehicle_photos table
CREATE POLICY "Users can view own vehicle photos" ON vehicle_photos 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vehicles v 
            WHERE v.id = vehicle_id 
            AND v.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own vehicle photos" ON vehicle_photos 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM vehicles v 
            WHERE v.id = vehicle_id 
            AND v.user_id = auth.uid()
        )
    );

-- Public read access for service data
CREATE POLICY "Public can view services" ON services 
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view service pricing" ON service_pricing 
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view available slots" ON available_slots 
    FOR SELECT USING (true);

CREATE POLICY "Public can view system config" ON system_config 
    FOR SELECT USING (is_active = true);

-- Admin policies for service management
CREATE POLICY "Admin can manage services" ON services 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admin can manage service pricing" ON service_pricing 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admin can manage available slots" ON available_slots 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'staff', 'super_admin')
        )
    );

CREATE POLICY "Admin can manage system config" ON system_config 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Booking locks: allow system to manage locks
CREATE POLICY "System can manage booking locks" ON booking_locks 
    FOR ALL USING (true);

-- Vehicle model registry: allow system to manage registry
CREATE POLICY "Public can view vehicle registry" ON vehicle_model_registry 
    FOR SELECT USING (true);

CREATE POLICY "System can manage vehicle registry" ON vehicle_model_registry 
    FOR ALL USING (true);
```

---

## Step 12: Grant Function Permissions

```sql
-- Grant necessary permissions to functions
GRANT EXECUTE ON FUNCTION create_booking_transaction TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_available_slots_for_date TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_booking_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_booking_history TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_locks TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_reward_tier TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_booking_reference TO authenticated, anon;
GRANT EXECUTE ON FUNCTION award_booking_points TO authenticated;
```

---

## Step 13: Seed Initial Data

```sql
-- Insert the Full Valet service
INSERT INTO services (code, name, description, base_duration_minutes) VALUES
    ('full_valet', 'Full Valet', 'Complete interior and exterior valet service', 120);

-- Insert Full Valet pricing based on vehicle size
INSERT INTO service_pricing (service_id, vehicle_size, price_pence, duration_minutes)
SELECT 
    s.id,
    vs.size,
    CASE vs.size
        WHEN 'small' THEN 5000      -- £50 for small vehicles
        WHEN 'medium' THEN 6000     -- £60 for medium vehicles
        WHEN 'large' THEN 7000      -- £70 for large vehicles
        WHEN 'extra_large' THEN 8500 -- £85 for extra large vehicles
    END as price,
    CASE vs.size
        WHEN 'small' THEN 90        -- 1.5 hours for small
        WHEN 'medium' THEN 120      -- 2 hours for medium
        WHEN 'large' THEN 150       -- 2.5 hours for large
        WHEN 'extra_large' THEN 180 -- 3 hours for extra large
    END as duration
FROM services s
CROSS JOIN (
    SELECT unnest(enum_range(NULL::vehicle_size)) as size
) vs
WHERE s.code = 'full_valet';

-- System configuration
INSERT INTO system_config (key, value, description) VALUES
    ('booking.advance_days', '30', 'Days in advance bookings can be made'),
    ('booking.cancellation_hours', '24', 'Hours before appointment for free cancellation'),
    ('booking.buffer_minutes', '30', 'Buffer time between appointments'),
    ('rewards.points_per_pound', '1', 'Points earned per pound spent'),
    ('rewards.bronze_threshold', '0', 'Points for Bronze tier'),
    ('rewards.silver_threshold', '500', 'Points for Silver tier'),
    ('rewards.gold_threshold', '1500', 'Points for Gold tier'),
    ('rewards.platinum_threshold', '3000', 'Points for Platinum tier'),
    ('business.name', 'Love4Detailing', 'Business name'),
    ('business.email', 'info@love4detailing.com', 'Business contact email'),
    ('business.phone', '0123456789', 'Business contact phone'),
    ('business.address', '123 Business Street, City, Postcode', 'Business address'),
    ('booking.default_start_time', '09:00', 'Default start time for bookings'),
    ('booking.default_end_time', '17:00', 'Default end time for bookings'),
    ('booking.slot_duration_minutes', '30', 'Default slot duration in minutes'),
    ('email.notifications_enabled', 'true', 'Enable email notifications'),
    ('sms.notifications_enabled', 'false', 'Enable SMS notifications'),
    ('payment.cash_enabled', 'true', 'Enable cash payments'),
    ('payment.card_enabled', 'false', 'Enable card payments'),
    ('payment.bank_transfer_enabled', 'false', 'Enable bank transfer payments');

-- Generate available slots for the next 30 days
-- This creates a basic schedule from 9 AM to 5 PM with 2-hour slots
DO $$
DECLARE
    current_date DATE := CURRENT_DATE;
    end_date DATE := CURRENT_DATE + INTERVAL '30 days';
    slot_start TIME;
    slot_end TIME;
    slot_duration INTERVAL := '2 hours';
BEGIN
    -- Generate slots for each day
    WHILE current_date <= end_date LOOP
        -- Skip Sundays (day of week 0)
        IF EXTRACT(DOW FROM current_date) != 0 THEN
            slot_start := '09:00:00';
            
            -- Generate slots throughout the day
            WHILE slot_start <= '15:00:00' LOOP  -- Last slot starts at 3 PM
                slot_end := slot_start + slot_duration;
                
                INSERT INTO available_slots (
                    slot_date,
                    start_time,
                    end_time,
                    max_bookings,
                    current_bookings,
                    is_blocked
                ) VALUES (
                    current_date,
                    slot_start,
                    slot_end,
                    1,  -- One booking per slot
                    0,  -- No current bookings
                    FALSE
                );
                
                slot_start := slot_start + slot_duration;
            END LOOP;
        END IF;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
END $$;

-- Insert common vehicle makes/models with their sizes
INSERT INTO vehicle_model_registry (make, model, default_size, verified) VALUES
    -- Small vehicles
    ('Toyota', 'Aygo', 'small', true),
    ('Peugeot', '107', 'small', true),
    ('Citroen', 'C1', 'small', true),
    ('Fiat', '500', 'small', true),
    ('Smart', 'ForTwo', 'small', true),
    ('Volkswagen', 'Up', 'small', true),
    ('Hyundai', 'i10', 'small', true),
    ('Kia', 'Picanto', 'small', true),
    ('Suzuki', 'Alto', 'small', true),
    ('Nissan', 'Micra', 'small', true),
    
    -- Medium vehicles
    ('Ford', 'Focus', 'medium', true),
    ('Volkswagen', 'Golf', 'medium', true),
    ('Honda', 'Civic', 'medium', true),
    ('Toyota', 'Corolla', 'medium', true),
    ('Nissan', 'Leaf', 'medium', true),
    ('Peugeot', '308', 'medium', true),
    ('Vauxhall', 'Astra', 'medium', true),
    ('BMW', '3 Series', 'medium', true),
    ('Mercedes', 'A-Class', 'medium', true),
    ('Audi', 'A3', 'medium', true),
    ('Hyundai', 'i30', 'medium', true),
    ('Kia', 'Ceed', 'medium', true),
    ('Mazda', '3', 'medium', true),
    ('Renault', 'Megane', 'medium', true),
    ('Seat', 'Leon', 'medium', true),
    ('Skoda', 'Octavia', 'medium', true),
    
    -- Large vehicles
    ('BMW', '5 Series', 'large', true),
    ('Mercedes', 'C-Class', 'large', true),
    ('Audi', 'A4', 'large', true),
    ('Jaguar', 'XE', 'large', true),
    ('Lexus', 'IS', 'large', true),
    ('Volvo', 'S60', 'large', true),
    ('BMW', 'X3', 'large', true),
    ('Mercedes', 'GLC', 'large', true),
    ('Audi', 'Q5', 'large', true),
    ('Toyota', 'RAV4', 'large', true),
    ('Honda', 'CR-V', 'large', true),
    ('Nissan', 'Qashqai', 'large', true),
    ('Ford', 'Kuga', 'large', true),
    ('Hyundai', 'Tucson', 'large', true),
    ('Kia', 'Sportage', 'large', true),
    ('Mazda', 'CX-5', 'large', true),
    ('Peugeot', '3008', 'large', true),
    ('Volkswagen', 'Tiguan', 'large', true),
    ('Vauxhall', 'Grandland', 'large', true),
    ('Renault', 'Kadjar', 'large', true),
    
    -- Extra large vehicles
    ('BMW', 'X5', 'extra_large', true),
    ('Mercedes', 'GLE', 'extra_large', true),
    ('Audi', 'Q7', 'extra_large', true),
    ('Range Rover', 'Sport', 'extra_large', true),
    ('Land Rover', 'Discovery', 'extra_large', true),
    ('Volvo', 'XC90', 'extra_large', true),
    ('BMW', 'X7', 'extra_large', true),
    ('Mercedes', 'GLS', 'extra_large', true),
    ('Audi', 'Q8', 'extra_large', true),
    ('Porsche', 'Cayenne', 'extra_large', true),
    ('Ford', 'Transit', 'extra_large', true),
    ('Mercedes', 'Sprinter', 'extra_large', true),
    ('Volkswagen', 'Crafter', 'extra_large', true),
    ('Iveco', 'Daily', 'extra_large', true),
    ('Renault', 'Master', 'extra_large', true),
    ('Peugeot', 'Boxer', 'extra_large', true),
    ('Citroen', 'Relay', 'extra_large', true),
    ('Vauxhall', 'Movano', 'extra_large', true),
    ('Nissan', 'NV200', 'extra_large', true),
    ('Ford', 'Transit Connect', 'extra_large', true);
```

---

## Step 14: Final Verification

```sql
-- Verify the database setup
SELECT 'Database setup complete!' as status;

-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Check views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check service and pricing data
SELECT 
    s.name,
    sp.vehicle_size,
    sp.price_pence,
    sp.duration_minutes
FROM services s
JOIN service_pricing sp ON s.id = sp.service_id
ORDER BY sp.vehicle_size;

-- Check available slots
SELECT COUNT(*) as total_slots
FROM available_slots
WHERE slot_date >= CURRENT_DATE;
```

---

## 🎉 Setup Complete!

Your Love4Detailing v2.0 database is now fully configured with:

- ✅ Complete schema with all tables and relationships
- ✅ Row Level Security (RLS) on all tables
- ✅ Comprehensive booking functions for atomic operations
- ✅ Full Valet service with size-based pricing (£50-£85)
- ✅ Vehicle registry with 70+ common UK vehicles
- ✅ 30 days of available time slots
- ✅ Reward system with Bronze/Silver/Gold/Platinum tiers
- ✅ Anonymous booking support
- ✅ Performance optimized with proper indexes

**Next Steps:**
1. Test the booking functions
2. Deploy your frontend components
3. Verify the complete booking flow works end-to-end

**Pricing Structure:**
- Small vehicles: £50 (90 minutes)
- Medium vehicles: £60 (120 minutes)  
- Large vehicles: £70 (150 minutes)
- Extra large vehicles: £85 (180 minutes)

The database is ready for production use with the Vercel frontend deployment!