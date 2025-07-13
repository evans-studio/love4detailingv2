-- Fix booking-slot relationship by creating proper booking transaction procedure
-- This addresses the critical issue where booking_id is not stored in available_slots

-- Create function to handle complete booking creation with slot relationship
CREATE OR REPLACE FUNCTION create_booking_with_slot_update(
  p_customer_data JSONB,
  p_vehicle_data JSONB,
  p_booking_data JSONB,
  p_pricing JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_booking_reference TEXT;
  v_vehicle_id UUID;
  v_slot_id UUID;
  v_user_id UUID DEFAULT NULL;
  v_result JSONB;
BEGIN
  -- Extract slot_id from booking data
  v_slot_id := (p_booking_data->>'slot_id')::UUID;
  
  -- Generate booking reference
  v_booking_reference := 'L4D' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  
  -- Get or extract user_id from customer data
  IF p_customer_data ? 'user_id' AND (p_customer_data->>'user_id') IS NOT NULL THEN
    v_user_id := (p_customer_data->>'user_id')::UUID;
  END IF;
  
  -- Step 1: Validate slot is available
  IF NOT EXISTS (
    SELECT 1 FROM available_slots 
    WHERE id = v_slot_id 
    AND slot_status = 'available'
    AND booking_id IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Selected time slot is no longer available'
    );
  END IF;
  
  -- Step 2: Create or get vehicle
  SELECT id INTO v_vehicle_id
  FROM vehicles 
  WHERE registration = UPPER(p_vehicle_data->>'registration')
  AND (v_user_id IS NULL OR user_id = v_user_id OR user_id IS NULL);
  
  IF v_vehicle_id IS NULL THEN
    -- Create new vehicle
    INSERT INTO vehicles (
      user_id,
      registration,
      make,
      model,
      year,
      color,
      size,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      UPPER(p_vehicle_data->>'registration'),
      p_vehicle_data->>'make',
      p_vehicle_data->>'model',
      COALESCE((p_vehicle_data->>'year')::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
      p_vehicle_data->>'color',
      COALESCE(p_vehicle_data->>'size', 'medium'),
      NOW(),
      NOW()
    ) RETURNING id INTO v_vehicle_id;
  END IF;
  
  -- Step 3: Create booking
  INSERT INTO bookings (
    booking_reference,
    user_id,
    customer_email,
    customer_name,
    customer_phone,
    vehicle_id,
    service_id,
    slot_id,
    status,
    payment_method,
    service_price_pence,
    total_price_pence,
    service_location,
    customer_instructions,
    created_at,
    updated_at,
    last_status_change
  ) VALUES (
    v_booking_reference,
    v_user_id,
    p_customer_data->>'email',
    p_customer_data->>'full_name',
    p_customer_data->>'phone',
    v_vehicle_id,
    (p_booking_data->>'service_id')::UUID,
    v_slot_id,
    'confirmed',
    COALESCE(p_booking_data->>'payment_method', 'cash'),
    COALESCE((p_pricing->>'total_price_pence')::INTEGER, (p_pricing->>'service_price_pence')::INTEGER, 0),
    COALESCE((p_pricing->>'total_price_pence')::INTEGER, (p_pricing->>'service_price_pence')::INTEGER, 0),
    COALESCE(p_booking_data->>'service_location', 'Customer location'),
    COALESCE(p_booking_data->>'special_instructions', ''),
    NOW(),
    NOW(),
    NOW()
  ) RETURNING id INTO v_booking_id;
  
  -- Step 4: Update slot with booking_id and status (CRITICAL FIX)
  UPDATE available_slots 
  SET 
    booking_id = v_booking_id,
    slot_status = 'booked',
    last_modified = NOW()
  WHERE id = v_slot_id;
  
  -- Verify the update worked
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update slot with booking_id';
  END IF;
  
  -- Step 5: Create rewards transaction if user exists
  IF v_user_id IS NOT NULL THEN
    INSERT INTO reward_transactions (
      user_id,
      booking_id,
      transaction_type,
      points_change,
      description,
      created_at
    ) VALUES (
      v_user_id,
      v_booking_id,
      'earned',
      50, -- Base points for booking
      'Points earned for booking ' || v_booking_reference,
      NOW()
    );
    
    -- Update customer rewards total
    INSERT INTO customer_rewards (user_id, customer_email, total_points, points_lifetime, current_tier)
    VALUES (v_user_id, p_customer_data->>'email', 50, 50, 'bronze')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_points = customer_rewards.total_points + 50,
      points_lifetime = customer_rewards.points_lifetime + 50,
      updated_at = NOW();
  END IF;
  
  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'booking_reference', v_booking_reference,
    'vehicle_id', v_vehicle_id,
    'slot_id', v_slot_id,
    'total_price_pence', COALESCE((p_pricing->>'total_price_pence')::INTEGER, 0),
    'message', 'Booking created successfully with slot relationship'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure
    RAISE LOG 'Error in create_booking_with_slot_update: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to create booking: ' || SQLERRM
    );
END;
$$;

-- Create function to fix existing booking-slot relationships
CREATE OR REPLACE FUNCTION fix_existing_booking_slot_relationships()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_booking RECORD;
BEGIN
  -- Find bookings that don't have their slot_id properly linked
  FOR v_booking IN 
    SELECT b.id as booking_id, b.slot_id, b.booking_reference
    FROM bookings b
    LEFT JOIN available_slots s ON s.id = b.slot_id
    WHERE b.slot_id IS NOT NULL 
    AND (s.booking_id IS NULL OR s.booking_id != b.id)
  LOOP
    -- Update the slot to reference this booking
    UPDATE available_slots 
    SET 
      booking_id = v_booking.booking_id,
      slot_status = 'booked',
      last_modified = NOW()
    WHERE id = v_booking.slot_id;
    
    IF FOUND THEN
      v_updated_count := v_updated_count + 1;
      RAISE LOG 'Fixed booking-slot relationship for booking % (slot %)', 
        v_booking.booking_reference, v_booking.slot_id;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'message', 'Fixed ' || v_updated_count || ' booking-slot relationships'
  );
END;
$$;

-- Run the fix for existing data
SELECT fix_existing_booking_slot_relationships();

-- Verify the fix worked by checking current state
DO $$
DECLARE
  v_check_result RECORD;
BEGIN
  SELECT 
    COUNT(*) as total_bookings,
    COUNT(CASE WHEN s.booking_id IS NOT NULL THEN 1 END) as linked_slots,
    COUNT(CASE WHEN s.booking_id IS NULL THEN 1 END) as unlinked_slots
  INTO v_check_result
  FROM bookings b
  LEFT JOIN available_slots s ON s.id = b.slot_id
  WHERE b.slot_id IS NOT NULL;
  
  RAISE LOG 'Booking-slot relationship status: % total bookings, % linked slots, % unlinked slots',
    v_check_result.total_bookings, v_check_result.linked_slots, v_check_result.unlinked_slots;
END;
$$;

COMMENT ON FUNCTION create_booking_with_slot_update IS 'Creates booking with proper slot relationship - fixes critical booking-slot linkage issue';
COMMENT ON FUNCTION fix_existing_booking_slot_relationships IS 'Repairs existing booking-slot relationships where booking_id is missing from slots';