-- Migration: Fix Reschedule and Cancellation System
-- Date: 2025-07-13T11:00:00.000Z
-- Description: Ensure proper reschedule and cancellation system with database connections, email notifications, and dashboard indicators

BEGIN;

-- Ensure reschedule_requests table exists with correct schema
CREATE TABLE IF NOT EXISTS reschedule_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_slot_id UUID NOT NULL REFERENCES available_slots(id) ON DELETE CASCADE,
    requested_slot_id UUID NOT NULL REFERENCES available_slots(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'expired', 'cancelled')),
    reason TEXT,
    admin_notes TEXT,
    admin_id UUID REFERENCES users(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_booking_id ON reschedule_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_customer_id ON reschedule_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_expires_at ON reschedule_requests(expires_at);

-- Ensure bookings table has necessary columns for reschedule/cancel tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status_change_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS current_slot_id UUID REFERENCES available_slots(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS original_slot_id UUID REFERENCES available_slots(id);

-- Add indexes for booking tracking
CREATE INDEX IF NOT EXISTS idx_bookings_current_slot_id ON bookings(current_slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status_change ON bookings(last_status_change);

-- Add comment for documentation
COMMENT ON TABLE reschedule_requests IS 'Tracks customer reschedule requests with admin approval workflow';
COMMENT ON TABLE bookings IS 'Enhanced with reschedule/cancel tracking fields';

-- Create function to update slot status when reschedule is approved
CREATE OR REPLACE FUNCTION process_reschedule_approval(
    p_reschedule_request_id UUID,
    p_admin_id UUID,
    p_admin_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_request reschedule_requests%ROWTYPE;
    v_booking bookings%ROWTYPE;
    v_result JSONB;
BEGIN
    -- Get reschedule request
    SELECT * INTO v_request 
    FROM reschedule_requests 
    WHERE id = p_reschedule_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reschedule request not found or already processed');
    END IF;
    
    -- Get booking
    SELECT * INTO v_booking 
    FROM bookings 
    WHERE id = v_request.booking_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
    END IF;
    
    -- Check if requested slot is still available
    IF NOT EXISTS (
        SELECT 1 FROM available_slots 
        WHERE id = v_request.requested_slot_id 
        AND slot_status = 'available'
    ) THEN
        -- Auto-decline if slot is no longer available
        UPDATE reschedule_requests 
        SET status = 'declined',
            admin_notes = 'Requested slot is no longer available',
            admin_id = p_admin_id,
            responded_at = NOW(),
            updated_at = NOW()
        WHERE id = p_reschedule_request_id;
        
        RETURN jsonb_build_object('success', false, 'error', 'Requested slot is no longer available');
    END IF;
    
    -- Start transaction
    BEGIN
        -- 1. Free up original slot
        UPDATE available_slots 
        SET slot_status = 'available', last_modified = NOW()
        WHERE id = v_request.original_slot_id;
        
        -- 2. Book new slot
        UPDATE available_slots 
        SET slot_status = 'booked', last_modified = NOW()
        WHERE id = v_request.requested_slot_id;
        
        -- 3. Update booking with new slot
        UPDATE bookings 
        SET slot_id = v_request.requested_slot_id,
            current_slot_id = v_request.requested_slot_id,
            status = 'confirmed',
            reschedule_count = reschedule_count + 1,
            last_status_change = NOW(),
            status_change_reason = 'Reschedule approved by admin',
            booking_history = booking_history || jsonb_build_object(
                'action', 'reschedule_approved',
                'timestamp', NOW(),
                'admin_id', p_admin_id,
                'old_slot_id', v_request.original_slot_id,
                'new_slot_id', v_request.requested_slot_id,
                'notes', p_admin_notes
            ),
            updated_at = NOW()
        WHERE id = v_request.booking_id;
        
        -- 4. Update reschedule request
        UPDATE reschedule_requests 
        SET status = 'approved',
            admin_notes = p_admin_notes,
            admin_id = p_admin_id,
            responded_at = NOW(),
            updated_at = NOW()
        WHERE id = p_reschedule_request_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Reschedule approved successfully',
            'booking_id', v_request.booking_id,
            'new_slot_id', v_request.requested_slot_id
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Rollback will happen automatically
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Failed to process reschedule: ' || SQLERRM
        );
    END;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process reschedule decline
CREATE OR REPLACE FUNCTION process_reschedule_decline(
    p_reschedule_request_id UUID,
    p_admin_id UUID,
    p_admin_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_request reschedule_requests%ROWTYPE;
    v_result JSONB;
BEGIN
    -- Get reschedule request
    SELECT * INTO v_request 
    FROM reschedule_requests 
    WHERE id = p_reschedule_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reschedule request not found or already processed');
    END IF;
    
    -- Update reschedule request
    UPDATE reschedule_requests 
    SET status = 'declined',
        admin_notes = p_admin_notes,
        admin_id = p_admin_id,
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = p_reschedule_request_id;
    
    -- Update booking history
    UPDATE bookings 
    SET booking_history = booking_history || jsonb_build_object(
            'action', 'reschedule_declined',
            'timestamp', NOW(),
            'admin_id', p_admin_id,
            'requested_slot_id', v_request.requested_slot_id,
            'notes', p_admin_notes
        ),
        updated_at = NOW()
    WHERE id = v_request.booking_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Reschedule request declined',
        'booking_id', v_request.booking_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cancel booking and free slot
CREATE OR REPLACE FUNCTION cancel_booking_and_free_slot(
    p_booking_id UUID,
    p_cancelled_by UUID,
    p_reason TEXT DEFAULT NULL,
    p_refund_amount INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_booking bookings%ROWTYPE;
    v_result JSONB;
BEGIN
    -- Get booking
    SELECT * INTO v_booking 
    FROM bookings 
    WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
    END IF;
    
    -- Check if booking can be cancelled
    IF v_booking.status IN ('cancelled', 'completed', 'no_show') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking cannot be cancelled in current status');
    END IF;
    
    BEGIN
        -- 1. Free up the slot if it exists
        IF v_booking.slot_id IS NOT NULL THEN
            UPDATE available_slots 
            SET slot_status = 'available', last_modified = NOW()
            WHERE id = v_booking.slot_id;
        END IF;
        
        -- 2. Update booking
        UPDATE bookings 
        SET status = 'cancelled',
            last_status_change = NOW(),
            status_change_reason = p_reason,
            booking_history = booking_history || jsonb_build_object(
                'action', 'cancelled',
                'timestamp', NOW(),
                'cancelled_by', p_cancelled_by,
                'reason', p_reason,
                'refund_amount', p_refund_amount
            ),
            updated_at = NOW()
        WHERE id = p_booking_id;
        
        -- 3. Cancel any pending reschedule requests
        UPDATE reschedule_requests 
        SET status = 'cancelled',
            admin_notes = 'Booking was cancelled',
            updated_at = NOW()
        WHERE booking_id = p_booking_id AND status = 'pending';
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Booking cancelled successfully',
            'booking_id', p_booking_id,
            'refund_amount', p_refund_amount
        );
        
    EXCEPTION WHEN OTHERS THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Failed to cancel booking: ' || SQLERRM
        );
    END;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to expire old reschedule requests
CREATE OR REPLACE FUNCTION expire_old_reschedule_requests() RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    UPDATE reschedule_requests 
    SET status = 'expired',
        admin_notes = 'Request expired automatically',
        updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    
    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- Set up RLS policies for reschedule_requests
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Customers can view and create their own reschedule requests
CREATE POLICY "Customers can manage their reschedule requests" ON reschedule_requests
    FOR ALL USING (auth.uid() = customer_id);

-- Admins can view and manage all reschedule requests
CREATE POLICY "Admins can manage all reschedule requests" ON reschedule_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

COMMIT;

-- Migration completed successfully
-- Next steps:
-- 1. Update reschedule API to use proper reschedule_requests table
-- 2. Update cancellation API to use new functions
-- 3. Test email notifications for all flows
-- 4. Update admin dashboard to show reschedule requests