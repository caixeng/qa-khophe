-- ============================================================
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
