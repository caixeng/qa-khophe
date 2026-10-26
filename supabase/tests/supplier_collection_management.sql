BEGIN;
DO $$
DECLARE
  v_admin_auth uuid := gen_random_uuid();
  v_supplier_id uuid;
  v_advance_id uuid;
  v_import_id uuid;
  v_fifo_res jsonb;
BEGIN
  INSERT INTO public.users(auth_id, email, full_name, role, is_active)
  VALUES (v_admin_auth, 'anhho-test-admin@example.invalid', 'Admin Test', 'admin', true);

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_admin_auth, 'role', 'authenticated')::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  -- 1. Tạo mới đơn vị cung cấp phế với đầy đủ hồ sơ của Anh Hồ
  INSERT INTO public.contacts(
    name, type, phone, address, default_price_per_kg,
    contact_person, source_category, region, main_material_type, bank_info, collector_name
  ) VALUES (
    'Nhà máy Tấm Nhựa Nano Hòa Khánh', 'supplier', '0905123888', 'KCN Hòa Khánh, Đà Nẵng', 4500,
    'Anh Tuấn - Quản đốc kho', 'factory', 'Đà Nẵng', 'Tấm nhựa nano', 'VCB 004100998877', 'Anh Hồ'
  ) RETURNING id INTO v_supplier_id;

  IF (SELECT source_category FROM public.contacts WHERE id = v_supplier_id) <> 'factory' THEN
    RAISE EXCEPTION 'Lưu phân loại nguồn phế thất bại';
  END IF;

  -- 2. Tạo khoản tạm ứng mua hàng cho Anh Hồ
  INSERT INTO public.advances(date, amount, person, type, purpose, notes)
  VALUES ('2041-05-01', 50000000, 'Anh Hồ', 'advance', 'materials', 'Ứng tiền đi gom phế đầu tháng')
  RETURNING id INTO v_advance_id;

  -- 3. Ghi nhận chuyến thu mua của Anh Hồ & đối trừ trực tiếp vào tạm ứng
  INSERT INTO public.imports(
    date, contact_id, material_type, import_type, quantity_kg, price_per_kg,
    payment_status, processing_status, collector_name, vehicle_info, supplier_slip_code
  ) VALUES (
    '2041-05-02', v_supplier_id, 'Tấm nhựa nano', 'nvl', 4000, 4500,
    'unpaid', 'pending', 'Anh Hồ', 'Xe tải 43C-128.99', 'PC-20410502'
  ) RETURNING id INTO v_import_id;

  v_fifo_res := public.record_bulk_partner_payment(
    v_supplier_id,
    'import',
    18000000,
    DATE '2041-05-02',
    'advance',
    v_advance_id,
    'Trả tiền phế từ khoản tạm ứng của Anh Hồ'
  );

  IF (v_fifo_res->>'totalAllocated')::numeric <> 18000000 THEN
    RAISE EXCEPTION 'Đối trừ tạm ứng qua FIFO thất bại: %', v_fifo_res;
  END IF;

  IF (SELECT payment_status FROM public.imports WHERE id = v_import_id) <> 'paid' THEN
    RAISE EXCEPTION 'Phiếu nhập của Anh Hồ chưa chuyển sang paid sau khi đối trừ tạm ứng';
  END IF;

  IF (SELECT outstanding_amount FROM public.v_advance_balances WHERE id = v_advance_id) <> 32000000 THEN
    RAISE EXCEPTION 'Số dư tạm ứng còn lại của Anh Hồ không đúng';
  END IF;

  EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
