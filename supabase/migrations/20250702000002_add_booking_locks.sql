-- Create booking_locks table
CREATE TABLE IF NOT EXISTS public.booking_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(slot_date, slot_time)
);

-- Create index for faster expiry checks
CREATE INDEX IF NOT EXISTS idx_booking_locks_expires_at ON booking_locks(expires_at);

-- Enable Row Level Security
ALTER TABLE booking_locks ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all users to read and create locks" ON booking_locks;

-- Create policy to allow all users to read and create locks
CREATE POLICY "Allow all users to read and create locks" ON booking_locks
FOR ALL USING (true); 