-- COMPREHENSIVE FIX - single file, idempotent, safe to run multiple times.
--
-- WHAT THIS FIXES (all verified issues from live diagnosis):
--   1. projects_status_check: prod CHECK constraint drifted from schema.sql
--   2. Profiles: admin INSERT policy missing
--   3. Clients: admin INSERT policy missing
--   4. Notifications trigger: may not exist
--   5. Realtime publication: may not include notifications
--
-- Run in: Supabase Dashboard -> SQL Editor -> Run (entire file)

-- ============================================================
-- 1. Fix projects_status_check (the immediate blocker)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = 'projects_status_check'
             AND table_name = 'projects') THEN
    ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
  END IF;
END $$;

ALTER TABLE public.projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('قيد التنفيذ', 'مكتمل', 'ملغي'));

-- ============================================================
-- 2. Profiles: admin INSERT + hardened RLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are visible to authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their profile or admins" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON profiles;

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

-- ============================================================
-- 3. Clients: admin INSERT policy
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Admins can manage clients" ON clients;

CREATE POLICY "Authenticated users can view clients" ON clients
  FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'employee'
  ));

CREATE POLICY "Admins can manage clients" ON clients
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 4. Projects: admin INSERT policy (ensure admin can create)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;

CREATE POLICY "Authenticated users can view projects" ON projects
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage projects" ON projects
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 5. Tasks: hardened RLS (UUID only)
-- ============================================================
DROP POLICY IF EXISTS "Tasks viewable by everyone" ON tasks;
DROP POLICY IF EXISTS "Tasks manageable by authenticated users" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON tasks;
DROP POLICY IF EXISTS "Employees can view own tasks, admins all" ON tasks;
DROP POLICY IF EXISTS "Admins can create and delete tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can create tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Assigned employees can update tasks" ON tasks;

CREATE POLICY "Employees can view own tasks, admins all" ON tasks
  FOR SELECT TO authenticated
  USING (assigned_to_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can create tasks" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete tasks" ON tasks
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Assigned employees can update tasks" ON tasks
  FOR UPDATE TO authenticated
  USING (assigned_to_id = auth.uid() OR public.is_admin())
  WITH CHECK (assigned_to_id = auth.uid() OR public.is_admin());

-- ============================================================
-- 6. Notifications: hardened RLS + trigger + realtime
-- ============================================================
DROP POLICY IF EXISTS "Notifications viewable by recipient" ON notifications;
DROP POLICY IF EXISTS "Notifications manageable by authenticated users" ON notifications;
DROP POLICY IF EXISTS "Recipients can view notifications" ON notifications;
DROP POLICY IF EXISTS "Recipients can update notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;

CREATE POLICY "Recipients can view notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Recipients can update notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can create notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- Notification trigger
CREATE OR REPLACE FUNCTION public.create_task_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_title TEXT;
BEGIN
  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND NEW.assigned_to_id IS DISTINCT FROM OLD.assigned_to_id)
  THEN
    IF NEW.assigned_to_id IS NOT NULL THEN
      SELECT title INTO v_project_title FROM projects WHERE id = NEW.project_id;

      INSERT INTO notifications (user_id, title, message, type, project_id)
      VALUES (
        NEW.assigned_to_id,
        'مهمة جديدة موكلة إليك',
        format(
          'تم تكليفك بمهمة "%s" في مشروع "%s" - آخر موعد للتسليم: %s',
          NEW.title,
          COALESCE(v_project_title, 'غير محدد'),
          COALESCE(NEW.deadline::text, 'غير محدد')
        ),
        'info',
        NEW.project_id
      );
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.status = 'Completed'
     AND NEW.delivery_notes IS NOT NULL
     AND (OLD.status IS DISTINCT FROM 'Completed'
          OR OLD.delivery_notes IS DISTINCT FROM NEW.delivery_notes)
  THEN
    SELECT title INTO v_project_title FROM projects WHERE id = NEW.project_id;
    INSERT INTO notifications (user_id, title, message, type, project_id)
    SELECT p.id,
           'تسليم مهمة فنية',
           format('الموظف سلم مهمة "%s" في مشروع "%s"', NEW.title, COALESCE(v_project_title, 'غير محدد')),
           'delivery',
           NEW.project_id
    FROM profiles p
    WHERE p.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_notification_trigger ON tasks;
CREATE TRIGGER task_notification_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.create_task_notification();

-- Realtime
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
