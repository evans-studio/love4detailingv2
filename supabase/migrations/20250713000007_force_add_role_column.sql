-- =========================================================================
-- Love4Detailing - Force Add Role Column
-- Directly add role column since previous migrations didn't work
-- =========================================================================

-- Drop and recreate the enum type
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'staff', 'super_admin');

-- Drop role column if it exists (to start fresh)
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Add role column
ALTER TABLE users ADD COLUMN role user_role DEFAULT 'customer';

-- Set roles for existing users
UPDATE users 
SET role = CASE 
  WHEN email IN ('admin@love4detailing.com', 'zell@love4detailing.com') THEN 'super_admin'::user_role
  ELSE 'customer'::user_role
END;

-- Make role NOT NULL
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- Grant permissions
GRANT USAGE ON TYPE user_role TO authenticated, anon;

-- Recreate the handle_new_user function with proper role handling
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
    'customer'::user_role,
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

-- Verify the role column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role';

SELECT 'Role column force-added successfully!' as result;