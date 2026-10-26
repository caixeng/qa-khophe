-- Admin user account management RPCs (list, create, update role/status, reset password).
BEGIN;

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
        u.created_at,
        NULL::timestamptz AS last_sign_in_at
      FROM public.users u
      ORDER BY u.is_active DESC, u.created_at ASC;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_user_account(
  p_account text,
  p_full_name text,
  p_role text,
  p_password text,
  p_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entered text := lower(btrim(coalesce(p_account, '')));
  v_email text;
  v_name text := btrim(coalesce(p_full_name, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_auth_id uuid;
  v_user_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền tạo tài khoản' USING ERRCODE = '42501';
  END IF;

  IF v_entered = '' THEN
    RAISE EXCEPTION 'Vui lòng nhập tên đăng nhập hoặc email' USING ERRCODE = '23514';
  END IF;

  IF position('@' in v_entered) = 0 THEN
    IF v_entered !~ '^[a-z0-9._-]{3,40}$' THEN
      RAISE EXCEPTION 'Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang (3–40 ký tự)' USING ERRCODE = '23514';
    END IF;
    v_email := v_entered || '@accounts.khophe.local';
  ELSE
    IF v_entered !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      RAISE EXCEPTION 'Định dạng email không hợp lệ' USING ERRCODE = '23514';
    END IF;
    v_email := v_entered;
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'Vui lòng nhập họ và tên người dùng' USING ERRCODE = '23514';
  END IF;

  IF p_role IS NULL OR p_role NOT IN ('admin', 'manager', 'warehouse_manager', 'accountant', 'staff') THEN
    RAISE EXCEPTION 'Vai trò phân quyền không hợp lệ' USING ERRCODE = '23514';
  END IF;

  IF length(coalesce(p_password, '')) < 8 THEN
    RAISE EXCEPTION 'Mật khẩu phải có ít nhất 8 ký tự' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'Tài khoản đã tồn tại trong hệ thống' USING ERRCODE = '23505';
  END IF;

  IF to_regclass('auth.users') IS NOT NULL THEN
    EXECUTE 'SELECT id FROM auth.users WHERE lower(email) = $1 LIMIT 1'
      INTO v_auth_id
      USING v_email;

    IF v_auth_id IS NOT NULL THEN
      EXECUTE $q$
        UPDATE auth.users
        SET encrypted_password = extensions.crypt($1, extensions.gen_salt('bf')),
            email_confirmed_at = coalesce(email_confirmed_at, now()),
            raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', $2, 'email_verified', true),
            updated_at = now()
        WHERE id = $3
      $q$ USING p_password, v_name, v_auth_id;
    ELSE
      v_auth_id := gen_random_uuid();
      EXECUTE $q$
        INSERT INTO auth.users (
          id, instance_id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at, confirmation_token, email_change,
          email_change_token_new, recovery_token, email_change_token_current,
          phone_change, phone_change_token, reauthentication_token,
          is_sso_user, is_anonymous
        ) VALUES (
          $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          $2, extensions.crypt($3, extensions.gen_salt('bf')),
          now(), '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', $4, 'email_verified', true),
          now(), now(), '', '', '', '', '', '', '', '', false, false
        )
      $q$ USING v_auth_id, v_email, p_password, v_name;
    END IF;

    IF to_regclass('auth.identities') IS NOT NULL THEN
      EXECUTE $q$
        INSERT INTO auth.identities (
          id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        )
        SELECT
          gen_random_uuid(), $1, $1::text,
          jsonb_build_object('sub', $1::text, 'email', $2, 'email_verified', true, 'phone_verified', false),
          'email', now(), now(), now()
        WHERE NOT EXISTS (
          SELECT 1 FROM auth.identities WHERE user_id = $1 AND provider = 'email'
        )
      $q$ USING v_auth_id, v_email;
    END IF;
  ELSE
    v_auth_id := gen_random_uuid();
  END IF;

  INSERT INTO public.users (auth_id, email, full_name, role, phone, is_active)
  VALUES (v_auth_id, v_email, v_name, p_role, v_phone, true)
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_account(
  p_user_id uuid,
  p_full_name text,
  p_role text,
  p_phone text DEFAULT NULL,
  p_is_active boolean DEFAULT true
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

  UPDATE public.users
  SET full_name = v_name,
      role = p_role,
      phone = v_phone,
      is_active = v_active
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

CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target public.users%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền đặt lại mật khẩu' USING ERRCODE = '42501';
  END IF;

  IF length(coalesce(p_new_password, '')) < 8 THEN
    RAISE EXCEPTION 'Mật khẩu mới phải có ít nhất 8 ký tự' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_target FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy tài khoản người dùng' USING ERRCODE = 'P0002';
  END IF;

  IF to_regclass('auth.users') IS NOT NULL AND v_target.auth_id IS NOT NULL THEN
    EXECUTE $q$
      UPDATE auth.users
      SET encrypted_password = extensions.crypt($1, extensions.gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          updated_at = now()
      WHERE id = $2
    $q$ USING p_new_password, v_target.auth_id;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION
  public.list_managed_users(),
  public.admin_create_user_account(text, text, text, text, text),
  public.admin_update_user_account(uuid, text, text, text, boolean),
  public.admin_reset_user_password(uuid, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.list_managed_users(),
  public.admin_create_user_account(text, text, text, text, text),
  public.admin_update_user_account(uuid, text, text, text, boolean),
  public.admin_reset_user_password(uuid, text)
TO authenticated;

COMMIT;
