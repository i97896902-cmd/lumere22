-- Run in the Supabase SQL Editor.
--
-- Why: tasks.assigned_to_id was declared as UUID REFERENCES profiles(id). Staff accounts
-- created outside Supabase Auth carry non-UUID ids (e.g. "mohamed-user-id"), so inserting
-- a task for them was rejected by the FK/type check. The admin UI then silently fell back
-- to localStorage, and the employee never received the task or its notification.
--
-- Changes:
--   1. Keep assigned_to_id as TEXT so either id form can be stored.
--   2. Add assigned_email so a task can always be re-attributed to its owner even when the
--      stored id does not match the id the employee signed in with.

-- 1. Drop the FK + type restriction on assigned_to_id, keeping existing values.
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_assigned_to_id_fkey;

ALTER TABLE public.tasks
  ALTER COLUMN assigned_to_id TYPE TEXT USING assigned_to_id::text;

-- 2. Track the assignee's email (the stable identifier across auth systems).
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_email TEXT;

CREATE INDEX IF NOT EXISTS tasks_assigned_email_idx
  ON public.tasks (lower(trim(assigned_email)));

-- 3. Backfill assigned_email from profiles for rows created before this migration.
UPDATE public.tasks t
SET assigned_email = lower(trim(p.email))
FROM public.profiles p
WHERE t.assigned_email IS NULL
  AND t.assigned_to_id IS NOT NULL
  AND p.id::text = t.assigned_to_id::text;
