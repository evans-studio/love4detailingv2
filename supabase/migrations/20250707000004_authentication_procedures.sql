-- Authentication Stored Procedures for Love4Detailing Database-First Architecture
-- Phase 1: Authentication Foundation Implementation

-- ===== USER REGISTRATION & PROFILE MANAGEMENT =====

-- Create user profile after Supabase auth user is created
CREATE OR REPLACE FUNCTION create_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_phone TEXT DEFAULT NULL,
    p_role user_role DEFAULT 'customer',
    p_marketing_opt_in BOOLEAN DEFAULT FALSE,
    p_service_preferences JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (
    user_id UUID,
    success BOOLEAN,
    message TEXT,
    profile_data JSONB
) AS $$
DECLARE
    v_existing_user UUID;
    v_profile_data JSONB;
BEGIN
    -- Check if user profile already exists
    SELECT id INTO v_existing_user FROM users WHERE id = p_user_id;
    
    IF v_existing_user IS NOT NULL THEN
        RETURN QUERY SELECT 
            p_user_id,
            FALSE,
            'User profile already exists'::TEXT,
            jsonb_build_object('user_id', p_user_id, 'email', p_email);
        RETURN;
    END IF;

    -- Create user profile
    INSERT INTO users (
        id, email, full_name, phone, role, is_active,
        email_verified_at, marketing_opt_in, service_preferences,
        created_at, updated_at
    ) VALUES (
        p_user_id, p_email, p_full_name, p_phone, p_role, TRUE,
        CASE WHEN p_role = 'customer' THEN NULL ELSE NOW() END,
        p_marketing_opt_in, p_service_preferences,
        NOW(), NOW()
    );

    -- Update last login
    UPDATE users SET last_login_at = NOW() WHERE id = p_user_id;

    -- Build profile data response
    SELECT jsonb_build_object(
        'user_id', u.id,
        'email', u.email,
        'full_name', u.full_name,
        'phone', u.phone,
        'role', u.role,
        'is_active', u.is_active,
        'email_verified_at', u.email_verified_at,
        'marketing_opt_in', u.marketing_opt_in,
        'service_preferences', u.service_preferences,
        'created_at', u.created_at
    ) INTO v_profile_data
    FROM users u WHERE u.id = p_user_id;

    RETURN QUERY SELECT 
        p_user_id,
        TRUE,
        'User profile created successfully'::TEXT,
        v_profile_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
    p_user_id UUID,
    p_profile_data JSONB
) RETURNS TABLE (
    user_id UUID,
    success BOOLEAN,
    message TEXT,
    updated_profile JSONB
) AS $$
DECLARE
    v_user_exists BOOLEAN;
    v_updated_profile JSONB;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RETURN QUERY SELECT 
            p_user_id,
            FALSE,
            'User not found'::TEXT,
            '{}'::jsonb;
        RETURN;
    END IF;

    -- Update profile fields
    UPDATE users SET
        full_name = COALESCE(p_profile_data->>'full_name', full_name),
        phone = COALESCE(p_profile_data->>'phone', phone),
        marketing_opt_in = COALESCE((p_profile_data->>'marketing_opt_in')::boolean, marketing_opt_in),
        service_preferences = COALESCE(p_profile_data->'service_preferences', service_preferences),
        preferred_communication = COALESCE(p_profile_data->>'preferred_communication', preferred_communication),
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Get updated profile
    SELECT jsonb_build_object(
        'user_id', u.id,
        'email', u.email,
        'full_name', u.full_name,
        'phone', u.phone,
        'role', u.role,
        'is_active', u.is_active,
        'email_verified_at', u.email_verified_at,
        'marketing_opt_in', u.marketing_opt_in,
        'service_preferences', u.service_preferences,
        'preferred_communication', u.preferred_communication,
        'last_login_at', u.last_login_at,
        'updated_at', u.updated_at
    ) INTO v_updated_profile
    FROM users u WHERE u.id = p_user_id;

    RETURN QUERY SELECT 
        p_user_id,
        TRUE,
        'Profile updated successfully'::TEXT,
        v_updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== USER SESSION MANAGEMENT =====

-- Update user login timestamp and get user data
CREATE OR REPLACE FUNCTION handle_user_login(
    p_user_id UUID,
    p_email TEXT
) RETURNS TABLE (
    user_id UUID,
    success BOOLEAN,
    message TEXT,
    user_data JSONB,
    session_data JSONB
) AS $$
DECLARE
    v_user_data JSONB;
    v_session_data JSONB;
    v_user_exists BOOLEAN;
BEGIN
    -- Check if user profile exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        -- Create minimal profile for existing auth user
        PERFORM create_user_profile(
            p_user_id,
            p_email,
            split_part(p_email, '@', 1), -- Use email prefix as default name
            NULL,
            'customer',
            FALSE,
            '{}'::jsonb
        );
    END IF;

    -- Update last login
    UPDATE users SET last_login_at = NOW() WHERE id = p_user_id;

    -- Get user data
    SELECT jsonb_build_object(
        'user_id', u.id,
        'email', u.email,
        'full_name', u.full_name,
        'phone', u.phone,
        'role', u.role,
        'is_active', u.is_active,
        'email_verified_at', u.email_verified_at,
        'marketing_opt_in', u.marketing_opt_in,
        'service_preferences', u.service_preferences,
        'preferred_communication', u.preferred_communication,
        'last_login_at', u.last_login_at
    ) INTO v_user_data
    FROM users u WHERE u.id = p_user_id;

    -- Build session data
    v_session_data := jsonb_build_object(
        'login_at', NOW(),
        'user_agent', current_setting('request.headers', true)::json->>'user-agent',
        'ip_address', current_setting('request.headers', true)::json->>'x-forwarded-for'
    );

    RETURN QUERY SELECT 
        p_user_id,
        TRUE,
        'Login successful'::TEXT,
        v_user_data,
        v_session_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user profile with permissions
CREATE OR REPLACE FUNCTION get_user_profile(
    p_user_id UUID
) RETURNS TABLE (
    user_data JSONB,
    permissions JSONB,
    statistics JSONB
) AS $$
DECLARE
    v_user_data JSONB;
    v_permissions JSONB;
    v_statistics JSONB;
    v_user_role user_role;
BEGIN
    -- Get user data
    SELECT jsonb_build_object(
        'user_id', u.id,
        'email', u.email,
        'full_name', u.full_name,
        'phone', u.phone,
        'role', u.role,
        'is_active', u.is_active,
        'email_verified_at', u.email_verified_at,
        'marketing_opt_in', u.marketing_opt_in,
        'service_preferences', u.service_preferences,
        'preferred_communication', u.preferred_communication,
        'last_login_at', u.last_login_at,
        'created_at', u.created_at
    ), u.role INTO v_user_data, v_user_role
    FROM users u WHERE u.id = p_user_id;

    IF v_user_data IS NULL THEN
        RETURN QUERY SELECT 
            '{}'::jsonb,
            '{}'::jsonb,
            '{}'::jsonb;
        RETURN;
    END IF;

    -- Build permissions based on role
    v_permissions := CASE v_user_role
        WHEN 'super_admin' THEN jsonb_build_object(
            'can_manage_users', true,
            'can_manage_services', true,
            'can_manage_bookings', true,
            'can_manage_schedule', true,
            'can_view_analytics', true,
            'can_manage_system', true,
            'can_create_manual_bookings', true,
            'can_edit_bookings', true,
            'can_cancel_bookings', true,
            'can_refund_payments', true
        )
        WHEN 'admin' THEN jsonb_build_object(
            'can_manage_users', true,
            'can_manage_services', true,
            'can_manage_bookings', true,
            'can_manage_schedule', true,
            'can_view_analytics', true,
            'can_manage_system', false,
            'can_create_manual_bookings', true,
            'can_edit_bookings', true,
            'can_cancel_bookings', true,
            'can_refund_payments', true
        )
        WHEN 'staff' THEN jsonb_build_object(
            'can_manage_users', false,
            'can_manage_services', false,
            'can_manage_bookings', true,
            'can_manage_schedule', false,
            'can_view_analytics', false,
            'can_manage_system', false,
            'can_create_manual_bookings', true,
            'can_edit_bookings', true,
            'can_cancel_bookings', false,
            'can_refund_payments', false
        )
        ELSE jsonb_build_object(
            'can_manage_users', false,
            'can_manage_services', false,
            'can_manage_bookings', false,
            'can_manage_schedule', false,
            'can_view_analytics', false,
            'can_manage_system', false,
            'can_create_manual_bookings', false,
            'can_edit_bookings', false,
            'can_cancel_bookings', false,
            'can_refund_payments', false
        )
    END;

    -- Get user statistics
    SELECT jsonb_build_object(
        'total_bookings', COUNT(b.id),
        'completed_bookings', COUNT(CASE WHEN b.status = 'completed' THEN 1 END),
        'cancelled_bookings', COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END),
        'total_spent_pence', COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_price_pence END), 0),
        'last_booking_date', MAX(b.created_at),
        'last_service_date', MAX(b.completed_at),
        'total_vehicles', (SELECT COUNT(*) FROM vehicles WHERE user_id = p_user_id),
        'reward_points', COALESCE((SELECT total_points FROM customer_rewards WHERE user_id = p_user_id), 0),
        'reward_tier', COALESCE((SELECT current_tier FROM customer_rewards WHERE user_id = p_user_id), 'bronze')
    ) INTO v_statistics
    FROM bookings b
    WHERE b.user_id = p_user_id;

    RETURN QUERY SELECT 
        v_user_data,
        v_permissions,
        v_statistics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== ROLE MANAGEMENT =====

-- Update user role (admin only)
CREATE OR REPLACE FUNCTION update_user_role(
    p_user_id UUID,
    p_new_role user_role,
    p_admin_user_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS TABLE (
    user_id UUID,
    success BOOLEAN,
    message TEXT,
    role_change_data JSONB
) AS $$
DECLARE
    v_admin_role user_role;
    v_old_role user_role;
    v_user_exists BOOLEAN;
BEGIN
    -- Verify admin permissions
    SELECT role INTO v_admin_role FROM users WHERE id = p_admin_user_id;
    
    IF v_admin_role NOT IN ('admin', 'super_admin') THEN
        RETURN QUERY SELECT 
            p_user_id,
            FALSE,
            'Unauthorized: Admin privileges required'::TEXT,
            '{}'::jsonb;
        RETURN;
    END IF;

    -- Check if target user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id), role 
    INTO v_user_exists, v_old_role
    FROM users WHERE id = p_user_id;
    
    IF NOT v_user_exists THEN
        RETURN QUERY SELECT 
            p_user_id,
            FALSE,
            'User not found'::TEXT,
            '{}'::jsonb;
        RETURN;
    END IF;

    -- Update role
    UPDATE users SET 
        role = p_new_role,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN QUERY SELECT 
        p_user_id,
        TRUE,
        'Role updated successfully'::TEXT,
        jsonb_build_object(
            'user_id', p_user_id,
            'old_role', v_old_role,
            'new_role', p_new_role,
            'changed_by', p_admin_user_id,
            'reason', p_reason,
            'changed_at', NOW()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== USER VALIDATION & PERMISSIONS =====

-- Check user permissions for specific action
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_role user_role;
BEGIN
    SELECT role INTO v_user_role FROM users WHERE id = p_user_id AND is_active = TRUE;
    
    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN CASE 
        WHEN v_user_role = 'super_admin' THEN TRUE
        WHEN v_user_role = 'admin' AND p_permission IN (
            'manage_users', 'manage_services', 'manage_bookings', 
            'manage_schedule', 'view_analytics', 'create_manual_bookings',
            'edit_bookings', 'cancel_bookings', 'refund_payments'
        ) THEN TRUE
        WHEN v_user_role = 'staff' AND p_permission IN (
            'manage_bookings', 'create_manual_bookings', 'edit_bookings'
        ) THEN TRUE
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate user session and get minimal user data
CREATE OR REPLACE FUNCTION validate_user_session(
    p_user_id UUID
) RETURNS TABLE (
    is_valid BOOLEAN,
    user_data JSONB,
    message TEXT
) AS $$
DECLARE
    v_user_data JSONB;
    v_is_active BOOLEAN;
BEGIN
    -- Get user data
    SELECT jsonb_build_object(
        'user_id', u.id,
        'email', u.email,
        'full_name', u.full_name,
        'role', u.role,
        'is_active', u.is_active,
        'email_verified_at', u.email_verified_at,
        'last_login_at', u.last_login_at
    ), u.is_active INTO v_user_data, v_is_active
    FROM users u WHERE u.id = p_user_id;

    IF v_user_data IS NULL THEN
        RETURN QUERY SELECT 
            FALSE,
            '{}'::jsonb,
            'User not found'::TEXT;
        RETURN;
    END IF;

    IF NOT v_is_active THEN
        RETURN QUERY SELECT 
            FALSE,
            v_user_data,
            'Account is inactive'::TEXT;
        RETURN;
    END IF;

    RETURN QUERY SELECT 
        TRUE,
        v_user_data,
        'Session is valid'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== GRANTS AND SECURITY =====

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT, TEXT, user_role, BOOLEAN, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_user_login(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, user_role, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_user_session(UUID) TO authenticated;

-- Grant service role access for server-side operations
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT, TEXT, user_role, BOOLEAN, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION handle_user_login(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, user_role, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION check_user_permission(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION validate_user_session(UUID) TO service_role;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();