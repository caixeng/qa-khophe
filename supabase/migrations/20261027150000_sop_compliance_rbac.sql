-- SOP Compliance (Điều 4, 5, 6, 11, 17, 18):
-- 1. Mở quyền scrap.view và inventory.count cho Kế toán (accountant) để kiểm chứng từ kho & phối hợp kiểm kê.
-- 2. Mở quyền contacts.manage cho Thu mua (staff - Anh Hồ) để thêm mới/cập nhật đơn vị nhập phế.
-- 3. Cho phép Thu mua (scrap.create) xem số dư tạm ứng mua hàng (purpose = 'materials') và đối trừ trực tiếp khi tạo phiếu nhập.

BEGIN;

CREATE OR REPLACE FUNCTION public.default_role_permissions(p_role text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_role
    WHEN 'admin' THEN jsonb_build_object(
      'dashboard.finance.view', true,
      'reconciliation.view', true,
      'reports.view', true,
      'scrap.view', true,
      'scrap.create', true,
      'scrap.edit_delete', true,
      'inventory.view', true,
      'inventory.count', true,
      'inventory.opening_stock', true,
      'contacts.view', true,
      'contacts.manage', true,
      'finance.view', true,
      'finance.manage_expenses', true,
      'finance.record_payment', true,
      'attachments.delete', true,
      'hr.view', true,
      'hr.manage', true,
      'settings.manage', true
    )
    WHEN 'manager' THEN jsonb_build_object(
      'dashboard.finance.view', true,
      'reconciliation.view', true,
      'reports.view', true,
      'scrap.view', true,
      'scrap.create', true,
      'scrap.edit_delete', true,
      'inventory.view', true,
      'inventory.count', true,
      'inventory.opening_stock', false,
      'contacts.view', true,
      'contacts.manage', true,
      'finance.view', true,
      'finance.manage_expenses', true,
      'finance.record_payment', true,
      'attachments.delete', true,
      'hr.view', true,
      'hr.manage', true,
      'settings.manage', false
    )
    WHEN 'accountant' THEN jsonb_build_object(
      'dashboard.finance.view', true,
      'reconciliation.view', true,
      'reports.view', true,
      'scrap.view', true,
      'scrap.create', false,
      'scrap.edit_delete', false,
      'inventory.view', true,
      'inventory.count', true,
      'inventory.opening_stock', false,
      'contacts.view', true,
      'contacts.manage', false,
      'finance.view', true,
      'finance.manage_expenses', true,
      'finance.record_payment', true,
      'attachments.delete', true,
      'hr.view', true,
      'hr.manage', true,
      'settings.manage', false
    )
    WHEN 'warehouse_manager' THEN jsonb_build_object(
      'dashboard.finance.view', false,
      'reconciliation.view', true,
      'reports.view', true,
      'scrap.view', true,
      'scrap.create', true,
      'scrap.edit_delete', true,
      'inventory.view', true,
      'inventory.count', true,
      'inventory.opening_stock', false,
      'contacts.view', true,
      'contacts.manage', true,
      'finance.view', false,
      'finance.manage_expenses', false,
      'finance.record_payment', false,
      'attachments.delete', false,
      'hr.view', false,
      'hr.manage', false,
      'settings.manage', false
    )
    WHEN 'staff' THEN jsonb_build_object(
      'dashboard.finance.view', false,
      'reconciliation.view', true,
      'reports.view', true,
      'scrap.view', true,
      'scrap.create', true,
      'scrap.edit_delete', false,
      'inventory.view', true,
      'inventory.count', false,
      'inventory.opening_stock', false,
      'contacts.view', true,
      'contacts.manage', true,
      'finance.view', false,
      'finance.manage_expenses', false,
      'finance.record_payment', false,
      'attachments.delete', false,
      'hr.view', false,
      'hr.manage', false,
      'settings.manage', false
    )
    ELSE '{}'::jsonb
  END;
$$;

-- Đồng bộ quyền mặc định mới vào bảng role_permissions
UPDATE public.role_permissions
SET permissions = COALESCE(permissions, '{}'::jsonb) || jsonb_build_object(
  'scrap.view', true,
  'inventory.count', true
),
updated_at = now()
WHERE role = 'accountant';

UPDATE public.role_permissions
SET permissions = COALESCE(permissions, '{}'::jsonb) || jsonb_build_object(
  'contacts.manage', true
),
updated_at = now()
WHERE role = 'staff';

-- Cho phép nhân sự Thu mua (scrap.create) đọc các khoản ứng tiền mua hàng (purpose = 'materials')
-- để chọn đối trừ trực tiếp trên màn hình Nhập phế mà không lộ các khoản ứng xưởng/ứng lương khác.
DROP POLICY IF EXISTS advances_all ON public.advances;
CREATE POLICY advances_all ON public.advances FOR SELECT TO authenticated
  USING (
    public.has_permission('finance.view')
    OR public.has_permission('dashboard.finance.view')
    OR (purpose = 'materials' AND public.has_permission('scrap.create'))
  );

-- Cho phép nhân sự Thu mua (scrap.create) ghi nhận thanh toán đối trừ trực tiếp từ khoản ứng mua hàng
DROP POLICY IF EXISTS payments_insert ON public.payments;
CREATE POLICY payments_insert ON public.payments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission('finance.record_payment')
    OR (ref_type = 'import' AND advance_id IS NOT NULL AND public.has_permission('scrap.create'))
  );

-- Chuyển guard_advance_allocation và validate_payment_ref sang SECURITY DEFINER để khi nhân sự Thu mua tạo phiếu thanh toán
-- gắn advance_id thì trigger khóa dòng (FOR UPDATE) trên public.advances và public.imports không bị chặn bởi RLS UPDATE.
ALTER FUNCTION public.guard_advance_allocation() SECURITY DEFINER;
ALTER FUNCTION public.validate_payment_ref() SECURITY DEFINER;

COMMIT;
