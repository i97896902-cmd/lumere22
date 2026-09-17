-- Run this migration in Supabase SQL Editor.
-- It creates the RPC used by the employee approval/rejection screen.

CREATE OR REPLACE FUNCTION public.delete_employee_account(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can delete employee accounts';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'An admin cannot delete their own account';
  END IF;

  DELETE FROM public.profiles
  WHERE id = target_user_id
    AND role = 'employee';

  DELETE FROM auth.users
  WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_employee_account(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_employee_account(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';