BEGIN;
DO $$
DECLARE admin_auth uuid:=gen_random_uuid(); warehouse uuid:=gen_random_uuid(); accountant uuid:=gen_random_uuid(); admin_user uuid; warehouse_user uuid; created_user uuid; record_id uuid:=gen_random_uuid(); rows_changed int;
BEGIN
 INSERT INTO public.users(auth_id,email,full_name,role,is_active) VALUES(admin_auth,'admin-test@example.invalid','Admin test','admin',true) RETURNING id INTO admin_user;
 INSERT INTO public.users(auth_id,email,full_name,role,is_active) VALUES(warehouse,'warehouse-test@example.invalid','Warehouse test','warehouse_manager',true) RETURNING id INTO warehouse_user;
 INSERT INTO public.users(auth_id,email,full_name,role,is_active) VALUES(accountant,'accountant-test@example.invalid','Accountant test','accountant',true);
 INSERT INTO public.expenses(id,category,amount) VALUES(record_id,'other',100);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',warehouse,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF EXISTS(SELECT FROM public.expenses WHERE id=record_id) THEN RAISE EXCEPTION 'Warehouse can see finance'; END IF;
 IF NOT public.can_manage_operations() THEN RAISE EXCEPTION 'Warehouse cannot manage operations'; END IF;
 BEGIN INSERT INTO public.advances(person,amount,type) VALUES('Test',100,'advance'); RAISE EXCEPTION 'Warehouse can create advance'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.users SET role='admin' WHERE id=warehouse_user; RAISE EXCEPTION 'Warehouse elevated itself'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.list_managed_users(); RAISE EXCEPTION 'Warehouse listed managed users'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.admin_create_user_account('staff01','Nhân viên 01','staff','MatKhau123',NULL); RAISE EXCEPTION 'Warehouse created user account'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',accountant,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF NOT EXISTS(SELECT FROM public.expenses WHERE id=record_id) THEN RAISE EXCEPTION 'Accountant cannot see finance'; END IF;
 IF public.can_manage_operations() THEN RAISE EXCEPTION 'Accountant can manage operations'; END IF;
 BEGIN INSERT INTO public.imports(quantity_kg,price_per_kg) VALUES(100,10); RAISE EXCEPTION 'Accountant can create inventory entry'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.settings SET value='100' WHERE key='kg_per_bag'; GET DIAGNOSTICS rows_changed=ROW_COUNT;
 IF rows_changed<>0 THEN RAISE EXCEPTION 'Accountant can edit global configuration'; END IF;
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_auth,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 created_user := public.admin_create_user_account('nhanvienkho','Nhân viên Kho','staff','MatKhau123','0901234567');
 IF NOT EXISTS(SELECT 1 FROM public.list_managed_users() WHERE id=created_user AND username='nhanvienkho' AND role='staff') THEN
  RAISE EXCEPTION 'Admin created account not returned by list_managed_users';
 END IF;
 PERFORM public.admin_update_user_account(created_user,'Nhân viên Kho Mới','warehouse_manager','0909999999',false);
 IF NOT EXISTS(SELECT 1 FROM public.list_managed_users() WHERE id=created_user AND role='warehouse_manager' AND is_active=false) THEN
  RAISE EXCEPTION 'Admin update user account failed';
 END IF;
 PERFORM public.admin_reset_user_password(created_user,'MatKhauMoi456');
 BEGIN PERFORM public.admin_update_user_account(admin_user,'Admin test','admin',NULL,false); RAISE EXCEPTION 'Admin locked own account'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN PERFORM public.admin_update_user_account(admin_user,'Admin test','staff',NULL,true); RAISE EXCEPTION 'Admin demoted own account'; EXCEPTION WHEN check_violation THEN NULL; END;
 IF (SELECT count(*) FROM public.get_role_permissions_matrix()) <> 5 THEN
  RAISE EXCEPTION 'Expected 5 roles in permission matrix';
 END IF;
 PERFORM public.admin_update_role_permissions('warehouse_manager', '{"finance.view": true, "finance.manage_expenses": true}'::jsonb);
 PERFORM public.admin_update_user_account(created_user,'Nhân viên Kho Mới','warehouse_manager','0909999999',true,'{"contacts.manage": false}'::jsonb);
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',warehouse,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF NOT EXISTS(SELECT FROM public.expenses WHERE id=record_id) THEN
  RAISE EXCEPTION 'Warehouse should see finance after dynamic role permission grant';
 END IF;
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_auth,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM public.admin_reset_role_permissions('warehouse_manager');
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',warehouse,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF EXISTS(SELECT FROM public.expenses WHERE id=record_id) THEN
  RAISE EXCEPTION 'Warehouse should not see finance after role permission reset';
 END IF;
 EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT 'PASS scoped warehouse and accountant roles' result;
