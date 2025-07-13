-- =========================================================================
-- Love4Detailing - Update Trigger Role Logic
-- Update the user creation trigger to set proper roles based on email
-- =========================================================================

-- Update the handle_new_user function with proper role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role_val user_role;
BEGIN
  -- Determine role based on email
  CASE 
    WHEN NEW.email = 'paul@evans-studio.co.uk' THEN
      user_role_val := 'super_admin'::user_role;
    WHEN NEW.email = 'zell@love4detailing.com' THEN
      user_role_val := 'admin'::user_role;
    ELSE
      user_role_val := 'customer'::user_role;
  END CASE;

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
    user_role_val,
    true,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at ELSE NULL END,
    NEW.created_at,
    NEW.created_at
  ) ON CONFLICT (id) DO UPDATE SET
    last_login_at = NEW.created_at,
    email_verified_at = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at ELSE users.email_verified_at END,
    role = user_role_val; -- Update role on conflict too

  -- Create initial customer rewards record (for all users, even admins can have rewards)
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

-- Also update the handleUserLogin procedure to use the same logic
CREATE OR REPLACE FUNCTION public.get_user_role_by_email(email_addr TEXT)
RETURNS user_role
LANGUAGE plpgsql
AS $$
BEGIN
  CASE 
    WHEN email_addr = 'paul@evans-studio.co.uk' THEN
      RETURN 'super_admin'::user_role;
    WHEN email_addr = 'zell@love4detailing.com' THEN
      RETURN 'admin'::user_role;
    ELSE
      RETURN 'customer'::user_role;
  END CASE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role_by_email TO authenticated, anon;

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates user profiles with correct roles based on email addresses';
COMMENT ON FUNCTION public.get_user_role_by_email(TEXT) IS 'Returns the appropriate role for a given email address';

SELECT 'Trigger role logic updated successfully!' as result;