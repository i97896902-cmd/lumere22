-- SECURITY FIX: anonymous callers must never be able to delete records.
-- Run this file in Supabase SQL Editor, then rerun npm run test.

CREATE OR REPLACE FUNCTION public.admin_delete_record(p_table TEXT, p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only authenticated admins can delete records';
  END IF;

  CASE p_table
    WHEN 'clients' THEN DELETE FROM public.clients WHERE id = p_id;
    WHEN 'projects' THEN DELETE FROM public.projects WHERE id = p_id;
    WHEN 'tasks' THEN DELETE FROM public.tasks WHERE id = p_id;
    WHEN 'transactions' THEN DELETE FROM public.transactions WHERE id = p_id;
    WHEN 'payroll' THEN DELETE FROM public.payroll WHERE id = p_id;
    WHEN 'equipment' THEN DELETE FROM public.equipment WHERE id = p_id;
    WHEN 'profiles' THEN
      -- Never delete employees through this generic endpoint.
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_id AND role = 'employee') THEN
        RAISE EXCEPTION 'Employee records must not be deleted from this endpoint';
      END IF;
      DELETE FROM public.profiles
      WHERE id = p_id AND lower(trim(role)) = 'client' AND id <> auth.uid();
    ELSE RAISE EXCEPTION 'Unsupported delete target: %', p_table;
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_record(TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_delete_record(TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_record(TEXT, UUID) TO authenticated;

-- Ensure task assignment is only possible for authenticated admins and real profile UUIDs.
DROP POLICY IF EXISTS "Tasks manageable by authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Tasks viewable by everyone" ON public.tasks;
DROP POLICY IF EXISTS "Admins can create tasks" ON public.tasks;
CREATE POLICY "Admins can create tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
