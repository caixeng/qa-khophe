-- Additive repair for installations where 014 was skipped. No historical rows
-- are deleted or recalculated. Run after 016; verify with tests/fullstack.sql.
BEGIN;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() AND is_active = true
$$;

-- A row policy does not protect columns. Guard identity and authorization data.
CREATE OR REPLACE FUNCTION public.guard_user_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.email IS DISTINCT FROM OLD.email
    OR NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Không được thay đổi quyền hoặc danh tính tài khoản' USING ERRCODE = '42501';
  END IF;
  IF NEW.auth_id IS DISTINCT FROM OLD.auth_id AND NOT (
    OLD.auth_id IS NULL AND NEW.auth_id = auth.uid()
    AND OLD.email = (auth.jwt() ->> 'email') AND OLD.is_active = true
  ) THEN
    RAISE EXCEPTION 'Không được thay đổi liên kết tài khoản' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_user_profile ON public.users;
CREATE TRIGGER trg_guard_user_profile BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_profile();

DROP POLICY IF EXISTS users_select_own_or_admin ON public.users;
CREATE POLICY users_select_own_or_admin ON public.users FOR SELECT TO authenticated
USING (auth_id = (select auth.uid()) OR public.is_admin()
  OR (auth_id IS NULL AND is_active = true AND email = (auth.jwt() ->> 'email')));
DROP POLICY IF EXISTS users_update_own_or_admin ON public.users;
CREATE POLICY users_update_own_or_admin ON public.users FOR UPDATE TO authenticated
USING ((auth_id = (select auth.uid()) AND is_active = true) OR public.is_admin())
WITH CHECK ((auth_id = (select auth.uid()) AND is_active = true) OR public.is_admin());
DROP POLICY IF EXISTS users_claim_own_profile_by_email ON public.users;
CREATE POLICY users_claim_own_profile_by_email ON public.users FOR UPDATE TO authenticated
USING (auth_id IS NULL AND is_active = true AND email = (auth.jwt() ->> 'email'))
WITH CHECK (auth_id = (select auth.uid()) AND is_active = true AND email = (auth.jwt() ->> 'email'));

-- Require a provisioned, active user to read operational tables.
DO $$
DECLARE t text; p text;
BEGIN
  FOR t,p IN SELECT * FROM (VALUES
    ('contacts','contacts_select'), ('imports','imports_select'),
    ('exports','exports_select'), ('grinding','grinding_select'),
    ('weighing_sessions','weighing_sessions_select'), ('weighing_bags','weighing_bags_select'),
    ('payments','payments_select'), ('settings','settings_select'), ('stock_counts','stock_counts_select')
  ) AS policies(table_name, policy_name) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',p,t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_any_role())',p,t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.can_access_attachment_ref(p_type text, p_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_any_role() THEN RETURN false; END IF;
  CASE p_type
    WHEN 'import' THEN RETURN EXISTS (SELECT 1 FROM public.imports WHERE id=p_id AND deleted_at IS NULL);
    WHEN 'export' THEN RETURN EXISTS (SELECT 1 FROM public.exports WHERE id=p_id AND deleted_at IS NULL);
    WHEN 'weighing_session' THEN RETURN EXISTS (SELECT 1 FROM public.weighing_sessions WHERE id=p_id);
    WHEN 'expense' THEN RETURN public.is_manager_or_admin() AND EXISTS (SELECT 1 FROM public.expenses WHERE id=p_id);
    WHEN 'advance' THEN RETURN public.is_manager_or_admin() AND EXISTS (SELECT 1 FROM public.advances WHERE id=p_id);
    ELSE RETURN false;
  END CASE;
END;
$$;
CREATE OR REPLACE FUNCTION public.can_access_attachment_path(p_path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE parts text[] := string_to_array(p_path,'/');
BEGIN
  IF array_length(parts,1) <> 3 OR parts[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;
  RETURN public.can_access_attachment_ref(parts[1], parts[2]::uuid);
END;
$$;
DROP POLICY IF EXISTS attachments_select ON public.attachments;
CREATE POLICY attachments_select ON public.attachments FOR SELECT TO authenticated
USING (public.can_access_attachment_ref(ref_type,ref_id));
DROP POLICY IF EXISTS attachments_insert ON public.attachments;
CREATE POLICY attachments_insert ON public.attachments FOR INSERT TO authenticated
WITH CHECK (public.can_access_attachment_ref(ref_type,ref_id)
  AND split_part(storage_path,'/',1)=ref_type AND split_part(storage_path,'/',2)=ref_id::text);
DROP POLICY IF EXISTS attachments_storage_select ON storage.objects;
CREATE POLICY attachments_storage_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='attachments' AND public.can_access_attachment_path(name));
DROP POLICY IF EXISTS attachments_storage_insert ON storage.objects;
CREATE POLICY attachments_storage_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='attachments' AND public.can_access_attachment_path(name));
DROP POLICY IF EXISTS attachments_storage_delete ON storage.objects;
CREATE POLICY attachments_storage_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='attachments' AND public.can_access_attachment_path(name)
  AND (public.is_manager_or_admin() OR owner_id=(select auth.uid())::text));

-- Atomic, retry-safe weighing. Net weight is derived from bags and explicit tare.
ALTER TABLE public.weighing_sessions ADD COLUMN IF NOT EXISTS tare_kg numeric(10,2) NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS exports_active_weighing_uq ON public.exports(weighing_session_id)
  WHERE deleted_at IS NULL AND weighing_session_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.create_weighing_session(
  p_id uuid, p_date date, p_material_type text, p_contact_id uuid,
  p_notes text, p_tare_kg numeric, p_bags jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_gross numeric; v_count integer; v_owner uuid;
BEGIN
  IF NOT public.has_any_role() THEN RAISE EXCEPTION 'Không có quyền tạo phiên cân' USING ERRCODE='42501'; END IF;
  IF p_id IS NULL OR p_date IS NULL OR jsonb_typeof(p_bags) IS DISTINCT FROM 'array'
    OR p_tare_kg IS NULL OR p_tare_kg < 0 THEN
    RAISE EXCEPTION 'Dữ liệu phiên cân không hợp lệ' USING ERRCODE='23514';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  SELECT created_by INTO v_owner FROM public.weighing_sessions WHERE id=p_id;
  IF FOUND THEN
    IF v_owner IS DISTINCT FROM public.current_user_id() THEN
      RAISE EXCEPTION 'Phiên cân thuộc tài khoản khác' USING ERRCODE='42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.weighing_sessions WHERE id=p_id AND date=p_date
      AND contact_id IS NOT DISTINCT FROM p_contact_id AND tare_kg=p_tare_kg)
      OR EXISTS (
        (SELECT bag_number,weight_kg FROM public.weighing_bags WHERE session_id=p_id
         EXCEPT SELECT bag_number,weight_kg FROM jsonb_to_recordset(p_bags) AS b(bag_number integer,weight_kg numeric))
        UNION ALL
        (SELECT bag_number,weight_kg FROM jsonb_to_recordset(p_bags) AS b(bag_number integer,weight_kg numeric)
         EXCEPT SELECT bag_number,weight_kg FROM public.weighing_bags WHERE session_id=p_id)
      ) THEN RAISE EXCEPTION 'Phiên cân đã lưu có dữ liệu khác. Tạo phiên mới để thay đổi.' USING ERRCODE='23514'; END IF;
    RETURN p_id;
  END IF;
  SELECT count(*),sum(weight_kg) INTO v_count,v_gross
    FROM jsonb_to_recordset(p_bags) AS b(bag_number integer,weight_kg numeric);
  IF v_count=0 OR v_count>1000 OR v_gross IS NULL OR v_gross<=p_tare_kg
    OR EXISTS (SELECT 1 FROM jsonb_to_recordset(p_bags) AS b(bag_number integer,weight_kg numeric)
      WHERE bag_number IS NULL OR bag_number<=0 OR weight_kg IS NULL OR weight_kg<=0)
    OR (SELECT count(DISTINCT bag_number) FROM jsonb_to_recordset(p_bags) AS b(bag_number integer))<>v_count THEN
    RAISE EXCEPTION 'Số bao, khối lượng hoặc bì cân không hợp lệ' USING ERRCODE='23514';
  END IF;
  INSERT INTO public.weighing_sessions(id,date,material_type,contact_id,notes,tare_kg,total_bags,total_kg)
    VALUES (p_id,p_date,p_material_type,p_contact_id,p_notes,p_tare_kg,v_count,v_gross-p_tare_kg);
  INSERT INTO public.weighing_bags(session_id,bag_number,weight_kg,notes)
    SELECT p_id,bag_number,weight_kg,notes
    FROM jsonb_to_recordset(p_bags) AS b(bag_number integer,weight_kg numeric,notes text);
  RETURN p_id;
END;
$$;

-- Restore HR fields without destructive deduplication or financial backfills.
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS employee_name_snapshot text;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS paid_by uuid REFERENCES public.users(id);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_employee_id_fkey;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_employee_id_fkey
  FOREIGN KEY(employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;
-- Separate advance-only rows must be allowed on an already-attended date.
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_employee_date_uq;
CREATE UNIQUE INDEX IF NOT EXISTS attendance_work_day_uq ON public.attendance(employee_id,date)
  WHERE employee_id IS NOT NULL AND work_shift>0;
DO $$ DECLARE p text; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='employees' LOOP
    EXECUTE format('DROP POLICY %I ON public.employees',p);
  END LOOP;
END $$;
CREATE POLICY employees_manager_select ON public.employees FOR SELECT TO authenticated USING(public.is_manager_or_admin());
CREATE POLICY employees_manager_insert ON public.employees FOR INSERT TO authenticated WITH CHECK(public.is_manager_or_admin());
CREATE POLICY employees_manager_update ON public.employees FOR UPDATE TO authenticated USING(public.is_manager_or_admin()) WITH CHECK(public.is_manager_or_admin());
CREATE POLICY employees_manager_delete ON public.employees FOR DELETE TO authenticated USING(public.is_manager_or_admin());
CREATE OR REPLACE FUNCTION public.compute_attendance_net_pay()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  NEW.net_pay := round(NEW.work_shift*NEW.daily_pay + coalesce(NEW.overtime_hours,0)*NEW.daily_pay*1.5/8)
    - coalesce(NEW.advance_pay,0);
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.set_attendance_employee_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NEW.employee_id IS NOT NULL AND (TG_OP='INSERT' OR NEW.employee_id IS DISTINCT FROM OLD.employee_id) THEN
    SELECT name INTO NEW.employee_name_snapshot FROM public.employees WHERE id=NEW.employee_id;
  END IF;
  IF NEW.payment_status='paid' THEN
    NEW.paid_at:=coalesce(NEW.paid_at,now()); NEW.paid_by:=coalesce(NEW.paid_by,public.current_user_id());
  ELSE NEW.paid_at:=NULL; NEW.paid_by:=NULL; END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_attendance_employee_snapshot ON public.attendance;
CREATE TRIGGER trg_attendance_employee_snapshot BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_attendance_employee_snapshot();

CREATE TABLE IF NOT EXISTS public.payroll_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  period date NOT NULL CHECK (period=date_trunc('month',period)::date),
  gross_amount numeric(15,0) NOT NULL DEFAULT 0,
  advance_amount numeric(15,0) NOT NULL DEFAULT 0,
  net_amount numeric(15,0) NOT NULL DEFAULT 0,
  paid_at timestamptz NOT NULL DEFAULT now(), paid_by uuid REFERENCES public.users(id),
  notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id,period)
);
ALTER TABLE public.payroll_settlements ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.payroll_settlements TO authenticated;
DROP POLICY IF EXISTS payroll_settlements_manager_select ON public.payroll_settlements;
DROP POLICY IF EXISTS payroll_settlements_manager_insert ON public.payroll_settlements;
DROP POLICY IF EXISTS payroll_settlements_manager_update ON public.payroll_settlements;
CREATE POLICY payroll_settlements_manager_select ON public.payroll_settlements FOR SELECT TO authenticated USING(public.is_manager_or_admin());
CREATE POLICY payroll_settlements_manager_insert ON public.payroll_settlements FOR INSERT TO authenticated WITH CHECK(public.is_manager_or_admin());
CREATE POLICY payroll_settlements_manager_update ON public.payroll_settlements FOR UPDATE TO authenticated USING(public.is_manager_or_admin()) WITH CHECK(public.is_manager_or_admin());
CREATE OR REPLACE FUNCTION public.settle_employee_payroll(p_employee_id uuid,p_period date)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_period date:=date_trunc('month',p_period)::date; v_end date:=(v_period+interval '1 month')::date;
  v_gross numeric; v_advance numeric; v_id uuid;
BEGIN
  IF NOT public.is_manager_or_admin() THEN RAISE EXCEPTION 'Không có quyền chốt lương' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.employees WHERE id=p_employee_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nhân viên không tồn tại' USING ERRCODE='23503'; END IF;
  PERFORM 1 FROM public.attendance WHERE employee_id=p_employee_id AND date>=v_period AND date<v_end FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không có dữ liệu công trong kỳ lương này' USING ERRCODE='P0001'; END IF;
  SELECT coalesce(sum(round(work_shift*daily_pay+coalesce(overtime_hours,0)*daily_pay*1.5/8)),0),coalesce(sum(advance_pay),0)
    INTO v_gross,v_advance FROM public.attendance WHERE employee_id=p_employee_id AND date>=v_period AND date<v_end;
  SELECT id INTO v_id FROM public.payroll_settlements WHERE employee_id=p_employee_id AND period=v_period;
  IF FOUND THEN RETURN v_id; END IF;
  INSERT INTO public.payroll_settlements(employee_id,period,gross_amount,advance_amount,net_amount,paid_by)
    VALUES(p_employee_id,v_period,v_gross,v_advance,v_gross-v_advance,public.current_user_id()) RETURNING id INTO v_id;
  UPDATE public.attendance SET payment_status='paid',paid_at=now(),paid_by=public.current_user_id()
    WHERE employee_id=p_employee_id AND date>=v_period AND date<v_end;
  RETURN v_id;
END;
$$;
-- Serialize edits with settlement and forbid changing a settled period.
CREATE OR REPLACE FUNCTION public.guard_settled_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_employee uuid; v_date date;
BEGIN
  v_employee:=CASE WHEN TG_OP='DELETE' THEN OLD.employee_id ELSE NEW.employee_id END;
  v_date:=CASE WHEN TG_OP='DELETE' THEN OLD.date ELSE NEW.date END;
  PERFORM 1 FROM public.employees WHERE id IN (v_employee,CASE WHEN TG_OP='UPDATE' THEN OLD.employee_id ELSE v_employee END)
    ORDER BY id FOR UPDATE;
  IF TG_OP='UPDATE' AND NEW.employee_id IS NOT DISTINCT FROM OLD.employee_id AND NEW.date=OLD.date
    AND NEW.work_shift=OLD.work_shift AND NEW.daily_pay=OLD.daily_pay
    AND NEW.overtime_hours IS NOT DISTINCT FROM OLD.overtime_hours AND NEW.advance_pay=OLD.advance_pay
    AND NEW.payment_status='paid' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.payroll_settlements WHERE employee_id=v_employee AND period=date_trunc('month',v_date)::date)
    OR (TG_OP='UPDATE' AND EXISTS (SELECT 1 FROM public.payroll_settlements WHERE employee_id=OLD.employee_id AND period=date_trunc('month',OLD.date)::date)) THEN
    RAISE EXCEPTION 'Kỳ lương đã chốt, không thể sửa công hoặc tạm ứng' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_settled_attendance ON public.attendance;
CREATE TRIGGER trg_guard_settled_attendance BEFORE INSERT OR UPDATE OR DELETE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.guard_settled_attendance();

-- Validate payment references and synchronize both ends of reassignment.
CREATE OR REPLACE FUNCTION public.validate_payment_ref()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NEW.ref_type='import' THEN
    PERFORM 1 FROM public.imports WHERE id=NEW.ref_id AND deleted_at IS NULL FOR UPDATE;
  ELSE PERFORM 1 FROM public.exports WHERE id=NEW.ref_id AND deleted_at IS NULL FOR UPDATE;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Chứng từ thanh toán không tồn tại hoặc đã xoá' USING ERRCODE='23503'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_payment_ref ON public.payments;
CREATE TRIGGER trg_validate_payment_ref BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_ref();
CREATE OR REPLACE FUNCTION public.sync_payment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r record; v_total numeric; v_paid numeric;
BEGIN
  FOR r IN SELECT DISTINCT ref_type,ref_id FROM (
    SELECT NEW.ref_type,NEW.ref_id WHERE TG_OP<>'DELETE'
    UNION SELECT OLD.ref_type,OLD.ref_id WHERE TG_OP<>'INSERT'
  ) refs LOOP
    SELECT coalesce(sum(amount),0) INTO v_paid FROM public.payments WHERE ref_type=r.ref_type AND ref_id=r.ref_id;
    IF r.ref_type='import' THEN
      SELECT total_amount INTO v_total FROM public.imports WHERE id=r.ref_id FOR UPDATE;
      UPDATE public.imports SET payment_status=CASE WHEN v_paid<=0 THEN 'unpaid' WHEN v_paid>=v_total THEN 'paid' ELSE 'partial' END WHERE id=r.ref_id;
    ELSE
      SELECT total_amount INTO v_total FROM public.exports WHERE id=r.ref_id FOR UPDATE;
      UPDATE public.exports SET payment_status=CASE WHEN v_paid<=0 THEN 'unpaid' WHEN v_paid>=v_total THEN 'paid' ELSE 'partial' END WHERE id=r.ref_id;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_payment_status() FROM PUBLIC;

-- Full-history stock aggregation: no REST row cap and no hidden negative stock.
CREATE OR REPLACE FUNCTION public.get_inventory_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v_open numeric; v_raw_open numeric; v_bag numeric; v_ground numeric; v_input numeric;
  v_imported numeric; v_exported numeric; v_raw_imported numeric; v_raw_exported numeric;
BEGIN
  IF NOT public.has_any_role() THEN RAISE EXCEPTION 'Không có quyền xem tồn kho' USING ERRCODE='42501'; END IF;
  SELECT coalesce(max(value::numeric) FILTER(WHERE key='opening_stock_kg'),0),
    coalesce(max(value::numeric) FILTER(WHERE key='opening_raw_stock_kg'),0),
    coalesce(max(value::numeric) FILTER(WHERE key='kg_per_bag'),900)
    INTO v_open,v_raw_open,v_bag FROM public.settings WHERE key IN ('opening_stock_kg','opening_raw_stock_kg','kg_per_bag');
  SELECT coalesce(sum(output_qty_kg),0),coalesce(sum(input_qty_kg),0) INTO v_ground,v_input FROM public.grinding WHERE deleted_at IS NULL;
  SELECT coalesce(sum(quantity_kg) FILTER(WHERE import_type='thanh_pham'),0),coalesce(sum(quantity_kg) FILTER(WHERE coalesce(import_type,'nvl')='nvl'),0)
    INTO v_imported,v_raw_imported FROM public.imports WHERE deleted_at IS NULL;
  SELECT coalesce(sum(total_kg) FILTER(WHERE coalesce(export_type,'thanh_pham')='thanh_pham'),0),coalesce(sum(total_kg) FILTER(WHERE export_type='nvl'),0)
    INTO v_exported,v_raw_exported FROM public.exports WHERE deleted_at IS NULL;
  RETURN jsonb_build_object('currentStockKg',v_open+v_imported+v_ground-v_exported,
    'currentBags',CASE WHEN v_bag>0 THEN greatest(0,round((v_open+v_imported+v_ground-v_exported)/v_bag)) ELSE 0 END,
    'rawStockKg',v_raw_open+v_raw_imported-v_input-v_raw_exported,
    'totalGround',v_ground,'totalImported',v_imported,'totalExported',v_exported,'openingStock',v_open,'kgPerBag',v_bag);
END;
$$;
CREATE INDEX IF NOT EXISTS imports_active_date_id_idx ON public.imports(date DESC,id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS exports_active_date_id_idx ON public.exports(date DESC,id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS grinding_active_date_id_idx ON public.grinding(date DESC,id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS attendance_employee_date_idx ON public.attendance(employee_id,date);

REVOKE ALL ON FUNCTION public.create_weighing_session(uuid,date,text,uuid,text,numeric,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_weighing_session(uuid,date,text,uuid,text,numeric,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.settle_employee_payroll(uuid,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_employee_payroll(uuid,date) TO authenticated;
REVOKE ALL ON FUNCTION public.get_inventory_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_inventory_summary() TO authenticated;
REVOKE ALL ON FUNCTION public.can_access_attachment_ref(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_attachment_ref(text,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.can_access_attachment_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_attachment_path(text) TO authenticated;
ALTER FUNCTION public.update_updated_at() SET search_path = '';
REVOKE ALL ON FUNCTION public.set_created_by() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_import_processing_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.write_audit_log() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_payment_status() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_manager_or_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_any_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role(), public.current_user_id(), public.is_admin(), public.is_manager_or_admin(), public.has_any_role() TO authenticated;
COMMIT;
