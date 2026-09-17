-- Run in Supabase SQL Editor after the delete migrations.
-- Authorization is based on auth.uid() -> profiles.id, not on email.

UPDATE public.profiles p
SET role = 'admin', status = 'approved'
FROM auth.users u
WHERE p.id = u.id
  AND lower(trim(u.email)) = 'yousef555554321@gmail.com';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND lower(trim(role)) IN ('admin', 'administrator')
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_record(p_table TEXT, p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT lower(trim(role)) INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role NOT IN ('admin', 'administrator') THEN
    RAISE EXCEPTION 'Only admins can delete records';
  END IF;

  CASE p_table
    WHEN 'clients' THEN DELETE FROM public.clients WHERE id = p_id;
    WHEN 'projects' THEN DELETE FROM public.projects WHERE id = p_id;
    WHEN 'tasks' THEN DELETE FROM public.tasks WHERE id = p_id;
    WHEN 'transactions' THEN DELETE FROM public.transactions WHERE id = p_id;
    WHEN 'payroll' THEN DELETE FROM public.payroll WHERE id = p_id;
    WHEN 'equipment' THEN DELETE FROM public.equipment WHERE id = p_id;
    WHEN 'profiles' THEN
      DELETE FROM public.profiles
      WHERE id = p_id AND lower(trim(role)) IN ('employee', 'client') AND id <> auth.uid();
    ELSE RAISE EXCEPTION 'Unsupported delete target: %', p_table;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_employee_account(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT lower(trim(role)) INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role NOT IN ('admin', 'administrator') THEN
    RAISE EXCEPTION 'Only admins can delete employee accounts';
  END IF;
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'An admin cannot delete their own account';
  END IF;
  DELETE FROM public.profiles WHERE id = target_user_id AND lower(trim(role)) = 'employee';
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_record(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_record(TEXT, UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_employee_account(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_employee_account(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';