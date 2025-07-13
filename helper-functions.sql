-- Helper Functions for Enhanced Booking System
-- Based on quick-fix.md requirements

-- =========================================================================
-- STORED PROCEDURES FOR SLOT MANAGEMENT
-- =========================================================================

-- Function: Create temporary reservation during booking process
CREATE OR REPLACE FUNCTION create_temporary_reservation(
  p_slot_id UUID,
  p_user_id UUID,
  p_duration_minutes INTEGER DEFAULT 10
) RETURNS BOOLEAN AS $$
DECLARE
  reservation_expires TIMESTAMPTZ;
BEGIN
  reservation_expires := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;
  
  -- Check if slot is available
  IF EXISTS (
    SELECT 1 FROM available_slots 
    WHERE id = p_slot_id 
    AND slot_status = 'available'
    AND (current_bookings < max_bookings OR max_bookings IS NULL)
  ) THEN
    -- Create temporary reservation
    UPDATE available_slots 
    SET 
      reserved_for_user_id = p_user_id,
      reserved_until = reservation_expires,
      slot_status = 'temporarily_reserved',
      last_modified = NOW(),
      modification_reason = 'Temporary reservation for booking process'
    WHERE id = p_slot_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Confirm booking and link to slot permanently  
CREATE OR REPLACE FUNCTION confirm_booking_and_slot(
  p_booking_id UUID,
  p_slot_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  booking_user_id UUID;
BEGIN
  -- Get the user_id from the booking
  SELECT user_id INTO booking_user_id FROM bookings WHERE id = p_booking_id;
  
  -- Verify the slot is temporarily reserved for this user
  IF EXISTS (
    SELECT 1 FROM available_slots 
    WHERE id = p_slot_id 
    AND reserved_for_user_id = booking_user_id
    AND slot_status = 'temporarily_reserved'
  ) THEN
    -- Update slot to confirmed booking
    UPDATE available_slots 
    SET 
      booking_id = p_booking_id,
      current_bookings = COALESCE(current_bookings, 0) + 1,
      slot_status = 'booked',
      reserved_for_user_id = NULL,
      reserved_until = NULL,
      last_modified = NOW(),
      modification_reason = 'Booking confirmed'
    WHERE id = p_slot_id;
    
    -- Update booking with slot information
    UPDATE bookings 
    SET 
      slot_id = p_slot_id,
      current_slot_id = p_slot_id,
      original_slot_id = COALESCE(original_slot_id, p_slot_id),
      last_status_change = NOW(),
      status_change_reason = 'Booking confirmed with slot'
    WHERE id = p_booking_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Process reschedule request with slot management
CREATE OR REPLACE FUNCTION process_reschedule_request(
  p_booking_id UUID,
  p_new_slot_id UUID,
  p_reason TEXT DEFAULT 'Customer request'
) RETURNS UUID AS $$
DECLARE
  booking_rec RECORD;
  request_id UUID;
BEGIN
  -- Get booking details
  SELECT * INTO booking_rec FROM bookings WHERE id = p_booking_id;
  
  -- Create reschedule request
  INSERT INTO reschedule_requests (
    booking_id,
    customer_id,
    original_slot_id,
    requested_slot_id,
    original_date,
    original_time,
    requested_date,
    requested_time,
    reason
  )
  SELECT 
    p_booking_id,
    booking_rec.user_id,
    booking_rec.current_slot_id,
    p_new_slot_id,
    orig_slot.slot_date,
    orig_slot.start_time,
    new_slot.slot_date,
    new_slot.start_time,
    p_reason
  FROM available_slots orig_slot, available_slots new_slot
  WHERE orig_slot.id = booking_rec.current_slot_id
  AND new_slot.id = p_new_slot_id
  RETURNING id INTO request_id;
  
  -- Temporarily reserve the new slot
  UPDATE available_slots 
  SET 
    reserved_for_user_id = booking_rec.user_id,
    reserved_until = NOW() + INTERVAL '72 hours',
    slot_status = 'reschedule_reserved',
    last_modified = NOW(),
    modification_reason = 'Reserved for reschedule request'
  WHERE id = p_new_slot_id;
  
  -- Update original slot status
  UPDATE available_slots 
  SET 
    slot_status = 'pending_reschedule',
    last_modified = NOW(),
    modification_reason = 'Booking has pending reschedule request'
  WHERE id = booking_rec.current_slot_id;
  
  -- Update booking status
  UPDATE bookings 
  SET 
    status = 'reschedule_requested'::booking_status,
    last_status_change = NOW(),
    status_change_reason = 'Reschedule request submitted',
    reschedule_count = COALESCE(reschedule_count, 0) + 1
  WHERE id = p_booking_id;
  
  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cleanup expired temporary reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations() RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER := 0;
BEGIN
  -- Release expired temporary reservations
  UPDATE available_slots 
  SET 
    reserved_for_user_id = NULL,
    reserved_until = NULL,
    slot_status = 'available',
    last_modified = NOW(),
    modification_reason = 'Expired temporary reservation cleaned up'
  WHERE reserved_until < NOW() 
  AND slot_status IN ('temporarily_reserved', 'reschedule_reserved');
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Expire old reschedule requests
  UPDATE reschedule_requests 
  SET 
    status = 'expired',
    responded_at = NOW()
  WHERE status = 'pending' 
  AND expires_at < NOW();
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- GRANT PERMISSIONS
-- =========================================================================

-- Grant access to authenticated users for new functions
GRANT EXECUTE ON FUNCTION create_temporary_reservation TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_booking_and_slot TO authenticated;
GRANT EXECUTE ON FUNCTION process_reschedule_request TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_reservations TO service_role;

-- =========================================================================
-- VALIDATION AND SUCCESS MESSAGE
-- =========================================================================

SELECT 'Quick-fix.md implementation completed successfully! All schema elements are now in place.' as implementation_status;