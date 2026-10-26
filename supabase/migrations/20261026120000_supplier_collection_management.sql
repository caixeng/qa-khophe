-- Migration: Quản lý Đơn vị Nhập phế (Nguồn hàng) & Sổ Nhật ký Đi Thu Mua Hằng Ngày của Anh Hồ
BEGIN;

-- 1. Mở rộng bảng contacts (Hồ sơ Đơn vị cung cấp phế / Đối tác / Khách hàng)
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS source_category TEXT DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS main_material_type TEXT,
  ADD COLUMN IF NOT EXISTS bank_info TEXT,
  ADD COLUMN IF NOT EXISTS collector_name TEXT DEFAULT 'Anh Hồ';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_source_category_check'
  ) THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_source_category_check
      CHECK (
        source_category IS NULL
        OR source_category IN ('factory', 'warehouse', 'construction', 'individual', 'other')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.contacts.contact_person IS 'Tên người liên hệ trực tiếp tại đơn vị (chủ vựa, thủ kho, quản đốc...)';
COMMENT ON COLUMN public.contacts.source_category IS 'Phân loại đơn vị cung cấp phế: factory (Nhà máy/Xưởng), warehouse (Vựa phế/Đại lý), construction (Công trình), individual (Thu gom nhỏ lẻ), other (Khác)';
COMMENT ON COLUMN public.contacts.region IS 'Khu vực / Tuyến thu mua để ghép chuyến xe';
COMMENT ON COLUMN public.contacts.main_material_type IS 'Loại phế chủ lực của đơn vị cung cấp';
COMMENT ON COLUMN public.contacts.bank_info IS 'Thông tin tài khoản ngân hàng thanh toán của đơn vị';
COMMENT ON COLUMN public.contacts.collector_name IS 'Người phụ trách thu mua đơn vị này (mặc định: Anh Hồ)';

CREATE INDEX IF NOT EXISTS idx_contacts_source_category ON public.contacts(source_category);
CREATE INDEX IF NOT EXISTS idx_contacts_region ON public.contacts(region);

-- 2. Mở rộng bảng imports (Nhật ký chuyến đi thu mua phế hằng ngày)
ALTER TABLE public.imports
  ADD COLUMN IF NOT EXISTS collector_name TEXT DEFAULT 'Anh Hồ',
  ADD COLUMN IF NOT EXISTS vehicle_info TEXT,
  ADD COLUMN IF NOT EXISTS supplier_slip_code TEXT;

COMMENT ON COLUMN public.imports.collector_name IS 'Người trực tiếp đi thu mua lô phế (mặc định: Anh Hồ)';
COMMENT ON COLUMN public.imports.vehicle_info IS 'Thông tin xe vận chuyển / biển số / chuyến thu gom';
COMMENT ON COLUMN public.imports.supplier_slip_code IS 'Mã phiếu cân tại đơn vị cung cấp (nếu có)';

CREATE INDEX IF NOT EXISTS idx_imports_collector_name
  ON public.imports(collector_name)
  WHERE deleted_at IS NULL;

-- 3. Chuẩn hóa method trong record_bulk_partner_payment khi đối trừ tạm ứng (p_method = 'advance')
CREATE OR REPLACE FUNCTION public.record_bulk_partner_payment(
  p_contact_id uuid,
  p_ref_type text,
  p_total_amount numeric,
  p_date date,
  p_method text,
  p_advance_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  r record;
  v_paid numeric;
  v_doc_rem numeric;
  v_alloc numeric;
  v_rem numeric := round(coalesce(p_total_amount, 0));
  v_total_allocated numeric := 0;
  v_count integer := 0;
  v_payment_id uuid;
  v_payment_ids jsonb := '[]'::jsonb;
  v_base_note text := nullif(btrim(coalesce(p_notes, '')), '');
  v_note text;
  v_db_method text;
BEGIN
  IF NOT public.has_permission('finance.record_payment') THEN
    RAISE EXCEPTION 'Không có quyền ghi nhận thanh toán công nợ' USING ERRCODE = '42501';
  END IF;

  IF p_contact_id IS NULL THEN
    RAISE EXCEPTION 'Vui lòng chọn đối tác thanh toán' USING ERRCODE = '23514';
  END IF;

  IF p_ref_type IS NULL OR p_ref_type NOT IN ('import', 'export') THEN
    RAISE EXCEPTION 'Loại chứng từ công nợ không hợp lệ' USING ERRCODE = '23514';
  END IF;

  IF v_rem <= 0 THEN
    RAISE EXCEPTION 'Số tiền thanh toán phải lớn hơn 0' USING ERRCODE = '23514';
  END IF;

  IF p_date IS NULL THEN
    RAISE EXCEPTION 'Vui lòng chọn ngày thanh toán' USING ERRCODE = '23514';
  END IF;

  IF p_method IS NULL OR p_method NOT IN ('cash', 'transfer', 'other', 'advance') THEN
    RAISE EXCEPTION 'Phương thức thanh toán không hợp lệ' USING ERRCODE = '23514';
  END IF;

  IF p_method = 'advance' OR p_advance_id IS NOT NULL THEN
    IF p_ref_type <> 'import' THEN
      RAISE EXCEPTION 'Chỉ phiếu nhập mới được đối trừ từ khoản tạm ứng mua hàng' USING ERRCODE = '23514';
    END IF;
    IF p_advance_id IS NULL THEN
      RAISE EXCEPTION 'Vui lòng chọn khoản tạm ứng để đối trừ' USING ERRCODE = '23514';
    END IF;
  END IF;

  v_db_method := CASE WHEN p_method = 'advance' THEN 'cash' ELSE p_method END;

  PERFORM 1 FROM public.contacts WHERE id = p_contact_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đối tác không tồn tại' USING ERRCODE = '23503';
  END IF;

  IF p_ref_type = 'import' THEN
    FOR r IN
      SELECT id, date, total_amount, payment_status
      FROM public.imports
      WHERE contact_id = p_contact_id AND deleted_at IS NULL
      ORDER BY date ASC, created_at ASC, id ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_rem <= 0;
      SELECT coalesce(sum(amount), 0) INTO v_paid
      FROM public.payments
      WHERE ref_type = 'import' AND ref_id = r.id;

      IF r.payment_status = 'paid' AND v_paid = 0 THEN
        v_doc_rem := 0;
      ELSE
        v_doc_rem := greatest(coalesce(r.total_amount, 0) - v_paid, 0);
      END IF;

      IF v_doc_rem > 0 THEN
        v_alloc := least(v_rem, v_doc_rem);
        v_count := v_count + 1;
        v_note := coalesce(v_base_note, 'Thanh toán công nợ gộp (FIFO)') || format(' [FIFO #%s - %s]', v_count, r.date);

        INSERT INTO public.payments(ref_type, ref_id, date, amount, method, advance_id, notes, created_by)
        VALUES ('import', r.id, p_date, v_alloc, v_db_method, p_advance_id, v_note, public.current_user_id())
        RETURNING id INTO v_payment_id;

        v_rem := v_rem - v_alloc;
        v_total_allocated := v_total_allocated + v_alloc;
        v_payment_ids := v_payment_ids || to_jsonb(v_payment_id);
      END IF;
    END LOOP;
  ELSE
    FOR r IN
      SELECT id, date, total_amount, payment_status
      FROM public.exports
      WHERE contact_id = p_contact_id AND deleted_at IS NULL
      ORDER BY date ASC, created_at ASC, id ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_rem <= 0;
      SELECT coalesce(sum(amount), 0) INTO v_paid
      FROM public.payments
      WHERE ref_type = 'export' AND ref_id = r.id;

      IF r.payment_status = 'paid' AND v_paid = 0 THEN
        v_doc_rem := 0;
      ELSE
        v_doc_rem := greatest(coalesce(r.total_amount, 0) - v_paid, 0);
      END IF;

      IF v_doc_rem > 0 THEN
        v_alloc := least(v_rem, v_doc_rem);
        v_count := v_count + 1;
        v_note := coalesce(v_base_note, 'Thu nợ gộp khách hàng (FIFO)') || format(' [FIFO #%s - %s]', v_count, r.date);

        INSERT INTO public.payments(ref_type, ref_id, date, amount, method, advance_id, notes, created_by)
        VALUES ('export', r.id, p_date, v_alloc, v_db_method, NULL, v_note, public.current_user_id())
        RETURNING id INTO v_payment_id;

        v_rem := v_rem - v_alloc;
        v_total_allocated := v_total_allocated + v_alloc;
        v_payment_ids := v_payment_ids || to_jsonb(v_payment_id);
      END IF;
    END LOOP;
  END IF;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Đối tác không còn khoản công nợ nào cần thanh toán' USING ERRCODE = '23514';
  END IF;

  IF v_rem > 0 THEN
    RAISE EXCEPTION 'Số tiền thanh toán vượt tổng dư nợ còn lại (%s đ)', v_total_allocated USING ERRCODE = '23514';
  END IF;

  RETURN jsonb_build_object(
    'allocatedCount', v_count,
    'totalAllocated', v_total_allocated,
    'paymentIds', v_payment_ids
  );
END $$;

REVOKE ALL ON FUNCTION public.record_bulk_partner_payment(uuid, text, numeric, date, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_bulk_partner_payment(uuid, text, numeric, date, text, uuid, text) TO authenticated;

COMMIT;
