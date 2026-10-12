BEGIN;
ALTER TABLE public.advances
  ADD COLUMN purpose text NOT NULL DEFAULT 'unclassified' CHECK (purpose IN ('unclassified','workshop','materials','payroll','other')),
  ADD COLUMN employee_id uuid REFERENCES public.employees(id) ON DELETE RESTRICT,
  ADD COLUMN original_advance_id uuid REFERENCES public.advances(id) ON DELETE RESTRICT;
ALTER TABLE public.expenses ADD COLUMN advance_id uuid REFERENCES public.advances(id) ON DELETE RESTRICT;
ALTER TABLE public.payments ADD COLUMN advance_id uuid REFERENCES public.advances(id) ON DELETE RESTRICT;
ALTER TABLE public.attendance ADD COLUMN advance_id uuid UNIQUE REFERENCES public.advances(id) ON DELETE RESTRICT;
CREATE INDEX expenses_advance_idx ON public.expenses(advance_id) WHERE advance_id IS NOT NULL;
CREATE INDEX payments_advance_idx ON public.payments(advance_id) WHERE advance_id IS NOT NULL;
CREATE INDEX advances_original_idx ON public.advances(original_advance_id) WHERE original_advance_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.advance_used_amount(p_id uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT coalesce((SELECT sum(amount) FROM public.expenses WHERE advance_id=p_id),0)
      + coalesce((SELECT sum(amount) FROM public.payments WHERE advance_id=p_id),0)
      + coalesce((SELECT sum(advance_pay) FROM public.attendance WHERE advance_id=p_id),0)
      + coalesce((SELECT sum(amount) FROM public.advances WHERE original_advance_id=p_id AND type IN ('settlement','hoan')),0);
$$;

CREATE OR REPLACE FUNCTION public.guard_advance_classification() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE origin public.advances; used numeric;
BEGIN
 IF NEW.amount<=0 THEN RAISE EXCEPTION 'Số tiền phải lớn hơn 0' USING ERRCODE='23514'; END IF;
 IF NEW.type IN ('advance','ung') THEN
  IF NEW.original_advance_id IS NOT NULL THEN RAISE EXCEPTION 'Phiếu ứng không được có phiếu ứng gốc' USING ERRCODE='23514'; END IF;
  IF NEW.employee_id IS NOT NULL AND NEW.purpose<>'payroll' THEN RAISE EXCEPTION 'Nhân sự chỉ dành cho ứng lương' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' THEN
   used:=public.advance_used_amount(OLD.id);
   IF used>NEW.amount THEN RAISE EXCEPTION 'Số tiền thấp hơn phần đã đối soát/hoàn ứng' USING ERRCODE='23514'; END IF;
   IF used>0 AND (NEW.type IS DISTINCT FROM OLD.type OR NEW.purpose IS DISTINCT FROM OLD.purpose OR NEW.employee_id IS DISTINCT FROM OLD.employee_id OR NEW.date IS DISTINCT FROM OLD.date) THEN
    RAISE EXCEPTION 'Khoản đã đối soát không được đổi loại, nhân sự hoặc ngày' USING ERRCODE='23514';
   END IF;
  END IF;
 ELSE
  IF NEW.original_advance_id IS NULL THEN
   IF TG_OP='INSERT' THEN RAISE EXCEPTION 'Hoàn ứng phải chọn phiếu ứng gốc' USING ERRCODE='23514'; END IF;
   IF OLD.original_advance_id IS NOT NULL THEN RAISE EXCEPTION 'Không được bỏ liên kết hoàn ứng' USING ERRCODE='23514'; END IF;
   RETURN NEW; -- Legacy refunds remain visible until classified.
  END IF;
  IF NEW.original_advance_id=NEW.id THEN RAISE EXCEPTION 'Không được tự hoàn ứng' USING ERRCODE='23514'; END IF;
  SELECT * INTO origin FROM public.advances WHERE id=NEW.original_advance_id FOR UPDATE;
  IF NOT FOUND OR origin.type NOT IN ('advance','ung') THEN RAISE EXCEPTION 'Phiếu ứng gốc không hợp lệ' USING ERRCODE='23514'; END IF;
  IF NEW.date<origin.date THEN RAISE EXCEPTION 'Ngày hoàn trước ngày ứng' USING ERRCODE='23514'; END IF;
  NEW.purpose:=origin.purpose; NEW.employee_id:=origin.employee_id;
  used:=public.advance_used_amount(origin.id);
  IF TG_OP='UPDATE' AND OLD.original_advance_id=origin.id THEN used:=used-OLD.amount; END IF;
  IF used+NEW.amount>origin.amount THEN RAISE EXCEPTION 'Hoàn ứng vượt phần còn lại' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND OLD.type IN ('advance','ung') AND public.advance_used_amount(OLD.id)>0 THEN RAISE EXCEPTION 'Phiếu ứng đã đối soát không được đổi thành hoàn ứng' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_advance_classification BEFORE INSERT OR UPDATE ON public.advances
FOR EACH ROW EXECUTE FUNCTION public.guard_advance_classification();

CREATE OR REPLACE FUNCTION public.guard_advance_allocation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE origin public.advances; used numeric; new_amount numeric; old_amount numeric:=0;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.advance_id IS NOT NULL THEN RAISE EXCEPTION 'Gỡ đối soát trước khi xóa chứng từ' USING ERRCODE='23514'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND OLD.advance_id IS NOT NULL AND NEW.advance_id IS DISTINCT FROM OLD.advance_id AND NEW.advance_id IS NOT NULL THEN
  RAISE EXCEPTION 'Gỡ đối soát trước khi đổi nguồn ứng' USING ERRCODE='23514';
 END IF;
 IF NEW.advance_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO origin FROM public.advances WHERE id=NEW.advance_id FOR UPDATE;
 IF NOT FOUND OR origin.type NOT IN ('advance','ung') THEN RAISE EXCEPTION 'Nguồn ứng không hợp lệ' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='expenses' THEN
  IF origin.purpose NOT IN ('workshop','other') THEN RAISE EXCEPTION 'Phiếu chi chỉ dùng ứng chi xưởng/khác' USING ERRCODE='23514'; END IF;
  new_amount:=NEW.amount;
  IF TG_OP='UPDATE' AND OLD.advance_id=origin.id THEN old_amount:=OLD.amount; END IF;
 ELSIF TG_TABLE_NAME='payments' THEN
  IF origin.purpose<>'materials' OR NEW.ref_type<>'import' THEN RAISE EXCEPTION 'Ứng mua nguyên liệu chỉ đối soát thanh toán phiếu nhập' USING ERRCODE='23514'; END IF;
  new_amount:=NEW.amount;
  IF TG_OP='UPDATE' AND OLD.advance_id=origin.id THEN old_amount:=OLD.amount; END IF;
 ELSE
  IF origin.purpose<>'payroll' OR origin.employee_id IS NULL OR NEW.employee_id IS DISTINCT FROM origin.employee_id THEN RAISE EXCEPTION 'Ứng lương phải khớp nhân sự đã chọn' USING ERRCODE='23514'; END IF;
  new_amount:=NEW.advance_pay;
  IF TG_OP='UPDATE' AND OLD.advance_id=origin.id THEN old_amount:=OLD.advance_pay; END IF;
 END IF;
 used:=public.advance_used_amount(origin.id)-old_amount;
 IF new_amount<=0 OR used+new_amount>origin.amount THEN RAISE EXCEPTION 'Đối soát vượt số tiền ứng còn lại hoặc số tiền bằng 0' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_expense_advance BEFORE INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.guard_advance_allocation();
CREATE TRIGGER guard_payment_advance BEFORE INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.guard_advance_allocation();
CREATE TRIGGER guard_attendance_advance BEFORE INSERT OR UPDATE OR DELETE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.guard_advance_allocation();

CREATE VIEW public.v_advance_balances WITH (security_invoker=true) AS
 SELECT a.*,
 coalesce((SELECT sum(e.amount) FROM public.expenses e WHERE e.advance_id=a.id),0)
 +coalesce((SELECT sum(p.amount) FROM public.payments p WHERE p.advance_id=a.id),0)
 +coalesce((SELECT sum(t.advance_pay) FROM public.attendance t WHERE t.advance_id=a.id),0) AS accounted_amount,
 coalesce((SELECT sum(r.amount) FROM public.advances r WHERE r.original_advance_id=a.id AND r.type IN ('settlement','hoan')),0) AS returned_amount,
 CASE WHEN a.type IN ('advance','ung') THEN a.amount-public.advance_used_amount(a.id) ELSE 0 END AS outstanding_amount
 FROM public.advances a;
GRANT SELECT ON public.v_advance_balances TO authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_advance(p_advance_id uuid,p_ref_type text,p_ref_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE origin public.advances; target_id uuid; existing_source uuid; remaining numeric;
BEGIN
 IF NOT public.is_manager_or_admin() THEN RAISE EXCEPTION 'Không có quyền đối soát ứng' USING ERRCODE='42501'; END IF;
 SELECT * INTO origin FROM public.advances WHERE id=p_advance_id FOR UPDATE;
 IF NOT FOUND OR origin.type NOT IN ('advance','ung') THEN RAISE EXCEPTION 'Phiếu ứng không hợp lệ' USING ERRCODE='23514'; END IF;
 IF p_ref_type='payroll_new' THEN
  IF origin.purpose<>'payroll' OR origin.employee_id IS NULL THEN RAISE EXCEPTION 'Chọn nhân sự cho khoản ứng lương trước' USING ERRCODE='23514'; END IF;
  SELECT id INTO target_id FROM public.attendance WHERE advance_id=origin.id;
  IF FOUND THEN RETURN target_id; END IF;
  remaining:=origin.amount-public.advance_used_amount(origin.id);
  IF remaining<=0 THEN RAISE EXCEPTION 'Khoản ứng không còn số dư' USING ERRCODE='23514'; END IF;
  INSERT INTO public.attendance(date,employee_id,work_shift,daily_pay,overtime_hours,advance_pay,payment_status,advance_id,notes)
  VALUES(origin.date,origin.employee_id,0,0,0,remaining,'unpaid',origin.id,'Ứng lương từ sổ ứng tiền') RETURNING id INTO target_id;
  RETURN target_id;
 END IF;
 IF p_ref_id IS NULL THEN RAISE EXCEPTION 'Chọn chứng từ đối soát' USING ERRCODE='23514'; END IF;
 IF p_ref_type='expense' THEN
  SELECT advance_id INTO existing_source FROM public.expenses WHERE id=p_ref_id FOR UPDATE;
 ELSIF p_ref_type='payment' THEN
  SELECT advance_id INTO existing_source FROM public.payments WHERE id=p_ref_id FOR UPDATE;
 ELSIF p_ref_type='attendance' THEN
  SELECT advance_id INTO existing_source FROM public.attendance WHERE id=p_ref_id FOR UPDATE;
 ELSE RAISE EXCEPTION 'Loại chứng từ không hợp lệ' USING ERRCODE='23514'; END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy chứng từ' USING ERRCODE='23514'; END IF;
 IF existing_source IS NOT NULL AND existing_source<>origin.id THEN RAISE EXCEPTION 'Chứng từ đã thuộc khoản ứng khác' USING ERRCODE='23514'; END IF;
 IF p_ref_type='expense' THEN UPDATE public.expenses SET advance_id=origin.id WHERE id=p_ref_id;
 ELSIF p_ref_type='payment' THEN UPDATE public.payments SET advance_id=origin.id WHERE id=p_ref_id;
 ELSE UPDATE public.attendance SET advance_id=origin.id WHERE id=p_ref_id; END IF;
 RETURN p_ref_id;
END; $$;
REVOKE ALL ON FUNCTION public.reconcile_advance(uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_advance(uuid,text,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.advance_used_amount(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_used_amount(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.guard_advance_classification() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_advance_allocation() FROM PUBLIC,anon,authenticated;
COMMIT;
