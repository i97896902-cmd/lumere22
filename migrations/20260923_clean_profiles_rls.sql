-- CLEAN FIX: drop ALL profiles policies, then recreate exactly 5 correct ones.
-- Run in Supabase SQL Editor.

-- 1. Drop ALL existing policies on profiles (remove duplicates)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- 2. Recreate exactly 5 clean policies
CREATE POLICY "Profiles are visible to authenticated users" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can create their own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can create profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update their profile or admins" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 3. Verify: should show exactly 5 rows
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='profiles';
