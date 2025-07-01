-- Create unmatched vehicles table if it doesn't exist
CREATE TABLE IF NOT EXISTS unmatched_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  registration TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  matched_size TEXT DEFAULT 'Medium',
  handled BOOLEAN DEFAULT false
);

-- Enable RLS on unmatched vehicles
ALTER TABLE unmatched_vehicles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for unmatched vehicles
DROP POLICY IF EXISTS "Only admins can view unmatched vehicles" ON unmatched_vehicles;
CREATE POLICY "Only admins can view unmatched vehicles" ON unmatched_vehicles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

DROP POLICY IF EXISTS "System can insert unmatched vehicles" ON unmatched_vehicles;
CREATE POLICY "System can insert unmatched vehicles" ON unmatched_vehicles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can update unmatched vehicles" ON unmatched_vehicles;
CREATE POLICY "Only admins can update unmatched vehicles" ON unmatched_vehicles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- Create function to log unmatched vehicle
DROP FUNCTION IF EXISTS log_unmatched_vehicle(TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION log_unmatched_vehicle(
  p_make TEXT,
  p_model TEXT,
  p_registration TEXT DEFAULT NULL,
  p_matched_size TEXT DEFAULT 'Medium'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO unmatched_vehicles (
    make,
    model,
    registration,
    matched_size
  )
  VALUES (
    p_make,
    p_model,
    p_registration,
    p_matched_size
  )
  RETURNING id INTO v_id;

  -- Trigger email notification via Edge Function
  PERFORM net.http_post(
    url := CONCAT(current_setting('app.settings.edge_function_url'), '/notify-unmatched-vehicle'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.edge_function_key')
    ),
    body := jsonb_build_object(
      'make', p_make,
      'model', p_model,
      'registration', p_registration,
      'matched_size', p_matched_size
    )
  );

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark vehicle as handled
DROP FUNCTION IF EXISTS mark_vehicle_handled(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION mark_vehicle_handled(
  p_vehicle_id UUID,
  p_handled BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE unmatched_vehicles
  SET handled = p_handled
  WHERE id = p_vehicle_id
  AND auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate vehicle size
DROP FUNCTION IF EXISTS calculate_vehicle_size(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION calculate_vehicle_size(
  p_make TEXT,
  p_model TEXT,
  p_registration TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID, label TEXT) AS $$
DECLARE
  v_size_id UUID;
  v_size_label TEXT;
BEGIN
  -- Try to find a matching vehicle size from the reference data
  SELECT vs.id, vs.label
  INTO v_size_id, v_size_label
  FROM vehicle_sizes vs
  WHERE vs.label = (
    SELECT size
    FROM vehicle_size_reference
    WHERE LOWER(make) = LOWER(p_make)
    AND LOWER(model) = LOWER(p_model)
    LIMIT 1
  );

  -- If no match found, log it and return medium size
  IF v_size_id IS NULL THEN
    -- Get medium size as fallback
    SELECT id, label
    INTO v_size_id, v_size_label
    FROM vehicle_sizes
    WHERE label = 'Medium'
    LIMIT 1;

    -- Log the unmatched vehicle
    PERFORM log_unmatched_vehicle(
      p_make := p_make,
      p_model := p_model,
      p_registration := p_registration,
      p_matched_size := v_size_label
    );
  END IF;

  RETURN QUERY SELECT v_size_id, v_size_label;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle anonymous booking creation
CREATE OR REPLACE FUNCTION create_anonymous_booking(
    p_vehicle_registration TEXT,
    p_vehicle_make TEXT,
    p_vehicle_model TEXT,
    p_vehicle_year TEXT,
    p_vehicle_color TEXT,
    p_vehicle_size_id UUID,
    p_time_slot_id UUID,
    p_total_price_pence INTEGER,
    p_email TEXT,
    p_full_name TEXT,
    p_phone TEXT
) RETURNS UUID AS $$
DECLARE
    v_vehicle_id UUID;
    v_booking_id UUID;
BEGIN
    -- Create vehicle record
    INSERT INTO vehicles (
        registration,
        make,
        model,
        year,
        color,
        size_id
    ) VALUES (
        p_vehicle_registration,
        p_vehicle_make,
        p_vehicle_model,
        p_vehicle_year,
        p_vehicle_color,
        p_vehicle_size_id
    ) RETURNING id INTO v_vehicle_id;

    -- Create booking record
    INSERT INTO bookings (
        vehicle_id,
        time_slot_id,
        total_price_pence,
        email,
        full_name,
        phone
    ) VALUES (
        v_vehicle_id,
        p_time_slot_id,
        p_total_price_pence,
        p_email,
        p_full_name,
        p_phone
    ) RETURNING id INTO v_booking_id;

    RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate vehicle size
CREATE OR REPLACE FUNCTION calculate_vehicle_size(
    p_make TEXT,
    p_model TEXT,
    p_registration TEXT
) RETURNS TEXT AS $$
BEGIN
    -- Log unmatched vehicle for admin review
    INSERT INTO missing_vehicle_models (make, model, registration)
    VALUES (p_make, p_model, p_registration);

    -- Return default size
    RETURN 'Medium';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark vehicle as handled
CREATE OR REPLACE FUNCTION mark_vehicle_handled(
    p_registration TEXT
) RETURNS VOID AS $$
BEGIN
    UPDATE missing_vehicle_models
    SET handled = true
    WHERE registration = p_registration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_slots_updated_at
    BEFORE UPDATE ON time_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_notes_updated_at
    BEFORE UPDATE ON admin_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at
    BEFORE UPDATE ON rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reward_transactions_updated_at
    BEFORE UPDATE ON reward_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 