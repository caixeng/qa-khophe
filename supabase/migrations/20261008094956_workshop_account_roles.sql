BEGIN;
ALTER TABLE public.users DROP CONSTRAINT users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK(role IN ('admin','manager','staff','warehouse_manager','accountant'));
CREATE OR REPLACE FUNCTION public.has_any_role() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT public.current_user_role() IN ('admin','manager','staff','warehouse_manager','accountant'); $$;
CREATE OR REPLACE FUNCTION public.is_manager_or_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT public.current_user_role() IN ('admin','manager','accountant'); $$;
CREATE OR REPLACE FUNCTION public.can_manage_operations() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT public.current_user_role() IN ('admin','manager','warehouse_manager'); $$;
CREATE OR REPLACE FUNCTION public.can_record_operations() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT public.current_user_role() IN ('admin','manager','warehouse_manager','staff'); $$;
DO $$
DECLARE p record; predicate text;
BEGIN
 FOR p IN SELECT tablename,policyname,cmd FROM pg_policies WHERE schemaname='public' AND tablename IN ('imports','exports','grinding','weighing_sessions','weighing_bags','stock_counts','contacts') AND cmd<>'SELECT' LOOP
  predicate:=CASE WHEN p.cmd='INSERT' AND p.tablename IN ('imports','exports','grinding','weighing_sessions','weighing_bags') THEN 'public.can_record_operations()' ELSE 'public.can_manage_operations()' END;
  IF p.cmd='INSERT' THEN EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)',p.policyname,p.tablename,predicate);
  ELSIF p.cmd='UPDATE' THEN EXECUTE format('ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s)',p.policyname,p.tablename,predicate,predicate);
  ELSIF p.cmd='DELETE' THEN EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)',p.policyname,p.tablename,predicate);
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.can_manage_operations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_record_operations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_operations(),public.can_record_operations() TO authenticated;
COMMIT;
