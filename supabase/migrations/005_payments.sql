-- =============================================
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
