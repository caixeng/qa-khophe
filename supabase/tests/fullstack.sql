-- Run through an administrator connection. Fixtures and all changes roll back.
BEGIN;
CREATE TEMP TABLE upgrade_test_ids (name text PRIMARY KEY, id uuid DEFAULT gen_random_uuid());
INSERT INTO upgrade_test_ids(name) VALUES ('staff'),('manager'),('unlinked'),('inactive'),('expense'),('import'),('import2'),('session'),('bad_session'),('employee');
GRANT SELECT ON upgrade_test_ids TO authenticated;
INSERT INTO public.users(auth_id,email,full_name,role,is_active)
  SELECT id,'test-'||name||'@example.invalid','Upgrade test '||name,
    CASE WHEN name='manager' THEN 'manager' ELSE 'staff' END,name<>'inactive'
  FROM upgrade_test_ids WHERE name IN ('staff','manager','inactive');
INSERT INTO public.users(email,full_name,role,is_active)
  SELECT 'test-unlinked@example.invalid','Upgrade test unlinked','staff',true;
INSERT INTO public.expenses(id,category,amount,description)
  SELECT id,'other',100,'Rollback test' FROM upgrade_test_ids WHERE name='expense';
INSERT INTO public.imports(id,quantity_kg,price_per_kg)
  SELECT id,100,10 FROM upgrade_test_ids WHERE name IN ('import','import2');
INSERT INTO public.employees(id,name,daily_salary)
  SELECT id,'Rollback test employee',400000 FROM upgrade_test_ids WHERE name='employee';
INSERT INTO public.attachments(ref_type,ref_id,storage_path)
  SELECT 'expense',id,'expense/'||id||'/test.jpg' FROM upgrade_test_ids WHERE name='expense';
INSERT INTO storage.objects(bucket_id,name)
  SELECT 'attachments','expense/'||id||'/test.jpg' FROM upgrade_test_ids WHERE name='expense';

DO $$
DECLARE v_staff uuid; v_manager uuid; v_employee uuid; v_session uuid; v_bad uuid; v_import uuid; v_import2 uuid;
  v_settlement uuid; v_paid numeric; v_expected numeric; v_result jsonb;
BEGIN
  SELECT id INTO v_staff FROM upgrade_test_ids WHERE name='staff';
  SELECT id INTO v_manager FROM upgrade_test_ids WHERE name='manager';
  SELECT id INTO v_employee FROM upgrade_test_ids WHERE name='employee';
  SELECT id INTO v_session FROM upgrade_test_ids WHERE name='session';
  SELECT id INTO v_bad FROM upgrade_test_ids WHERE name='bad_session';
  SELECT id INTO v_import FROM upgrade_test_ids WHERE name='import';
  SELECT id INTO v_import2 FROM upgrade_test_ids WHERE name='import2';
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_staff,'email','test-staff@example.invalid','role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF public.current_user_role()<>'staff' THEN RAISE EXCEPTION 'staff role resolution failed'; END IF;
  BEGIN
    UPDATE public.users SET role='admin' WHERE auth_id=v_staff;
    RAISE EXCEPTION 'Self elevation was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.users SET full_name='Updated own name' WHERE auth_id=v_staff;
  IF EXISTS (SELECT 1 FROM public.attachments WHERE ref_type='expense') THEN RAISE EXCEPTION 'Staff can read finance attachments'; END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='attachments' AND name LIKE 'expense/%') THEN RAISE EXCEPTION 'Staff can read finance storage'; END IF;
  IF EXISTS (SELECT 1 FROM public.employees) THEN RAISE EXCEPTION 'Staff can read HR'; END IF;
  PERFORM public.create_weighing_session(v_session,current_date,'Test',null,null,10,
    '[{"bag_number":1,"weight_kg":100},{"bag_number":2,"weight_kg":200}]');
  PERFORM public.create_weighing_session(v_session,current_date,'Test',null,null,10,
    '[{"bag_number":1,"weight_kg":100},{"bag_number":2,"weight_kg":200}]');
  IF (SELECT count(*) FROM public.weighing_sessions WHERE id=v_session)<>1 OR
    (SELECT total_kg FROM public.weighing_sessions WHERE id=v_session)<>290 OR
    (SELECT count(*) FROM public.weighing_bags WHERE session_id=v_session)<>2 THEN RAISE EXCEPTION 'Weighing retry or tare failed'; END IF;
  BEGIN
    PERFORM public.create_weighing_session(v_bad,current_date,'Bad',null,null,0,
      '[{"bag_number":1,"weight_kg":100},{"bag_number":1,"weight_kg":200}]');
    RAISE EXCEPTION 'Invalid bags were accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF EXISTS (SELECT 1 FROM public.weighing_sessions WHERE id=v_bad) THEN RAISE EXCEPTION 'Partial weighing session survived'; END IF;
  BEGIN
    PERFORM public.settle_employee_payroll(v_employee,current_date);
    RAISE EXCEPTION 'Staff settled payroll';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_manager,'email','test-manager@example.invalid','role','authenticated')::text,true);
  IF NOT EXISTS (SELECT 1 FROM public.attachments WHERE ref_type='expense') THEN RAISE EXCEPTION 'Manager cannot read attachments'; END IF;
  INSERT INTO public.attendance(employee_id,date,work_shift,daily_pay,overtime_hours,advance_pay)
    VALUES(v_employee,current_date,1,400000,2,0),(v_employee,current_date,0,400000,0,600000);
  SELECT sum(net_pay) INTO v_paid FROM public.attendance WHERE employee_id=v_employee;
  IF v_paid<>-50000 THEN RAISE EXCEPTION 'Advance-only payroll balance incorrect: %',v_paid; END IF;
  v_settlement:=public.settle_employee_payroll(v_employee,current_date);
  IF (SELECT net_amount FROM public.payroll_settlements WHERE id=v_settlement)<>-50000 THEN RAISE EXCEPTION 'Settlement calculation incorrect'; END IF;
  IF public.settle_employee_payroll(v_employee,current_date)<>v_settlement THEN RAISE EXCEPTION 'Settlement not idempotent'; END IF;
  BEGIN
    UPDATE public.attendance SET daily_pay=500000 WHERE employee_id=v_employee;
    RAISE EXCEPTION 'Settled payroll was editable';
  EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO public.payments(ref_type,ref_id,amount) VALUES('import',v_import,300);
  IF (SELECT payment_status FROM public.imports WHERE id=v_import)<>'partial' THEN RAISE EXCEPTION 'Payment status incorrect'; END IF;
  UPDATE public.payments SET ref_id=v_import2 WHERE ref_id=v_import;
  IF (SELECT payment_status FROM public.imports WHERE id=v_import)<>'unpaid' OR
    (SELECT payment_status FROM public.imports WHERE id=v_import2)<>'partial' THEN RAISE EXCEPTION 'Payment reassignment incorrect'; END IF;
  BEGIN
    INSERT INTO public.payments(ref_type,ref_id,amount) VALUES('import',gen_random_uuid(),100);
    RAISE EXCEPTION 'Orphan payment accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;

  v_result:=public.get_inventory_summary();
  SELECT coalesce((SELECT value::numeric FROM public.settings WHERE key='opening_stock_kg'),0)
    +coalesce((SELECT sum(quantity_kg) FROM public.imports WHERE deleted_at IS NULL AND import_type='thanh_pham'),0)
    +coalesce((SELECT sum(output_qty_kg) FROM public.grinding WHERE deleted_at IS NULL),0)
    -coalesce((SELECT sum(total_kg) FROM public.exports WHERE deleted_at IS NULL AND coalesce(export_type,'thanh_pham')='thanh_pham'),0)
    INTO v_expected;
  IF (v_result->>'currentStockKg')::numeric<>v_expected THEN RAISE EXCEPTION 'Inventory aggregation incorrect'; END IF;

  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT id FROM upgrade_test_ids WHERE name='unlinked'),'email','test-unlinked@example.invalid','role','authenticated')::text,true);
  UPDATE public.users SET auth_id=(SELECT id FROM upgrade_test_ids WHERE name='unlinked') WHERE email='test-unlinked@example.invalid';
  IF public.current_user_role()<>'staff' THEN RAISE EXCEPTION 'First login profile claim failed'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT id FROM upgrade_test_ids WHERE name='inactive'),'role','authenticated')::text,true);
  IF public.has_any_role() OR EXISTS (SELECT 1 FROM public.imports) THEN RAISE EXCEPTION 'Inactive user can read data'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
  IF EXISTS (SELECT 1 FROM public.imports) THEN RAISE EXCEPTION 'Unprovisioned user can read data'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT 'PASS: authorization, attachment privacy, atomic weighing, payroll, payments, inventory; all fixtures rolled back' AS result;
