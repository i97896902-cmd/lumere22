-- Allow an authenticated admin to set a known password for an employee.
-- This fixes legacy accounts whose automatic repair generated a password that was
-- never communicated. It updates auth.users only and never deletes the employee.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_reset_employee_password(
  p_employee_id UUID,
  p_new_password TEXT
)
RETURNS TABLE (user_id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT;
  v_hash TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only authenticated admins can reset employee passwords';
  END IF;
  IF coalesce(length(trim(p_new_password)), 0) < 6 THEN
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
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = p_employee_id;

  INSERT INTO public.audit_logs (action, user_id, user_email, details)
  VALUES ('employee_password_reset', p_employee_id, v_email,
          format('Password reset by admin %s', auth.uid()::text));

  RETURN QUERY SELECT p_employee_id, v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_employee_password(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_employee_password(UUID, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
