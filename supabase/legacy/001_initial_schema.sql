-- =============================================
-- QA KHOPHE — Database Schema
-- Paste toàn bộ nội dung này vào Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/ageezcxrthqmmacnrqpf/sql
-- =============================================

-- 1. USERS (Người dùng)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff'
    CHECK (role IN ('admin', 'manager', 'staff')),
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CONTACTS (Nhà cung cấp / Đối tác / Khách hàng)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('supplier', 'customer', 'partner')),
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. IMPORTS (Nhập phế liệu)
CREATE TABLE IF NOT EXISTS imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  contact_id UUID REFERENCES contacts(id),
  quantity_kg NUMERIC(10,2) NOT NULL,
  material_type TEXT DEFAULT 'Tấm nhựa nano',
  price_per_kg NUMERIC(10,0) DEFAULT 4000,
  total_amount NUMERIC(15,0),
  payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  processing_status TEXT DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'grinding', 'done')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. GRINDING (Xay phế liệu)
CREATE TABLE IF NOT EXISTS grinding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  import_id UUID REFERENCES imports(id),
  input_qty_kg NUMERIC(10,2) NOT NULL,
  output_qty_kg NUMERIC(10,2) NOT NULL,
  loss_kg NUMERIC(10,2) GENERATED ALWAYS AS
    (input_qty_kg - output_qty_kg) STORED,
  loss_pct NUMERIC(5,2) GENERATED ALWAYS AS
    (CASE WHEN input_qty_kg > 0
      THEN ((input_qty_kg - output_qty_kg) / input_qty_kg * 100)
      ELSE 0 END) STORED,
  bags_count INTEGER,
  worker TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. EXPORTS (Xuất phế liệu)
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  contact_id UUID REFERENCES contacts(id),
  bags_count INTEGER NOT NULL,
  total_kg NUMERIC(10,2) NOT NULL,
  price_per_kg NUMERIC(10,0) DEFAULT 6000,
  total_amount NUMERIC(15,0),
  payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  weighing_session_id UUID,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. WEIGHING SESSIONS (Phiên cân phế)
CREATE TABLE IF NOT EXISTS weighing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  material_type TEXT DEFAULT 'Tấm nhựa nano',
  total_bags INTEGER DEFAULT 0,
  total_kg NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. WEIGHING BAGS (Chi tiết từng bao)
CREATE TABLE IF NOT EXISTS weighing_bags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES weighing_sessions(id) ON DELETE CASCADE,
  bag_number INTEGER NOT NULL,
  weight_kg NUMERIC(8,2) NOT NULL,
  notes TEXT
);

-- 8. EXPENSES (Chi phí)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL
    CHECK (category IN ('fuel', 'blade', 'oil', 'labor', 'parts',
                        'transport', 'maintenance', 'other')),
  amount NUMERIC(15,0) NOT NULL,
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. ADVANCES (Ứng tiền)
CREATE TABLE IF NOT EXISTS advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,0) NOT NULL,
  person TEXT NOT NULL,
  type TEXT DEFAULT 'advance'
    CHECK (type IN ('advance', 'settlement')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_imports_date ON imports(date);
CREATE INDEX IF NOT EXISTS idx_imports_contact ON imports(contact_id);
CREATE INDEX IF NOT EXISTS idx_grinding_date ON grinding(date);
CREATE INDEX IF NOT EXISTS idx_grinding_import ON grinding(import_id);
CREATE INDEX IF NOT EXISTS idx_exports_date ON exports(date);
CREATE INDEX IF NOT EXISTS idx_exports_contact ON exports(contact_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_weighing_bags_session ON weighing_bags(session_id);
CREATE INDEX IF NOT EXISTS idx_advances_date ON advances(date);

-- =============================================
-- ROW LEVEL SECURITY (RLS) — Cho phép tất cả authenticated users
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE grinding ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE weighing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weighing_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can do everything
CREATE POLICY "Allow all for authenticated" ON users
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON contacts
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON imports
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON grinding
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON exports
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON weighing_sessions
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON weighing_bags
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON expenses
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON advances
  FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- TRIGGER: Auto-update updated_at on contacts
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SEED DATA: Nhà cung cấp + Khách hàng từ sổ tay
-- =============================================
INSERT INTO contacts (name, type, phone, notes) VALUES
  ('A. Danh', 'supplier', '0901000001', 'NCC phế nhựa nano'),
  ('Em Hoàn', 'supplier', '0912000002', 'NCC phế nhựa nano'),
  ('Em Hồ', 'supplier', '0918000003', 'NCC phế nhựa nano'),
  ('Nga', 'supplier', '0977000004', 'NCC phế nhựa nano'),
  ('Hoàn', 'supplier', '0938000005', 'NCC phế nhựa nano'),
  ('A. Ngâu', 'supplier', '0905000006', 'NCC phế nhựa nano'),
  ('Hồ Chung', 'supplier', '0934000007', 'NCC phế nhựa nano'),
  ('Ph. Tuấn', 'supplier', '0922000008', 'NCC phế nhựa nano'),
  ('Chị Hoan', 'supplier', '0915000009', 'NCC phế nhựa nano'),
  ('A. Sâm', 'supplier', '0947000010', 'NCC phế nhựa nano'),
  ('Ka Tuệ', 'supplier', '0903000011', 'NCC phế nhựa nano'),
  ('Bà Phấn', 'supplier', '0916000012', 'NCC phế nhựa nano'),
  ('Nhà máy Nhựa Việt', 'customer', '0281000001', 'Khách mua bột PVC tái sinh'),
  ('Công ty Tân Phát', 'customer', '0282000002', 'Khách mua bột PVC tái sinh'),
  ('Xưởng SX ABC', 'customer', '0283000003', 'Khách mua bột PVC tái sinh');
