-- Migration: Add Reschedule Request Procedures
-- Date: 2025-07-13T11:10:00.000Z
-- Description: Add stored procedures for creating and managing reschedule requests

BEGIN;

-- Create function to create reschedule request with proper validation
CREATE OR REPLACE FUNCTION create_reschedule_request(
    p_booking_id UUID,
    p_customer_id UUID,
    p_original_slot_id UUID,
    p_requested_slot_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_booking bookings%ROWTYPE;
    v_requested_slot available_slots%ROWTYPE;
    v_request_id UUID;
    v_result JSONB;
BEGIN
    -- Validate booking exists and belongs to customer
    SELECT * INTO v_booking 
    FROM bookings 
    WHERE id = p_booking_id AND user_id = p_customer_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found or access denied');
    END IF;
    
    -- Validate booking can be rescheduled
    IF v_booking.status NOT IN ('confirmed', 'reschedule_declined') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking cannot be rescheduled in current status: ' || v_booking.status);
    END IF;
    
    -- Check reschedule limit
    IF v_booking.reschedule_count >= 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maximum reschedule limit reached');
    END IF;
    
    -- Validate requested slot exists and is available
    SELECT * INTO v_requested_slot 
    FROM available_slots 
    WHERE id = p_requested_slot_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Requested slot not found');
    END IF;
    
    IF v_requested_slot.slot_status != 'available' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Requested slot is not available');
    END IF;
    
    -- Check for existing pending requests
    IF EXISTS (
        SELECT 1 FROM reschedule_requests 
        WHERE booking_id = p_booking_id AND status = 'pending'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pending reschedule request already exists');
    END IF;
    
    -- Create reschedule request
    BEGIN
        -- Generate new request ID
        v_request_id := gen_random_uuid();
        
        -- Insert reschedule request
        INSERT INTO reschedule_requests (
            id,
            booking_id,
            customer_id,
            original_slot_id,
            requested_slot_id,
            status,
            reason,
            requested_at,
            expires_at
        ) VALUES (
            v_request_id,
            p_booking_id,
            p_customer_id,
            p_original_slot_id,
            p_requested_slot_id,
            'pending',
            p_reason,
            NOW(),
            NOW() + INTERVAL '7 days'
        );
        
        -- Update booking status to reschedule_requested
        UPDATE bookings 
        SET status = 'reschedule_requested',
            last_status_change = NOW(),
            status_change_reason = 'Customer requested reschedule',
            booking_history = booking_history || jsonb_build_object(
                'action', 'reschedule_requested',
                'timestamp', NOW(),
                'customer_id', p_customer_id,
                'original_slot_id', p_original_slot_id,
                'requested_slot_id', p_requested_slot_id,
                'reason', p_reason,
                'request_id', v_request_id
            ),
            updated_at = NOW()
        WHERE id = p_booking_id;
        
        -- Temporarily reserve the requested slot (not fully booked, but reserved for reschedule)
        -- This prevents other customers from booking it while admin decides
        UPDATE available_slots 
        SET slot_status = 'reschedule_reserved',
            last_modified = NOW()
        WHERE id = p_requested_slot_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'request_id', v_request_id,
            'message', 'Reschedule request created successfully'
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Rollback will happen automatically
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Failed to create reschedule request: ' || SQLERRM
        );
    END;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the slot status enum to include reschedule_reserved
ALTER TABLE available_slots DROP CONSTRAINT IF EXISTS available_slots_slot_status_check;
ALTER TABLE available_slots ADD CONSTRAINT available_slots_slot_status_check 
CHECK (slot_status IN ('available', 'booked', 'blocked', 'reschedule_reserved'));

-- Update the process_reschedule_approval function to handle reschedule_reserved status
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
    
    -- Check if requested slot is still reserved for this reschedule
    IF NOT EXISTS (
        SELECT 1 FROM available_slots 
        WHERE id = v_request.requested_slot_id 
        AND slot_status IN ('reschedule_reserved', 'available')
    ) THEN
        -- Auto-decline if slot is no longer available
        UPDATE reschedule_requests 
        SET status = 'declined',
            admin_notes = 'Requested slot is no longer available',
            admin_id = p_admin_id,
            responded_at = NOW(),
            updated_at = NOW()
        WHERE id = p_reschedule_request_id;
        
        -- Release the reservation
        UPDATE available_slots 
        SET slot_status = 'available', last_modified = NOW()
        WHERE id = v_request.requested_slot_id 
        AND slot_status = 'reschedule_reserved';
        
        RETURN jsonb_build_object('success', false, 'error', 'Requested slot is no longer available');
    END IF;
    
    -- Start transaction
    BEGIN
        -- 1. Free up original slot
        UPDATE available_slots 
        SET slot_status = 'available', last_modified = NOW()
        WHERE id = v_request.original_slot_id;
        
        -- 2. Book new slot (change from reschedule_reserved to booked)
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
                'notes', p_admin_notes,
                'request_id', p_reschedule_request_id
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

-- Update the process_reschedule_decline function to release reserved slots
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
    
    BEGIN
        -- 1. Release the reserved slot
        UPDATE available_slots 
        SET slot_status = 'available', last_modified = NOW()
        WHERE id = v_request.requested_slot_id 
        AND slot_status = 'reschedule_reserved';
        
        -- 2. Update reschedule request
        UPDATE reschedule_requests 
        SET status = 'declined',
            admin_notes = p_admin_notes,
            admin_id = p_admin_id,
            responded_at = NOW(),
            updated_at = NOW()
        WHERE id = p_reschedule_request_id;
        
        -- 3. Update booking status back to confirmed
        UPDATE bookings 
        SET status = 'reschedule_declined',
            last_status_change = NOW(),
            status_change_reason = 'Reschedule request declined by admin',
            booking_history = booking_history || jsonb_build_object(
                'action', 'reschedule_declined',
                'timestamp', NOW(),
                'admin_id', p_admin_id,
                'requested_slot_id', v_request.requested_slot_id,
                'notes', p_admin_notes,
                'request_id', p_reschedule_request_id
            ),
            updated_at = NOW()
        WHERE id = v_request.booking_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Reschedule request declined',
            'booking_id', v_request.booking_id
        );
        
    EXCEPTION WHEN OTHERS THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Failed to decline reschedule: ' || SQLERRM
        );
    END;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to automatically expire old reschedule requests and release reserved slots
CREATE OR REPLACE FUNCTION expire_old_reschedule_requests() RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER;
    v_expired_request reschedule_requests%ROWTYPE;
BEGIN
    -- Process each expired request individually to release reserved slots
    FOR v_expired_request IN 
        SELECT * FROM reschedule_requests 
        WHERE status = 'pending' AND expires_at < NOW()
    LOOP
        -- Release the reserved slot
        UPDATE available_slots 
        SET slot_status = 'available', last_modified = NOW()
        WHERE id = v_expired_request.requested_slot_id 
        AND slot_status = 'reschedule_reserved';
        
        -- Update booking status back to confirmed
        UPDATE bookings 
        SET status = 'confirmed',
            last_status_change = NOW(),
            status_change_reason = 'Reschedule request expired',
            booking_history = booking_history || jsonb_build_object(
                'action', 'reschedule_expired',
                'timestamp', NOW(),
                'request_id', v_expired_request.id
            ),
            updated_at = NOW()
        WHERE id = v_expired_request.booking_id;
    END LOOP;
    
    -- Mark all expired requests
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

-- Add comment for slot status documentation
COMMENT ON CONSTRAINT available_slots_slot_status_check ON available_slots IS 
'Slot status: available (open), booked (confirmed booking), blocked (admin disabled), reschedule_reserved (temporarily held for reschedule approval)';

COMMIT;

-- Migration completed successfully
-- Reschedule request procedures are now ready for use