-- =========================================================================
-- Love4Detailing - Fix Missing Role Column
-- Restore role column that was accidentally removed in cleanup
-- =========================================================================

-- Check if role column exists, if not create it
DO $$ 
BEGIN
    -- Check if role column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        -- Create the role enum type if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
            CREATE TYPE user_role AS ENUM ('customer', 'admin', 'staff', 'super_admin');
        END IF;
        
        -- Add the role column back
        ALTER TABLE users ADD COLUMN role user_role DEFAULT 'customer';
        
        -- Update existing users to have customer role if null
        UPDATE users SET role = 'customer' WHERE role IS NULL;
        
        -- Set admin role for known admin email
        UPDATE users SET role = 'super_admin' 
        WHERE email = 'admin@love4detailing.com';
        
        RAISE NOTICE 'Role column restored to users table';
    ELSE
        RAISE NOTICE 'Role column already exists in users table';
    END IF;
END $$;

-- Ensure we have the right permissions
GRANT USAGE ON TYPE user_role TO authenticated, anon;

-- Also fix the trigger function to handle the role column properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert new user profile
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    is_active,
    email_verified_at,
    created_at,
    last_login_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'customer'::user_role, -- Explicitly cast to enum type
    true,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at ELSE NULL END,
    NEW.created_at,
    NEW.created_at
  ) ON CONFLICT (id) DO UPDATE SET
    last_login_at = NEW.created_at,
    email_verified_at = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at ELSE users.email_verified_at END;

  -- Create initial customer rewards record
  INSERT INTO public.customer_rewards (
    user_id,
    customer_email,
    total_points,
    points_lifetime,
    current_tier
  ) VALUES (
    NEW.id,
    NEW.email,
    0,
    0,
    'bronze'
  ) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE LOG 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

SELECT 'Role column and trigger fixes applied successfully!' as fix_result;