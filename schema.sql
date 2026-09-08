-- SQL Migration for Supabase PostgreSQL Database

-- 1. PROFILES Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('approved', 'pending')),
  specialization TEXT CHECK (specialization IN ('مونتير', 'مبرمج', 'مصور', 'جرافيك ديزاينر', 'إنتاج')),
  bio TEXT,
  portfolio_link TEXT,
  rating INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and insert initial admin
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
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Review', 'Completed', 'Canceled')),
  delivery_notes TEXT,
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks viewable by everyone" ON tasks FOR SELECT USING (true);
CREATE POLICY "Tasks manageable by authenticated users" ON tasks FOR ALL USING (true);

-- 5. FINANCIAL RECORDS Table
CREATE TABLE IF NOT EXISTS financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL DEFAULT 0,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL, -- 'كاش', 'محفظة إلكترونية', 'أنستا باي (InstaPay)'
  date DATE DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  creator_id UUID,
  creator_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financial records viewable by admins" ON financial_records FOR SELECT USING (true);
CREATE POLICY "Financial records manageable by admins" ON financial_records FOR ALL USING (true);

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
