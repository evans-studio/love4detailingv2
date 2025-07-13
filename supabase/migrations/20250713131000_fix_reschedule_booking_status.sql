-- Fix reschedule procedures to use valid booking_status enum values
-- The booking_status enum only contains: pending, confirmed, in_progress, completed, cancelled, no_show

BEGIN;

-- Update booking_status enum to include reschedule-related statuses
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'reschedule_requested';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'reschedule_approved';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'reschedule_declined';

-- Recreate the create_reschedule_request function with proper enum values
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
    
    -- Validate booking can be rescheduled (use confirmed status only for now)
    IF v_booking.status NOT IN ('confirmed') THEN
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
        
        -- Keep booking status as confirmed - we'll track reschedule state via reschedule_requests table
        UPDATE bookings 
        SET last_status_change = NOW(),
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
        
        -- Temporarily reserve the requested slot for reschedule consideration
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

-- Update the decline function to use valid booking status
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
        
        -- 3. Keep booking status as confirmed (they still have their original booking)
        UPDATE bookings 
        SET last_status_change = NOW(),
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

COMMIT;

-- Test the fixed function to make sure it works
DO $$
DECLARE
    v_test_result JSONB;
BEGIN
    -- Test with a valid booking (this should work now)
    SELECT create_reschedule_request(
        '72ab19df-60f5-4020-9e3e-a0a274f36260'::UUID,
        '5a6ffffd-d11f-470d-b65e-2559256a5954'::UUID,
        '765e6acb-85c1-44a4-ba19-791bb6d24665'::UUID,
        '765e6acb-85c1-44a4-ba19-791bb6d24665'::UUID,
        'Test reschedule request after enum fix'
    ) INTO v_test_result;
    
    RAISE LOG 'Test reschedule request result: %', v_test_result;
    
    -- If it created a request, clean it up
    IF (v_test_result->>'success')::BOOLEAN THEN
        DELETE FROM reschedule_requests WHERE id = (v_test_result->>'request_id')::UUID;
        RAISE LOG 'Test reschedule request cleaned up successfully';
    END IF;
END;
$$;

COMMENT ON FUNCTION create_reschedule_request IS 'Creates reschedule request with valid booking_status enum values - fixed to not use invalid enum values';