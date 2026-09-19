-- ROOT FIX for: invalid input syntax for type uuid: "mohamed-user-id"
--
-- Cause: the admin task form offered fake-ID employees seeded in the browser
-- ("mohamed-user-id", "ibrahim-mohamed-id-97896902", "ghareb-user-id") and sent
-- that string to the UUID-typed tasks.assigned_to_id column.
--
-- Design (from schema, do NOT change UUID to TEXT):
--   profiles.id (UUID) = auth.users.id
--   employees = profiles WHERE role='employee'  (no separate employees table)
--   tasks.assigned_to_id (UUID) REFERENCES profiles(id)  — real employee UUID
--   tasks.project_id (UUID) REFERENCES projects(id)
--   notifications.user_id (UUID) REFERENCES profiles(id)
--
-- Run in the Supabase SQL Editor. Idempotent: safe to run even if the earlier
-- TEXT/email workaround migrations were or were not applied.

-- ============================================================
-- 1. Clean rows that can never cast to UUID, then restore UUID type
-- ============================================================
-- If assigned_to_id is still TEXT (workaround applied), drop fake values first.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'assigned_to_id'
      AND data_type = 'text'
  ) THEN
    -- Null out every non-UUID assignee (fake IDs, names, empty strings).
    UPDATE public.tasks
    SET assigned_to_id = NULL
    WHERE assigned_to_id IS NOT NULL
      AND trim(assigned_to_id) !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';

    ALTER TABLE public.tasks
      DROP CONSTRAINT IF EXISTS tasks_assigned_to_id_fkey;

    ALTER TABLE public.tasks
      ALTER COLUMN assigned_to_id TYPE UUID USING assigned_to_id::uuid;

    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_assigned_to_id_fkey
      FOREIGN KEY (assigned_to_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- If the column is already UUID, just (re)attach the FK to profiles(id).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'assigned_to_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.tasks
      DROP CONSTRAINT IF EXISTS tasks_assigned_to_id_fkey;
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_assigned_to_id_fkey
      FOREIGN KEY (assigned_to_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Restore original design: no assigned_email column (it was a workaround).
ALTER TABLE public.tasks DROP COLUMN IF EXISTS assigned_email;
DROP INDEX IF EXISTS tasks_assigned_email_idx;

-- Helpful index for the employee's own-tasks query.
CREATE INDEX IF NOT EXISTS tasks_assigned_to_id_idx ON public.tasks (assigned_to_id);

-- ============================================================
-- 2. TASKS RLS — pure UUID comparison (no email matching)
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
-- 3. NOTIFICATIONS RLS — pure UUID (user_id = auth.uid())
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

-- ============================================================
-- 4. Notification trigger — UUID directly, no email lookup
--    Task → assigned employee UUID → Notification → same employee UUID
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_task_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_title TEXT;
BEGIN
  -- On assignment (INSERT, or reassignment to a different real UUID):
  -- NEW.assigned_to_id is already the profiles UUID, use it directly.
  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND NEW.assigned_to_id IS DISTINCT FROM OLD.assigned_to_id)
  THEN
    IF NEW.assigned_to_id IS NOT NULL THEN
      SELECT title INTO v_project_title FROM projects WHERE id = NEW.project_id;

      INSERT INTO notifications (user_id, title, message, type, project_id)
      VALUES (
        NEW.assigned_to_id,
        'مهمة جديدة موكلة إليك 📋',
        format(
          'تم تكليفك بمهمة "%s" في مشروع "%s" — آخر موعد للتسليم: %s',
          NEW.title,
          COALESCE(v_project_title, 'غير محدد'),
          COALESCE(NEW.deadline::text, 'غير محدد')
        ),
        'info',
        NEW.project_id
      );
    END IF;
  END IF;

  -- On delivery (status → Completed with notes): notify every admin.
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'Completed'
     AND NEW.delivery_notes IS NOT NULL
     AND (OLD.status IS DISTINCT FROM 'Completed'
          OR OLD.delivery_notes IS DISTINCT FROM NEW.delivery_notes)
  THEN
    SELECT title INTO v_project_title FROM projects WHERE id = NEW.project_id;
    INSERT INTO notifications (user_id, title, message, type, project_id)
    SELECT p.id,
           'تسليم مهمة فنية 📥',
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

-- ============================================================
-- 5. Realtime for notifications (no re-login needed)
-- ============================================================
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN duplicate_object THEN
    -- Already a member; nothing to do.
    NULL;
  END;
END $$;
