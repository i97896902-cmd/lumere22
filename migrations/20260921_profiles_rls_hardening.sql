-- Profiles RLS hardening —政策 only, zero data/schema changes.
--
-- VERIFIED LIVE (anonymous REST on profiles returns rows): production still carries
-- the legacy permissive policy ("Public profiles are viewable by everyone" USING (true)),
-- so unauthenticated callers can read profiles rows. This file replaces ONLY the
-- profiles policies with the auth.uid()/role-based set from schema.sql §12.
--
-- Safety: DROP ... IF EXISTS touches ONLY the 7 named policies below. No column type
-- changes, no table changes, RLS stays ENABLED, no USING(true)/WITH CHECK(true).
--
-- HOW TO APPLY: paste this whole file into Supabase Dashboard → SQL Editor → Run.
-- Then run the verification query at the bottom and confirm the 4 policies exist
-- and anonymous reads return 0 rows.

-- 0. BEFORE (read-only): list current profiles policies to confirm names.
-- SELECT policyname, roles, cmd, qual, with_check
-- FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';

-- 1. Helper (idempotent): admins are profiles rows with role='admin' for auth.uid().
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- 2. Remove the legacy open policies (the leak) + hardened names (idempotent re-run).
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are visible to authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their profile or admins" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- 3. Hardened policies (auth.uid() + role only — never USING(true)).
-- Anonymous (no session): auth.uid() IS NULL → matches nothing → 0 rows.
-- Employee: reads own row (auth.uid() = id); creates/updates own row only.
-- Admin (public.is_admin()): reads/updates all, deletes non-self staff via RPC guards.
CREATE POLICY "Profiles are visible to authenticated users" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users can create their own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their profile or admins" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin()) WITH CHECK (auth.uid() = id OR public.is_admin());
CREATE POLICY "Admins can delete profiles" ON profiles FOR DELETE TO authenticated USING (public.is_admin());

-- 4. AFTER (read-only verification — run separately and check output):
-- SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';
-- Expected: the 4 policies above, nothing with USING(true).
-- Then anonymous REST GET /rest/v1/profiles?select=id must return [].
