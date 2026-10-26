-- Full-stack RBAC synchronization for HR/Finance RPCs + atomic bulk FIFO partner payment RPC.
BEGIN;

CREATE OR REPLACE FUNCTION public.payroll_opening_balance(p_employee_id uuid, p_period date)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_last date;
  v_balance numeric;
  v_unpaid numeric;
BEGIN
  IF NOT (
    public.has_permission('hr.view')
    OR public.has_permission('hr.manage')
    OR public.is_manager_or_admin()
  ) THEN
    RAISE EXCEPTION 'Không có quyền xem lương' USING ERRCODE = '42501';
  END IF;

  SELECT period, closing_balance
  INTO v_last, v_balance
  FROM public.payroll_settlements
  WHERE employee_id = p_employee_id
    AND period < date_trunc('month', p_period)::date
  ORDER BY period DESC
  LIMIT 1;

  SELECT coalesce(sum(net_pay), 0)
  INTO v_unpaid
  FROM public.attendance
  WHERE employee_id = p_employee_id
    AND date < date_trunc('month', p_period)::date
    AND payment_status <> 'paid'
    AND (v_last IS NULL OR date >= (v_last + interval '1 month')::date);

  RETURN coalesce(v_balance, 0) + v_unpaid;
END $$;

CREATE OR REPLACE FUNCTION public.get_payroll_balances(p_period date)
RETURNS TABLE(
  employee_id uuid,
  name text,
  opening_balance numeric,
  settled boolean,
  cash_paid numeric,
  closing_balance numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT (
    public.has_permission('hr.view')
    OR public.has_permission('hr.manage')
    OR public.is_manager_or_admin()
  ) THEN
    RAISE EXCEPTION 'Không có quyền xem lương' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT
      e.id,
      e.name,
      coalesce(s.opening_balance, public.payroll_opening_balance(e.id, p_period)),
      s.id IS NOT NULL,
      coalesce(s.cash_paid, 0),
      coalesce(s.closing_balance, 0)
    FROM public.employees e
    LEFT JOIN public.payroll_settlements s
      ON s.employee_id = e.id
      AND s.period = date_trunc('month', p_period)::date;
END $$;

CREATE OR REPLACE FUNCTION public.settle_employee_payroll(p_employee_id uuid, p_period date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_period date := date_trunc('month', p_period)::date;
  v_end date := (v_period + interval '1 month')::date;
  v_gross numeric;
  v_advance numeric;
  v_open numeric;
  v_net numeric;
  v_id uuid;
BEGIN
  IF NOT (public.has_permission('hr.manage') OR public.is_admin()) THEN
    RAISE EXCEPTION 'Không có quyền chốt lương' USING ERRCODE = '42501';
  END IF;

  IF p_period IS NULL THEN
    RAISE EXCEPTION 'Chọn kỳ lương' USING ERRCODE = '23514';
  END IF;

  PERFORM 1 FROM public.employees WHERE id = p_employee_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nhân viên không tồn tại' USING ERRCODE = '23503';
  END IF;

  SELECT id INTO v_id
  FROM public.payroll_settlements
  WHERE employee_id = p_employee_id AND period = v_period;
  IF FOUND THEN
    RETURN v_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payroll_settlements
    WHERE employee_id = p_employee_id AND period > v_period
  ) THEN
    RAISE EXCEPTION 'Đã chốt kỳ sau, không thể chốt lùi kỳ' USING ERRCODE = '23514';
  END IF;

  PERFORM 1
  FROM public.attendance
  WHERE employee_id = p_employee_id
    AND date < v_end
    AND payment_status <> 'paid'
  FOR UPDATE;

  v_open := public.payroll_opening_balance(p_employee_id, v_period);

  IF NOT EXISTS (
    SELECT 1 FROM public.attendance
    WHERE employee_id = p_employee_id AND date >= v_period AND date < v_end
  ) AND v_open = 0 THEN
    RAISE EXCEPTION 'Không có dữ liệu công hoặc số dư chuyển kỳ' USING ERRCODE = 'P0001';
  END IF;

  SELECT
    coalesce(sum(round(work_shift * daily_pay + coalesce(overtime_hours, 0) * daily_pay * overtime_multiplier / 8)), 0),
    coalesce(sum(advance_pay), 0)
  INTO v_gross, v_advance
  FROM public.attendance
  WHERE employee_id = p_employee_id AND date >= v_period AND date < v_end;

  SELECT coalesce(sum(net_pay), 0)
  INTO v_net
  FROM public.attendance
  WHERE employee_id = p_employee_id
    AND date >= v_period
    AND date < v_end
    AND payment_status <> 'paid';

  INSERT INTO public.payroll_settlements(
    employee_id, period, gross_amount, advance_amount, net_amount,
    opening_balance, cash_paid, closing_balance, paid_by
  )
  VALUES(
    p_employee_id, v_period, v_gross, v_advance, v_net,
    v_open, greatest(v_open + v_net, 0), least(v_open + v_net, 0), public.current_user_id()
  )
  RETURNING id INTO v_id;

  UPDATE public.attendance
  SET payment_status = 'paid',
      paid_at = now(),
      paid_by = public.current_user_id(),
      payroll_settlement_id = v_id
  WHERE employee_id = p_employee_id
    AND date < v_end
    AND payment_status <> 'paid';

  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.get_cash_flow(p_from date, p_to date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT (
    public.has_permission('finance.view')
    OR public.has_permission('dashboard.finance.view')
    OR public.is_manager_or_admin()
  ) THEN
    RAISE EXCEPTION 'Không có quyền xem dòng tiền' USING ERRCODE = '42501';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN
    RAISE EXCEPTION 'Khoảng ngày không hợp lệ' USING ERRCODE = '23514';
  END IF;

  WITH movements AS (
    SELECT date, CASE WHEN ref_type = 'export' THEN 'receipts' ELSE 'materials' END category,
      CASE WHEN ref_type = 'export' THEN amount ELSE -amount END amount
    FROM public.payments WHERE advance_id IS NULL
    UNION ALL
    SELECT date, 'expenses', -amount FROM public.expenses WHERE advance_id IS NULL
    UNION ALL
    SELECT date, CASE WHEN type IN ('advance', 'ung') THEN 'advances' ELSE 'returns' END,
      CASE WHEN type IN ('advance', 'ung') THEN -amount ELSE amount END
    FROM public.advances
    UNION ALL
    SELECT date, 'payroll_advances', -advance_pay
    FROM public.attendance WHERE advance_id IS NULL AND advance_pay > 0
    UNION ALL
    SELECT (paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'payroll', -cash_paid
    FROM public.payroll_settlements WHERE cash_paid > 0
    UNION ALL
    SELECT (a.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'manual_payroll', -greatest(a.net_pay, 0)
    FROM public.attendance a
    WHERE a.payment_status = 'paid' AND a.paid_at IS NOT NULL AND a.payroll_settlement_id IS NULL
  ),
  totals AS (
    SELECT category, sum(amount) amount
    FROM movements
    WHERE date BETWEEN p_from AND p_to
    GROUP BY category
  )
  SELECT jsonb_build_object(
    'categories', coalesce(jsonb_object_agg(category, amount), '{}'::jsonb),
    'inflow', coalesce(sum(greatest(amount, 0)), 0),
    'outflow', coalesce(-sum(least(amount, 0)), 0),
    'net', coalesce(sum(amount), 0)
  )
  INTO v
  FROM totals;

  RETURN v;
END $$;

-- Atomic server-side bulk FIFO partner payment allocation
CREATE OR REPLACE FUNCTION public.record_bulk_partner_payment(
  p_contact_id uuid,
  p_ref_type text,
  p_total_amount numeric,
  p_date date,
  p_method text,
  p_advance_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  r record;
  v_paid numeric;
  v_doc_rem numeric;
  v_alloc numeric;
  v_rem numeric := round(coalesce(p_total_amount, 0));
  v_total_allocated numeric := 0;
  v_count integer := 0;
  v_payment_id uuid;
  v_payment_ids jsonb := '[]'::jsonb;
  v_base_note text := nullif(btrim(coalesce(p_notes, '')), '');
  v_note text;
BEGIN
  IF NOT public.has_permission('finance.record_payment') THEN
    RAISE EXCEPTION 'Không có quyền ghi nhận thanh toán công nợ' USING ERRCODE = '42501';
  END IF;

  IF p_contact_id IS NULL THEN
    RAISE EXCEPTION 'Vui lòng chọn đối tác thanh toán' USING ERRCODE = '23514';
  END IF;

  IF p_ref_type IS NULL OR p_ref_type NOT IN ('import', 'export') THEN
    RAISE EXCEPTION 'Loại chứng từ công nợ không hợp lệ' USING ERRCODE = '23514';
  END IF;

  IF v_rem <= 0 THEN
    RAISE EXCEPTION 'Số tiền thanh toán phải lớn hơn 0' USING ERRCODE = '23514';
  END IF;

  IF p_date IS NULL THEN
    RAISE EXCEPTION 'Vui lòng chọn ngày thanh toán' USING ERRCODE = '23514';
  END IF;

  IF p_method IS NULL OR p_method NOT IN ('cash', 'transfer', 'other', 'advance') THEN
    RAISE EXCEPTION 'Phương thức thanh toán không hợp lệ' USING ERRCODE = '23514';
  END IF;

  IF p_method = 'advance' THEN
    IF p_ref_type <> 'import' THEN
      RAISE EXCEPTION 'Chỉ phiếu nhập mới được đối trừ từ khoản tạm ứng mua hàng' USING ERRCODE = '23514';
    END IF;
    IF p_advance_id IS NULL THEN
      RAISE EXCEPTION 'Vui lòng chọn khoản tạm ứng để đối trừ' USING ERRCODE = '23514';
    END IF;
  ELSIF p_advance_id IS NOT NULL THEN
    RAISE EXCEPTION 'Chỉ thanh toán đối trừ tạm ứng mới được gắn phiếu ứng' USING ERRCODE = '23514';
  END IF;

  -- Serialize concurrent payments for the same partner
  PERFORM 1 FROM public.contacts WHERE id = p_contact_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đối tác không tồn tại' USING ERRCODE = '23503';
  END IF;

  IF p_ref_type = 'import' THEN
    FOR r IN
      SELECT id, date, total_amount, payment_status
      FROM public.imports
      WHERE contact_id = p_contact_id AND deleted_at IS NULL
      ORDER BY date ASC, created_at ASC, id ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_rem <= 0;
      SELECT coalesce(sum(amount), 0) INTO v_paid
      FROM public.payments
      WHERE ref_type = 'import' AND ref_id = r.id;

      IF r.payment_status = 'paid' AND v_paid = 0 THEN
        v_doc_rem := 0;
      ELSE
        v_doc_rem := greatest(coalesce(r.total_amount, 0) - v_paid, 0);
      END IF;

      IF v_doc_rem > 0 THEN
        v_alloc := least(v_rem, v_doc_rem);
        v_count := v_count + 1;
        v_note := coalesce(v_base_note, 'Thanh toán công nợ gộp (FIFO)') || format(' [FIFO #%s - %s]', v_count, r.date);

        INSERT INTO public.payments(ref_type, ref_id, date, amount, method, advance_id, notes, created_by)
        VALUES ('import', r.id, p_date, v_alloc, p_method, p_advance_id, v_note, public.current_user_id())
        RETURNING id INTO v_payment_id;

        v_rem := v_rem - v_alloc;
        v_total_allocated := v_total_allocated + v_alloc;
        v_payment_ids := v_payment_ids || to_jsonb(v_payment_id);
      END IF;
    END LOOP;
  ELSE
    FOR r IN
      SELECT id, date, total_amount, payment_status
      FROM public.exports
      WHERE contact_id = p_contact_id AND deleted_at IS NULL
      ORDER BY date ASC, created_at ASC, id ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_rem <= 0;
      SELECT coalesce(sum(amount), 0) INTO v_paid
      FROM public.payments
      WHERE ref_type = 'export' AND ref_id = r.id;

      IF r.payment_status = 'paid' AND v_paid = 0 THEN
        v_doc_rem := 0;
      ELSE
        v_doc_rem := greatest(coalesce(r.total_amount, 0) - v_paid, 0);
      END IF;

      IF v_doc_rem > 0 THEN
        v_alloc := least(v_rem, v_doc_rem);
        v_count := v_count + 1;
        v_note := coalesce(v_base_note, 'Thu nợ gộp khách hàng (FIFO)') || format(' [FIFO #%s - %s]', v_count, r.date);

        INSERT INTO public.payments(ref_type, ref_id, date, amount, method, advance_id, notes, created_by)
        VALUES ('export', r.id, p_date, v_alloc, p_method, NULL, v_note, public.current_user_id())
        RETURNING id INTO v_payment_id;

        v_rem := v_rem - v_alloc;
        v_total_allocated := v_total_allocated + v_alloc;
        v_payment_ids := v_payment_ids || to_jsonb(v_payment_id);
      END IF;
    END LOOP;
  END IF;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Đối tác không còn khoản công nợ nào cần thanh toán' USING ERRCODE = '23514';
  END IF;

  IF v_rem > 0 THEN
    RAISE EXCEPTION 'Số tiền thanh toán vượt tổng dư nợ còn lại (%s đ)', v_total_allocated USING ERRCODE = '23514';
  END IF;

  RETURN jsonb_build_object(
    'allocatedCount', v_count,
    'totalAllocated', v_total_allocated,
    'paymentIds', v_payment_ids
  );
END $$;

REVOKE ALL ON FUNCTION public.record_bulk_partner_payment(uuid, text, numeric, date, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_bulk_partner_payment(uuid, text, numeric, date, text, uuid, text) TO authenticated;

COMMIT;
