-- =============================================
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
