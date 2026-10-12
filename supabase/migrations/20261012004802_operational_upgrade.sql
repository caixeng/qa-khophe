-- Operational review: preserve historical amounts; add reconciliation and aggregates.
-- The partial unique index attendance_work_day_uq supersedes this legacy trigger.
DROP TRIGGER IF EXISTS trg_prevent_duplicate_daily_attendance ON public.attendance;
DROP FUNCTION IF EXISTS public.prevent_duplicate_daily_attendance();
CREATE INDEX IF NOT EXISTS advances_employee_id_idx ON public.advances(employee_id);
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('advances','created_by'),('attachments','created_by'),('attendance','created_by'),
    ('attendance','paid_by'),('audit_log','changed_by'),('employees','created_by'),
    ('expenses','created_by'),('exports','created_by'),('grinding','created_by'),
    ('imports','created_by'),('payments','created_by'),('payroll_settlements','paid_by'),
    ('stock_counts','created_by'),('weighing_sessions','created_by')) t(tbl,col)
  LOOP EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(%I)',r.tbl||'_'||r.col||'_idx',r.tbl,r.col); END LOOP;
END $$;
DROP POLICY IF EXISTS settings_admin_write ON public.settings;
CREATE POLICY settings_admin_insert ON public.settings FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY settings_admin_update ON public.settings FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY settings_admin_delete ON public.settings FOR DELETE TO authenticated USING ((SELECT public.is_admin()));
DROP POLICY IF EXISTS users_claim_own_profile_by_email ON public.users;
DROP POLICY IF EXISTS users_update_own_or_admin ON public.users;
DROP POLICY IF EXISTS users_select_own_or_admin ON public.users;
CREATE POLICY users_select_own_or_admin ON public.users FOR SELECT TO authenticated USING (
  auth_id=(SELECT auth.uid()) OR (SELECT public.is_admin()) OR
  (auth_id IS NULL AND is_active AND email=((SELECT auth.jwt())->>'email')));
CREATE POLICY users_update_own_or_admin ON public.users FOR UPDATE TO authenticated USING (
  (auth_id=(SELECT auth.uid()) AND is_active) OR (SELECT public.is_admin()) OR
  (auth_id IS NULL AND is_active AND email=((SELECT auth.jwt())->>'email')))
WITH CHECK ((auth_id=(SELECT auth.uid()) AND is_active) OR (SELECT public.is_admin()));

-- Rates are snapshotted on each attendance row; changing defaults never rewrites history.
INSERT INTO public.settings(key,value) VALUES ('overtime_multiplier','1.5'),('loss_warning_pct','5') ON CONFLICT (key) DO NOTHING;
CREATE OR REPLACE FUNCTION public.validate_business_setting()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
  IF NEW.key IN ('loss_warning_pct','overtime_multiplier') THEN
    IF NEW.value !~ '^[0-9]+([.][0-9]+)?$' THEN RAISE EXCEPTION 'Cấu hình phải là số hợp lệ' USING ERRCODE='23514'; END IF;
    IF (NEW.key='loss_warning_pct' AND NEW.value::numeric NOT BETWEEN 0 AND 100)
      OR (NEW.key='overtime_multiplier' AND NEW.value::numeric NOT BETWEEN 1 AND 5) THEN
      RAISE EXCEPTION 'Ngưỡng hao hụt từ 0 đến 100; hệ số tăng ca từ 1 đến 5' USING ERRCODE='23514'; END IF;
  END IF; RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_business_setting BEFORE INSERT OR UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.validate_business_setting();
REVOKE ALL ON FUNCTION public.validate_business_setting() FROM PUBLIC,anon,authenticated;
ALTER TABLE public.attendance ADD COLUMN overtime_multiplier numeric(4,2);
UPDATE public.attendance SET overtime_multiplier=1.5;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_overtime_multiplier_check CHECK (overtime_multiplier BETWEEN 1 AND 5);
CREATE OR REPLACE FUNCTION public.compute_attendance_net_pay()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
  IF NEW.overtime_multiplier IS NULL THEN
    SELECT coalesce((SELECT value::numeric FROM public.settings WHERE key='overtime_multiplier'),1.5) INTO NEW.overtime_multiplier;
  END IF;
  NEW.net_pay:=round(NEW.work_shift*NEW.daily_pay+coalesce(NEW.overtime_hours,0)*NEW.daily_pay*NEW.overtime_multiplier/8)-coalesce(NEW.advance_pay,0);
  RETURN NEW;
END $$;
ALTER TABLE public.attendance ALTER COLUMN overtime_multiplier SET NOT NULL;
ALTER TABLE public.payroll_settlements ADD COLUMN opening_balance numeric(15,0) NOT NULL DEFAULT 0,
  ADD COLUMN cash_paid numeric(15,0) NOT NULL DEFAULT 0,
  ADD COLUMN closing_balance numeric(15,0) NOT NULL DEFAULT 0;
UPDATE public.payroll_settlements SET cash_paid=greatest(net_amount,0),closing_balance=least(net_amount,0);
ALTER TABLE public.payroll_settlements ADD CONSTRAINT payroll_balance_check
  CHECK (cash_paid>=0 AND closing_balance=opening_balance+net_amount-cash_paid);
ALTER TABLE public.attendance ADD COLUMN payroll_settlement_id uuid REFERENCES public.payroll_settlements(id) ON DELETE RESTRICT;
CREATE INDEX attendance_payroll_settlement_id_idx ON public.attendance(payroll_settlement_id);
UPDATE public.attendance a SET payroll_settlement_id=s.id FROM public.payroll_settlements s
  WHERE s.employee_id=a.employee_id AND s.period=date_trunc('month',a.date)::date AND a.payment_status='paid';

CREATE OR REPLACE FUNCTION public.payroll_opening_balance(p_employee_id uuid,p_period date)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v_last date; v_balance numeric; v_unpaid numeric; BEGIN
  IF NOT public.is_manager_or_admin() THEN RAISE EXCEPTION 'Không có quyền xem lương' USING ERRCODE='42501'; END IF;
  SELECT period,closing_balance INTO v_last,v_balance FROM public.payroll_settlements
    WHERE employee_id=p_employee_id AND period<date_trunc('month',p_period)::date ORDER BY period DESC LIMIT 1;
  SELECT coalesce(sum(net_pay),0) INTO v_unpaid FROM public.attendance
    WHERE employee_id=p_employee_id AND date<date_trunc('month',p_period)::date AND payment_status<>'paid'
      AND (v_last IS NULL OR date>=(v_last+interval '1 month')::date);
  RETURN coalesce(v_balance,0)+v_unpaid;
END $$;
CREATE OR REPLACE FUNCTION public.get_payroll_balances(p_period date)
RETURNS TABLE(employee_id uuid,name text,opening_balance numeric,settled boolean,cash_paid numeric,closing_balance numeric)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$ BEGIN
  IF NOT public.is_manager_or_admin() THEN RAISE EXCEPTION 'Không có quyền xem lương' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT e.id,e.name,coalesce(s.opening_balance,public.payroll_opening_balance(e.id,p_period)),
    s.id IS NOT NULL,coalesce(s.cash_paid,0),coalesce(s.closing_balance,0)
    FROM public.employees e LEFT JOIN public.payroll_settlements s ON s.employee_id=e.id AND s.period=date_trunc('month',p_period)::date;
END $$;
CREATE OR REPLACE FUNCTION public.settle_employee_payroll(p_employee_id uuid,p_period date)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_period date:=date_trunc('month',p_period)::date; v_end date:=(v_period+interval '1 month')::date;
  v_gross numeric; v_advance numeric; v_open numeric; v_net numeric; v_id uuid;
BEGIN
  IF NOT public.is_manager_or_admin() THEN RAISE EXCEPTION 'Không có quyền chốt lương' USING ERRCODE='42501'; END IF;
  IF p_period IS NULL THEN RAISE EXCEPTION 'Chọn kỳ lương' USING ERRCODE='23514'; END IF;
  PERFORM 1 FROM public.employees WHERE id=p_employee_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nhân viên không tồn tại' USING ERRCODE='23503'; END IF;
  SELECT id INTO v_id FROM public.payroll_settlements WHERE employee_id=p_employee_id AND period=v_period;
  IF FOUND THEN RETURN v_id; END IF;
  IF EXISTS (SELECT 1 FROM public.payroll_settlements WHERE employee_id=p_employee_id AND period>v_period) THEN
    RAISE EXCEPTION 'Đã chốt kỳ sau, không thể chốt lùi kỳ' USING ERRCODE='23514'; END IF;
  PERFORM 1 FROM public.attendance WHERE employee_id=p_employee_id AND date<v_end AND payment_status<>'paid' FOR UPDATE;
  v_open:=public.payroll_opening_balance(p_employee_id,v_period);
  IF NOT EXISTS (SELECT 1 FROM public.attendance WHERE employee_id=p_employee_id AND date>=v_period AND date<v_end) AND v_open=0 THEN
    RAISE EXCEPTION 'Không có dữ liệu công hoặc số dư chuyển kỳ' USING ERRCODE='P0001'; END IF;
  SELECT coalesce(sum(round(work_shift*daily_pay+coalesce(overtime_hours,0)*daily_pay*overtime_multiplier/8)),0),coalesce(sum(advance_pay),0)
    INTO v_gross,v_advance FROM public.attendance WHERE employee_id=p_employee_id AND date>=v_period AND date<v_end;
  SELECT coalesce(sum(net_pay),0) INTO v_net FROM public.attendance
    WHERE employee_id=p_employee_id AND date>=v_period AND date<v_end AND payment_status<>'paid';
  -- Amount already paid manually in this month is excluded from the settlement cash.
  INSERT INTO public.payroll_settlements(employee_id,period,gross_amount,advance_amount,net_amount,opening_balance,cash_paid,closing_balance,paid_by)
    VALUES(p_employee_id,v_period,v_gross,v_advance,v_net,v_open,greatest(v_open+v_net,0),least(v_open+v_net,0),public.current_user_id()) RETURNING id INTO v_id;
  UPDATE public.attendance SET payment_status='paid',paid_at=now(),paid_by=public.current_user_id(),payroll_settlement_id=v_id
    WHERE employee_id=p_employee_id AND date<v_end AND payment_status<>'paid';
  RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.guard_settled_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_employee uuid; v_date date; BEGIN
  v_employee:=CASE WHEN TG_OP='DELETE' THEN OLD.employee_id ELSE NEW.employee_id END;
  v_date:=CASE WHEN TG_OP='DELETE' THEN OLD.date ELSE NEW.date END;
  PERFORM 1 FROM public.employees WHERE id IN (v_employee,CASE WHEN TG_OP='UPDATE' THEN OLD.employee_id ELSE v_employee END) ORDER BY id FOR UPDATE;
  IF TG_OP='INSERT' AND NEW.payroll_settlement_id IS NOT NULL THEN RAISE EXCEPTION 'Chốt lương qua chức năng chốt kỳ' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND NEW.payroll_settlement_id IS DISTINCT FROM OLD.payroll_settlement_id THEN
    IF OLD.payment_status='paid' OR NEW.payroll_settlement_id IS NULL OR NEW.payment_status<>'paid'
      OR NOT EXISTS (SELECT 1 FROM public.payroll_settlements WHERE id=NEW.payroll_settlement_id AND employee_id=NEW.employee_id AND period>=date_trunc('month',NEW.date)::date) THEN
      RAISE EXCEPTION 'Không được thay đổi liên kết quyết toán lương' USING ERRCODE='23514'; END IF;
  END IF;
  IF TG_OP='UPDATE' AND NEW.employee_id IS NOT DISTINCT FROM OLD.employee_id AND NEW.date=OLD.date
    AND NEW.work_shift=OLD.work_shift AND NEW.daily_pay=OLD.daily_pay
    AND NEW.overtime_hours IS NOT DISTINCT FROM OLD.overtime_hours AND NEW.advance_pay=OLD.advance_pay
    AND NEW.overtime_multiplier IS NOT DISTINCT FROM OLD.overtime_multiplier AND NEW.payment_status='paid' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.payroll_settlements WHERE employee_id=v_employee AND period>=date_trunc('month',v_date)::date)
    OR (TG_OP='UPDATE' AND EXISTS (SELECT 1 FROM public.payroll_settlements WHERE employee_id=OLD.employee_id AND period>=date_trunc('month',OLD.date)::date)) THEN
    RAISE EXCEPTION 'Kỳ lương đã chốt hoặc đã chuyển vào kỳ sau, không thể sửa công hoặc tạm ứng' USING ERRCODE='23514'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;

ALTER TABLE public.grinding ADD COLUMN loss_category text NOT NULL DEFAULT 'unclassified', ADD COLUMN loss_notes text;
ALTER TABLE public.grinding ADD CONSTRAINT grinding_loss_category_check CHECK (loss_category IN ('unclassified','sorting','moisture','machine','transport','other'));
CREATE OR REPLACE FUNCTION public.validate_grinding_loss()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.input_qty_kg>NEW.output_qty_kg AND NEW.loss_category='unclassified' THEN
    RAISE EXCEPTION 'Chọn nguyên nhân hao hụt trước khi lưu' USING ERRCODE='23514'; END IF;
  IF NEW.loss_category='other' AND nullif(btrim(NEW.loss_notes),'') IS NULL THEN
    RAISE EXCEPTION 'Ghi rõ nguyên nhân hao hụt khác' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_grinding_loss BEFORE INSERT OR UPDATE OF input_qty_kg,output_qty_kg,loss_category,loss_notes ON public.grinding FOR EACH ROW EXECUTE FUNCTION public.validate_grinding_loss();

CREATE OR REPLACE FUNCTION public.validate_grinding_lot()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_qty numeric; v_used numeric; BEGIN
  PERFORM 1 FROM public.imports WHERE id IN (NEW.import_id,CASE WHEN TG_OP='UPDATE' THEN OLD.import_id ELSE NEW.import_id END) ORDER BY id FOR UPDATE;
  IF NEW.deleted_at IS NOT NULL OR NEW.import_id IS NULL THEN RETURN NEW; END IF;
  SELECT quantity_kg INTO v_qty FROM public.imports WHERE id=NEW.import_id AND deleted_at IS NULL AND coalesce(import_type,'nvl')='nvl';
  IF NOT FOUND THEN RAISE EXCEPTION 'Lô xay phải là phiếu nhập nguyên liệu còn hiệu lực' USING ERRCODE='23514'; END IF;
  SELECT coalesce(sum(input_qty_kg),0) INTO v_used FROM public.grinding WHERE import_id=NEW.import_id AND deleted_at IS NULL AND id IS DISTINCT FROM NEW.id;
  IF v_used+NEW.input_qty_kg>v_qty THEN RAISE EXCEPTION 'Tổng lượng đưa vào xay vượt khối lượng lô nhập' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_grinding_lot BEFORE INSERT OR UPDATE OF import_id,input_qty_kg,deleted_at ON public.grinding FOR EACH ROW EXECUTE FUNCTION public.validate_grinding_lot();
REVOKE ALL ON FUNCTION public.validate_grinding_lot() FROM PUBLIC,anon,authenticated;

-- Match legacy paid documents to the shared client debt formula without inventing cash receipts.
CREATE OR REPLACE VIEW public.v_import_debts WITH (security_invoker=true) AS
  SELECT i.id ref_id,'import'::text ref_type,i.date,i.contact_id,i.total_amount,coalesce(p.paid_amount,0) paid_amount,
    CASE WHEN i.payment_status='paid' AND coalesce(p.paid_amount,0)=0 THEN 0 ELSE greatest(i.total_amount-coalesce(p.paid_amount,0),0) END remaining_amount
  FROM public.imports i LEFT JOIN (SELECT ref_id,sum(amount) paid_amount FROM public.payments WHERE ref_type='import' GROUP BY ref_id) p ON p.ref_id=i.id;
CREATE OR REPLACE VIEW public.v_export_debts WITH (security_invoker=true) AS
  SELECT e.id ref_id,'export'::text ref_type,e.date,e.contact_id,e.total_amount,coalesce(p.paid_amount,0) paid_amount,
    CASE WHEN e.payment_status='paid' AND coalesce(p.paid_amount,0)=0 THEN 0 ELSE greatest(e.total_amount-coalesce(p.paid_amount,0),0) END remaining_amount
  FROM public.exports e LEFT JOIN (SELECT ref_id,sum(amount) paid_amount FROM public.payments WHERE ref_type='export' GROUP BY ref_id) p ON p.ref_id=e.id;

CREATE OR REPLACE FUNCTION public.guard_payroll_settlement()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_gross numeric; v_advance numeric; v_net numeric; v_open numeric; BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Phiếu chốt lương không được sửa hoặc xoá' USING ERRCODE='23514'; END IF;
  PERFORM 1 FROM public.employees WHERE id=NEW.employee_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.payroll_settlements WHERE employee_id=NEW.employee_id AND period>NEW.period) THEN RAISE EXCEPTION 'Không được chốt lùi kỳ' USING ERRCODE='23514'; END IF;
  SELECT coalesce(sum(round(work_shift*daily_pay+coalesce(overtime_hours,0)*daily_pay*overtime_multiplier/8)),0),coalesce(sum(advance_pay),0),coalesce(sum(net_pay) FILTER (WHERE payment_status<>'paid'),0)
    INTO v_gross,v_advance,v_net FROM public.attendance WHERE employee_id=NEW.employee_id AND date>=NEW.period AND date<(NEW.period+interval '1 month')::date;
  v_open:=public.payroll_opening_balance(NEW.employee_id,NEW.period);
  IF NEW.gross_amount<>v_gross OR NEW.advance_amount<>v_advance OR NEW.net_amount<>v_net OR NEW.opening_balance<>v_open
    OR NEW.cash_paid<>greatest(v_open+v_net,0) OR NEW.closing_balance<>least(v_open+v_net,0) THEN
    RAISE EXCEPTION 'Số tiền chốt không khớp bảng công và số dư chuyển kỳ' USING ERRCODE='23514'; END IF;
  NEW.paid_at:=now(); NEW.paid_by:=public.current_user_id(); RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_payroll_settlement BEFORE INSERT OR UPDATE OR DELETE ON public.payroll_settlements FOR EACH ROW EXECUTE FUNCTION public.guard_payroll_settlement();
REVOKE ALL ON FUNCTION public.guard_payroll_settlement() FROM PUBLIC,anon,authenticated;

-- Inventory formula and inputs for reconciliation, from the same snapshot as the stock RPC.
CREATE OR REPLACE FUNCTION public.get_reconciliation_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v jsonb; BEGIN
  IF NOT public.has_any_role() THEN RAISE EXCEPTION 'Không có quyền đối soát' USING ERRCODE='42501'; END IF;
  v:=jsonb_build_object('inventory',public.get_inventory_summary(),
    'rawImported',(SELECT coalesce(sum(quantity_kg),0) FROM public.imports WHERE deleted_at IS NULL AND coalesce(import_type,'nvl')='nvl'),
    'rawExported',(SELECT coalesce(sum(total_kg),0) FROM public.exports WHERE deleted_at IS NULL AND export_type='nvl'),
    'grindingInput',(SELECT coalesce(sum(input_qty_kg),0) FROM public.grinding WHERE deleted_at IS NULL),
    'unlinkedLots',(SELECT count(*) FROM public.grinding WHERE deleted_at IS NULL AND import_id IS NULL),
    'zeroLossLots',(SELECT count(*) FROM public.grinding WHERE deleted_at IS NULL AND input_qty_kg=output_qty_kg),
    'lossUnclassified',(SELECT count(*) FROM public.grinding WHERE deleted_at IS NULL AND input_qty_kg>output_qty_kg AND loss_category='unclassified'));
  IF public.is_manager_or_admin() THEN
    v:=v||jsonb_build_object('unclassifiedAdvances',(SELECT coalesce(sum(outstanding_amount),0) FROM public.v_advance_balances WHERE purpose='unclassified' AND type IN ('advance','ung')),
      'advanceOutstanding',(SELECT coalesce(sum(outstanding_amount),0) FROM public.v_advance_balances WHERE type IN ('advance','ung')),
      'employeesWithoutSalary',(SELECT count(*) FROM public.employees WHERE status='active' AND daily_salary<=0));
  END IF; RETURN v;
END $$;

-- Cash movement only. A funded document is not a second cash outflow after its advance.
CREATE OR REPLACE FUNCTION public.get_cash_flow(p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v jsonb; BEGIN
  IF NOT public.is_manager_or_admin() THEN RAISE EXCEPTION 'Không có quyền xem dòng tiền' USING ERRCODE='42501'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to<p_from THEN RAISE EXCEPTION 'Khoảng ngày không hợp lệ' USING ERRCODE='23514'; END IF;
  WITH movements AS (
    SELECT date,CASE WHEN ref_type='export' THEN 'receipts' ELSE 'materials' END category,
      CASE WHEN ref_type='export' THEN amount ELSE -amount END amount FROM public.payments WHERE advance_id IS NULL
    UNION ALL SELECT date,'expenses',-amount FROM public.expenses WHERE advance_id IS NULL
    UNION ALL SELECT date,CASE WHEN type IN ('advance','ung') THEN 'advances' ELSE 'returns' END,
      CASE WHEN type IN ('advance','ung') THEN -amount ELSE amount END FROM public.advances
    UNION ALL SELECT date,'payroll_advances',-advance_pay FROM public.attendance WHERE advance_id IS NULL AND advance_pay>0
    UNION ALL SELECT (paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'payroll',-cash_paid FROM public.payroll_settlements WHERE cash_paid>0
    UNION ALL SELECT (a.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'manual_payroll',-greatest(a.net_pay,0)
      FROM public.attendance a WHERE a.payment_status='paid' AND a.paid_at IS NOT NULL AND a.payroll_settlement_id IS NULL
  ), totals AS (SELECT category,sum(amount) amount FROM movements WHERE date BETWEEN p_from AND p_to GROUP BY category)
  SELECT jsonb_build_object('categories',coalesce(jsonb_object_agg(category,amount),'{}'::jsonb),
    'inflow',coalesce(sum(greatest(amount,0)),0),'outflow',coalesce(-sum(least(amount,0)),0),'net',coalesce(sum(amount),0)) INTO v FROM totals;
  RETURN v;
END $$;

REVOKE ALL ON FUNCTION public.payroll_opening_balance(uuid,date),public.get_payroll_balances(date),public.get_reconciliation_status(),public.get_cash_flow(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.payroll_opening_balance(uuid,date),public.get_payroll_balances(date),public.get_reconciliation_status(),public.get_cash_flow(date,date) TO authenticated;
REVOKE ALL ON FUNCTION public.validate_grinding_loss() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard_snapshot(p_today date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v jsonb; v_inventory jsonb; v_finance boolean; v_revenue numeric; v_import_cost numeric;
  v_operating numeric; v_receivable numeric; v_payable numeric; v_overdue numeric; v_monthly jsonb;
BEGIN
  IF NOT public.has_any_role() THEN RAISE EXCEPTION 'Không có quyền xem tổng quan' USING ERRCODE='42501'; END IF;
  IF p_today IS NULL THEN RAISE EXCEPTION 'Thiếu ngày tổng quan' USING ERRCODE='23514'; END IF;
  v_finance:=public.is_manager_or_admin(); v_inventory:=public.get_inventory_summary();
  SELECT coalesce(sum(total_amount),0) INTO v_revenue FROM public.exports WHERE deleted_at IS NULL;
  SELECT coalesce(sum(total_amount),0) INTO v_import_cost FROM public.imports WHERE deleted_at IS NULL;
  v_operating:=0; v_receivable:=0; v_payable:=0; v_overdue:=0;
  IF v_finance THEN
    SELECT (SELECT coalesce(sum(amount),0) FROM public.expenses)+
      (SELECT coalesce(sum(round(work_shift*daily_pay+coalesce(overtime_hours,0)*daily_pay*overtime_multiplier/8)),0) FROM public.attendance) INTO v_operating;
    SELECT coalesce(sum(d.remaining_amount),0),coalesce(sum(d.remaining_amount) FILTER (WHERE e.date<=p_today-30),0)
      INTO v_receivable,v_overdue FROM public.v_export_debts d JOIN public.exports e ON e.id=d.ref_id WHERE e.deleted_at IS NULL;
    SELECT coalesce(sum(d.remaining_amount),0) INTO v_payable FROM public.v_import_debts d JOIN public.imports i ON i.id=d.ref_id WHERE i.deleted_at IS NULL;
  END IF;
  WITH months AS (SELECT generate_series(date_trunc('month',p_today)-interval '11 months',date_trunc('month',p_today),interval '1 month')::date m),
  i AS (SELECT date_trunc('month',date)::date m,sum(quantity_kg) kg,sum(total_amount) cost FROM public.imports WHERE deleted_at IS NULL AND date>=date_trunc('month',p_today)-interval '11 months' GROUP BY 1),
  e AS (SELECT date_trunc('month',date)::date m,sum(total_kg) kg,sum(bags_count) bags,sum(total_amount) revenue FROM public.exports WHERE deleted_at IS NULL AND date>=date_trunc('month',p_today)-interval '11 months' GROUP BY 1),
  g AS (SELECT date_trunc('month',date)::date m,sum(output_qty_kg) kg FROM public.grinding WHERE deleted_at IS NULL AND date>=date_trunc('month',p_today)-interval '11 months' GROUP BY 1),
  x AS (SELECT date_trunc('month',date)::date m,sum(amount) cost FROM public.expenses WHERE v_finance AND date>=date_trunc('month',p_today)-interval '11 months' GROUP BY 1),
  a AS (SELECT date_trunc('month',date)::date m,sum(round(work_shift*daily_pay+coalesce(overtime_hours,0)*daily_pay*overtime_multiplier/8)) cost FROM public.attendance WHERE v_finance AND date>=date_trunc('month',p_today)-interval '11 months' GROUP BY 1)
  SELECT jsonb_agg(jsonb_build_object('month',to_char(months.m,'YYYY-MM'),'label','Thg '||to_char(months.m,'MM/YY'),'shortLabel','T'||extract(month FROM months.m),
    'importKg',coalesce(i.kg,0),'groundKg',coalesce(g.kg,0),'exportKg',coalesce(e.kg,0),'exportBags',coalesce(e.bags,0),
    'importCost',CASE WHEN v_finance THEN coalesce(i.cost,0) ELSE 0 END,'revenue',CASE WHEN v_finance THEN coalesce(e.revenue,0) ELSE 0 END,
    'operatingCost',coalesce(x.cost,0)+coalesce(a.cost,0),'profit',CASE WHEN v_finance THEN coalesce(e.revenue,0)-coalesce(i.cost,0)-coalesce(x.cost,0)-coalesce(a.cost,0) ELSE 0 END) ORDER BY months.m)
    INTO v_monthly FROM months LEFT JOIN i USING(m) LEFT JOIN e USING(m) LEFT JOIN g USING(m) LEFT JOIN x USING(m) LEFT JOIN a USING(m);
  v:=jsonb_build_object('monthly',v_monthly,'summary',jsonb_build_object(
    'todayImportKg',(SELECT coalesce(sum(quantity_kg),0) FROM public.imports WHERE deleted_at IS NULL AND date=p_today),
    'todayGroundKg',(SELECT coalesce(sum(output_qty_kg),0) FROM public.grinding WHERE deleted_at IS NULL AND date=p_today),
    'todayExportBags',(SELECT coalesce(sum(bags_count),0) FROM public.exports WHERE deleted_at IS NULL AND date=p_today),
    'totalImportKg',(SELECT coalesce(sum(quantity_kg),0) FROM public.imports WHERE deleted_at IS NULL),
    'totalExportKg',(SELECT coalesce(sum(total_kg),0) FROM public.exports WHERE deleted_at IS NULL),
    'totalImportCost',CASE WHEN v_finance THEN v_import_cost ELSE 0 END,'totalRevenue',CASE WHEN v_finance THEN v_revenue ELSE 0 END,
    'totalOperatingCost',CASE WHEN v_finance THEN v_operating ELSE NULL END,'estimatedProfit',CASE WHEN v_finance THEN v_revenue-v_import_cost-v_operating ELSE NULL END,
    'receivables',v_receivable,'payables',v_payable,'inventoryKg',(v_inventory->>'currentStockKg')::numeric,'inventoryBags',(v_inventory->>'currentBags')::numeric,
    'pendingImportCount',(SELECT count(*) FROM public.imports WHERE deleted_at IS NULL AND processing_status='pending' AND coalesce(import_type,'nvl')='nvl'),
    'pendingImports',(SELECT coalesce(jsonb_agg(t),'[]'::jsonb) FROM (SELECT i.id,i.quantity_kg,coalesce(c.name,'Khách lẻ') contact_name FROM public.imports i LEFT JOIN public.contacts c ON c.id=i.contact_id WHERE i.deleted_at IS NULL AND i.processing_status='pending' AND coalesce(i.import_type,'nvl')='nvl' ORDER BY i.date,i.id LIMIT 2)t),
    'unpaidExports',CASE WHEN v_receivable>0 THEN '[{}]'::jsonb ELSE '[]'::jsonb END,'totalUnpaidReceivables',v_receivable,
    'overdueReceivables',CASE WHEN v_overdue>0 THEN '[{}]'::jsonb ELSE '[]'::jsonb END,'totalOverdueReceivables',v_overdue,
    'overdueCount',CASE WHEN v_finance THEN (SELECT count(*) FROM public.v_export_debts d JOIN public.exports e ON e.id=d.ref_id WHERE e.deleted_at IS NULL AND e.date<=p_today-30 AND d.remaining_amount>0) ELSE 0 END,
    'lowStockAlert',coalesce((SELECT value::numeric FROM public.settings WHERE key='low_stock_threshold_kg'),0)>0 AND (v_inventory->>'currentStockKg')::numeric<coalesce((SELECT value::numeric FROM public.settings WHERE key='low_stock_threshold_kg'),0),
    'recentActivities',(SELECT coalesce(jsonb_agg(t ORDER BY t.date DESC),'[]'::jsonb) FROM (
      SELECT * FROM (
        (SELECT 'import-'||i.id id,'import' type,'Nhập từ '||coalesce(c.name,'Khách lẻ') text,i.created_at date,i.quantity_kg amount,'kg' unit FROM public.imports i LEFT JOIN public.contacts c ON c.id=i.contact_id WHERE i.deleted_at IS NULL ORDER BY i.created_at DESC LIMIT 5)
        UNION ALL (SELECT 'export-'||e.id,'export','Xuất cho '||coalesce(c.name,'Khách lẻ'),e.created_at,-e.total_kg,'kg' FROM public.exports e LEFT JOIN public.contacts c ON c.id=e.contact_id WHERE e.deleted_at IS NULL ORDER BY e.created_at DESC LIMIT 5)
        UNION ALL (SELECT 'expense-'||id,'expense',coalesce(description,category),created_at,-amount,'đ' FROM public.expenses WHERE v_finance ORDER BY created_at DESC LIMIT 5)
      ) activities ORDER BY date DESC LIMIT 5) t)));
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.get_dashboard_snapshot(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_snapshot(date) TO authenticated;

CREATE TABLE public.app_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id),
  message text NOT NULL CHECK (length(message)<=500), context text CHECK (length(context)<=100),
  path text CHECK (length(path)<=200), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_error_logs_created_at_idx ON public.app_error_logs(created_at DESC);
CREATE INDEX app_error_logs_user_id_idx ON public.app_error_logs(user_id);
ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON public.app_error_logs TO authenticated;
REVOKE ALL ON public.app_error_logs FROM anon;
CREATE POLICY app_error_logs_select ON public.app_error_logs FOR SELECT TO authenticated
  USING (user_id=(SELECT public.current_user_id()) OR (SELECT public.is_admin()));
CREATE POLICY app_error_logs_insert ON public.app_error_logs FOR INSERT TO authenticated
  WITH CHECK (user_id=(SELECT public.current_user_id()));
CREATE OR REPLACE FUNCTION public.guard_app_error_log()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
  IF NOT public.has_any_role() OR NEW.user_id IS DISTINCT FROM public.current_user_id() THEN
    RAISE EXCEPTION 'Không có quyền ghi nhật ký lỗi' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));
  IF (SELECT count(*) FROM public.app_error_logs WHERE user_id=NEW.user_id AND created_at>now()-interval '1 minute')>=10 THEN
    RAISE EXCEPTION 'Đã đạt giới hạn nhật ký lỗi' USING ERRCODE='23514'; END IF;
  NEW.created_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_app_error_log BEFORE INSERT ON public.app_error_logs FOR EACH ROW EXECUTE FUNCTION public.guard_app_error_log();
REVOKE ALL ON FUNCTION public.guard_app_error_log() FROM PUBLIC,anon,authenticated;
