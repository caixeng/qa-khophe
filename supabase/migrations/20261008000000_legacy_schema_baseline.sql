-- Legacy schema baseline, without business seed data.
-- Existing projects already have this schema; their baseline is recorded without rerunning it.
DO $baseline$ BEGIN
 IF to_regclass('public.users') IS NULL THEN
 EXECUTE $legacy_sql$-- =============================================
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
$legacy_sql$;
 EXECUTE $legacy_sql$-- =============================================
-- QA KHOPHE — Migration 003: Phân quyền thật (RLS theo vai trò)
-- Paste toàn bộ nội dung này vào Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/ageezcxrthqmmacnrqpf/sql
--
-- THAY THẾ hoàn toàn các policy "Allow all" (USING(true)) của migration 002.
-- Sau khi chạy file này, ứng dụng BẮT BUỘC đăng nhập thật qua Supabase Auth —
-- không còn tài khoản admin@khophe.vn/123456 cứng trong code.
--
-- QUAN TRỌNG — việc cần làm SAU khi chạy migration này:
-- 1. Vào Supabase Dashboard > Authentication > Users, tạo tài khoản đăng nhập
--    thật (email + mật khẩu) cho từng người dùng.
-- 2. Chạy lệnh dưới đây (thay email) để cấp quyền admin cho tài khoản đầu tiên:
--      INSERT INTO users (email, full_name, role)
--      VALUES ('ban@congty.vn', 'Quản trị viên', 'admin')
--      ON CONFLICT (email) DO UPDATE SET role = 'admin';
--    Lần đăng nhập đầu tiên bằng email này, ứng dụng sẽ tự động gắn auth_id
--    tương ứng vào dòng users này (tự "nhận" hồ sơ theo email).
-- 3. Với nhân viên/quản lý: thêm dòng tương tự với role = 'staff' hoặc 'manager'.
-- =============================================

-- ---------------------------------------------
-- 1. Hàm tiện ích: lấy role / user_id của người đang đăng nhập
--    SECURITY DEFINER để tránh đệ quy RLS khi policy tự tham chiếu bảng users.
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM users WHERE auth_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM users WHERE auth_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(current_user_role() IN ('manager', 'admin'), false)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(current_user_role() = 'admin', false)
$$;

-- Bất kỳ role hợp lệ nào (staff/manager/admin) — dùng để cho phép ghi nghiệp vụ hằng ngày
CREATE OR REPLACE FUNCTION public.has_any_role()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(current_user_role() IS NOT NULL, false)
$$;

-- ---------------------------------------------
-- 2. Dọn toàn bộ policy "Allow all" cũ (migration 001 + 002)
-- ---------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  pol TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['users','contacts','imports','grinding','exports','weighing_sessions','weighing_bags','expenses','advances'])
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------
-- 3. USERS — chỉ xem/sửa hồ sơ của chính mình; admin toàn quyền
--    Policy riêng cho phép "tự nhận" hồ sơ chưa gắn auth_id theo email khớp
--    với JWT hiện tại (dùng đúng 1 lần khi admin đã pre-provision theo email).
-- ---------------------------------------------
CREATE POLICY "users_select_own_or_admin" ON users
  FOR SELECT USING (auth_id = auth.uid() OR is_admin());

CREATE POLICY "users_claim_own_profile_by_email" ON users
  FOR UPDATE
  USING (auth_id IS NULL AND email = (auth.jwt() ->> 'email'))
  WITH CHECK (auth_id = auth.uid() AND email = (auth.jwt() ->> 'email'));

CREATE POLICY "users_update_own_or_admin" ON users
  FOR UPDATE USING (auth_id = auth.uid() OR is_admin());

CREATE POLICY "users_admin_insert" ON users
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "users_admin_delete" ON users
  FOR DELETE USING (is_admin());

-- ---------------------------------------------
-- 4. CONTACTS — mọi user đã đăng nhập xem được; manager+ mới được ghi
-- ---------------------------------------------
CREATE POLICY "contacts_select" ON contacts
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "contacts_write" ON contacts
  FOR INSERT WITH CHECK (is_manager_or_admin());
CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE USING (is_manager_or_admin());

-- ---------------------------------------------
-- 5. NGHIỆP VỤ HẰNG NGÀY (imports/grinding/exports/weighing)
--    Bất kỳ role hợp lệ (staff+) đều ghi được phiếu mới; chỉ manager+ sửa/xoá.
-- ---------------------------------------------
CREATE POLICY "imports_select" ON imports
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "imports_insert" ON imports
  FOR INSERT WITH CHECK (has_any_role());
CREATE POLICY "imports_update" ON imports
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "imports_delete" ON imports
  FOR DELETE USING (is_manager_or_admin());

CREATE POLICY "grinding_select" ON grinding
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "grinding_insert" ON grinding
  FOR INSERT WITH CHECK (has_any_role());
CREATE POLICY "grinding_update" ON grinding
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "grinding_delete" ON grinding
  FOR DELETE USING (is_manager_or_admin());

CREATE POLICY "exports_select" ON exports
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "exports_insert" ON exports
  FOR INSERT WITH CHECK (has_any_role());
CREATE POLICY "exports_update" ON exports
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "exports_delete" ON exports
  FOR DELETE USING (is_manager_or_admin());

CREATE POLICY "weighing_sessions_select" ON weighing_sessions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "weighing_sessions_insert" ON weighing_sessions
  FOR INSERT WITH CHECK (has_any_role());
CREATE POLICY "weighing_sessions_update" ON weighing_sessions
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "weighing_sessions_delete" ON weighing_sessions
  FOR DELETE USING (is_manager_or_admin());

CREATE POLICY "weighing_bags_select" ON weighing_bags
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "weighing_bags_insert" ON weighing_bags
  FOR INSERT WITH CHECK (has_any_role());
CREATE POLICY "weighing_bags_update" ON weighing_bags
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "weighing_bags_delete" ON weighing_bags
  FOR DELETE USING (is_manager_or_admin());

-- ---------------------------------------------
-- 6. TÀI CHÍNH (expenses/advances) — chỉ manager+ được xem và ghi
--    (chi phí, ứng lương là thông tin nhạy cảm, không cho staff xem)
-- ---------------------------------------------
CREATE POLICY "expenses_all" ON expenses
  FOR SELECT USING (is_manager_or_admin());
CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (is_manager_or_admin());
CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (is_manager_or_admin());

CREATE POLICY "advances_all" ON advances
  FOR SELECT USING (is_manager_or_admin());
CREATE POLICY "advances_insert" ON advances
  FOR INSERT WITH CHECK (is_manager_or_admin());
CREATE POLICY "advances_update" ON advances
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "advances_delete" ON advances
  FOR DELETE USING (is_manager_or_admin());

-- ---------------------------------------------
-- 7. Tự động gắn created_by khi INSERT (không phụ thuộc client có gửi hay không)
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := current_user_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_created_by ON imports;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON imports
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS trg_set_created_by ON grinding;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON grinding
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS trg_set_created_by ON exports;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON exports
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS trg_set_created_by ON weighing_sessions;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON weighing_sessions
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS trg_set_created_by ON expenses;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS trg_set_created_by ON advances;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON advances
  FOR EACH ROW EXECUTE FUNCTION set_created_by();
$legacy_sql$;
 EXECUTE $legacy_sql$-- =============================================
-- QA KHOPHE — Migration 004: Nhân sự & Chấm công
-- Paste vào Supabase SQL Editor SAU khi đã chạy migration 003.
-- Bảng employees/attendance được app dùng từ trước nhưng CHƯA từng được tạo —
-- module Nhân sự hiện đang chạy 100% trên dữ liệu giả trong code.
-- =============================================

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff'
    CHECK (role IN ('grinder', 'weigher', 'driver', 'manager', 'staff')),
  daily_salary NUMERIC(15,0) NOT NULL DEFAULT 0 CHECK (daily_salary >= 0),
  phone TEXT,
  address TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  employee_id UUID REFERENCES employees(id),
  work_shift NUMERIC(3,2) NOT NULL DEFAULT 1 CHECK (work_shift >= 0),
  overtime_hours NUMERIC(4,1) DEFAULT 0 CHECK (overtime_hours >= 0),
  daily_pay NUMERIC(15,0) NOT NULL DEFAULT 0 CHECK (daily_pay >= 0),
  advance_pay NUMERIC(15,0) DEFAULT 0 CHECK (advance_pay >= 0),
  net_pay NUMERIC(15,0) NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Lương/chấm công là dữ liệu nhạy cảm — chỉ manager+ được xem và ghi.
CREATE POLICY "employees_manager_all" ON employees
  FOR SELECT USING (is_manager_or_admin());
CREATE POLICY "employees_manager_insert" ON employees
  FOR INSERT WITH CHECK (is_manager_or_admin());
CREATE POLICY "employees_manager_update" ON employees
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "employees_manager_delete" ON employees
  FOR DELETE USING (is_manager_or_admin());

CREATE POLICY "attendance_manager_all" ON attendance
  FOR SELECT USING (is_manager_or_admin());
CREATE POLICY "attendance_manager_insert" ON attendance
  FOR INSERT WITH CHECK (is_manager_or_admin());
CREATE POLICY "attendance_manager_update" ON attendance
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "attendance_manager_delete" ON attendance
  FOR DELETE USING (is_manager_or_admin());

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_set_created_by ON employees;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS trg_set_created_by ON attendance;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON attendance
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

-- Tự động tính net_pay = (work_shift * daily_pay) - advance_pay, tránh sai lệch
-- nếu có ai ghi thẳng vào DB ngoài app.
CREATE OR REPLACE FUNCTION public.compute_attendance_net_pay()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.net_pay := GREATEST(0, (NEW.work_shift * NEW.daily_pay) - COALESCE(NEW.advance_pay, 0));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_net_pay ON attendance;
CREATE TRIGGER trg_attendance_net_pay BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION compute_attendance_net_pay();
$legacy_sql$;
 EXECUTE $legacy_sql$-- =============================================
-- QA KHOPHE — Migration 005: Thanh toán từng phần & Công nợ chính xác
-- Paste vào Supabase SQL Editor SAU khi đã chạy migration 003 + 004.
--
-- Vấn đề đang sửa: payment_status chỉ có unpaid/partial/paid nhưng KHÔNG lưu
-- được SỐ TIỀN đã trả từng lần → cột "Nợ còn lại" trên trang Công nợ hiện
-- luôn hiện TOÀN BỘ giá trị đơn dù đã trả một phần.
-- =============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_type TEXT NOT NULL CHECK (ref_type IN ('import', 'export')),
  ref_id UUID NOT NULL,
  amount NUMERIC(15,0) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT DEFAULT 'cash' CHECK (method IN ('cash', 'transfer', 'other')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(ref_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (is_manager_or_admin());
CREATE POLICY "payments_update" ON payments
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "payments_delete" ON payments
  FOR DELETE USING (is_manager_or_admin());

DROP TRIGGER IF EXISTS trg_set_created_by ON payments;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

-- ---------------------------------------------
-- Tự động đồng bộ payment_status trên imports/exports mỗi khi
-- payments thay đổi, tính theo TỔNG đã trả thực tế.
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID := COALESCE(NEW.ref_id, OLD.ref_id);
  target_type TEXT := COALESCE(NEW.ref_type, OLD.ref_type);
  total NUMERIC;
  paid NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO paid
  FROM payments WHERE ref_type = target_type AND ref_id = target_id;

  IF target_type = 'import' THEN
    SELECT total_amount INTO total FROM imports WHERE id = target_id;
    IF FOUND THEN
      UPDATE imports SET payment_status = CASE
        WHEN paid <= 0 THEN 'unpaid'
        WHEN paid >= total THEN 'paid'
        ELSE 'partial'
      END WHERE id = target_id;
    END IF;
  ELSIF target_type = 'export' THEN
    SELECT total_amount INTO total FROM exports WHERE id = target_id;
    IF FOUND THEN
      UPDATE exports SET payment_status = CASE
        WHEN paid <= 0 THEN 'unpaid'
        WHEN paid >= total THEN 'paid'
        ELSE 'partial'
      END WHERE id = target_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payment_status ON payments;
CREATE TRIGGER trg_sync_payment_status
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_payment_status();

-- ---------------------------------------------
-- View tiện dụng: nợ còn lại chính xác cho từng phiếu nhập/xuất
-- ---------------------------------------------
CREATE OR REPLACE VIEW v_import_debts WITH (security_invoker = true) AS
SELECT
  i.id AS ref_id,
  'import'::TEXT AS ref_type,
  i.date,
  i.contact_id,
  i.total_amount,
  COALESCE(p.paid_amount, 0) AS paid_amount,
  i.total_amount - COALESCE(p.paid_amount, 0) AS remaining_amount
FROM imports i
LEFT JOIN (
  SELECT ref_id, SUM(amount) AS paid_amount FROM payments WHERE ref_type = 'import' GROUP BY ref_id
) p ON p.ref_id = i.id;

CREATE OR REPLACE VIEW v_export_debts WITH (security_invoker = true) AS
SELECT
  e.id AS ref_id,
  'export'::TEXT AS ref_type,
  e.date,
  e.contact_id,
  e.total_amount,
  COALESCE(p.paid_amount, 0) AS paid_amount,
  e.total_amount - COALESCE(p.paid_amount, 0) AS remaining_amount
FROM exports e
LEFT JOIN (
  SELECT ref_id, SUM(amount) AS paid_amount FROM payments WHERE ref_type = 'export' GROUP BY ref_id
) p ON p.ref_id = e.id;
$legacy_sql$;
 EXECUTE $legacy_sql$-- =============================================
-- QA KHOPHE — Migration 006: Kiểm kê kho, Cấu hình hệ thống,
--             Ràng buộc dữ liệu, Audit log, Soft delete
-- Paste vào Supabase SQL Editor SAU khi đã chạy migration 003 + 004 + 005.
-- =============================================

-- ---------------------------------------------
-- 1. SETTINGS — cấu hình hệ thống (vd: quy đổi kg/bao)
--    Thay cho hằng số "1 bao = 900kg" đang hardcode rải rác trong code.
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO settings (key, value) VALUES ('kg_per_bag', '900')
  ON CONFLICT (key) DO NOTHING;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select" ON settings
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "settings_admin_write" ON settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------------------------------------------
-- 2. STOCK COUNTS — kiểm kê kho thực tế, đối chiếu số hệ thống
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS stock_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  counted_bags INTEGER NOT NULL CHECK (counted_bags >= 0),
  counted_kg NUMERIC(12,2) NOT NULL CHECK (counted_kg >= 0),
  system_kg NUMERIC(12,2) NOT NULL,
  diff_kg NUMERIC(12,2) GENERATED ALWAYS AS (counted_kg - system_kg) STORED,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_counts_date ON stock_counts(date);

ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_counts_select" ON stock_counts
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "stock_counts_insert" ON stock_counts
  FOR INSERT WITH CHECK (is_manager_or_admin());
CREATE POLICY "stock_counts_update" ON stock_counts
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "stock_counts_delete" ON stock_counts
  FOR DELETE USING (is_manager_or_admin());

DROP TRIGGER IF EXISTS trg_set_created_by ON stock_counts;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON stock_counts
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

-- ---------------------------------------------
-- 3. RÀNG BUỘC DỮ LIỆU CÒN THIẾU
-- ---------------------------------------------
ALTER TABLE imports ADD CONSTRAINT chk_imports_qty_positive CHECK (quantity_kg > 0);
ALTER TABLE imports ADD CONSTRAINT chk_imports_price_nonneg CHECK (price_per_kg >= 0);
ALTER TABLE exports ADD CONSTRAINT chk_exports_kg_positive CHECK (total_kg > 0);
ALTER TABLE exports ADD CONSTRAINT chk_exports_price_nonneg CHECK (price_per_kg >= 0);
ALTER TABLE exports ADD CONSTRAINT chk_exports_bags_nonneg CHECK (bags_count >= 0);
ALTER TABLE grinding ADD CONSTRAINT chk_grinding_input_positive CHECK (input_qty_kg > 0);
ALTER TABLE grinding ADD CONSTRAINT chk_grinding_output_nonneg CHECK (output_qty_kg >= 0);

-- Liên kết phiếu xuất với phiên cân (trước đây không có FK)
ALTER TABLE exports
  ADD CONSTRAINT fk_exports_weighing_session
  FOREIGN KEY (weighing_session_id) REFERENCES weighing_sessions(id);

-- total_amount phải luôn khớp qty * price — chuyển thành cột tính tự động
-- thay vì để client tự tính rồi gửi lên (có thể sai lệch).
-- v_import_debts/v_export_debts (migration 005) phụ thuộc cột này nên phải
-- drop view trước, đổi cột, rồi tạo lại view giống hệt migration 005.
DROP VIEW IF EXISTS v_import_debts;
DROP VIEW IF EXISTS v_export_debts;

ALTER TABLE imports DROP COLUMN IF EXISTS total_amount;
ALTER TABLE imports ADD COLUMN total_amount NUMERIC(15,0)
  GENERATED ALWAYS AS (quantity_kg * price_per_kg) STORED;

ALTER TABLE exports DROP COLUMN IF EXISTS total_amount;
ALTER TABLE exports ADD COLUMN total_amount NUMERIC(15,0)
  GENERATED ALWAYS AS (total_kg * price_per_kg) STORED;

CREATE OR REPLACE VIEW v_import_debts WITH (security_invoker = true) AS
SELECT
  i.id AS ref_id,
  'import'::TEXT AS ref_type,
  i.date,
  i.contact_id,
  i.total_amount,
  COALESCE(p.paid_amount, 0) AS paid_amount,
  i.total_amount - COALESCE(p.paid_amount, 0) AS remaining_amount
FROM imports i
LEFT JOIN (
  SELECT ref_id, SUM(amount) AS paid_amount FROM payments WHERE ref_type = 'import' GROUP BY ref_id
) p ON p.ref_id = i.id;

CREATE OR REPLACE VIEW v_export_debts WITH (security_invoker = true) AS
SELECT
  e.id AS ref_id,
  'export'::TEXT AS ref_type,
  e.date,
  e.contact_id,
  e.total_amount,
  COALESCE(p.paid_amount, 0) AS paid_amount,
  e.total_amount - COALESCE(p.paid_amount, 0) AS remaining_amount
FROM exports e
LEFT JOIN (
  SELECT ref_id, SUM(amount) AS paid_amount FROM payments WHERE ref_type = 'export' GROUP BY ref_id
) p ON p.ref_id = e.id;

-- ---------------------------------------------
-- 4. updated_at cho các bảng còn thiếu + soft delete cho chứng từ
-- ---------------------------------------------
ALTER TABLE imports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE imports ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE exports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE exports ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE grinding ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE grinding ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DROP TRIGGER IF EXISTS imports_updated_at ON imports;
CREATE TRIGGER imports_updated_at BEFORE UPDATE ON imports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS exports_updated_at ON exports;
CREATE TRIGGER exports_updated_at BEFORE UPDATE ON exports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS grinding_updated_at ON grinding;
CREATE TRIGGER grinding_updated_at BEFORE UPDATE ON grinding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index cho các cột lọc nhiều nhất
CREATE INDEX IF NOT EXISTS idx_imports_payment_status ON imports(payment_status);
CREATE INDEX IF NOT EXISTS idx_imports_processing_status ON imports(processing_status);
CREATE INDEX IF NOT EXISTS idx_exports_payment_status ON exports(payment_status);

-- ---------------------------------------------
-- 5. AUDIT LOG — ghi lại ai sửa/xoá gì (đối chiếu khi có tranh chấp)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  row_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID REFERENCES users(id),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_row ON audit_log(table_name, row_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_admin_select" ON audit_log
  FOR SELECT USING (is_admin());

CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, changed_by, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    current_user_id(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_imports ON imports;
CREATE TRIGGER trg_audit_imports AFTER INSERT OR UPDATE OR DELETE ON imports
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();
DROP TRIGGER IF EXISTS trg_audit_exports ON exports;
CREATE TRIGGER trg_audit_exports AFTER INSERT OR UPDATE OR DELETE ON exports
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();
DROP TRIGGER IF EXISTS trg_audit_grinding ON grinding;
CREATE TRIGGER trg_audit_grinding AFTER INSERT OR UPDATE OR DELETE ON grinding
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();
DROP TRIGGER IF EXISTS trg_audit_payments ON payments;
CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();
DROP TRIGGER IF EXISTS trg_audit_employees ON employees;
CREATE TRIGGER trg_audit_employees AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();
$legacy_sql$;
 EXECUTE $legacy_sql$-- =============================================
-- QA KHOPHE — Migration 008: Kiểm tra & siết bảo mật
--
-- Chạy file này SAU 003–007. An toàn khi chạy lại nhiều lần.
--
-- Mục đích: tự kiểm tra xem DB có đang ở trạng thái an toàn không, thay vì phải
-- tin vào trí nhớ về việc "đã chạy migration nào rồi". Nếu còn sót policy mở
-- toang, file này sẽ DỪNG với thông báo rõ ràng chứ không âm thầm bỏ qua.
-- =============================================

-- ---------------------------------------------
-- 1. Bật RLS cho mọi bảng nghiệp vụ
--    (Bảng có RLS tắt thì policy viết bao nhiêu cũng vô nghĩa.)
-- ---------------------------------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users','contacts','imports','grinding','exports',
      'weighing_sessions','weighing_bags','expenses','advances'
    ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;

  -- Các bảng thêm ở migration 004–006 (nếu đã tạo)
  FOR tbl IN
    SELECT unnest(ARRAY['employees','attendance','payments','settings','stock_counts','audit_log'])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------
-- 2. Xoá mọi policy còn để USING(true) — tàn dư của migration 002
-- ---------------------------------------------
DO $$
DECLARE
  r RECORD;
  removed INT := 0;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual = 'true' OR with_check = 'true')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    removed := removed + 1;
    RAISE NOTICE 'Đã xoá policy mở toang: %.% ', r.tablename, r.policyname;
  END LOOP;

  IF removed = 0 THEN
    RAISE NOTICE 'OK — không còn policy USING(true) nào.';
  ELSE
    RAISE WARNING 'Đã xoá % policy mở toang. Chạy lại 003_users_roles_and_rls.sql nếu các bảng liên quan giờ không còn policy nào.', removed;
  END IF;
END $$;

-- ---------------------------------------------
-- 3. Cảnh báo bảng đã bật RLS nhưng KHÔNG có policy nào
--    (Trạng thái này khoá sạch mọi truy cập — app sẽ trắng dữ liệu.)
-- ---------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
      )
  LOOP
    RAISE WARNING 'Bảng "%" đã bật RLS nhưng chưa có policy nào — sẽ không ai đọc/ghi được. Cần bổ sung policy.', r.tablename;
  END LOOP;
END $$;

-- ---------------------------------------------
-- 4. Cảnh báo tài khoản chưa gắn Supabase Auth
--    Dòng users chưa có auth_id sẽ được "nhận" ở lần đăng nhập đầu theo email.
-- ---------------------------------------------
DO $$
DECLARE
  n INT;
  admins INT;
BEGIN
  SELECT count(*) INTO n FROM users WHERE auth_id IS NULL;
  IF n > 0 THEN
    RAISE NOTICE '% tài khoản chưa gắn auth_id — sẽ tự gắn ở lần đăng nhập đầu tiên theo email khớp.', n;
  END IF;

  SELECT count(*) INTO admins FROM users WHERE role = 'admin';
  IF admins = 0 THEN
    RAISE WARNING 'CHƯA CÓ TÀI KHOẢN ADMIN NÀO. Chạy: INSERT INTO users (email, full_name, role) VALUES (''ban@congty.vn'', ''Quản trị viên'', ''admin'') ON CONFLICT (email) DO UPDATE SET role = ''admin'';';
  END IF;
END $$;

-- ---------------------------------------------
-- 5. Báo cáo tổng kết — đọc phần Messages/Notices sau khi chạy
-- ---------------------------------------------
SELECT
  tablename AS "Bảng",
  count(*) AS "Số policy",
  bool_or(qual = 'true' OR with_check = 'true') AS "Còn mở toang?"
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
$legacy_sql$;
 EXECUTE $legacy_sql$-- =============================================
-- QA KHOPHE — Migration 009: Bảng giá riêng theo đối tác
--
-- Chạy sau 008. An toàn khi chạy lại nhiều lần.
--
-- Vì sao cần: giá nhập/xuất đang hardcode 4.000 và 6.000 đ/kg trong form, trong
-- khi thực tế mỗi nhà cung cấp một giá và giá thay đổi theo thời điểm (dữ liệu
-- sổ tay đã có cả 4.000 lẫn 4.500). Người nhập phải sửa tay mỗi phiếu, và chỉ
-- cần quên một lần là sai tiền của cả lô.
-- =============================================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS default_price_per_kg NUMERIC(12, 2);

COMMENT ON COLUMN contacts.default_price_per_kg IS
  'Giá mặc định đ/kg cho đối tác này. Với nhà cung cấp là giá nhập, với khách hàng là giá xuất. NULL = dùng giá chung trong cài đặt.';

-- Giá không thể âm. Không đặt CHECK > 0 vì NULL (chưa cấu hình) là hợp lệ.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_default_price_non_negative'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_default_price_non_negative
      CHECK (default_price_per_kg IS NULL OR default_price_per_kg >= 0);
  END IF;
END $$;

-- ---------------------------------------------
-- Điền giá khởi tạo từ lịch sử giao dịch thật.
--
-- Lấy đơn giá của phiếu GẦN NHẤT thay vì giá trung bình: giá phế biến động
-- theo thị trường, nên lần giao dịch gần nhất mới là con số đáng dùng làm
-- mặc định cho lần tới. Chỉ điền cho đối tác chưa có giá, để không ghi đè
-- những giá đã được cấu hình tay.
-- ---------------------------------------------
UPDATE contacts c
SET default_price_per_kg = latest.price_per_kg
FROM (
  SELECT DISTINCT ON (contact_id) contact_id, price_per_kg
  FROM imports
  WHERE contact_id IS NOT NULL
    AND deleted_at IS NULL
    AND price_per_kg > 0
  ORDER BY contact_id, date DESC, created_at DESC
) latest
WHERE c.id = latest.contact_id
  AND c.type = 'supplier'
  AND c.default_price_per_kg IS NULL;

UPDATE contacts c
SET default_price_per_kg = latest.price_per_kg
FROM (
  SELECT DISTINCT ON (contact_id) contact_id, price_per_kg
  FROM exports
  WHERE contact_id IS NOT NULL
    AND deleted_at IS NULL
    AND price_per_kg > 0
  ORDER BY contact_id, date DESC, created_at DESC
) latest
WHERE c.id = latest.contact_id
  AND c.type IN ('customer', 'partner')
  AND c.default_price_per_kg IS NULL;

-- ---------------------------------------------
-- Báo cáo kết quả — đọc tab Results sau khi chạy
-- ---------------------------------------------
SELECT
  type AS "Loại đối tác",
  count(*) AS "Tổng",
  count(default_price_per_kg) AS "Đã có giá mặc định"
FROM contacts
GROUP BY type
ORDER BY type;
$legacy_sql$;
 EXECUTE $legacy_sql$-- =============================================
-- QA KHOPHE — Migration 010: Tự động cập nhật trạng thái xay của lô nhập
--
-- Chạy sau 009. An toàn khi chạy lại nhiều lần.
--
-- Vì sao cần: tạo phiếu xay có chọn "lô phế nhập" (imports.processing_status),
-- nhưng KHÔNG có chỗ nào trong ứng dụng cập nhật lại trạng thái của lô nhập đó
-- sau khi xay xong. Kết quả: cảnh báo "N lô phế chưa xay" trên Dashboard đứng
-- yên vĩnh viễn dù đã xay hết — người quản lý không còn tin vào cảnh báo này
-- nữa. Sửa bằng trigger ở tầng DB thay vì gọi thêm ở client, để đúng bất kể
-- ai/ứng dụng nào ghi vào bảng grinding (kể cả sửa tay qua SQL Editor).
-- =============================================

CREATE OR REPLACE FUNCTION public.sync_import_processing_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
BEGIN
  -- Xét lại TẤT CẢ lô nhập bị ảnh hưởng bởi thay đổi này: lô đang được gán
  -- (NEW.import_id) và lô vừa bị gỡ ra/xoá phiếu xay (OLD.import_id) — cùng
  -- một logic cho INSERT, UPDATE (kể cả đổi lô hoặc xoá mềm deleted_at), và
  -- DELETE thật.
  FOR target_id IN
    SELECT DISTINCT id FROM (
      SELECT NEW.import_id AS id WHERE TG_OP IN ('INSERT', 'UPDATE') AND NEW.import_id IS NOT NULL
      UNION
      SELECT OLD.import_id AS id WHERE TG_OP IN ('UPDATE', 'DELETE') AND OLD.import_id IS NOT NULL
    ) affected
  LOOP
    IF EXISTS (SELECT 1 FROM grinding WHERE import_id = target_id AND deleted_at IS NULL) THEN
      -- Còn ít nhất 1 phiếu xay sống tham chiếu tới lô này → đã xay.
      -- Chỉ chuyển từ 'pending', không đụng vào 'grinding' (trạng thái người
      -- dùng tự chọn tay để đánh dấu "đang xay dở").
      UPDATE imports SET processing_status = 'done'
      WHERE id = target_id AND processing_status = 'pending';
    ELSE
      -- Không còn phiếu xay nào tham chiếu → quay lại chưa xay.
      UPDATE imports SET processing_status = 'pending'
      WHERE id = target_id AND processing_status = 'done';
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_import_processing_status ON grinding;
CREATE TRIGGER trg_sync_import_processing_status
  AFTER INSERT OR UPDATE OR DELETE ON grinding
  FOR EACH ROW EXECUTE FUNCTION sync_import_processing_status();

-- ---------------------------------------------
-- Đồng bộ lại dữ liệu đã có sẵn (một lần, ngay khi chạy migration) — các lô
-- đã thực sự được xay từ trước nhưng đang bị kẹt ở 'pending' vì trigger chưa
-- tồn tại lúc đó.
-- ---------------------------------------------
UPDATE imports i SET processing_status = 'done'
WHERE i.processing_status = 'pending'
  AND EXISTS (SELECT 1 FROM grinding g WHERE g.import_id = i.id AND g.deleted_at IS NULL);
$legacy_sql$;
 EXECUTE $legacy_sql$-- =============================================
-- QA KHOPHE — Migration 011: Đính kèm ảnh hoá đơn / chuyển khoản cho các phiếu
--
-- Chạy sau 010. An toàn khi chạy lại nhiều lần.
--
-- Vì sao cần: người nhập cân/nhận hàng ngoài xưởng thường có ảnh phiếu cân
-- giấy, hoá đơn viết tay, hoặc ảnh chụp màn hình chuyển khoản — hiện không có
-- chỗ nào lưu lại, nên khi có tranh chấp (giá, khối lượng, đã thanh toán chưa)
-- không có gì đối chiếu ngoài trí nhớ.
--
-- Thiết kế: 1 bảng `attachments` dùng chung cho mọi loại phiếu (như bảng
-- `payments`), thay vì thêm cột ảnh riêng trên từng bảng — một phiếu có thể
-- cần NHIỀU ảnh (ảnh cân + ảnh chuyển khoản), một cột URL duy nhất không đủ.
-- =============================================

-- ---------------------------------------------
-- 1. Storage bucket — KHÔNG public. Ảnh chuyển khoản có thể lộ số tài khoản,
--    không nên phát URL công khai đoán được; truy cập qua signed URL có hạn.
-- ---------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attachments', 'attachments', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "attachments_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "attachments_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "attachments_storage_delete" ON storage.objects;

CREATE POLICY "attachments_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "attachments_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attachments' AND has_any_role());

CREATE POLICY "attachments_storage_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'attachments' AND is_manager_or_admin());

-- ---------------------------------------------
-- 2. Bảng ghi chú metadata (ai đăng, khi nào, gắn với phiếu nào) —
--    storage.objects chỉ giữ file, không tiện query/hiện danh sách theo phiếu.
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_type TEXT NOT NULL CHECK (ref_type IN ('import', 'export', 'expense', 'advance', 'weighing_session')),
  ref_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_ref ON attachments(ref_type, ref_id);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attachments_select" ON attachments;
DROP POLICY IF EXISTS "attachments_insert" ON attachments;
DROP POLICY IF EXISTS "attachments_delete" ON attachments;

CREATE POLICY "attachments_select" ON attachments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "attachments_insert" ON attachments
  FOR INSERT WITH CHECK (has_any_role());

CREATE POLICY "attachments_delete" ON attachments
  FOR DELETE USING (is_manager_or_admin());

-- Dùng lại đúng hàm set_created_by() từ migration 003 (đã áp cho mọi bảng
-- chứng từ khác) — tự gắn người đăng khi client không gửi.
DROP TRIGGER IF EXISTS trg_set_created_by ON attachments;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON attachments
  FOR EACH ROW EXECUTE FUNCTION set_created_by();
$legacy_sql$;
 EXECUTE $legacy_sql$-- =============================================
-- QA KHOPHE — Migration 012: Gắn phiên cân với đối tác
--
-- Chạy sau 011. An toàn khi chạy lại nhiều lần.
--
-- Vì sao cần: phiên cân hiện là dữ liệu mồ côi — không biết cân của NCC nào
-- (khi nhập) hay cân cho khách nào (khi xuất), nên không đối chiếu được với
-- phiếu nhập/xuất. Cột `exports.weighing_session_id` đã có sẵn nhưng UI chưa
-- bao giờ cho chọn.
-- =============================================

ALTER TABLE weighing_sessions
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

COMMENT ON COLUMN weighing_sessions.contact_id IS
  'Đối tác gắn với phiên cân này (NCC khi cân nhập, khách hàng khi cân xuất). NULL = cân vãng lai, chưa rõ đối tác.';

CREATE INDEX IF NOT EXISTS idx_weighing_sessions_contact ON weighing_sessions(contact_id);
$legacy_sql$;
 EXECUTE $legacy_sql$-- ============================================================
-- QA KHOPHE — Migration 014: Chuẩn hóa nhân sự, chấm công, lương
-- Chạy sau migration 013.
-- ============================================================

-- Migration 013 từng mở CRUD hồ sơ nhân viên cho mọi tài khoản. Khôi phục
-- nguyên tắc dữ liệu nhân sự/lương chỉ manager và admin được truy cập.
DROP POLICY IF EXISTS "employees_manager_all" ON employees;
DROP POLICY IF EXISTS "employees_select" ON employees;
DROP POLICY IF EXISTS "employees_insert" ON employees;
DROP POLICY IF EXISTS "employees_update" ON employees;
DROP POLICY IF EXISTS "employees_delete" ON employees;
DROP POLICY IF EXISTS "employees_manager_insert" ON employees;
DROP POLICY IF EXISTS "employees_manager_update" ON employees;
DROP POLICY IF EXISTS "employees_manager_delete" ON employees;

CREATE POLICY "employees_manager_select" ON employees
  FOR SELECT USING (is_manager_or_admin());
CREATE POLICY "employees_manager_insert" ON employees
  FOR INSERT WITH CHECK (is_manager_or_admin());
CREATE POLICY "employees_manager_update" ON employees
  FOR UPDATE USING (is_manager_or_admin()) WITH CHECK (is_manager_or_admin());
CREATE POLICY "employees_manager_delete" ON employees
  FOR DELETE USING (is_manager_or_admin());

-- Giữ lịch sử chấm công khi nhân viên nghỉ: ứng dụng chỉ chuyển trạng thái
-- inactive, không xóa hồ sơ đã phát sinh dữ liệu.
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_employee_id_fkey;
ALTER TABLE attendance
  ADD CONSTRAINT attendance_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT;

-- Snapshot tên giúp báo cáo lịch sử không đổi khi hồ sơ được sửa tên, đồng
-- thời vẫn đọc được sau các lần đồng bộ dữ liệu nhân viên.
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS employee_name_snapshot TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES users(id);

UPDATE attendance a
SET employee_name_snapshot = e.name
FROM employees e
WHERE a.employee_id = e.id
  AND a.employee_name_snapshot IS NULL;

CREATE OR REPLACE FUNCTION public.set_attendance_employee_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.employee_id IS NOT NULL THEN
    SELECT name INTO NEW.employee_name_snapshot
    FROM employees
    WHERE id = NEW.employee_id;
  END IF;

  IF NEW.payment_status = 'paid' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.paid_at := COALESCE(NEW.paid_at, now());
      NEW.paid_by := COALESCE(NEW.paid_by, current_user_id());
    ELSIF OLD.payment_status IS DISTINCT FROM 'paid' THEN
      NEW.paid_at := COALESCE(NEW.paid_at, now());
      NEW.paid_by := COALESCE(NEW.paid_by, current_user_id());
    END IF;
  ELSIF NEW.payment_status <> 'paid' THEN
    NEW.paid_at := NULL;
    NEW.paid_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_employee_snapshot ON attendance;
CREATE TRIGGER trg_attendance_employee_snapshot
  BEFORE INSERT OR UPDATE OF employee_id, payment_status ON attendance
  FOR EACH ROW EXECUTE FUNCTION set_attendance_employee_snapshot();

-- Ràng buộc hợp lý cho dữ liệu mới. NOT VALID không chặn migration nếu dữ liệu
-- lịch sử có sai lệch; ràng buộc vẫn áp dụng ngay cho INSERT/UPDATE mới.
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_work_shift_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_work_shift_check
  CHECK (work_shift >= 0 AND work_shift <= 3) NOT VALID;

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_overtime_hours_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_overtime_hours_check
  CHECK (overtime_hours >= 0 AND overtime_hours <= 24) NOT VALID;

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_name_not_blank;
ALTER TABLE employees ADD CONSTRAINT employees_name_not_blank
  CHECK (length(btrim(name)) >= 2) NOT VALID;

-- Mỗi nhân viên chỉ có một bản ghi công (>0 công) trong một ngày. Dùng trigger
-- thay unique index để migration vẫn chạy được nếu lịch sử cũ đang có bản ghi
-- trùng; dữ liệu cũ cần được rà soát thủ công trước khi gộp/xóa.
CREATE OR REPLACE FUNCTION public.prevent_duplicate_daily_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.employee_id IS NOT NULL AND NEW.work_shift > 0 AND EXISTS (
    SELECT 1
    FROM attendance a
    WHERE a.employee_id = NEW.employee_id
      AND a.date = NEW.date
      AND a.work_shift > 0
      AND a.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'Nhân viên đã được chấm công trong ngày này'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_daily_attendance ON attendance;
CREATE TRIGGER trg_prevent_duplicate_daily_attendance
  BEFORE INSERT OR UPDATE OF employee_id, date, work_shift ON attendance
  FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_daily_attendance();

-- Công thức chuẩn dùng đồng nhất với ứng dụng:
-- lương thường + (giờ tăng ca × lương giờ × 150%) − tạm ứng.
CREATE OR REPLACE FUNCTION public.compute_attendance_net_pay()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  gross_pay NUMERIC(15,2);
BEGIN
  gross_pay :=
    (NEW.work_shift * NEW.daily_pay)
    + (COALESCE(NEW.overtime_hours, 0) * NEW.daily_pay / 8 * 1.5);
  NEW.net_pay := ROUND(GREATEST(0, gross_pay - COALESCE(NEW.advance_pay, 0)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_net_pay ON attendance;
CREATE TRIGGER trg_attendance_net_pay BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION compute_attendance_net_pay();

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
DROP TRIGGER IF EXISTS attendance_updated_at ON attendance;
CREATE TRIGGER attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date
  ON attendance(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_payment_status
  ON attendance(payment_status) WHERE payment_status <> 'paid';

-- Phiếu quyết toán tháng là dấu vết kế toán độc lập; việc ghi phiếu và đổi
-- trạng thái công được thực hiện trong cùng một transaction qua RPC bên dưới.
CREATE TABLE IF NOT EXISTS payroll_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  period DATE NOT NULL CHECK (period = date_trunc('month', period)::date),
  gross_amount NUMERIC(15,0) NOT NULL DEFAULT 0,
  advance_amount NUMERIC(15,0) NOT NULL DEFAULT 0,
  net_amount NUMERIC(15,0) NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, period)
);

ALTER TABLE payroll_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_settlements_manager_select" ON payroll_settlements
  FOR SELECT USING (is_manager_or_admin());
CREATE POLICY "payroll_settlements_manager_insert" ON payroll_settlements
  FOR INSERT WITH CHECK (is_manager_or_admin());
CREATE POLICY "payroll_settlements_manager_update" ON payroll_settlements
  FOR UPDATE USING (is_manager_or_admin()) WITH CHECK (is_manager_or_admin());

DROP TRIGGER IF EXISTS payroll_settlements_updated_at ON payroll_settlements;
CREATE TRIGGER payroll_settlements_updated_at
  BEFORE UPDATE ON payroll_settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION public.settle_employee_payroll(
  p_employee_id UUID,
  p_period DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_period DATE := date_trunc('month', p_period)::date;
  v_period_end DATE := (date_trunc('month', p_period) + INTERVAL '1 month - 1 day')::date;
  v_gross NUMERIC(15,0);
  v_advance NUMERIC(15,0);
  v_settlement_id UUID;
BEGIN
  IF NOT is_manager_or_admin() THEN
    RAISE EXCEPTION 'Không có quyền chốt lương' USING ERRCODE = '42501';
  END IF;

  SELECT
    ROUND(COALESCE(SUM(
      work_shift * daily_pay
      + COALESCE(overtime_hours, 0) * daily_pay / 8 * 1.5
    ), 0)),
    ROUND(COALESCE(SUM(advance_pay), 0))
  INTO v_gross, v_advance
  FROM attendance
  WHERE employee_id = p_employee_id
    AND date BETWEEN v_period AND v_period_end;

  IF NOT EXISTS (
    SELECT 1 FROM attendance
    WHERE employee_id = p_employee_id
      AND date BETWEEN v_period AND v_period_end
  ) THEN
    RAISE EXCEPTION 'Không có dữ liệu công trong kỳ lương này' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO payroll_settlements (
    employee_id, period, gross_amount, advance_amount, net_amount, paid_by
  ) VALUES (
    p_employee_id, v_period, v_gross, v_advance, v_gross - v_advance, current_user_id()
  )
  ON CONFLICT (employee_id, period) DO UPDATE SET
    gross_amount = EXCLUDED.gross_amount,
    advance_amount = EXCLUDED.advance_amount,
    net_amount = EXCLUDED.net_amount,
    paid_at = now(),
    paid_by = EXCLUDED.paid_by
  RETURNING id INTO v_settlement_id;

  UPDATE attendance
  SET payment_status = 'paid', paid_at = now(), paid_by = current_user_id()
  WHERE employee_id = p_employee_id
    AND date BETWEEN v_period AND v_period_end;

  RETURN v_settlement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_employee_payroll(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_employee_payroll(UUID, DATE) TO authenticated;
$legacy_sql$;
 EXECUTE $legacy_sql$-- Migration 015: Add import_type and export_type columns for NVL and Thành phẩm classification

ALTER TABLE imports 
ADD COLUMN IF NOT EXISTS import_type TEXT DEFAULT 'nvl' CHECK (import_type IN ('nvl', 'thanh_pham'));

ALTER TABLE exports 
ADD COLUMN IF NOT EXISTS export_type TEXT DEFAULT 'thanh_pham' CHECK (export_type IN ('nvl', 'thanh_pham'));

CREATE INDEX IF NOT EXISTS idx_imports_type ON imports(import_type);
CREATE INDEX IF NOT EXISTS idx_exports_type ON exports(export_type);
$legacy_sql$;
 EXECUTE $legacy_sql$-- =============================================
-- QA KHOPHE — Migration 016: Sửa lỗi tính lương & Ràng buộc toàn vẹn
-- Chạy SAU migration 015.
--
-- 1. FIX TRIGGER: compute_attendance_net_pay cộng thêm overtime_hours
--    Công thức: net_pay = (work_shift * daily_pay) + (overtime_hours * daily_pay * 1.5 / 8) - advance_pay
-- 2. Backfill: Cập nhật lại net_pay cho các bản ghi có tăng ca
-- 3. CONSTRAINT: Thêm UNIQUE(employee_id, date) cho attendance (tránh duplicate khi chấm công)
-- 4. CONSTRAINT: Thêm UNIQUE(session_id, bag_number) cho weighing_bags (tránh trùng số bao)
-- =============================================

-- ─────────────────────────────────────────────
-- 1. FIX TRIGGER: Cộng tiền tăng ca vào net_pay
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_attendance_net_pay()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.net_pay := GREATEST(0,
    (NEW.work_shift * NEW.daily_pay)
    + (COALESCE(NEW.overtime_hours, 0) * NEW.daily_pay * 1.5 / 8)
    - COALESCE(NEW.advance_pay, 0)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_net_pay ON attendance;
CREATE TRIGGER trg_attendance_net_pay BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION compute_attendance_net_pay();

-- ─────────────────────────────────────────────
-- 2. Cập nhật net_pay cho các bản ghi cũ bị sai (thiếu tăng ca)
-- ─────────────────────────────────────────────
UPDATE attendance
SET net_pay = GREATEST(0,
  (work_shift * daily_pay)
  + (COALESCE(overtime_hours, 0) * daily_pay * 1.5 / 8)
  - COALESCE(advance_pay, 0)
)
WHERE overtime_hours > 0;

-- ─────────────────────────────────────────────
-- 3. UNIQUE constraints tránh duplicate
-- ─────────────────────────────────────────────

-- Trước khi thêm constraint, xoá duplicate nếu có
-- (giữ lại bản ghi có net_pay cao nhất trong mỗi cặp trùng)
DELETE FROM attendance a
USING (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY employee_id, date
    ORDER BY net_pay DESC, created_at DESC
  ) AS rn
  FROM attendance
  WHERE employee_id IS NOT NULL
) ranked
WHERE a.id = ranked.id AND ranked.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_employee_date_uq'
  ) THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_employee_date_uq
      UNIQUE (employee_id, date);
  END IF;
END $$;

-- Xoá duplicate bao cân trùng số thứ tự nếu có
DELETE FROM weighing_bags a
USING (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY session_id, bag_number
    ORDER BY id
  ) AS rn
  FROM weighing_bags
) ranked
WHERE a.id = ranked.id AND ranked.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weighing_bags_session_bag_uq'
  ) THEN
    ALTER TABLE weighing_bags ADD CONSTRAINT weighing_bags_session_bag_uq
      UNIQUE (session_id, bag_number);
  END IF;
END $$;
$legacy_sql$;
 ELSE
 IF EXISTS(SELECT 1 FROM unnest(ARRAY['contacts','imports','exports','grinding','employees','attendance','payments','settings','stock_counts','attachments','advances','weighing_sessions','weighing_bags']) t(name) WHERE to_regclass('public.'||t.name) IS NULL) THEN RAISE EXCEPTION 'Legacy schema incomplete'; END IF;
 END IF;
END $baseline$;
