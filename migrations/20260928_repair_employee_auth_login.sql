-- Repair employee accounts provisioned by earlier migrations.
-- Those migrations inserted auth.users rows with an empty identities array,
-- which can make Supabase Auth reject an otherwise correct email/password.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure every employee auth user has the email identity required by GoTrue.
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  lower(u.email),
  jsonb_build_object('sub', u.id::text, 'email', lower(u.email)),
  'email',
  coalesce(u.created_at, now()),
  now()
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE p.role = 'employee'
  AND u.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider = 'email'
  );

-- Keep the password-reset RPC signature compatible with all earlier migrations.
-- PostgreSQL cannot change a function's return type with CREATE OR REPLACE, so
-- remove either previous overload before recreating the canonical 3-column RPC.
DROP FUNCTION IF EXISTS public.admin_reset_employee_password(UUID, TEXT);

CREATE FUNCTION public.admin_reset_employee_password(
  p_employee_id UUID,
  p_new_password TEXT
)
RETURNS TABLE (user_id UUID, email TEXT, password TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT;
  v_hash TEXT;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only authenticated admins can reset employee passwords';
  END IF;
  IF coalesce(length(p_new_password), 0) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE u.id = p_employee_id AND p.role = 'employee';
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Employee auth account was not found';
  END IF;

  v_hash := crypt(p_new_password, gen_salt('bf'));
  UPDATE auth.users
  SET encrypted_password = v_hash,
      email_confirmed_at = coalesce(email_confirmed_at, v_now),
      updated_at = v_now
  WHERE id = p_employee_id;

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, created_at, updated_at
  )
  SELECT gen_random_uuid(), p_employee_id, lower(v_email),
         jsonb_build_object('sub', p_employee_id::text, 'email', lower(v_email)),
         'email', v_now, v_now
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE user_id = p_employee_id AND provider = 'email'
  );

  INSERT INTO public.audit_logs (action, user_id, user_email, details)
  VALUES ('employee_password_reset', p_employee_id, v_email,
          format('Password reset by admin %s', auth.uid()::text));

  RETURN QUERY SELECT p_employee_id, v_email, p_new_password;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_employee_password(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_employee_password(UUID, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
