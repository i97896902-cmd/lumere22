-- Run in Supabase SQL Editor after the employee deletion migration.
-- Centralizes admin deletes and bypasses table-specific DELETE policy mistakes.

CREATE OR REPLACE FUNCTION public.admin_delete_record(p_table TEXT, p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can delete records';
  END IF;

  CASE p_table
    WHEN 'clients' THEN
      DELETE FROM public.clients WHERE id = p_id;
    WHEN 'projects' THEN
      DELETE FROM public.projects WHERE id = p_id;
    WHEN 'tasks' THEN
      DELETE FROM public.tasks WHERE id = p_id;
    WHEN 'transactions' THEN
      DELETE FROM public.transactions WHERE id = p_id;
    WHEN 'payroll' THEN
      DELETE FROM public.payroll WHERE id = p_id;
    WHEN 'equipment' THEN
      DELETE FROM public.equipment WHERE id = p_id;
    WHEN 'profiles' THEN
      DELETE FROM public.profiles
      WHERE id = p_id AND role IN ('employee', 'client') AND id <> auth.uid();
    ELSE
      RAISE EXCEPTION 'Unsupported delete target: %', p_table;
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_record(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_record(TEXT, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';