-- SQL Migration for Supabase PostgreSQL Database

-- 1. PROFILES Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee', 'client')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'active')),
  specialization TEXT,
  bio TEXT,
  portfolio_link TEXT,
  rating INTEGER DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  contract_url TEXT,
  contract_status TEXT DEFAULT 'قيد التوقيع',
  client_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public profiles are viewable by everyone' AND tablename = 'profiles') THEN
    CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (true);
  END IF;
END $$;

-- 2. CLIENTS Table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  business_type TEXT,
  notes TEXT,
  contract_url TEXT,
  contract_status TEXT DEFAULT 'قيد التوقيع',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients are viewable by authenticated users' AND tablename = 'clients') THEN
    CREATE POLICY "Clients are viewable by authenticated users" ON clients FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients are manageable by admins' AND tablename = 'clients') THEN
    CREATE POLICY "Clients are manageable by admins" ON clients FOR ALL USING (true);
  END IF;
END $$;

-- 3. PROJECTS Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  budget NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL, -- Project Type/Track
  status TEXT DEFAULT 'قيد التنفيذ' CHECK (status IN ('قيد التنفيذ', 'مكتمل', 'ملغي')), -- 'قيد التنفيذ', 'مكتمل', 'ملغي'
  deadline DATE,
  drive_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Projects viewable by everyone' AND tablename = 'projects') THEN
    CREATE POLICY "Projects viewable by everyone" ON projects FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Projects manageable by admins' AND tablename = 'projects') THEN
    CREATE POLICY "Projects manageable by admins" ON projects FOR ALL USING (true);
  END IF;
END $$;

-- 4. TASKS Table
-- assigned_to_id is TEXT, not UUID REFERENCES profiles(id): staff accounts created outside
-- Supabase Auth use non-UUID ids, and the FK rejected tasks assigned to them (the admin UI
-- then silently fell back to localStorage, so the employee saw neither task nor alert).
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assigned_to_id TEXT,
  assigned_email TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Review', 'Completed', 'Canceled', 'Rejected', 'Revisions')),
  delivery_notes TEXT,
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tasks viewable by everyone' AND tablename = 'tasks') THEN
    CREATE POLICY "Tasks viewable by everyone" ON tasks FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tasks manageable by authenticated users' AND tablename = 'tasks') THEN
    CREATE POLICY "Tasks manageable by authenticated users" ON tasks FOR ALL USING (true);
  END IF;
END $$;

-- 5. TRANSACTIONS Table
-- Keep this name aligned with the client queries in src/App.tsx.
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'revenue')),
  amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('كاش', 'محفظة إلكترونية', 'أنستا باي (InstaPay)')), -- 'كاش', 'محفظة إلكترونية', 'أنستا باي (InstaPay)'
  date DATE DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'تشغيلية',
  creator_id UUID,
  creator_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Transactions viewable by admins' AND tablename = 'transactions') THEN
    CREATE POLICY "Transactions viewable by admins" ON transactions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Transactions manageable by admins' AND tablename = 'transactions') THEN
    CREATE POLICY "Transactions manageable by admins" ON transactions FOR ALL USING (true);
  END IF;
END $$;

-- 6. PAYROLL Table
CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  month TEXT NOT NULL,
  status TEXT DEFAULT 'معلق' CHECK (status IN ('تم الصرف', 'معلق')),
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Payroll viewable by admins' AND tablename = 'payroll') THEN
    CREATE POLICY "Payroll viewable by admins" ON payroll FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Payroll manageable by admins' AND tablename = 'payroll') THEN
    CREATE POLICY "Payroll manageable by admins" ON payroll FOR ALL USING (true);
  END IF;
END $$;

-- 7. EQUIPMENT Table
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  serial_number TEXT,
  status TEXT DEFAULT 'متاحة' CHECK (status IN ('متاحة', 'قيد الاستخدام', 'في الصيانة')),
  assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_title TEXT,
  checkout_date DATE,
  return_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Equipment viewable by authenticated users' AND tablename = 'equipment') THEN
    CREATE POLICY "Equipment viewable by authenticated users" ON equipment FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Equipment manageable by admins' AND tablename = 'equipment') THEN
    CREATE POLICY "Equipment manageable by admins" ON equipment FOR ALL USING (true);
  END IF;
END $$;

-- 8. NOTIFICATIONS Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'info',
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  days_left INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Notifications viewable by recipient' AND tablename = 'notifications') THEN
    CREATE POLICY "Notifications viewable by recipient" ON notifications FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Notifications manageable by authenticated users' AND tablename = 'notifications') THEN
    CREATE POLICY "Notifications manageable by authenticated users" ON notifications FOR ALL USING (true);
  END IF;
END $$;

-- 9. AUDIT LOGS Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  details TEXT
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Audit logs viewable by admins' AND tablename = 'audit_logs') THEN
    CREATE POLICY "Audit logs viewable by admins" ON audit_logs FOR SELECT USING (true);
  END IF;
END $$;

-- 10. Atomic payroll payout
-- inserting a transaction as two independent requests.
CREATE OR REPLACE FUNCTION pay_payroll(p_payroll_id UUID)
RETURNS TABLE (payroll_id UUID, transaction_id UUID)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  payroll_row payroll%ROWTYPE;
  created_transaction_id UUID;
BEGIN
  SELECT * INTO payroll_row
  FROM payroll
  WHERE id = p_payroll_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payroll record not found';
  END IF;

  IF payroll_row.status = 'تم الصرف' THEN
    RAISE EXCEPTION 'Payroll record has already been paid';
  END IF;

  UPDATE payroll
  SET status = 'تم الصرف', payment_date = CURRENT_DATE
  WHERE id = p_payroll_id;

  INSERT INTO transactions (
    type, amount, payment_method, description, category, creator_id
  ) VALUES (
    'expense', payroll_row.amount, 'محفظة إلكترونية',
    'صرف مرتب الموظف لشهر ' || payroll_row.month, 'مرتبات', payroll_row.employee_id
  )
  RETURNING id INTO created_transaction_id;

  RETURN QUERY SELECT p_payroll_id, created_transaction_id;
END;
$$;

-- Storage setup for contract uploads. Access control should be tightened
-- further when the client is migrated to Supabase Auth.
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload contracts' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can upload contracts"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'contracts');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update contracts' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can update contracts"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'contracts')
    WITH CHECK (bucket_id = 'contracts');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public contract files are readable' AND tablename = 'objects') THEN
    CREATE POLICY "Public contract files are readable"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'contracts');
  END IF;
END $$;

-- 11. Employee account deletion
CREATE OR REPLACE FUNCTION delete_employee_account(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can delete employee accounts';
  END IF;
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'An admin cannot delete their own account';
  END IF;
  DELETE FROM profiles WHERE id = target_user_id AND role = 'employee';
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 12. Supabase Auth RLS hardening
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
CREATE POLICY "Profiles are visible to authenticated users" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users can create their own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their profile or admins" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin()) WITH CHECK (auth.uid() = id OR public.is_admin());
CREATE POLICY "Admins can delete profiles" ON profiles FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Clients are viewable by authenticated users" ON clients;
DROP POLICY IF EXISTS "Clients are manageable by admins" ON clients;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Admins can manage clients" ON clients;
CREATE POLICY "Authenticated users can view clients" ON clients FOR SELECT TO authenticated USING (public.is_admin() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'employee'));
CREATE POLICY "Admins can manage clients" ON clients FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Projects viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Projects manageable by admins" ON projects;
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;
CREATE POLICY "Authenticated users can view projects" ON projects FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage projects" ON projects FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Tasks viewable by everyone" ON tasks;
DROP POLICY IF EXISTS "Tasks manageable by authenticated users" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can create and delete tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Assigned employees can update tasks" ON tasks;
CREATE POLICY "Authenticated users can view tasks" ON tasks FOR SELECT TO authenticated USING (assigned_to_id = auth.uid() OR public.is_admin() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can create and delete tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete tasks" ON tasks FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY "Assigned employees can update tasks" ON tasks FOR UPDATE TO authenticated USING (assigned_to_id = auth.uid() OR public.is_admin()) WITH CHECK (assigned_to_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Transactions viewable by admins" ON transactions;
DROP POLICY IF EXISTS "Transactions manageable by admins" ON transactions;
DROP POLICY IF EXISTS "Admins can view transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can manage transactions" ON transactions;
CREATE POLICY "Admins can view transactions" ON transactions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage transactions" ON transactions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Payroll viewable by admins" ON payroll;
DROP POLICY IF EXISTS "Payroll manageable by admins" ON payroll;
DROP POLICY IF EXISTS "Admins can view payroll" ON payroll;
DROP POLICY IF EXISTS "Admins can manage payroll" ON payroll;
CREATE POLICY "Admins can view payroll" ON payroll FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage payroll" ON payroll FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Equipment viewable by authenticated users" ON equipment;
DROP POLICY IF EXISTS "Equipment manageable by admins" ON equipment;
DROP POLICY IF EXISTS "Authenticated users can view equipment" ON equipment;
DROP POLICY IF EXISTS "Admins can manage equipment" ON equipment;
CREATE POLICY "Authenticated users can view equipment" ON equipment FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage equipment" ON equipment FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Notifications viewable by recipient" ON notifications;
DROP POLICY IF EXISTS "Notifications manageable by authenticated users" ON notifications;
DROP POLICY IF EXISTS "Recipients can view notifications" ON notifications;
DROP POLICY IF EXISTS "Recipients can update notifications" ON notifications;
CREATE POLICY "Recipients can view notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Recipients can update notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Audit logs viewable by admins" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT TO authenticated USING (public.is_admin());
