-- REAL EMPLOYEE ACCOUNTS IN THE DATABASE
--
-- WHY: Previously, the admin UI created employee accounts through a client-side
-- supabase.auth.signUp() call on a throw-away "temp client" and then cached a
-- copy in localStorage (local_profiles_bypass / local_profiles_credentials).
-- When the temp-client sign-up failed or was skipped, the employee existed
-- only in localStorage with a fake / non-UUID id and NO entry in auth.users,
-- so they could never log in, never receive task notifications, and could not
-- be assigned equipment with a valid FK.
--
-- This migration adds a SECURITY-DEFINER RPC that the admin calls with the
-- normal supabase client (authenticated session). The function:
--   1. Verifies the caller is an admin (public.is_admin()).
--   2. Generates a UUID, hashes the password with bcrypt (GoTrue compatible),
--      and inserts a REAL row into auth.users (email_confirmed_at = now()).
--   3. Inserts the profiles row with role = 'employee', status = 'approved'.
--   4. Records the action in audit_logs.
--   5. Returns (user_id, email, password) so the admin can share credentials.
--
-- HOW TO APPLY: paste into Supabase SQL Editor -> Run, then verify:
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_type='FUNCTION' AND routine_name ILIKE 'admin_create_employee';

-- pgcrypto provides crypt()/gen_salt() used as a portable bcrypt fallback.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- admin_create_employee — provision a real employee account
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_create_employee(
  p_email          TEXT,
  p_full_name      TEXT,
  p_password       TEXT,
  p_phone          TEXT  DEFAULT NULL,
  p_specialization TEXT  DEFAULT NULL,
  p_bio            TEXT  DEFAULT NULL,
  p_portfolio_link TEXT  DEFAULT NULL
)
RETURNS TABLE (user_id UUID, email TEXT, password TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id       UUID;
  v_email_norm    TEXT := lower(trim(p_email));
  v_password_hash TEXT;
  v_now           TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- Only admins may provision accounts.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create employee accounts';
  END IF;

  -- Validate inputs.
  IF v_email_norm = '' OR p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RAISE EXCEPTION 'email and full_name are required';
  END IF;
  IF p_password IS NULL OR length(trim(p_password)) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  -- Reject pre-existing email (avoids duplicate-key on auth.users unique index).
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email_norm) THEN
    RAISE EXCEPTION 'An account with this email already exists: %', v_email_norm;
  END IF;

  v_user_id := gen_random_uuid();

  -- Hash the password using bcrypt. Prefer auth.hash_password() when available
  -- (modern Supabase); fall back to pgcrypto crypt() with a bf (bcrypt) salt.
  BEGIN
    v_password_hash := auth.hash_password(p_password, 'bcrypt', NULL);
  EXCEPTION WHEN OTHERS THEN
    v_password_hash := crypt(p_password, gen_salt('bf'));
  END;

  -- 1) Create the real Supabase Auth user.
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    role,
    aud,
    app_metadata,
    user_metadata,
    identities,
    instance_id
  ) VALUES (
    v_user_id,
    v_email_norm,
    v_password_hash,
    v_now,
    v_now,
    v_now,
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name',      p_full_name,
      'phone',          p_phone,
      'role',           'employee',
      'status',         'approved',
      'specialization', p_specialization,
      'bio',            p_bio,
      'portfolio_link', p_portfolio_link
    ),
    '[]'::jsonb,
    NULL
  );

  -- GoTrue requires an email identity for password sign-in. Keep this in sync
  -- with auth.users when provisioning accounts directly from this RPC.
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_email_norm,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email_norm),
    'email', v_now, v_now
  );

  -- 2) Create / upsert the profiles row so the employee is immediately visible
  --    and assignable to tasks, equipment, payroll, etc.
  INSERT INTO public.profiles (
    id, email, full_name, phone, role, status,
    specialization, bio, portfolio_link, created_at
  ) VALUES (
    v_user_id, v_email_norm, p_full_name, p_phone,
    'employee', 'approved',
    p_specialization, p_bio, p_portfolio_link, v_now
  )
  ON CONFLICT (id) DO UPDATE SET
    email          = EXCLUDED.email,
    full_name      = EXCLUDED.full_name,
    phone          = EXCLUDED.phone,
    role           = EXCLUDED.role,
    status         = EXCLUDED.status,
    specialization = EXCLUDED.specialization,
    bio            = EXCLUDED.bio,
    portfolio_link = EXCLUDED.portfolio_link;

  -- 3) Audit trail.
  INSERT INTO public.audit_logs (action, user_id, user_email, details)
  VALUES (
    'employee_account_created',
    v_user_id,
    v_email_norm,
    format('Employee account provisioned via admin_create_employee RPC by admin %s', auth.uid()::text)
  );

  -- 4) Return the credentials so the admin can communicate them to the employee.
  RETURN QUERY SELECT v_user_id, v_email_norm, p_password;
END;
$$;

-- ============================================================
-- admin_reset_employee_password — reset an employee's password
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reset_employee_password(
  p_employee_id UUID,
  p_new_password TEXT
)
RETURNS TABLE (user_id UUID, email TEXT, password TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email           TEXT;
  v_password_hash   TEXT;
  v_now             TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can reset employee passwords';
  END IF;

  IF p_new_password IS NULL OR length(trim(p_new_password)) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_employee_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No auth.users entry found for employee id %', p_employee_id;
  END IF;

  -- Hash with the same fallback logic.
  BEGIN
    v_password_hash := auth.hash_password(p_new_password, 'bcrypt', NULL);
  EXCEPTION WHEN OTHERS THEN
    v_password_hash := crypt(p_new_password, gen_salt('bf'));
  END;

  UPDATE auth.users
  SET encrypted_password = v_password_hash,
      updated_at         = v_now
  WHERE id = p_employee_id;

  INSERT INTO public.audit_logs (action, user_id, user_email, details)
  VALUES (
    'employee_password_reset',
    p_employee_id,
    v_email,
    format('Password reset via admin RPC by admin %s', auth.uid()::text)
  );

  RETURN QUERY SELECT p_employee_id, v_email, p_new_password;
END;
$$;

-- ============================================================
-- admin_list_employee_accounts — list employees with account status
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_employee_accounts()
RETURNS TABLE (
  user_id        UUID,
  email          TEXT,
  full_name      TEXT,
  phone          TEXT,
  specialization TEXT,
  status         TEXT,
  has_auth_user  BOOLEAN,
  created_at     TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.specialization,
    p.status,
    EXISTS(SELECT 1 FROM auth.users u WHERE u.id = p.id) AS has_auth_user,
    p.created_at
  FROM public.profiles p
  WHERE p.role = 'employee'
  ORDER BY p.created_at DESC;
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.admin_create_employee(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reset_employee_password(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_employee_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_employee(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_employee_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_employee_accounts() TO authenticated;

NOTIFY pgrst, 'reload schema';
