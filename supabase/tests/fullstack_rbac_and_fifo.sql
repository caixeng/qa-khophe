BEGIN;
DO $$
DECLARE
  v_admin_auth uuid := gen_random_uuid();
  v_hr_auth uuid := gen_random_uuid();
  v_staff_auth uuid := gen_random_uuid();
  v_hr_user uuid;
  v_emp_id uuid := gen_random_uuid();
  v_contact_id uuid := gen_random_uuid();
  v_imp1 uuid := gen_random_uuid();
  v_imp2 uuid := gen_random_uuid();
  v_imp3 uuid := gen_random_uuid();
  v_settlement_id uuid;
  v_fifo_res jsonb;
BEGIN
  INSERT INTO public.users(auth_id, email, full_name, role, is_active)
  VALUES (v_admin_auth, 'admin-fifo@example.invalid', 'Admin FIFO', 'admin', true);

  INSERT INTO public.users(auth_id, email, full_name, role, is_active, custom_permissions)
  VALUES (
    v_hr_auth,
    'hr-specialist@example.invalid',
    'HR Specialist',
    'staff',
    true,
    '{"hr.view": true, "hr.manage": true, "finance.view": false, "dashboard.finance.view": false}'::jsonb
  )
  RETURNING id INTO v_hr_user;

  INSERT INTO public.users(auth_id, email, full_name, role, is_active)
  VALUES (v_staff_auth, 'staff-fifo@example.invalid', 'Staff FIFO', 'staff', true);

  -- Setup HR data
  INSERT INTO public.employees(id, name, role, daily_salary, status)
  VALUES (v_emp_id, 'Công nhân Test HR', 'grinder', 400000, 'active');

  INSERT INTO public.attendance(employee_id, date, work_shift, daily_pay, overtime_hours, advance_pay, payment_status)
  VALUES (v_emp_id, DATE '2026-10-05', 1, 400000, 0, 50000, 'unpaid');

  -- 1. Verify HR-only user (staff with hr.view + hr.manage, NO finance.view) can read balances & settle payroll
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_hr_auth, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  IF NOT EXISTS (SELECT 1 FROM public.get_payroll_balances(DATE '2026-10-01') WHERE employee_id = v_emp_id) THEN
    RAISE EXCEPTION 'HR specialist with hr.view could not read get_payroll_balances';
  END IF;

  v_settlement_id := public.settle_employee_payroll(v_emp_id, DATE '2026-10-01');
  IF v_settlement_id IS NULL THEN
    RAISE EXCEPTION 'HR specialist with hr.manage could not settle payroll';
  END IF;

  EXECUTE 'RESET ROLE';

  -- Setup Partner & 3 Imports for FIFO debt payment test
  INSERT INTO public.contacts(id, name, type, phone)
  VALUES (v_contact_id, 'Vựa Phế FIFO Test', 'supplier', '0901112233');

  -- Import 1: 2026-10-01, 1,000 kg x 10,000 = 10,000,000
  INSERT INTO public.imports(id, date, contact_id, quantity_kg, price_per_kg, import_type, payment_status, processing_status)
  VALUES (v_imp1, DATE '2026-10-01', v_contact_id, 1000, 10000, 'nvl', 'unpaid', 'pending');

  -- Import 2: 2026-10-05, 1,500 kg x 10,000 = 15,000,000
  INSERT INTO public.imports(id, date, contact_id, quantity_kg, price_per_kg, import_type, payment_status, processing_status)
  VALUES (v_imp2, DATE '2026-10-05', v_contact_id, 1500, 10000, 'nvl', 'unpaid', 'pending');

  -- Import 3: 2026-10-10, 2,000 kg x 10,000 = 20,000,000
  INSERT INTO public.imports(id, date, contact_id, quantity_kg, price_per_kg, import_type, payment_status, processing_status)
  VALUES (v_imp3, DATE '2026-10-10', v_contact_id, 2000, 10000, 'nvl', 'unpaid', 'pending');

  -- 2. Verify staff without finance.record_payment cannot call record_bulk_partner_payment
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_staff_auth, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  BEGIN
    PERFORM public.record_bulk_partner_payment(v_contact_id, 'import', 5000000, DATE '2026-10-15', 'transfer', NULL, 'Test');
    RAISE EXCEPTION 'Staff without finance.record_payment was allowed to record bulk payment';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  EXECUTE 'RESET ROLE';

  -- 3. Verify Admin/Finance user can allocate 18,000,000 across Import 1 (10M -> paid) and Import 2 (8M -> partial)
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin_auth, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  v_fifo_res := public.record_bulk_partner_payment(
    v_contact_id,
    'import',
    18000000,
    DATE '2026-10-15',
    'transfer',
    NULL,
    'Thanh toán gộp đợt 1'
  );

  IF (v_fifo_res ->> 'allocatedCount')::int <> 2 OR (v_fifo_res ->> 'totalAllocated')::numeric <> 18000000 THEN
    RAISE EXCEPTION 'Unexpected FIFO result: %', v_fifo_res;
  END IF;

  IF (SELECT payment_status FROM public.imports WHERE id = v_imp1) <> 'paid' THEN
    RAISE EXCEPTION 'Oldest import should be marked paid';
  END IF;

  IF (SELECT payment_status FROM public.imports WHERE id = v_imp2) <> 'partial' THEN
    RAISE EXCEPTION 'Second import should be marked partial';
  END IF;

  IF (SELECT remaining_amount FROM public.v_import_debts WHERE ref_id = v_imp2) <> 7000000 THEN
    RAISE EXCEPTION 'Second import remaining amount should be 7,000,000';
  END IF;

  IF (SELECT payment_status FROM public.imports WHERE id = v_imp3) <> 'unpaid' THEN
    RAISE EXCEPTION 'Third import should remain unpaid';
  END IF;

  -- 4. Verify overpayment (> remaining 27,000,000) raises check_violation and rolls back
  BEGIN
    PERFORM public.record_bulk_partner_payment(
      v_contact_id,
      'import',
      30000000,
      DATE '2026-10-20',
      'cash',
      NULL,
      'Trả lố dư nợ'
    );
    RAISE EXCEPTION 'Overpayment should have failed';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT 'PASS dynamic HR RBAC and atomic bulk FIFO payment RPC' result;
