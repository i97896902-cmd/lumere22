-- Allow admins to INSERT profiles rows (employee provisioning).
--
-- ROOT CAUSE (verified live): after the profiles hardening, the only INSERT policy is
-- "Users can create their own profile" WITH CHECK (auth.uid() = id). An admin creating
-- an employee therefore inserts id=<new-employee-uuid> while auth.uid()=<admin-uuid> and
-- RLS denies it — the UI fell back to a local-only copy with a success toast, so the
-- employee never existed in Supabase and no task could ever reference them (FK violation).
--
-- This file adds ONE policy. Policies only: no schema/type/data changes, RLS stays
-- ENABLED, no USING(true)/WITH CHECK(true) — admin check via public.is_admin().
--
-- HOW TO APPLY: paste into Supabase Dashboard → SQL Editor → Run, then verify:
--   SELECT policyname FROM pg_policies
--   WHERE schemaname='public' AND tablename='profiles';
-- Expected 5 rows including "Admins can create profiles".

CREATE POLICY "Admins can create profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
