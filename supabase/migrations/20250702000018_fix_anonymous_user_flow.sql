-- Create a function to link anonymous booking data to a new user
CREATE OR REPLACE FUNCTION link_anonymous_booking_to_user(
    p_booking_id UUID,
    p_user_id UUID
) RETURNS void AS $$
DECLARE
    v_email TEXT;
    v_points INTEGER;
BEGIN
    -- Get the email from the booking
    SELECT email INTO v_email
    FROM bookings
    WHERE id = p_booking_id;

    -- Update the booking
    UPDATE bookings
    SET user_id = p_user_id
    WHERE id = p_booking_id
    AND user_id IS NULL;

    -- Update the vehicle
    UPDATE vehicles v
    SET user_id = p_user_id
    FROM bookings b
    WHERE b.id = p_booking_id
    AND b.vehicle_id = v.id
    AND v.user_id IS NULL;

    -- Update reward transactions
    UPDATE reward_transactions
    SET user_id = p_user_id
    WHERE booking_id = p_booking_id
    AND user_id IS NULL;

    -- Calculate total points from transactions
    SELECT COALESCE(SUM(points), 0) INTO v_points
    FROM reward_transactions
    WHERE user_id = p_user_id;

    -- Create or update rewards record
    INSERT INTO rewards (user_id, points)
    VALUES (p_user_id, v_points)
    ON CONFLICT (user_id) 
    DO UPDATE SET points = EXCLUDED.points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to initialize user rewards
CREATE OR REPLACE FUNCTION initialize_user_rewards(
    p_user_id UUID
) RETURNS void AS $$
BEGIN
    INSERT INTO rewards (user_id, points)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to initialize rewards for new users
CREATE OR REPLACE FUNCTION create_user_rewards_trigger()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_user_rewards(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS user_rewards_trigger ON users;
CREATE TRIGGER user_rewards_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_rewards_trigger();

-- Update RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON users;
CREATE POLICY "Allow public read access" ON users
    FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Allow individual update" ON users;
CREATE POLICY "Allow individual update" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow individual insert" ON users;
CREATE POLICY "Allow individual insert" ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION link_anonymous_booking_to_user TO service_role;
GRANT EXECUTE ON FUNCTION initialize_user_rewards TO service_role;
GRANT EXECUTE ON FUNCTION create_user_rewards_trigger TO service_role; 