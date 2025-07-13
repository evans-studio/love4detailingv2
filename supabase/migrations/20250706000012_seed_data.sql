-- Seed Data for Love4Detailing v2.0
-- This migration seeds the database with initial data

-- Insert the single service - Full Valet
-- Future services will be added later, but for now only Full Valet exists
INSERT INTO services (code, name, description, base_duration_minutes) VALUES
    ('full_valet', 'Full Valet', 'Complete interior and exterior valet service', 120)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_duration_minutes = EXCLUDED.base_duration_minutes;

-- Insert Full Valet pricing based on vehicle size
-- Prices are determined solely by vehicle size
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
WHERE s.code = 'full_valet'
ON CONFLICT (service_id, vehicle_size) DO UPDATE SET
    price_pence = EXCLUDED.price_pence,
    duration_minutes = EXCLUDED.duration_minutes;

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
    ('payment.bank_transfer_enabled', 'false', 'Enable bank transfer payments')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Generate available slots for the next 30 days
-- This creates a basic schedule from 9 AM to 5 PM with 2-hour slots
DO $$
DECLARE
    iter_date DATE := CURRENT_DATE;
    end_date DATE := CURRENT_DATE + INTERVAL '30 days';
    slot_start TIME;
    slot_end TIME;
    slot_duration INTERVAL := '2 hours';
BEGIN
    -- Clear existing future slots
    DELETE FROM available_slots WHERE slot_date >= CURRENT_DATE;
    
    -- Generate slots for each day
    WHILE iter_date <= end_date LOOP
        -- Skip Sundays (day of week 0)
        IF EXTRACT(DOW FROM iter_date) != 0 THEN
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
                    iter_date,
                    slot_start,
                    slot_end,
                    1,  -- One booking per slot
                    0,  -- No current bookings
                    FALSE
                );
                
                slot_start := slot_start + slot_duration;
            END LOOP;
        END IF;
        
        iter_date := iter_date + INTERVAL '1 day';
    END LOOP;
END $$;

-- Insert common vehicle makes/models with their sizes
-- This helps with automatic size detection
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
    ('Ford', 'Transit Connect', 'extra_large', true)
ON CONFLICT (make, model) DO UPDATE SET
    default_size = EXCLUDED.default_size,
    verified = EXCLUDED.verified;

-- Create a sample admin user (this would be replaced with actual admin creation in production)
-- Note: This is just for development/testing purposes
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, role)
VALUES (
    '12345678-1234-1234-1234-123456789012',
    'admin@love4detailing.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create corresponding user record
INSERT INTO users (id, email, full_name, phone, role, is_active, email_verified_at)
VALUES (
    '12345678-1234-1234-1234-123456789012',
    'admin@love4detailing.com',
    'System Administrator',
    '0123456789',
    'super_admin',
    true,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- Create sample customer rewards for the admin user
INSERT INTO customer_rewards (user_id, customer_email, total_points, points_lifetime, current_tier)
VALUES (
    '12345678-1234-1234-1234-123456789012',
    'admin@love4detailing.com',
    0,
    0,
    'bronze'
) ON CONFLICT (user_id) DO NOTHING;