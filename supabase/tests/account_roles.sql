BEGIN;
DO $$
DECLARE warehouse uuid:=gen_random_uuid(); accountant uuid:=gen_random_uuid(); warehouse_user uuid; record_id uuid:=gen_random_uuid(); rows_changed int;
BEGIN
 INSERT INTO public.users(auth_id,email,full_name,role,is_active) VALUES(warehouse,'warehouse-test@example.invalid','Warehouse test','warehouse_manager',true) RETURNING id INTO warehouse_user;
 INSERT INTO public.users(auth_id,email,full_name,role,is_active) VALUES(accountant,'accountant-test@example.invalid','Accountant test','accountant',true);
 INSERT INTO public.expenses(id,category,amount) VALUES(record_id,'other',100);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',warehouse,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF EXISTS(SELECT FROM public.expenses WHERE id=record_id) THEN RAISE EXCEPTION 'Warehouse can see finance'; END IF;
 IF NOT public.can_manage_operations() THEN RAISE EXCEPTION 'Warehouse cannot manage operations'; END IF;
 BEGIN INSERT INTO public.advances(person,amount,type) VALUES('Test',100,'advance'); RAISE EXCEPTION 'Warehouse can create advance'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.users SET role='admin' WHERE id=warehouse_user; RAISE EXCEPTION 'Warehouse elevated itself'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',accountant,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF NOT EXISTS(SELECT FROM public.expenses WHERE id=record_id) THEN RAISE EXCEPTION 'Accountant cannot see finance'; END IF;
 IF public.can_manage_operations() THEN RAISE EXCEPTION 'Accountant can manage operations'; END IF;
 BEGIN INSERT INTO public.imports(quantity_kg,price_per_kg) VALUES(100,10); RAISE EXCEPTION 'Accountant can create inventory entry'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.settings SET value='100' WHERE key='kg_per_bag'; GET DIAGNOSTICS rows_changed=ROW_COUNT;
 IF rows_changed<>0 THEN RAISE EXCEPTION 'Accountant can edit global configuration'; END IF;
 EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT 'PASS scoped warehouse and accountant roles' result;
