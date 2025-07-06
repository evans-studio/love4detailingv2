-- Cleanup conflicting functions and objects before applying comprehensive refactor
-- This migration removes duplicate or conflicting database objects

-- Drop any duplicate functions that might conflict
DROP FUNCTION IF EXISTS public.create_anonymous_booking(UUID, UUID, INTEGER, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.create_anonymous_booking(UUID, UUID, INTEGER, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.create_anonymous_booking CASCADE;

-- Drop any conflicting booking functions
DROP FUNCTION IF EXISTS public.create_booking_transaction CASCADE;
DROP FUNCTION IF EXISTS public.get_available_slots_for_date CASCADE;
DROP FUNCTION IF EXISTS public.update_booking_status CASCADE;
DROP FUNCTION IF EXISTS public.get_user_booking_history CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_locks CASCADE;
DROP FUNCTION IF EXISTS public.award_booking_points CASCADE;
DROP FUNCTION IF EXISTS public.calculate_reward_tier CASCADE;

-- Drop any conflicting triggers
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
DROP TRIGGER IF EXISTS update_service_pricing_updated_at ON service_pricing;
DROP TRIGGER IF EXISTS update_available_slots_updated_at ON available_slots;
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
DROP TRIGGER IF EXISTS update_customer_rewards_updated_at ON customer_rewards;
DROP TRIGGER IF EXISTS update_vehicle_model_registry_updated_at ON vehicle_model_registry;
DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;

-- Drop the update function if it exists
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;

-- Drop any views that might conflict (we'll recreate them)
DROP VIEW IF EXISTS public.booking_summaries CASCADE;
DROP VIEW IF EXISTS public.user_statistics CASCADE;

-- Clean up any RLS policies that might conflict
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can insert own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow anonymous vehicle creation" ON vehicles;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Admin can manage all bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view own rewards" ON customer_rewards;
DROP POLICY IF EXISTS "System can manage rewards" ON customer_rewards;
DROP POLICY IF EXISTS "Users can view own reward transactions" ON reward_transactions;
DROP POLICY IF EXISTS "Users can view own vehicle photos" ON vehicle_photos;
DROP POLICY IF EXISTS "Users can insert own vehicle photos" ON vehicle_photos;
DROP POLICY IF EXISTS "Public can view services" ON services;
DROP POLICY IF EXISTS "Public can view service pricing" ON service_pricing;
DROP POLICY IF EXISTS "Public can view available slots" ON available_slots;
DROP POLICY IF EXISTS "Public can view system config" ON system_config;
DROP POLICY IF EXISTS "Admin can manage services" ON services;
DROP POLICY IF EXISTS "Admin can manage service pricing" ON service_pricing;
DROP POLICY IF EXISTS "Admin can manage available slots" ON available_slots;
DROP POLICY IF EXISTS "Admin can manage system config" ON system_config;
DROP POLICY IF EXISTS "System can manage booking locks" ON booking_locks;
DROP POLICY IF EXISTS "Public can view vehicle registry" ON vehicle_model_registry;
DROP POLICY IF EXISTS "System can manage vehicle registry" ON vehicle_model_registry;