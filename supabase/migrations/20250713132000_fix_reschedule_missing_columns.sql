-- Fix missing columns in reschedule_requests table
-- The table has an original_date column that's not in our schema

BEGIN;

-- Add missing columns that seem to be required
ALTER TABLE reschedule_requests 
ADD COLUMN IF NOT EXISTS original_date DATE,
ADD COLUMN IF NOT EXISTS original_time TIME,
ADD COLUMN IF NOT EXISTS requested_date DATE,
ADD COLUMN IF NOT EXISTS requested_time TIME;

-- Update existing reschedule_requests to populate these fields from the slots
UPDATE reschedule_requests SET
  original_date = (SELECT slot_date FROM available_slots WHERE id = reschedule_requests.original_slot_id),
  original_time = (SELECT start_time FROM available_slots WHERE id = reschedule_requests.original_slot_id),
  requested_date = (SELECT slot_date FROM available_slots WHERE id = reschedule_requests.requested_slot_id),
  requested_time = (SELECT start_time FROM available_slots WHERE id = reschedule_requests.requested_slot_id)
WHERE original_date IS NULL OR requested_date IS NULL;

-- Update the create_reschedule_request function to populate these fields
CREATE OR REPLACE FUNCTION create_reschedule_request(
    p_booking_id UUID,
    p_customer_id UUID,
    p_original_slot_id UUID,
    p_requested_slot_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_booking bookings%ROWTYPE;
    v_original_slot available_slots%ROWTYPE;
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
    
    -- Get original slot details
    SELECT * INTO v_original_slot 
    FROM available_slots 
    WHERE id = p_original_slot_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Original slot not found');
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
        
        -- Insert reschedule request with all required fields
        INSERT INTO reschedule_requests (
            id,
            booking_id,
            customer_id,
            original_slot_id,
            requested_slot_id,
            original_date,
            original_time,
            requested_date,
            requested_time,
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
            v_original_slot.slot_date,
            v_original_slot.start_time,
            v_requested_slot.slot_date,
            v_requested_slot.start_time,
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

COMMIT;

-- Test the fixed function
DO $$
DECLARE
    v_test_result JSONB;
    v_cleanup_slot_id UUID;
    v_unique_datetime TIMESTAMP;
BEGIN
    -- Generate a unique datetime for testing
    v_unique_datetime := NOW() + INTERVAL '30 days';
    
    -- Create a test slot for the reschedule request with unique datetime
    INSERT INTO available_slots (slot_date, start_time, end_time, slot_status)
    VALUES (v_unique_datetime::DATE, v_unique_datetime::TIME, (v_unique_datetime + INTERVAL '1 hour')::TIME, 'available')
    RETURNING id INTO v_cleanup_slot_id;
    
    RAISE LOG 'Created test slot: %', v_cleanup_slot_id;
    
    -- Test the create_reschedule_request function only if we have valid test data
    IF EXISTS (SELECT 1 FROM bookings LIMIT 1) AND EXISTS (SELECT 1 FROM available_slots WHERE id != v_cleanup_slot_id LIMIT 1) THEN
        SELECT create_reschedule_request(
            (SELECT id FROM bookings LIMIT 1),
            (SELECT user_id FROM bookings LIMIT 1),
            (SELECT id FROM available_slots WHERE id != v_cleanup_slot_id LIMIT 1),
            v_cleanup_slot_id,
            'Test reschedule request with proper columns'
        ) INTO v_test_result;
        
        RAISE LOG 'Test reschedule request result: %', v_test_result;
        
        -- Clean up test data
        IF (v_test_result->>'success')::BOOLEAN THEN
            DELETE FROM reschedule_requests WHERE id = (v_test_result->>'request_id')::UUID;
            RAISE LOG 'Test reschedule request cleaned up';
        END IF;
    ELSE
        RAISE LOG 'Skipping test - insufficient test data';
    END IF;
    
    DELETE FROM available_slots WHERE id = v_cleanup_slot_id;
    RAISE LOG 'Test slot cleaned up';
END;
$$;

COMMENT ON FUNCTION create_reschedule_request IS 'Creates reschedule request with all required columns including original_date, original_time, requested_date, requested_time';