-- =============================================
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
