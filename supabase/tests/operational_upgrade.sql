BEGIN;
DO $$
DECLARE actor uuid:=gen_random_uuid(); employee uuid:=gen_random_uuid(); manual_employee uuid:=gen_random_uuid();
  warehouse uuid:=gen_random_uuid(); origin uuid:=gen_random_uuid(); expense uuid:=gen_random_uuid(); lot uuid:=gen_random_uuid();
  receipt uuid:=gen_random_uuid(); id1 uuid; id2 uuid; snapshot jsonb; baseline numeric; cash numeric; n numeric;
BEGIN
  INSERT INTO public.users(auth_id,email,full_name,role,is_active) VALUES
    (actor,'operational-admin@example.invalid','Test admin','admin',true),
    (warehouse,'operational-warehouse@example.invalid','Test warehouse','warehouse_manager',true);
  INSERT INTO public.employees(id,name,daily_salary) VALUES(employee,'Carry test',100),(manual_employee,'Manual test',100);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  baseline:=(public.get_cash_flow('2000-01-01','2100-01-01')->>'net')::numeric;
  UPDATE public.settings SET value='2' WHERE key='overtime_multiplier';
  INSERT INTO public.attendance(employee_id,date,work_shift,daily_pay,overtime_hours,advance_pay)
    VALUES(employee,'2040-01-01',1,100,8,500) RETURNING id INTO id1;
  IF (SELECT net_pay FROM public.attendance WHERE id=id1)<>-200 THEN RAISE EXCEPTION 'Rate or advance formula mismatch'; END IF;
  UPDATE public.settings SET value='1.5' WHERE key='overtime_multiplier';
  IF (SELECT overtime_multiplier FROM public.attendance WHERE id=id1)<>2 THEN RAISE EXCEPTION 'Historical rate changed'; END IF;
  id1:=public.settle_employee_payroll(employee,'2040-01-01');
  IF (SELECT cash_paid FROM public.payroll_settlements WHERE id=id1)<>0 OR public.payroll_opening_balance(employee,'2040-02-01')<>-200 THEN RAISE EXCEPTION 'Negative carry lost'; END IF;
  INSERT INTO public.attendance(employee_id,date,work_shift,daily_pay) VALUES(employee,'2040-02-01',1,100);
  id2:=public.settle_employee_payroll(employee,'2040-02-01');
  IF (SELECT closing_balance FROM public.payroll_settlements WHERE id=id2)<>-100 THEN RAISE EXCEPTION 'Carry not deducted'; END IF;
  INSERT INTO public.attendance(employee_id,date,work_shift,daily_pay) VALUES(employee,'2040-03-01',1,500);
  id2:=public.settle_employee_payroll(employee,'2040-03-01');
  IF (SELECT cash_paid FROM public.payroll_settlements WHERE id=id2)<>400 THEN RAISE EXCEPTION 'Excess salary cash mismatch'; END IF;
  IF public.settle_employee_payroll(employee,'2040-03-01')<>id2 THEN RAISE EXCEPTION 'Settlement retry changed id'; END IF;
  BEGIN UPDATE public.payroll_settlements SET cash_paid=999 WHERE id=id2; RAISE EXCEPTION 'Settled cash is mutable'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO public.attendance(employee_id,date,work_shift,daily_pay) VALUES(employee,'2039-12-01',1,10); RAISE EXCEPTION 'Backdated attendance was accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO public.attendance(employee_id,date,work_shift,daily_pay,payment_status) VALUES(manual_employee,'2040-01-01',1,100,'paid');
  INSERT INTO public.attendance(employee_id,date,work_shift,daily_pay) VALUES(manual_employee,'2040-01-02',1,200);
  id2:=public.settle_employee_payroll(manual_employee,'2040-01-01');
  IF (SELECT cash_paid FROM public.payroll_settlements WHERE id=id2)<>200 THEN RAISE EXCEPTION 'Manual salary counted twice'; END IF;
  INSERT INTO public.advances(id,date,amount,type,purpose,person) VALUES(origin,'2040-01-01',1000,'advance','workshop','Test');
  INSERT INTO public.expenses(id,date,amount,category) VALUES(expense,'2040-01-02',600,'other');
  PERFORM public.reconcile_advance(origin,'expense',expense);
  INSERT INTO public.advances(date,amount,type,original_advance_id,person) VALUES('2040-01-03',400,'settlement',origin,'Test');
  INSERT INTO public.expenses(date,amount,category) VALUES('2040-01-04',50,'other');
  cash:=(public.get_cash_flow('2000-01-01','2100-01-01')->>'net')::numeric;
  -- 500 payroll advance + 400 salary + 300 manual salary + 1000 workshop advance - 400 return + 50 expense.
  -- The 100 manual payment remains a real cash movement after the remaining 200 is settled.
  IF cash-baseline<>-1850 THEN RAISE EXCEPTION 'Cash counted twice or omitted: %',cash-baseline; END IF;
  INSERT INTO public.imports(id,date,quantity_kg,price_per_kg,import_type) VALUES(lot,'2040-01-01',100,10,'nvl');
  BEGIN INSERT INTO public.grinding(date,import_id,input_qty_kg,output_qty_kg) VALUES('2040-01-02',lot,60,55); RAISE EXCEPTION 'Loss without reason accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO public.grinding(date,import_id,input_qty_kg,output_qty_kg,loss_category) VALUES('2040-01-02',lot,60,55,'machine');
  BEGIN INSERT INTO public.grinding(date,import_id,input_qty_kg,output_qty_kg,loss_category) VALUES('2040-01-03',lot,60,55,'sorting'); RAISE EXCEPTION 'Lot consumed twice'; EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO public.exports(id,date,total_kg,bags_count,price_per_kg,payment_status) VALUES(receipt,'2040-01-02',1,1,100,'paid');
  IF (SELECT remaining_amount FROM public.v_export_debts WHERE ref_id=receipt)<>0 THEN RAISE EXCEPTION 'Legacy paid debt mismatch'; END IF;
  snapshot:=public.get_dashboard_snapshot('2040-03-01');
  IF (snapshot->'summary'->>'inventoryKg')::numeric<>(public.get_inventory_summary()->>'currentStockKg')::numeric THEN RAISE EXCEPTION 'Dashboard inventory mismatch'; END IF;
  IF jsonb_array_length(snapshot->'monthly')<>12 THEN RAISE EXCEPTION 'Dashboard monthly range mismatch'; END IF;
  IF (public.get_reconciliation_status()->>'advanceOutstanding') IS NULL THEN RAISE EXCEPTION 'Admin reconciliation missing'; END IF;
  PERFORM public.set_business_settings(7,2,100);
  IF (SELECT value::numeric FROM public.settings WHERE key='loss_warning_pct')<>7 THEN RAISE EXCEPTION 'Settings not saved'; END IF;
  INSERT INTO public.stock_counts(date,counted_bags,counted_kg,system_kg) VALUES('2040-03-01',0,0,999999) RETURNING system_kg INTO n;
  IF n<>(public.get_inventory_summary()->>'currentStockKg')::numeric THEN RAISE EXCEPTION 'Stock count trusts client stock'; END IF;
  INSERT INTO public.app_error_logs(user_id,message,path) VALUES(public.current_user_id(),'Rollback log test','/doi-soat');
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',warehouse,'role','authenticated')::text,true);
  IF public.get_reconciliation_status() ? 'advanceOutstanding' THEN RAISE EXCEPTION 'Warehouse can see advances'; END IF;
  IF public.get_dashboard_snapshot('2040-03-01')->'summary'->>'estimatedProfit' IS NOT NULL THEN RAISE EXCEPTION 'Warehouse can see finance'; END IF;
  BEGIN PERFORM public.get_cash_flow('2040-01-01','2040-03-31'); RAISE EXCEPTION 'Warehouse can see cash'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.get_payroll_balances('2040-03-01'); RAISE EXCEPTION 'Warehouse can see payroll'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.set_business_settings(7,2,100); RAISE EXCEPTION 'Warehouse can edit settings'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF EXISTS(SELECT 1 FROM public.app_error_logs WHERE message='Rollback log test') THEN RAISE EXCEPTION 'Warehouse sees another user log'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;

