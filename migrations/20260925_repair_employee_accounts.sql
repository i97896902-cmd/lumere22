-- REPAIR LEGACY EMPLOYEES WITHOUT DELETING THEM
-- Run once in the Supabase SQL Editor.
-- This links a legacy/local employee to a real auth.users + profiles UUID.
-- Existing employees are preserved; matching is done by email.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_ensure_employee_account(
  p_employee_id     TEXT,
  p_email            TEXT,
  p_full_name        TEXT,
  p_password        TEXT,
  p_phone            TEXT DEFAULT NULL,
  p_specialization  TEXT DEFAULT NULL,
  p_bio             TEXT DEFAULT NULL,
  p_portfolio_link  TEXT DEFAULT NULL
)
RETURNS TABLE (user_id UUID, email TEXT, password TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email_norm TEXT := lower(trim(p_email));
  v_user_id UUID;
  v_profile_id UUID;
  v_hash TEXT;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can repair employee accounts';
  END IF;

  IF v_email_norm = '' OR coalesce(trim(p_full_name), '') = '' THEN
    RAISE EXCEPTION 'email and full_name are required';
  END IF;
  IF coalesce(length(trim(p_password)), 0) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  -- If the employee already has a real account, reuse it and do not create or delete anything.
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email_norm LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
        phone = coalesce(p_phone, phone),
        specialization = coalesce(p_specialization, specialization),
        bio = coalesce(p_bio, bio),
        portfolio_link = coalesce(p_portfolio_link, portfolio_link),
        role = 'employee',
        status = CASE WHEN status = 'pending' THEN 'approved' ELSE status END
    WHERE id = v_user_id;
    RETURN QUERY SELECT v_user_id, v_email_norm, p_password;
    RETURN;
  END IF;

  -- Prefer an existing profile with the same email, including profiles created before Auth.
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE lower(email) = v_email_norm
  LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    v_user_id := v_profile_id;
  ELSE
    v_user_id := gen_random_uuid();
  END IF;

  v_hash := crypt(p_password, gen_salt('bf'));

  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
    role, aud, app_metadata, user_metadata, identities, instance_id
  ) VALUES (
    v_user_id, v_email_norm, v_hash, v_now, v_now, v_now,
    'authenticated', 'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'role', 'employee', 'status', 'approved'),
    '[]'::jsonb, NULL
  );

  INSERT INTO public.profiles (
    id, email, full_name, phone, role, status, specialization, bio, portfolio_link, created_at
  ) VALUES (
    v_user_id, v_email_norm, p_full_name, p_phone, 'employee', 'approved',
    p_specialization, p_bio, p_portfolio_link, v_now
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = coalesce(EXCLUDED.phone, profiles.phone),
    role = 'employee',
    status = CASE WHEN profiles.status = 'pending' THEN 'approved' ELSE profiles.status END,
    specialization = coalesce(EXCLUDED.specialization, profiles.specialization),
    bio = coalesce(EXCLUDED.bio, profiles.bio),
    portfolio_link = coalesce(EXCLUDED.portfolio_link, profiles.portfolio_link);

  INSERT INTO public.audit_logs (action, user_id, user_email, details)
  VALUES (
    'employee_account_repaired', v_user_id, v_email_norm,
    format('Legacy employee %s linked to a real Supabase Auth account by admin %s', coalesce(p_employee_id, 'unknown'), auth.uid()::text)
  );

  RETURN QUERY SELECT v_user_id, v_email_norm, p_password;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ensure_employee_account(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_ensure_employee_account(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
