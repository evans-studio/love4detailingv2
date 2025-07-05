-- Temporarily disable the reward transaction trigger to allow bookings to complete
-- This prevents the constraint violation that's causing bookings to fail after user creation

DROP TRIGGER IF EXISTS create_reward_transaction_trigger ON bookings;

-- We'll re-enable this later with proper constraint handling
-- For now, bookings need to work without automatic reward creation