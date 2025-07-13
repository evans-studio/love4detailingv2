-- Create reschedule_requests table for proper reschedule notification tracking
CREATE TABLE IF NOT EXISTS reschedule_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    original_slot_id UUID REFERENCES available_slots(id) ON DELETE SET NULL,
    requested_slot_id UUID NOT NULL REFERENCES available_slots(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    admin_response TEXT,
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_booking_id ON reschedule_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_customer_id ON reschedule_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_requested_at ON reschedule_requests(requested_at);

-- Enable RLS
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Customers can view their own reschedule requests
CREATE POLICY "Users can view their own reschedule requests"
    ON reschedule_requests FOR SELECT
    USING (customer_id = auth.uid());

-- Customers can create reschedule requests for their own bookings
CREATE POLICY "Users can create reschedule requests for their bookings"
    ON reschedule_requests FOR INSERT
    WITH CHECK (
        customer_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_id AND user_id = auth.uid()
        )
    );

-- Admins can view all reschedule requests
CREATE POLICY "Admins can view all reschedule requests"
    ON reschedule_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Admins can update reschedule requests (approve/reject)
CREATE POLICY "Admins can update reschedule requests"
    ON reschedule_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reschedule_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_reschedule_requests_updated_at
    BEFORE UPDATE ON reschedule_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_reschedule_requests_updated_at();