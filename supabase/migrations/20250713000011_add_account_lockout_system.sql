-- Account Lockout and Security Monitoring System Migration
-- Implements comprehensive account lockout protection and security monitoring

-- Add lockout fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lockout_reason TEXT,
ADD COLUMN IF NOT EXISTS security_alerts_enabled BOOLEAN DEFAULT true;

-- Create security events table for monitoring
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    ip_address INET,
    user_agent TEXT,
    location TEXT,
    details JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);
CREATE INDEX IF NOT EXISTS idx_users_failed_attempts ON users(failed_login_attempts);

-- Create lockout attempts table for detailed tracking
CREATE TABLE IF NOT EXISTS lockout_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    attempt_type TEXT NOT NULL, -- 'login', 'mfa', 'password_reset'
    success BOOLEAN DEFAULT false,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for lockout attempts
CREATE INDEX IF NOT EXISTS idx_lockout_attempts_user_id ON lockout_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_lockout_attempts_ip_address ON lockout_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_lockout_attempts_created_at ON lockout_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_lockout_attempts_success ON lockout_attempts(success);

-- Create security monitoring configuration table
CREATE TABLE IF NOT EXISTS security_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default security configuration
INSERT INTO security_config (config_key, config_value, description) 
VALUES 
    ('lockout_policy', '{
        "max_failed_attempts": 5,
        "lockout_duration_minutes": 30,
        "progressive_lockout": true,
        "progressive_multiplier": 2,
        "ip_lockout_enabled": true,
        "ip_lockout_threshold": 10,
        "account_lockout_enabled": true
    }', 'Account lockout policy configuration'),
    ('security_monitoring', '{
        "monitor_failed_logins": true,
        "monitor_suspicious_ips": true,
        "monitor_concurrent_sessions": true,
        "monitor_admin_actions": true,
        "alert_thresholds": {
            "failed_logins_per_hour": 10,
            "suspicious_ip_attempts": 5,
            "concurrent_sessions": 3
        }
    }', 'Security monitoring configuration'),
    ('notification_settings', '{
        "email_admin_on_lockout": true,
        "email_user_on_lockout": true,
        "slack_notifications": false,
        "real_time_alerts": true
    }', 'Security notification settings')
ON CONFLICT (config_key) DO NOTHING;

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_severity TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO security_events (
        user_id, event_type, severity, ip_address, 
        user_agent, location, details
    ) VALUES (
        p_user_id, p_event_type, p_severity, p_ip_address,
        p_user_agent, p_location, p_details
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record lockout attempt
CREATE OR REPLACE FUNCTION record_lockout_attempt(
    p_user_id UUID,
    p_ip_address INET,
    p_user_agent TEXT,
    p_attempt_type TEXT,
    p_success BOOLEAN,
    p_failure_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_attempt_id UUID;
BEGIN
    INSERT INTO lockout_attempts (
        user_id, ip_address, user_agent, attempt_type,
        success, failure_reason, metadata
    ) VALUES (
        p_user_id, p_ip_address, p_user_agent, p_attempt_type,
        p_success, p_failure_reason, p_metadata
    ) RETURNING id INTO v_attempt_id;
    
    RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT locked_until INTO v_locked_until
    FROM users
    WHERE id = p_user_id;
    
    IF v_locked_until IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF v_locked_until > NOW() THEN
        RETURN TRUE;
    ELSE
        -- Clear expired lockout
        UPDATE users 
        SET locked_until = NULL,
            failed_login_attempts = 0,
            lockout_reason = NULL
        WHERE id = p_user_id;
        
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to lock account
CREATE OR REPLACE FUNCTION lock_account(
    p_user_id UUID,
    p_duration_minutes INTEGER DEFAULT 30,
    p_reason TEXT DEFAULT 'Too many failed login attempts'
) RETURNS VOID AS $$
DECLARE
    v_lockout_until TIMESTAMP WITH TIME ZONE;
BEGIN
    v_lockout_until := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;
    
    UPDATE users 
    SET locked_until = v_lockout_until,
        lockout_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log security event
    PERFORM log_security_event(
        p_user_id,
        'account_locked',
        'high',
        NULL,
        NULL,
        NULL,
        jsonb_build_object(
            'duration_minutes', p_duration_minutes,
            'reason', p_reason,
            'locked_until', v_lockout_until
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlock account
CREATE OR REPLACE FUNCTION unlock_account(
    p_user_id UUID,
    p_unlocked_by UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET locked_until = NULL,
        failed_login_attempts = 0,
        lockout_reason = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log security event
    PERFORM log_security_event(
        p_user_id,
        'account_unlocked',
        'medium',
        NULL,
        NULL,
        NULL,
        jsonb_build_object(
            'unlocked_by', p_unlocked_by,
            'unlock_time', NOW()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle failed login attempt
CREATE OR REPLACE FUNCTION handle_failed_login(
    p_user_id UUID,
    p_ip_address INET,
    p_user_agent TEXT,
    p_failure_reason TEXT
) RETURNS JSONB AS $$
DECLARE
    v_config JSONB;
    v_current_attempts INTEGER;
    v_max_attempts INTEGER;
    v_lockout_duration INTEGER;
    v_should_lock BOOLEAN := FALSE;
    v_result JSONB;
BEGIN
    -- Get lockout configuration
    SELECT config_value INTO v_config
    FROM security_config
    WHERE config_key = 'lockout_policy';
    
    v_max_attempts := (v_config->>'max_failed_attempts')::INTEGER;
    v_lockout_duration := (v_config->>'lockout_duration_minutes')::INTEGER;
    
    -- Increment failed attempts
    UPDATE users 
    SET failed_login_attempts = failed_login_attempts + 1,
        last_failed_login = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING failed_login_attempts INTO v_current_attempts;
    
    -- Record attempt
    PERFORM record_lockout_attempt(
        p_user_id,
        p_ip_address,
        p_user_agent,
        'login',
        FALSE,
        p_failure_reason
    );
    
    -- Check if account should be locked
    IF v_current_attempts >= v_max_attempts THEN
        v_should_lock := TRUE;
        
        -- Progressive lockout
        IF (v_config->>'progressive_lockout')::BOOLEAN THEN
            v_lockout_duration := v_lockout_duration * 
                POWER((v_config->>'progressive_multiplier')::INTEGER, 
                      (v_current_attempts - v_max_attempts));
        END IF;
        
        -- Lock the account
        PERFORM lock_account(p_user_id, v_lockout_duration, 'Too many failed login attempts');
    END IF;
    
    -- Log security event
    PERFORM log_security_event(
        p_user_id,
        'failed_login',
        CASE WHEN v_should_lock THEN 'high' ELSE 'medium' END,
        p_ip_address,
        p_user_agent,
        NULL,
        jsonb_build_object(
            'failure_reason', p_failure_reason,
            'attempts', v_current_attempts,
            'max_attempts', v_max_attempts,
            'account_locked', v_should_lock
        )
    );
    
    v_result := jsonb_build_object(
        'success', TRUE,
        'attempts', v_current_attempts,
        'max_attempts', v_max_attempts,
        'account_locked', v_should_lock,
        'lockout_duration', v_lockout_duration
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle successful login
CREATE OR REPLACE FUNCTION handle_successful_login(
    p_user_id UUID,
    p_ip_address INET,
    p_user_agent TEXT
) RETURNS VOID AS $$
BEGIN
    -- Reset failed attempts
    UPDATE users 
    SET failed_login_attempts = 0,
        last_failed_login = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Record successful attempt
    PERFORM record_lockout_attempt(
        p_user_id,
        p_ip_address,
        p_user_agent,
        'login',
        TRUE
    );
    
    -- Log security event
    PERFORM log_security_event(
        p_user_id,
        'successful_login',
        'low',
        p_ip_address,
        p_user_agent,
        NULL,
        jsonb_build_object(
            'login_time', NOW()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get security dashboard data
CREATE OR REPLACE FUNCTION get_security_dashboard_data(
    p_admin_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_locked_accounts INTEGER;
    v_recent_events INTEGER;
    v_high_severity_events INTEGER;
    v_failed_logins_24h INTEGER;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS(
        SELECT 1 FROM users 
        WHERE id = p_admin_user_id 
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    -- Get locked accounts count
    SELECT COUNT(*) INTO v_locked_accounts
    FROM users
    WHERE locked_until IS NOT NULL AND locked_until > NOW();
    
    -- Get recent security events (last 24 hours)
    SELECT COUNT(*) INTO v_recent_events
    FROM security_events
    WHERE created_at >= NOW() - INTERVAL '24 hours';
    
    -- Get high severity events (last 7 days)
    SELECT COUNT(*) INTO v_high_severity_events
    FROM security_events
    WHERE severity IN ('high', 'critical')
    AND created_at >= NOW() - INTERVAL '7 days';
    
    -- Get failed logins in last 24 hours
    SELECT COUNT(*) INTO v_failed_logins_24h
    FROM lockout_attempts
    WHERE success = FALSE
    AND created_at >= NOW() - INTERVAL '24 hours';
    
    v_result := jsonb_build_object(
        'locked_accounts', v_locked_accounts,
        'recent_events', v_recent_events,
        'high_severity_events', v_high_severity_events,
        'failed_logins_24h', v_failed_logins_24h,
        'generated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lockout_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_config ENABLE ROW LEVEL SECURITY;

-- Security events policies
CREATE POLICY "Users can view their own security events" ON security_events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all security events" ON security_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can insert security events" ON security_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update security events" ON security_events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Lockout attempts policies
CREATE POLICY "Users can view their own lockout attempts" ON lockout_attempts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all lockout attempts" ON lockout_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can insert lockout attempts" ON lockout_attempts
    FOR INSERT WITH CHECK (true);

-- Security config policies
CREATE POLICY "Admins can manage security config" ON security_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_security_events_updated_at
    BEFORE UPDATE ON security_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_config_updated_at
    BEFORE UPDATE ON security_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON security_events TO authenticated;
GRANT SELECT, INSERT ON lockout_attempts TO authenticated;
GRANT SELECT ON security_config TO authenticated;