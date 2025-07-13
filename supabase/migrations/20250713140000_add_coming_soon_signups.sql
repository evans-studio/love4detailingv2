-- Create coming soon email signups table
-- This table stores email addresses from the coming soon page

BEGIN;

-- Create the coming_soon_signups table
CREATE TABLE IF NOT EXISTS coming_soon_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_coming_soon_signups_email ON coming_soon_signups(email);
CREATE INDEX IF NOT EXISTS idx_coming_soon_signups_created_at ON coming_soon_signups(created_at);

-- Add RLS policies
ALTER TABLE coming_soon_signups ENABLE ROW LEVEL SECURITY;

-- Policy for admins to read all signups
CREATE POLICY "Admins can read all signups"
    ON coming_soon_signups FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Policy for admins to insert signups (for testing)
CREATE POLICY "Admins can insert signups"
    ON coming_soon_signups FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Policy for public insert (anonymous users can sign up)
CREATE POLICY "Public can insert signups"
    ON coming_soon_signups FOR INSERT
    WITH CHECK (true);

-- Function to get signup statistics
CREATE OR REPLACE FUNCTION get_coming_soon_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_signups', COUNT(*),
        'recent_signups', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),
        'today_signups', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
        'latest_signup', MAX(created_at),
        'daily_growth', (
            SELECT json_agg(
                json_build_object(
                    'date', date_trunc('day', created_at),
                    'count', COUNT(*)
                )
                ORDER BY date_trunc('day', created_at)
            )
            FROM (
                SELECT created_at
                FROM coming_soon_signups
                WHERE created_at >= NOW() - INTERVAL '30 days'
            ) recent_data
            GROUP BY date_trunc('day', created_at)
        )
    ) INTO result
    FROM coming_soon_signups;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and insert email signup
CREATE OR REPLACE FUNCTION create_coming_soon_signup(
    p_email TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL,
    p_utm_source TEXT DEFAULT NULL,
    p_utm_medium TEXT DEFAULT NULL,
    p_utm_campaign TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_signup_id UUID;
BEGIN
    -- Validate email format
    IF p_email IS NULL OR p_email = '' OR p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid email format'
        );
    END IF;
    
    -- Normalize email (lowercase)
    p_email := LOWER(TRIM(p_email));
    
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM coming_soon_signups WHERE email = p_email) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Email already registered'
        );
    END IF;
    
    -- Insert the signup
    INSERT INTO coming_soon_signups (
        email,
        ip_address,
        user_agent,
        referrer,
        utm_source,
        utm_medium,
        utm_campaign
    ) VALUES (
        p_email,
        p_ip_address,
        p_user_agent,
        p_referrer,
        p_utm_source,
        p_utm_medium,
        p_utm_campaign
    ) RETURNING id INTO v_signup_id;
    
    -- Return success response
    RETURN json_build_object(
        'success', true,
        'signup_id', v_signup_id,
        'message', 'Email registered successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Failed to register email: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_coming_soon_signups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_coming_soon_signups_updated_at
    BEFORE UPDATE ON coming_soon_signups
    FOR EACH ROW
    EXECUTE FUNCTION update_coming_soon_signups_updated_at();

COMMIT;

-- Add comment to table
COMMENT ON TABLE coming_soon_signups IS 'Email signups from the coming soon page for launch notifications';
COMMENT ON FUNCTION create_coming_soon_signup IS 'Validates and creates coming soon email signup with duplicate prevention';
COMMENT ON FUNCTION get_coming_soon_stats IS 'Returns analytics data for coming soon signups';