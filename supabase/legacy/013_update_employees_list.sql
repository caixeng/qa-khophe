-- =============================================
-- QA KHOPHE — Migration 013: Cập nhật danh sách 5 nhân viên mới
--
-- Xoá danh sách nhân viên cũ và thêm 5 nhân viên từ bản khai báo tay:
-- 1. Phạm Xuân Tú
-- 2. Võ Thị Hoa
-- 3. Trần Quốc Mạnh
-- 4. Phan Văn Hoàng
-- 5. Bùi Xuân Lệ
-- =============================================

-- 1. Đảm bảo RLS cho phép truy vấn và quản lý nhân viên
DROP POLICY IF EXISTS "employees_manager_all" ON employees;
DROP POLICY IF EXISTS "employees_select" ON employees;
DROP POLICY IF EXISTS "employees_insert" ON employees;
DROP POLICY IF EXISTS "employees_update" ON employees;
DROP POLICY IF EXISTS "employees_delete" ON employees;
DROP POLICY IF EXISTS "employees_manager_insert" ON employees;
DROP POLICY IF EXISTS "employees_manager_update" ON employees;
DROP POLICY IF EXISTS "employees_manager_delete" ON employees;

CREATE POLICY "employees_select" ON employees
  FOR SELECT USING (true);

CREATE POLICY "employees_insert" ON employees
  FOR INSERT WITH CHECK (true);

CREATE POLICY "employees_update" ON employees
  FOR UPDATE USING (true);

CREATE POLICY "employees_delete" ON employees
  FOR DELETE USING (true);

-- 2. Gỡ liên kết chấm công cũ nếu có và thay thế danh sách nhân viên
UPDATE attendance SET employee_id = NULL WHERE employee_id IS NOT NULL;
DELETE FROM employees;

INSERT INTO employees (name, role, daily_salary, status, notes) VALUES
  ('Phạm Xuân Tú', 'staff', 350000, 'active', 'Nhân viên xưởng'),
  ('Võ Thị Hoa', 'staff', 350000, 'active', 'Nhân viên xưởng (Võ Thị Hoa)'),
  ('Trần Quốc Mạnh', 'staff', 350000, 'active', 'Nhân viên xưởng'),
  ('Phan Văn Hoàng', 'staff', 350000, 'active', 'Nhân viên xưởng'),
  ('Bùi Xuân Lệ', 'staff', 350000, 'active', 'Nhân viên xưởng'),
  ('Anh Tiếp', 'staff', 350000, 'active', 'Nhân viên xưởng'),
  ('Anh Tam', 'staff', 350000, 'active', 'Nhân viên xưởng'),
  ('Chị Hoa', 'staff', 350000, 'active', 'Nhân viên xưởng (Chị Hoa)');
