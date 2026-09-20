-- FINAL FIX: clean RLS for ALL tables + projects CHECK constraint + trigger + realtime.
-- Run this SINGLE file in Supabase SQL Editor.

-- ============================================================
-- 1. Fix projects CHECK constraint (drift from schema.sql)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = 'projects_status_check' AND table_name = 'projects') THEN
    ALTER TABLE public.projects DROP CONSTRAINT projects_status_check;
  END IF;
END $$;

ALTER TABLE public.projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('قيد التنفيذ', 'مكتمل', 'ملغي'));

-- ============================================================
-- 2. Profiles: drop ALL policies, recreate 5 clean ones
-- ============================================================
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname); END LOOP;
END $$;

CREATE POLICY "Profiles are visible to authenticated users" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users can create their own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can create profiles" ON profiles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Users can update their profile or admins" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin()) WITH CHECK (auth.uid() = id OR public.is_admin());
CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- 3. Clients: drop ALL policies, recreate 2 clean ones
-- ============================================================
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='clients'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON clients', pol.policyname); END LOOP;
END $$;

CREATE POLICY "Authenticated users can view clients" ON clients
  FOR SELECT TO authenticated USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'employee'
  ));
CREATE POLICY "Admins can manage clients" ON clients
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 4. Projects: drop ALL policies, recreate 2 clean ones
-- ============================================================
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='projects'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON projects', pol.policyname); END LOOP;
END $$;

CREATE POLICY "Authenticated users can view projects" ON projects
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage projects" ON projects
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 5. Tasks: drop ALL policies, recreate 4 clean ones
-- ============================================================
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='tasks'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON tasks', pol.policyname); END LOOP;
END $$;

CREATE POLICY "Employees can view own tasks, admins all" ON tasks
  FOR SELECT TO authenticated USING (assigned_to_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins can create tasks" ON tasks
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete tasks" ON tasks
  FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY "Assigned employees can update tasks" ON tasks
  FOR UPDATE TO authenticated USING (assigned_to_id = auth.uid() OR public.is_admin()) WITH CHECK (assigned_to_id = auth.uid() OR public.is_admin());

-- ============================================================
-- 6. Notifications: drop ALL policies, recreate 3 clean ones
-- ============================================================
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='notifications'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON notifications', pol.policyname); END LOOP;
END $$;

CREATE POLICY "Recipients can view notifications" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Recipients can update notifications" ON notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins can create notifications" ON notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- ============================================================
-- 7. Notification trigger (task assignment + delivery)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_task_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_project_title TEXT;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.assigned_to_id IS DISTINCT FROM OLD.assigned_to_id) THEN
    IF NEW.assigned_to_id IS NOT NULL THEN
      SELECT title INTO v_project_title FROM projects WHERE id = NEW.project_id;
      INSERT INTO notifications (user_id, title, message, type, project_id)
      VALUES (NEW.assigned_to_id, 'مهمة جديدة موكلة إليك',
        format('تم تكليفك بمهمة "%s" في مشروع "%s" — آخر موعد: %s', NEW.title, COALESCE(v_project_title, 'غير محدد'), COALESCE(NEW.deadline::text, 'غير محدد')),
        'info', NEW.project_id);
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'Completed' AND NEW.delivery_notes IS NOT NULL
     AND (OLD.status IS DISTINCT FROM 'Completed' OR OLD.delivery_notes IS DISTINCT FROM NEW.delivery_notes) THEN
    SELECT title INTO v_project_title FROM projects WHERE id = NEW.project_id;
    INSERT INTO notifications (user_id, title, message, type, project_id)
    SELECT p.id, 'تسليم مهمة فنية', format('الموظف سلم مهمة "%s" في مشروع "%s"', NEW.title, COALESCE(v_project_title, 'غير محدد')), 'delivery', NEW.project_id
    FROM profiles p WHERE p.role = 'admin';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS task_notification_trigger ON tasks;
CREATE TRIGGER task_notification_trigger AFTER INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION public.create_task_notification();

-- ============================================================
-- 8. Realtime for notifications
-- ============================================================
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================
-- VERIFY: run these separately after the above succeeds:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' ORDER BY tablename, cmd;
-- Expected: profiles(5) + clients(2) + projects(2) + tasks(4) + notifications(3) = 16 total
