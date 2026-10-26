-- Dynamic RBAC role permissions matrix + per-user custom permission overrides.
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
      'scrap.view', false,
      'scrap.create', false,
      'scrap.edit_delete', false,
      'inventory.view', true,
      'inventory.count', false,
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
      'contacts.manage', false,
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

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role text PRIMARY KEY CHECK (role IN ('admin', 'manager', 'accountant', 'warehouse_manager', 'staff')),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
REVOKE ALL ON public.role_permissions FROM anon;

DROP POLICY IF EXISTS role_permissions_select ON public.role_permissions;
CREATE POLICY role_permissions_select ON public.role_permissions
  FOR SELECT TO authenticated
  USING (public.has_any_role());

DROP POLICY IF EXISTS role_permissions_admin_write ON public.role_permissions;
CREATE POLICY role_permissions_admin_write ON public.role_permissions
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

INSERT INTO public.role_permissions (role, permissions)
VALUES
  ('admin', public.default_role_permissions('admin')),
  ('manager', public.default_role_permissions('manager')),
  ('accountant', public.default_role_permissions('accountant')),
  ('warehouse_manager', public.default_role_permissions('warehouse_manager')),
  ('staff', public.default_role_permissions('staff'))
ON CONFLICT (role) DO UPDATE
SET permissions = public.default_role_permissions(EXCLUDED.role) || COALESCE(public.role_permissions.permissions, '{}'::jsonb);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS custom_permissions jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Guard custom_permissions column against non-admin self-escalation
CREATE OR REPLACE FUNCTION public.guard_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
    OR NEW.email IS DISTINCT FROM OLD.email
    OR NEW.is_active IS DISTINCT FROM OLD.is_active
    OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.custom_permissions IS DISTINCT FROM OLD.custom_permissions THEN
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

CREATE OR REPLACE FUNCTION public.get_effective_permissions_for_user(
  p_role text,
  p_custom jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_role IS NULL THEN '{}'::jsonb
    WHEN p_role = 'admin' THEN public.default_role_permissions('admin')
    ELSE
      public.default_role_permissions(p_role)
      || COALESCE((SELECT rp.permissions FROM public.role_permissions rp WHERE rp.role = p_role), '{}'::jsonb)
      || COALESCE(p_custom, '{}'::jsonb)
      || jsonb_build_object('settings.manage', false)
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_custom jsonb;
BEGIN
  SELECT u.role, u.custom_permissions
  INTO v_role, v_custom
  FROM public.users u
  WHERE u.auth_id = auth.uid() AND u.is_active = true
  LIMIT 1;

  IF NOT FOUND OR v_role IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN public.get_effective_permissions_for_user(v_role, v_custom);
END;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((public.get_my_permissions() ->> p_permission)::boolean, false);
$$;

-- Link core operational & financial helper functions to dynamic permissions
CREATE OR REPLACE FUNCTION public.can_record_operations()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT public.has_permission('scrap.create');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_operations()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT public.has_permission('scrap.edit_delete');
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT public.is_admin()
    OR public.has_permission('finance.view')
    OR public.has_permission('dashboard.finance.view');
$$;

-- Bind granular RLS policies to their exact permission keys
DROP POLICY IF EXISTS contacts_write ON public.contacts;
DROP POLICY IF EXISTS contacts_update ON public.contacts;
DROP POLICY IF EXISTS contacts_delete ON public.contacts;
CREATE POLICY contacts_write ON public.contacts FOR INSERT TO authenticated WITH CHECK (public.has_permission('contacts.manage'));
CREATE POLICY contacts_update ON public.contacts FOR UPDATE TO authenticated USING (public.has_permission('contacts.manage')) WITH CHECK (public.has_permission('contacts.manage'));
CREATE POLICY contacts_delete ON public.contacts FOR DELETE TO authenticated USING (public.has_permission('contacts.manage'));

DO $$
DECLARE
  p text;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stock_counts' AND cmd <> 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.stock_counts', p);
  END LOOP;
END $$;
CREATE POLICY stock_counts_insert ON public.stock_counts FOR INSERT TO authenticated WITH CHECK (public.has_permission('inventory.count'));
CREATE POLICY stock_counts_update ON public.stock_counts FOR UPDATE TO authenticated USING (public.has_permission('inventory.count')) WITH CHECK (public.has_permission('inventory.count'));
CREATE POLICY stock_counts_delete ON public.stock_counts FOR DELETE TO authenticated USING (public.has_permission('inventory.count'));

DROP POLICY IF EXISTS expenses_all ON public.expenses;
DROP POLICY IF EXISTS expenses_insert ON public.expenses;
DROP POLICY IF EXISTS expenses_update ON public.expenses;
DROP POLICY IF EXISTS expenses_delete ON public.expenses;
CREATE POLICY expenses_all ON public.expenses FOR SELECT TO authenticated
  USING (public.has_permission('finance.view') OR public.has_permission('dashboard.finance.view'));
CREATE POLICY expenses_insert ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('finance.manage_expenses'));
CREATE POLICY expenses_update ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_permission('finance.manage_expenses'))
  WITH CHECK (public.has_permission('finance.manage_expenses'));
CREATE POLICY expenses_delete ON public.expenses FOR DELETE TO authenticated
  USING (public.has_permission('finance.manage_expenses'));

DROP POLICY IF EXISTS advances_all ON public.advances;
DROP POLICY IF EXISTS advances_insert ON public.advances;
DROP POLICY IF EXISTS advances_update ON public.advances;
DROP POLICY IF EXISTS advances_delete ON public.advances;
CREATE POLICY advances_all ON public.advances FOR SELECT TO authenticated
  USING (public.has_permission('finance.view') OR public.has_permission('dashboard.finance.view'));
CREATE POLICY advances_insert ON public.advances FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('finance.manage_expenses'));
CREATE POLICY advances_update ON public.advances FOR UPDATE TO authenticated
  USING (public.has_permission('finance.manage_expenses'))
  WITH CHECK (public.has_permission('finance.manage_expenses'));
CREATE POLICY advances_delete ON public.advances FOR DELETE TO authenticated
  USING (public.has_permission('finance.manage_expenses'));

DROP POLICY IF EXISTS payments_insert ON public.payments;
DROP POLICY IF EXISTS payments_update ON public.payments;
DROP POLICY IF EXISTS payments_delete ON public.payments;
CREATE POLICY payments_insert ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('finance.record_payment'));
CREATE POLICY payments_update ON public.payments FOR UPDATE TO authenticated
  USING (public.has_permission('finance.record_payment'))
  WITH CHECK (public.has_permission('finance.record_payment'));
CREATE POLICY payments_delete ON public.payments FOR DELETE TO authenticated
  USING (public.has_permission('finance.record_payment'));

DROP POLICY IF EXISTS employees_manager_select ON public.employees;
DROP POLICY IF EXISTS employees_manager_insert ON public.employees;
DROP POLICY IF EXISTS employees_manager_update ON public.employees;
DROP POLICY IF EXISTS employees_manager_delete ON public.employees;
CREATE POLICY employees_manager_select ON public.employees FOR SELECT TO authenticated
  USING (public.has_permission('hr.view') OR public.has_permission('dashboard.finance.view'));
CREATE POLICY employees_manager_insert ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('hr.manage'));
CREATE POLICY employees_manager_update ON public.employees FOR UPDATE TO authenticated
  USING (public.has_permission('hr.manage'))
  WITH CHECK (public.has_permission('hr.manage'));
CREATE POLICY employees_manager_delete ON public.employees FOR DELETE TO authenticated
  USING (public.has_permission('hr.manage'));

DROP POLICY IF EXISTS attendance_manager_all ON public.attendance;
DROP POLICY IF EXISTS attendance_manager_insert ON public.attendance;
DROP POLICY IF EXISTS attendance_manager_update ON public.attendance;
DROP POLICY IF EXISTS attendance_manager_delete ON public.attendance;
CREATE POLICY attendance_manager_all ON public.attendance FOR SELECT TO authenticated
  USING (public.has_permission('hr.view') OR public.has_permission('dashboard.finance.view'));
CREATE POLICY attendance_manager_insert ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('hr.manage'));
CREATE POLICY attendance_manager_update ON public.attendance FOR UPDATE TO authenticated
  USING (public.has_permission('hr.manage'))
  WITH CHECK (public.has_permission('hr.manage'));
CREATE POLICY attendance_manager_delete ON public.attendance FOR DELETE TO authenticated
  USING (public.has_permission('hr.manage'));

DROP POLICY IF EXISTS payroll_settlements_manager_select ON public.payroll_settlements;
DROP POLICY IF EXISTS payroll_settlements_manager_insert ON public.payroll_settlements;
DROP POLICY IF EXISTS payroll_settlements_manager_update ON public.payroll_settlements;
CREATE POLICY payroll_settlements_manager_select ON public.payroll_settlements FOR SELECT TO authenticated
  USING (public.has_permission('hr.view') OR public.has_permission('dashboard.finance.view'));
CREATE POLICY payroll_settlements_manager_insert ON public.payroll_settlements FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('hr.manage'));
CREATE POLICY payroll_settlements_manager_update ON public.payroll_settlements FOR UPDATE TO authenticated
  USING (public.has_permission('hr.manage'))
  WITH CHECK (public.has_permission('hr.manage'));

-- RPCs for Role Permission Matrix UI
CREATE OR REPLACE FUNCTION public.get_role_permissions_matrix()
RETURNS TABLE(
  role text,
  permissions jsonb,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    r.role_name AS role,
    CASE
      WHEN r.role_name = 'admin' THEN public.default_role_permissions('admin')
      ELSE public.default_role_permissions(r.role_name) || COALESCE(rp.permissions, '{}'::jsonb) || jsonb_build_object('settings.manage', false)
    END AS permissions,
    COALESCE(rp.updated_at, now()) AS updated_at
  FROM (
    VALUES ('admin', 1), ('manager', 2), ('accountant', 3), ('warehouse_manager', 4), ('staff', 5)
  ) AS r(role_name, sort_order)
  LEFT JOIN public.role_permissions rp ON rp.role = r.role_name
  WHERE public.has_any_role()
  ORDER BY r.sort_order ASC;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_role_permissions(
  p_role text,
  p_permissions jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_defaults jsonb;
  v_clean jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền cấu hình phân quyền' USING ERRCODE = '42501';
  END IF;

  IF p_role = 'admin' THEN
    RAISE EXCEPTION 'Vai trò Quản trị viên luôn được cố định toàn quyền hệ thống' USING ERRCODE = '23514';
  END IF;

  IF p_role IS NULL OR p_role NOT IN ('manager', 'accountant', 'warehouse_manager', 'staff') THEN
    RAISE EXCEPTION 'Vai trò phân quyền không hợp lệ' USING ERRCODE = '23514';
  END IF;

  IF p_permissions IS NULL OR jsonb_typeof(p_permissions) <> 'object' THEN
    RAISE EXCEPTION 'Dữ liệu phân quyền không hợp lệ' USING ERRCODE = '23514';
  END IF;

  v_defaults := public.default_role_permissions(p_role);

  FOR v_key IN SELECT jsonb_object_keys(v_defaults) LOOP
    IF v_key = 'settings.manage' THEN
      v_clean := v_clean || jsonb_build_object(v_key, false);
    ELSIF p_permissions ? v_key AND jsonb_typeof(p_permissions -> v_key) = 'boolean' THEN
      v_val := p_permissions -> v_key;
      v_clean := v_clean || jsonb_build_object(v_key, v_val);
    ELSE
      v_clean := v_clean || jsonb_build_object(v_key, v_defaults -> v_key);
    END IF;
  END LOOP;

  INSERT INTO public.role_permissions (role, permissions, updated_at, updated_by)
  VALUES (p_role, v_clean, now(), public.current_user_id())
  ON CONFLICT (role) DO UPDATE
  SET permissions = EXCLUDED.permissions,
      updated_at = now(),
      updated_by = public.current_user_id();

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_role_permissions(
  p_role text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền khôi phục phân quyền mặc định' USING ERRCODE = '42501';
  END IF;

  IF p_role IS NOT NULL THEN
    IF p_role NOT IN ('admin', 'manager', 'accountant', 'warehouse_manager', 'staff') THEN
      RAISE EXCEPTION 'Vai trò phân quyền không hợp lệ' USING ERRCODE = '23514';
    END IF;
    UPDATE public.role_permissions
    SET permissions = public.default_role_permissions(role),
        updated_at = now(),
        updated_by = public.current_user_id()
    WHERE role = p_role;
  ELSE
    UPDATE public.role_permissions
    SET permissions = public.default_role_permissions(role),
        updated_at = now(),
        updated_by = public.current_user_id();
  END IF;

  RETURN true;
END;
$$;

-- Upgrade list_managed_users & admin_update_user_account to include custom_permissions
DROP FUNCTION IF EXISTS public.list_managed_users();
CREATE OR REPLACE FUNCTION public.list_managed_users()
RETURNS TABLE(
  id uuid,
  auth_id uuid,
  email text,
  username text,
  full_name text,
  role text,
  phone text,
  is_active boolean,
  custom_permissions jsonb,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền xem danh sách tài khoản' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('auth.users') IS NOT NULL THEN
    RETURN QUERY EXECUTE $q$
      SELECT
        u.id,
        u.auth_id,
        u.email,
        CASE
          WHEN u.email LIKE '%@accounts.khophe.local' THEN split_part(u.email, '@', 1)
          ELSE u.email
        END AS username,
        u.full_name,
        u.role,
        u.phone,
        u.is_active,
        COALESCE(u.custom_permissions, '{}'::jsonb) AS custom_permissions,
        u.created_at,
        au.last_sign_in_at
      FROM public.users u
      LEFT JOIN auth.users au ON au.id = u.auth_id
      ORDER BY u.is_active DESC, u.created_at ASC
    $q$;
  ELSE
    RETURN QUERY
      SELECT
        u.id,
        u.auth_id,
        u.email,
        CASE
          WHEN u.email LIKE '%@accounts.khophe.local' THEN split_part(u.email, '@', 1)
          ELSE u.email
        END AS username,
        u.full_name,
        u.role,
        u.phone,
        u.is_active,
        COALESCE(u.custom_permissions, '{}'::jsonb) AS custom_permissions,
        u.created_at,
        NULL::timestamptz AS last_sign_in_at
      FROM public.users u
      ORDER BY u.is_active DESC, u.created_at ASC;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_update_user_account(uuid, text, text, text, boolean);
CREATE OR REPLACE FUNCTION public.admin_update_user_account(
  p_user_id uuid,
  p_full_name text,
  p_role text,
  p_phone text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_custom_permissions jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target public.users%ROWTYPE;
  v_name text := btrim(coalesce(p_full_name, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_active boolean := coalesce(p_is_active, true);
  v_custom jsonb;
  v_defaults jsonb;
  v_key text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền cập nhật tài khoản' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_target FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy tài khoản người dùng' USING ERRCODE = 'P0002';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'Vui lòng nhập họ và tên người dùng' USING ERRCODE = '23514';
  END IF;

  IF p_role IS NULL OR p_role NOT IN ('admin', 'manager', 'warehouse_manager', 'accountant', 'staff') THEN
    RAISE EXCEPTION 'Vai trò phân quyền không hợp lệ' USING ERRCODE = '23514';
  END IF;

  IF v_target.id = public.current_user_id() OR (v_target.auth_id IS NOT NULL AND v_target.auth_id = auth.uid()) THEN
    IF NOT v_active THEN
      RAISE EXCEPTION 'Không thể tự khóa tài khoản đang đăng nhập của chính mình' USING ERRCODE = '23514';
    END IF;
    IF p_role <> 'admin' THEN
      RAISE EXCEPTION 'Không thể tự hạ quyền quản trị viên của chính mình' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_target.role = 'admin' AND (p_role <> 'admin' OR NOT v_active) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users WHERE role = 'admin' AND is_active = true AND id <> p_user_id
    ) THEN
      RAISE EXCEPTION 'Hệ thống phải có ít nhất 1 quản trị viên đang hoạt động' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF p_role = 'admin' THEN
    v_custom := '{}'::jsonb;
  ELSIF p_custom_permissions IS NULL THEN
    v_custom := COALESCE(v_target.custom_permissions, '{}'::jsonb);
  ELSE
    v_custom := '{}'::jsonb;
    v_defaults := public.default_role_permissions(p_role);
    FOR v_key IN SELECT jsonb_object_keys(v_defaults) LOOP
      IF v_key <> 'settings.manage'
        AND p_custom_permissions ? v_key
        AND jsonb_typeof(p_custom_permissions -> v_key) = 'boolean' THEN
        v_custom := v_custom || jsonb_build_object(v_key, p_custom_permissions -> v_key);
      END IF;
    END LOOP;
  END IF;

  UPDATE public.users
  SET full_name = v_name,
      role = p_role,
      phone = v_phone,
      is_active = v_active,
      custom_permissions = v_custom
  WHERE id = p_user_id;

  IF to_regclass('auth.users') IS NOT NULL AND v_target.auth_id IS NOT NULL THEN
    EXECUTE $q$
      UPDATE auth.users
      SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', $1),
          updated_at = now()
      WHERE id = $2
    $q$ USING v_name, v_target.auth_id;

    IF NOT v_active AND to_regclass('auth.sessions') IS NOT NULL THEN
      EXECUTE 'DELETE FROM auth.sessions WHERE user_id = $1' USING v_target.auth_id;
    END IF;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION
  public.default_role_permissions(text),
  public.get_effective_permissions_for_user(text, jsonb),
  public.get_my_permissions(),
  public.has_permission(text),
  public.get_role_permissions_matrix(),
  public.admin_update_role_permissions(text, jsonb),
  public.admin_reset_role_permissions(text),
  public.list_managed_users(),
  public.admin_update_user_account(uuid, text, text, text, boolean, jsonb)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.default_role_permissions(text),
  public.get_effective_permissions_for_user(text, jsonb),
  public.get_my_permissions(),
  public.has_permission(text),
  public.get_role_permissions_matrix(),
  public.admin_update_role_permissions(text, jsonb),
  public.admin_reset_role_permissions(text),
  public.list_managed_users(),
  public.admin_update_user_account(uuid, text, text, text, boolean, jsonb)
TO authenticated;

COMMIT;
