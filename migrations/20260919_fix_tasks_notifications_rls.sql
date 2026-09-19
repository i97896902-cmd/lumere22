-- Migration to fix RLS policies for tasks and notifications
-- and add automatic notification creation when tasks are assigned
--
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. FIX TASKS RLS POLICIES
-- ============================================================
-- The current policy uses assigned_to_id = auth.uid() which fails because:
-- - assigned_to_id is TEXT (can be non-UUID like "ibrahim-mohamed-id-97896902")
-- - auth.uid() returns UUID
-- Solution: Use email matching via profiles table

DROP POLICY IF EXISTS "Authenticated users can view tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can create and delete tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Assigned employees can update tasks" ON tasks;

-- Employees can see tasks assigned to them (by email or id match)
-- Admins can see all tasks
CREATE POLICY "Employees can view own tasks, admins all" ON tasks
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      -- Match by email (stable identifier)
      assigned_email IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND lower(trim(p.email)) = lower(trim(tasks.assigned_email))
      )
    )
    OR (
      -- Match by id (for UUID-based employees)
      assigned_to_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.id::text = tasks.assigned_to_id
      )
    )
  );

-- Only admins can create tasks
CREATE POLICY "Admins can create tasks" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- Only admins can delete tasks
CREATE POLICY "Admins can delete tasks" ON tasks
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Assigned employee or admin can update task
CREATE POLICY "Assigned employees can update tasks" ON tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (
      assigned_email IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND lower(trim(p.email)) = lower(trim(tasks.assigned_email))
      )
    )
    OR (
      assigned_to_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.id::text = tasks.assigned_to_id
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      assigned_email IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND lower(trim(p.email)) = lower(trim(tasks.assigned_email))
      )
    )
    OR (
      assigned_to_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.id::text = tasks.assigned_to_id
      )
    )
  );

-- ============================================================
-- 2. FIX NOTIFICATIONS RLS POLICIES
-- ============================================================
-- Current policy uses user_id = auth.uid() but:
-- - notifications.user_id references profiles(id) which is UUID
-- - Some employees have non-UUID ids in localStorage
-- Solution: Allow matching by email via profiles

DROP POLICY IF EXISTS "Recipients can view notifications" ON notifications;
DROP POLICY IF EXISTS "Recipients can update notifications" ON notifications;

-- Recipients can view their notifications (by user_id or email match)
CREATE POLICY "Recipients can view notifications" ON notifications
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR (
      -- For employees with non-UUID ids, match via email
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND lower(trim(p.email)) = lower(trim((
          SELECT email FROM profiles WHERE id = notifications.user_id
        )))
      )
    )
  );

-- Recipients can update their notifications (mark as read)
CREATE POLICY "Recipients can update notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND lower(trim(p.email)) = lower(trim((
          SELECT email FROM profiles WHERE id = notifications.user_id
        )))
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND lower(trim(p.email)) = lower(trim((
          SELECT email FROM profiles WHERE id = notifications.user_id
        )))
      )
    )
  );

-- Admins can insert notifications (for system notifications)
CREATE POLICY "Admins can create notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ============================================================
-- 3. ADD NOTIFICATION TRIGGER FOR TASK ASSIGNMENT
-- ============================================================
-- When a task is inserted or updated with an assignee, create a notification

CREATE OR REPLACE FUNCTION public.create_task_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_task_title TEXT;
  v_project_title TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
BEGIN
  -- Only create notification on INSERT or when assigned_to_email changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.assigned_email IS DISTINCT FROM OLD.assigned_email) THEN
    -- Find the user_id from profiles using the assigned_email
    SELECT id INTO v_user_id
    FROM profiles
    WHERE lower(trim(email)) = lower(trim(NEW.assigned_email))
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      -- Get project title for notification
      SELECT title INTO v_project_title
      FROM projects
      WHERE id = NEW.project_id;

      v_task_title := NEW.title;
      v_notification_title := 'مهمة جديدة موكلة إليك 📋';
      v_notification_message := format(
        'تم تكليفك بمهمة "%s" في مشروع "%s" — آخر موعد للتسليم: %s',
        v_task_title,
        COALESCE(v_project_title, 'غير محدد'),
        COALESCE(NEW.deadline::text, 'غير محدد')
      );

      -- Insert notification
      INSERT INTO notifications (user_id, title, message, type, project_id)
      VALUES (v_user_id, v_notification_title, v_notification_message, 'info', NEW.project_id);
    END IF;
  END IF;

  -- Also notify on task completion (delivery)
  IF TG_OP = 'UPDATE' AND NEW.status = 'Completed' AND NEW.delivery_notes IS NOT NULL AND (OLD.status IS DISTINCT FROM 'Completed' OR OLD.delivery_notes IS DISTINCT FROM NEW.delivery_notes) THEN
    -- Notify admins about delivery
    -- We'll create a notification for all admins
    INSERT INTO notifications (user_id, title, message, type, project_id)
    SELECT p.id, 'تسليم مهمة فنية 📥', format('الموظف سلم مهمة "%s" في مشروع "%s"', NEW.title, COALESCE(v_project_title, 'غير محدد')), 'delivery', NEW.project_id
    FROM profiles p
    WHERE p.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS task_notification_trigger ON tasks;

-- Create trigger
CREATE TRIGGER task_notification_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.create_task_notification();

-- ============================================================
-- 4. ADD REALTIME PUBLICATION FOR NOTIFICATIONS
-- ============================================================
-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- 5. BACKFILL: Ensure existing tasks have assigned_email populated
-- ============================================================
UPDATE public.tasks t
SET assigned_email = lower(trim(p.email))
FROM public.profiles p
WHERE t.assigned_email IS NULL
  AND t.assigned_to_id IS NOT NULL
  AND p.id::text = t.assigned_to_id::text;

-- ============================================================
-- 6. HELPER FUNCTION: Get current user's employee profile id
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE id = auth.uid() AND role = 'employee';
$$;