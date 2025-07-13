-- Comprehensive Audit Logging System Migration
-- Implements enterprise-grade audit logging for all admin actions and user activities

-- Create audit logs table for comprehensive tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id TEXT,
    action_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    request_method TEXT,
    request_path TEXT,
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')),
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('auth', 'admin', 'user', 'booking', 'system', 'security', 'general')),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Create GIN index for JSONB columns
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin ON audit_logs USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changes_gin ON audit_logs USING gin(changes);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tags_gin ON audit_logs USING gin(tags);

-- Create admin actions table for specific admin operation tracking
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_name TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    target_name TEXT,
    action_details JSONB DEFAULT '{}',
    before_state JSONB,
    after_state JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    success BOOLEAN DEFAULT true,
    error_details TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for admin actions
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_user_id ON admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_name ON admin_actions(action_name);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_type ON admin_actions(target_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_id ON admin_actions(target_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_success ON admin_actions(success);

-- Create user activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT,
    activity_type TEXT NOT NULL,
    activity_description TEXT,
    page_url TEXT,
    referrer_url TEXT,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    location_info JSONB,
    duration_seconds INTEGER,
    activity_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user activity
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_session_id ON user_activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_logs(created_at);

-- Create system events table for system-level logging
CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_level TEXT NOT NULL DEFAULT 'info' CHECK (event_level IN ('debug', 'info', 'warn', 'error', 'critical')),
    component TEXT NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    event_data JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    request_id TEXT,
    correlation_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for system events
CREATE INDEX IF NOT EXISTS idx_system_events_event_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_event_level ON system_events(event_level);
CREATE INDEX IF NOT EXISTS idx_system_events_component ON system_events(component);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON system_events(created_at);
CREATE INDEX IF NOT EXISTS idx_system_events_user_id ON system_events(user_id);
CREATE INDEX IF NOT EXISTS idx_system_events_request_id ON system_events(request_id);

-- Create audit configuration table
CREATE TABLE IF NOT EXISTS audit_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_name TEXT UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default audit configuration
INSERT INTO audit_config (config_name, config_value, description) VALUES
    ('retention_policy', '{
        "audit_logs_days": 2555,
        "admin_actions_days": 2555,
        "user_activity_days": 365,
        "system_events_days": 90,
        "security_events_days": 1825,
        "auto_cleanup_enabled": true,
        "compression_enabled": true,
        "backup_before_cleanup": true
    }', 'Audit log retention policy configuration'),
    ('logging_settings', '{
        "log_user_actions": true,
        "log_admin_actions": true,
        "log_system_events": true,
        "log_security_events": true,
        "log_api_requests": true,
        "log_database_changes": true,
        "include_request_body": true,
        "include_response_body": false,
        "mask_sensitive_data": true,
        "sensitive_fields": ["password", "token", "secret", "key", "ssn", "credit_card"]
    }', 'Audit logging settings and preferences'),
    ('compliance_settings', '{
        "enable_gdpr_compliance": true,
        "enable_hipaa_compliance": false,
        "enable_sox_compliance": true,
        "data_classification_enabled": true,
        "encryption_at_rest": true,
        "access_logging_mandatory": true,
        "change_approval_required": false
    }', 'Compliance and regulatory settings'),
    ('notification_settings', '{
        "alert_on_critical_events": true,
        "alert_on_failed_admin_actions": true,
        "alert_on_suspicious_activity": true,
        "email_notifications": true,
        "real_time_monitoring": true,
        "digest_frequency": "daily"
    }', 'Audit notification and alerting settings')
ON CONFLICT (config_name) DO NOTHING;

-- Function to log audit entry
CREATE OR REPLACE FUNCTION log_audit_entry(
    p_user_id UUID,
    p_session_id TEXT,
    p_action_type TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_request_method TEXT DEFAULT NULL,
    p_request_path TEXT DEFAULT NULL,
    p_request_body JSONB DEFAULT NULL,
    p_response_status INTEGER DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL,
    p_severity TEXT DEFAULT 'info',
    p_category TEXT DEFAULT 'general',
    p_tags TEXT[] DEFAULT '{}',
    p_metadata JSONB DEFAULT '{}',
    p_duration_ms INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
    v_changes JSONB;
    v_config JSONB;
    v_should_log BOOLEAN := true;
BEGIN
    -- Get logging configuration
    SELECT config_value INTO v_config
    FROM audit_config
    WHERE config_name = 'logging_settings' AND is_active = true;
    
    -- Check if this type of logging is enabled
    IF v_config IS NOT NULL THEN
        CASE p_category
            WHEN 'admin' THEN
                v_should_log := COALESCE((v_config->>'log_admin_actions')::BOOLEAN, true);
            WHEN 'auth' THEN
                v_should_log := COALESCE((v_config->>'log_user_actions')::BOOLEAN, true);
            WHEN 'system' THEN
                v_should_log := COALESCE((v_config->>'log_system_events')::BOOLEAN, true);
            WHEN 'security' THEN
                v_should_log := COALESCE((v_config->>'log_security_events')::BOOLEAN, true);
            ELSE
                v_should_log := true;
        END CASE;
    END IF;
    
    -- Skip logging if disabled
    IF NOT v_should_log THEN
        RETURN NULL;
    END IF;
    
    -- Calculate changes if old and new values provided
    IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
        v_changes := jsonb_build_object(
            'added', p_new_values - p_old_values,
            'removed', p_old_values - p_new_values,
            'modified', p_new_values
        );
    END IF;
    
    -- Insert audit log entry
    INSERT INTO audit_logs (
        user_id, session_id, action_type, resource_type, resource_id,
        old_values, new_values, changes, ip_address, user_agent,
        request_method, request_path, request_body, response_status,
        success, error_message, severity, category, tags, metadata, duration_ms
    ) VALUES (
        p_user_id, p_session_id, p_action_type, p_resource_type, p_resource_id,
        p_old_values, p_new_values, v_changes, p_ip_address, p_user_agent,
        p_request_method, p_request_path, p_request_body, p_response_status,
        p_success, p_error_message, p_severity, p_category, p_tags, p_metadata, p_duration_ms
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_user_id UUID,
    p_action_name TEXT,
    p_target_type TEXT,
    p_target_id TEXT,
    p_target_name TEXT DEFAULT NULL,
    p_action_details JSONB DEFAULT '{}',
    p_before_state JSONB DEFAULT NULL,
    p_after_state JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_details TEXT DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_action_id UUID;
    v_admin_role TEXT;
BEGIN
    -- Verify admin user exists and has admin role
    SELECT role INTO v_admin_role
    FROM users
    WHERE id = p_admin_user_id;
    
    IF v_admin_role IS NULL OR v_admin_role NOT IN ('admin', 'super_admin', 'staff') THEN
        RAISE EXCEPTION 'Invalid admin user or insufficient permissions';
    END IF;
    
    -- Insert admin action log
    INSERT INTO admin_actions (
        admin_user_id, action_name, target_type, target_id, target_name,
        action_details, before_state, after_state, ip_address, user_agent,
        session_id, success, error_details, execution_time_ms
    ) VALUES (
        p_admin_user_id, p_action_name, p_target_type, p_target_id, p_target_name,
        p_action_details, p_before_state, p_after_state, p_ip_address, p_user_agent,
        p_session_id, p_success, p_error_details, p_execution_time_ms
    ) RETURNING id INTO v_action_id;
    
    -- Also log in general audit log
    PERFORM log_audit_entry(
        p_admin_user_id,
        p_session_id,
        p_action_name,
        p_target_type,
        p_target_id,
        p_before_state,
        p_after_state,
        p_ip_address,
        p_user_agent,
        'POST',
        '/admin/' || p_target_type,
        p_action_details,
        CASE WHEN p_success THEN 200 ELSE 500 END,
        p_success,
        p_error_details,
        CASE WHEN p_success THEN 'info' ELSE 'error' END,
        'admin',
        ARRAY['admin_action', p_action_name],
        jsonb_build_object(
            'target_name', p_target_name,
            'execution_time_ms', p_execution_time_ms
        ),
        p_execution_time_ms
    );
    
    RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_session_id TEXT,
    p_activity_type TEXT,
    p_activity_description TEXT DEFAULT NULL,
    p_page_url TEXT DEFAULT NULL,
    p_referrer_url TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_info JSONB DEFAULT NULL,
    p_location_info JSONB DEFAULT NULL,
    p_duration_seconds INTEGER DEFAULT NULL,
    p_activity_data JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO user_activity_logs (
        user_id, session_id, activity_type, activity_description,
        page_url, referrer_url, ip_address, user_agent,
        device_info, location_info, duration_seconds, activity_data
    ) VALUES (
        p_user_id, p_session_id, p_activity_type, p_activity_description,
        p_page_url, p_referrer_url, p_ip_address, p_user_agent,
        p_device_info, p_location_info, p_duration_seconds, p_activity_data
    ) RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log system event
CREATE OR REPLACE FUNCTION log_system_event(
    p_event_type TEXT,
    p_event_level TEXT,
    p_component TEXT,
    p_message TEXT,
    p_stack_trace TEXT DEFAULT NULL,
    p_event_data JSONB DEFAULT '{}',
    p_user_id UUID DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_correlation_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO system_events (
        event_type, event_level, component, message, stack_trace,
        event_data, user_id, request_id, correlation_id
    ) VALUES (
        p_event_type, p_event_level, p_component, p_message, p_stack_trace,
        p_event_data, p_user_id, p_request_id, p_correlation_id
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit summary
CREATE OR REPLACE FUNCTION get_audit_summary(
    p_admin_user_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_admin_actions_count INTEGER;
    v_user_activities_count INTEGER;
    v_system_events_count INTEGER;
    v_security_events_count INTEGER;
    v_failed_actions_count INTEGER;
    v_critical_events_count INTEGER;
BEGIN
    -- Verify admin permissions
    IF NOT EXISTS(
        SELECT 1 FROM users 
        WHERE id = p_admin_user_id 
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions for audit summary';
    END IF;
    
    -- Get admin actions count
    SELECT COUNT(*) INTO v_admin_actions_count
    FROM admin_actions
    WHERE created_at BETWEEN p_start_date AND p_end_date;
    
    -- Get user activities count
    SELECT COUNT(*) INTO v_user_activities_count
    FROM user_activity_logs
    WHERE created_at BETWEEN p_start_date AND p_end_date;
    
    -- Get system events count
    SELECT COUNT(*) INTO v_system_events_count
    FROM system_events
    WHERE created_at BETWEEN p_start_date AND p_end_date;
    
    -- Get security events count
    SELECT COUNT(*) INTO v_security_events_count
    FROM security_events
    WHERE created_at BETWEEN p_start_date AND p_end_date;
    
    -- Get failed actions count
    SELECT COUNT(*) INTO v_failed_actions_count
    FROM audit_logs
    WHERE created_at BETWEEN p_start_date AND p_end_date
    AND success = false;
    
    -- Get critical events count
    SELECT COUNT(*) INTO v_critical_events_count
    FROM audit_logs
    WHERE created_at BETWEEN p_start_date AND p_end_date
    AND severity = 'critical';
    
    v_result := jsonb_build_object(
        'period', jsonb_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date
        ),
        'summary', jsonb_build_object(
            'admin_actions', v_admin_actions_count,
            'user_activities', v_user_activities_count,
            'system_events', v_system_events_count,
            'security_events', v_security_events_count,
            'failed_actions', v_failed_actions_count,
            'critical_events', v_critical_events_count
        ),
        'generated_at', NOW(),
        'generated_by', p_admin_user_id
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_audit_logs() RETURNS VOID AS $$
DECLARE
    v_config JSONB;
    v_audit_retention INTEGER;
    v_admin_retention INTEGER;
    v_activity_retention INTEGER;
    v_system_retention INTEGER;
    v_security_retention INTEGER;
    v_deleted_count INTEGER;
BEGIN
    -- Get retention configuration
    SELECT config_value INTO v_config
    FROM audit_config
    WHERE config_name = 'retention_policy' AND is_active = true;
    
    IF v_config IS NULL THEN
        RAISE NOTICE 'No retention policy configured, skipping cleanup';
        RETURN;
    END IF;
    
    -- Extract retention periods
    v_audit_retention := COALESCE((v_config->>'audit_logs_days')::INTEGER, 2555);
    v_admin_retention := COALESCE((v_config->>'admin_actions_days')::INTEGER, 2555);
    v_activity_retention := COALESCE((v_config->>'user_activity_days')::INTEGER, 365);
    v_system_retention := COALESCE((v_config->>'system_events_days')::INTEGER, 90);
    v_security_retention := COALESCE((v_config->>'security_events_days')::INTEGER, 1825);
    
    -- Cleanup audit logs
    DELETE FROM audit_logs
    WHERE created_at < NOW() - (v_audit_retention || ' days')::INTERVAL;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
        PERFORM log_system_event(
            'audit_cleanup',
            'info',
            'audit_system',
            'Cleaned up ' || v_deleted_count || ' old audit log entries',
            NULL,
            jsonb_build_object(
                'deleted_count', v_deleted_count,
                'retention_days', v_audit_retention
            )
        );
    END IF;
    
    -- Cleanup admin actions
    DELETE FROM admin_actions
    WHERE created_at < NOW() - (v_admin_retention || ' days')::INTERVAL;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
        PERFORM log_system_event(
            'admin_actions_cleanup',
            'info',
            'audit_system',
            'Cleaned up ' || v_deleted_count || ' old admin action entries',
            NULL,
            jsonb_build_object(
                'deleted_count', v_deleted_count,
                'retention_days', v_admin_retention
            )
        );
    END IF;
    
    -- Cleanup user activities
    DELETE FROM user_activity_logs
    WHERE created_at < NOW() - (v_activity_retention || ' days')::INTERVAL;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
        PERFORM log_system_event(
            'user_activity_cleanup',
            'info',
            'audit_system',
            'Cleaned up ' || v_deleted_count || ' old user activity entries',
            NULL,
            jsonb_build_object(
                'deleted_count', v_deleted_count,
                'retention_days', v_activity_retention
            )
        );
    END IF;
    
    -- Cleanup system events
    DELETE FROM system_events
    WHERE created_at < NOW() - (v_system_retention || ' days')::INTERVAL;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
        PERFORM log_system_event(
            'system_events_cleanup',
            'info',
            'audit_system',
            'Cleaned up ' || v_deleted_count || ' old system event entries',
            NULL,
            jsonb_build_object(
                'deleted_count', v_deleted_count,
                'retention_days', v_system_retention
            )
        );
    END IF;
    
    -- Cleanup security events (separate retention)
    DELETE FROM security_events
    WHERE created_at < NOW() - (v_security_retention || ' days')::INTERVAL;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
        PERFORM log_system_event(
            'security_events_cleanup',
            'info',
            'audit_system',
            'Cleaned up ' || v_deleted_count || ' old security event entries',
            NULL,
            jsonb_build_object(
                'deleted_count', v_deleted_count,
                'retention_days', v_security_retention
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_config ENABLE ROW LEVEL SECURITY;

-- Audit logs policies
CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Admin actions policies
CREATE POLICY "Admins can view all admin actions" ON admin_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can insert admin actions" ON admin_actions
    FOR INSERT WITH CHECK (true);

-- User activity policies
CREATE POLICY "Users can view their own activities" ON user_activity_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user activities" ON user_activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can insert user activities" ON user_activity_logs
    FOR INSERT WITH CHECK (true);

-- System events policies
CREATE POLICY "Admins can view system events" ON system_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can insert system events" ON system_events
    FOR INSERT WITH CHECK (true);

-- Audit config policies
CREATE POLICY "Admins can manage audit config" ON audit_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Create triggers for updated_at
CREATE TRIGGER update_audit_config_updated_at
    BEFORE UPDATE ON audit_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT ON admin_actions TO authenticated;
GRANT SELECT ON user_activity_logs TO authenticated;
GRANT SELECT ON system_events TO authenticated;
GRANT SELECT ON audit_config TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;
GRANT INSERT ON admin_actions TO authenticated;
GRANT INSERT ON user_activity_logs TO authenticated;
GRANT INSERT ON system_events TO authenticated;