-- Add MFA support to users table
-- This migration adds Multi-Factor Authentication capabilities to the Love4Detailing system

-- Add MFA-related columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_enrolled_at timestamptz,
ADD COLUMN IF NOT EXISTS mfa_backup_codes jsonb,
ADD COLUMN IF NOT EXISTS mfa_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_last_used timestamptz;

-- Create index for MFA queries
CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled ON users(mfa_enabled) WHERE mfa_enabled = true;
CREATE INDEX IF NOT EXISTS idx_users_mfa_required ON users(mfa_required) WHERE mfa_required = true;

-- Create MFA audit log table for security tracking
CREATE TABLE IF NOT EXISTS mfa_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action text NOT NULL, -- 'enrolled', 'verified', 'failed', 'unenrolled', 'backup_used'
    ip_address inet,
    user_agent text,
    success boolean NOT NULL DEFAULT false,
    failure_reason text,
    created_at timestamptz DEFAULT now()
);

-- Create index for MFA audit log queries
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_user_id ON mfa_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_action ON mfa_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_created_at ON mfa_audit_log(created_at);

-- RLS policies for MFA audit log
ALTER TABLE mfa_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own MFA audit logs
CREATE POLICY "Users can view own MFA audit logs" ON mfa_audit_log
FOR SELECT USING (auth.uid() = user_id);

-- Only the system can insert MFA audit logs
CREATE POLICY "System can insert MFA audit logs" ON mfa_audit_log
FOR INSERT WITH CHECK (true);

-- Admins can view all MFA audit logs
CREATE POLICY "Admins can view all MFA audit logs" ON mfa_audit_log
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin')
    )
);

-- Function to log MFA events
CREATE OR REPLACE FUNCTION log_mfa_event(
    p_user_id uuid,
    p_action text,
    p_ip_address inet DEFAULT NULL,
    p_user_agent text DEFAULT NULL,
    p_success boolean DEFAULT false,
    p_failure_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO mfa_audit_log (
        user_id,
        action,
        ip_address,
        user_agent,
        success,
        failure_reason
    ) VALUES (
        p_user_id,
        p_action,
        p_ip_address,
        p_user_agent,
        p_success,
        p_failure_reason
    );
END;
$$;

-- Function to get MFA status for a user
CREATE OR REPLACE FUNCTION get_mfa_status(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_record users%ROWTYPE;
    v_result json;
BEGIN
    -- Get user record
    SELECT * INTO v_user_record 
    FROM users 
    WHERE id = p_user_id;
    
    -- Check if user exists
    IF v_user_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Build result
    v_result := json_build_object(
        'success', true,
        'mfa_enabled', COALESCE(v_user_record.mfa_enabled, false),
        'mfa_enrolled_at', v_user_record.mfa_enrolled_at,
        'mfa_required', COALESCE(v_user_record.mfa_required, false),
        'mfa_last_used', v_user_record.mfa_last_used,
        'has_backup_codes', v_user_record.mfa_backup_codes IS NOT NULL,
        'backup_codes_count', 
        CASE 
            WHEN v_user_record.mfa_backup_codes IS NOT NULL 
            THEN jsonb_array_length(v_user_record.mfa_backup_codes)
            ELSE 0
        END
    );
    
    RETURN v_result;
END;
$$;

-- Function to update MFA status
CREATE OR REPLACE FUNCTION update_mfa_status(
    p_user_id uuid,
    p_mfa_enabled boolean DEFAULT NULL,
    p_mfa_required boolean DEFAULT NULL,
    p_backup_codes jsonb DEFAULT NULL,
    p_log_action text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update user MFA status
    UPDATE users 
    SET 
        mfa_enabled = COALESCE(p_mfa_enabled, mfa_enabled),
        mfa_enrolled_at = CASE 
            WHEN p_mfa_enabled = true AND mfa_enrolled_at IS NULL 
            THEN now() 
            ELSE mfa_enrolled_at 
        END,
        mfa_required = COALESCE(p_mfa_required, mfa_required),
        mfa_backup_codes = COALESCE(p_backup_codes, mfa_backup_codes),
        mfa_last_used = CASE 
            WHEN p_log_action = 'verified' 
            THEN now() 
            ELSE mfa_last_used 
        END
    WHERE id = p_user_id;
    
    -- Log the action if provided
    IF p_log_action IS NOT NULL THEN
        PERFORM log_mfa_event(
            p_user_id,
            p_log_action,
            NULL,
            NULL,
            true,
            NULL
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'MFA status updated successfully'
    );
END;
$$;

-- Function to validate backup code
CREATE OR REPLACE FUNCTION validate_backup_code(
    p_user_id uuid,
    p_backup_code text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_record users%ROWTYPE;
    v_backup_codes jsonb;
    v_code_valid boolean := false;
    v_updated_codes jsonb;
    v_code_item jsonb;
BEGIN
    -- Get user record
    SELECT * INTO v_user_record 
    FROM users 
    WHERE id = p_user_id;
    
    -- Check if user exists
    IF v_user_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Get backup codes
    v_backup_codes := v_user_record.mfa_backup_codes;
    
    -- Check if backup codes exist
    IF v_backup_codes IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No backup codes found'
        );
    END IF;
    
    -- Validate backup code and remove if valid
    v_updated_codes := '[]'::jsonb;
    
    FOR v_code_item IN SELECT * FROM jsonb_array_elements(v_backup_codes)
    LOOP
        IF v_code_item->>'code' = p_backup_code AND (v_code_item->>'used')::boolean = false THEN
            v_code_valid := true;
            -- Mark as used
            v_updated_codes := v_updated_codes || jsonb_build_object(
                'code', v_code_item->>'code',
                'used', true,
                'used_at', now()
            );
        ELSE
            v_updated_codes := v_updated_codes || v_code_item;
        END IF;
    END LOOP;
    
    -- Update backup codes if valid
    IF v_code_valid THEN
        UPDATE users 
        SET mfa_backup_codes = v_updated_codes,
            mfa_last_used = now()
        WHERE id = p_user_id;
        
        -- Log successful backup code use
        PERFORM log_mfa_event(
            p_user_id,
            'backup_used',
            NULL,
            NULL,
            true,
            NULL
        );
    ELSE
        -- Log failed backup code attempt
        PERFORM log_mfa_event(
            p_user_id,
            'backup_failed',
            NULL,
            NULL,
            false,
            'Invalid backup code'
        );
    END IF;
    
    RETURN json_build_object(
        'success', v_code_valid,
        'valid', v_code_valid,
        'message', CASE 
            WHEN v_code_valid THEN 'Backup code validated successfully'
            ELSE 'Invalid backup code'
        END
    );
END;
$$;

-- Function to generate backup codes
CREATE OR REPLACE FUNCTION generate_backup_codes(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_backup_codes jsonb := '[]'::jsonb;
    v_code text;
    v_i integer;
BEGIN
    -- Generate 10 backup codes
    FOR v_i IN 1..10 LOOP
        -- Generate 8-character alphanumeric code
        v_code := array_to_string(
            ARRAY(
                SELECT substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', (random() * 35)::integer + 1, 1)
                FROM generate_series(1, 8)
            ),
            ''
        );
        
        v_backup_codes := v_backup_codes || jsonb_build_object(
            'code', v_code,
            'used', false,
            'created_at', now()
        );
    END LOOP;
    
    -- Update user backup codes
    UPDATE users 
    SET mfa_backup_codes = v_backup_codes
    WHERE id = p_user_id;
    
    -- Log backup code generation
    PERFORM log_mfa_event(
        p_user_id,
        'backup_codes_generated',
        NULL,
        NULL,
        true,
        NULL
    );
    
    RETURN json_build_object(
        'success', true,
        'backup_codes', v_backup_codes
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION log_mfa_event(uuid, text, inet, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mfa_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_mfa_status(uuid, boolean, boolean, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_backup_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_backup_codes(uuid) TO authenticated;

-- Comment on the migration
COMMENT ON TABLE mfa_audit_log IS 'Audit log for MFA-related events and security tracking';
COMMENT ON FUNCTION log_mfa_event(uuid, text, inet, text, boolean, text) IS 'Logs MFA events for security auditing';
COMMENT ON FUNCTION get_mfa_status(uuid) IS 'Returns comprehensive MFA status for a user';
COMMENT ON FUNCTION update_mfa_status(uuid, boolean, boolean, jsonb, text) IS 'Updates user MFA settings and logs the action';
COMMENT ON FUNCTION validate_backup_code(uuid, text) IS 'Validates and marks backup codes as used';
COMMENT ON FUNCTION generate_backup_codes(uuid) IS 'Generates new backup codes for user';