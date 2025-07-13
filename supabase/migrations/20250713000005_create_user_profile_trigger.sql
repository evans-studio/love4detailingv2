-- =========================================================================
-- Love4Detailing - User Profile Auto-Creation Trigger
-- Fix authentication flow by automatically creating user profiles
-- =========================================================================

-- Create function to handle new user registration
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
    'customer', -- Default role
    true,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at ELSE NULL END,
    NEW.created_at,
    NEW.created_at
  );

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
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- User already exists, just update last_login_at
    UPDATE public.users 
    SET last_login_at = NEW.created_at
    WHERE id = NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE LOG 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also create a trigger for login tracking
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update last login timestamp when auth user signs in
  UPDATE public.users 
  SET last_login_at = NEW.updated_at
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail if user profile doesn't exist
    RETURN NEW;
END;
$$;

-- Create trigger for login tracking
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_user_login();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.customer_rewards TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile and rewards record when new auth user is created';
COMMENT ON FUNCTION public.handle_user_login() IS 'Updates last login timestamp when user signs in';

SELECT 'User profile auto-creation triggers successfully created!' as trigger_result;