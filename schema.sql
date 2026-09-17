-- SQL Migration for Supabase PostgreSQL Database

-- 1. PROFILES Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee', 'client')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('approved', 'pending')),
  specialization TEXT,
  bio TEXT,
  portfolio_link TEXT,
  rating INTEGER DEFAULT 0,
  contract_url TEXT,
  contract_status TEXT DEFAULT 'قيد التوقيع',
  client_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (true);

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
CREATE POLICY "Clients are viewable by authenticated users" ON clients FOR SELECT USING (true);
CREATE POLICY "Clients are manageable by admins" ON clients FOR ALL USING (true);

-- 3. PROJECTS Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  budget NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL, -- Project Type/Track
  status TEXT DEFAULT 'قيد التنفيذ', -- 'قيد التنفيذ', 'مكتمل', 'ملغي'
  deadline DATE,
  drive_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects viewable by everyone" ON projects FOR SELECT USING (true);
CREATE POLICY "Projects manageable by admins" ON projects FOR ALL USING (true);

-- 4. TASKS Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Review', 'Completed', 'Canceled', 'Rejected', 'Revisions')),
  delivery_notes TEXT,
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks viewable by everyone" ON tasks FOR SELECT USING (true);
CREATE POLICY "Tasks manageable by authenticated users" ON tasks FOR ALL USING (true);

-- 5. TRANSACTIONS Table
-- Keep this name aligned with the client queries in src/App.tsx.
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'revenue')),
  amount NUMERIC NOT NULL DEFAULT 0,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL, -- 'كاش', 'محفظة إلكترونية', 'أنستا باي (InstaPay)'
  date DATE DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'تشغيلية',
  creator_id UUID,
  creator_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transactions viewable by admins" ON transactions FOR SELECT USING (true);
CREATE POLICY "Transactions manageable by admins" ON transactions FOR ALL USING (true);

-- 6. PAYROLL Table
CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  month TEXT NOT NULL,
  status TEXT DEFAULT 'معلق' CHECK (status IN ('تم الصرف', 'معلق')),
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payroll viewable by admins" ON payroll FOR SELECT USING (true);
CREATE POLICY "Payroll manageable by admins" ON payroll FOR ALL USING (true);

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
CREATE POLICY "Equipment viewable by authenticated users" ON equipment FOR SELECT USING (true);
CREATE POLICY "Equipment manageable by admins" ON equipment FOR ALL USING (true);

-- 8. NOTIFICATIONS Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'info',
  project_id UUID,
  days_left INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifications viewable by recipient" ON notifications FOR SELECT USING (true);
CREATE POLICY "Notifications manageable by authenticated users" ON notifications FOR ALL USING (true);

-- 9. AUDIT LOGS Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  details TEXT
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit logs viewable by admins" ON audit_logs FOR SELECT USING (true);
