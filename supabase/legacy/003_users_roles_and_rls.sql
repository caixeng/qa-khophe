-- =============================================
-- QA KHOPHE — Migration 003: Phân quyền thật (RLS theo vai trò)
-- Paste toàn bộ nội dung này vào Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/ageezcxrthqmmacnrqpf/sql
--
-- THAY THẾ hoàn toàn các policy "Allow all" (USING(true)) của migration 002.
-- Sau khi chạy file này, ứng dụng BẮT BUỘC đăng nhập thật qua Supabase Auth —
-- không còn tài khoản admin@khophe.vn/123456 cứng trong code.
--
-- QUAN TRỌNG — việc cần làm SAU khi chạy migration này:
-- 1. Vào Supabase Dashboard > Authentication > Users, tạo tài khoản đăng nhập
--    thật (email + mật khẩu) cho từng người dùng.
-- 2. Chạy lệnh dưới đây (thay email) để cấp quyền admin cho tài khoản đầu tiên:
--      INSERT INTO users (email, full_name, role)
--      VALUES ('ban@congty.vn', 'Quản trị viên', 'admin')
--      ON CONFLICT (email) DO UPDATE SET role = 'admin';
--    Lần đăng nhập đầu tiên bằng email này, ứng dụng sẽ tự động gắn auth_id
--    tương ứng vào dòng users này (tự "nhận" hồ sơ theo email).
-- 3. Với nhân viên/quản lý: thêm dòng tương tự với role = 'staff' hoặc 'manager'.
-- =============================================

-- ---------------------------------------------
-- 1. Hàm tiện ích: lấy role / user_id của người đang đăng nhập
--    SECURITY DEFINER để tránh đệ quy RLS khi policy tự tham chiếu bảng users.
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM users WHERE auth_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM users WHERE auth_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(current_user_role() IN ('manager', 'admin'), false)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(current_user_role() = 'admin', false)
$$;

-- Bất kỳ role hợp lệ nào (staff/manager/admin) — dùng để cho phép ghi nghiệp vụ hằng ngày
CREATE OR REPLACE FUNCTION public.has_any_role()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(current_user_role() IS NOT NULL, false)
$$;

-- ---------------------------------------------
-- 2. Dọn toàn bộ policy "Allow all" cũ (migration 001 + 002)
-- ---------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  pol TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['users','contacts','imports','grinding','exports','weighing_sessions','weighing_bags','expenses','advances'])
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------
-- 3. USERS — chỉ xem/sửa hồ sơ của chính mình; admin toàn quyền
--    Policy riêng cho phép "tự nhận" hồ sơ chưa gắn auth_id theo email khớp
--    với JWT hiện tại (dùng đúng 1 lần khi admin đã pre-provision theo email).
-- ---------------------------------------------
CREATE POLICY "users_select_own_or_admin" ON users
  FOR SELECT USING (auth_id = auth.uid() OR is_admin());

CREATE POLICY "users_claim_own_profile_by_email" ON users
  FOR UPDATE
  USING (auth_id IS NULL AND email = (auth.jwt() ->> 'email'))
  WITH CHECK (auth_id = auth.uid() AND email = (auth.jwt() ->> 'email'));

CREATE POLICY "users_update_own_or_admin" ON users
  FOR UPDATE USING (auth_id = auth.uid() OR is_admin());

CREATE POLICY "users_admin_insert" ON users
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "users_admin_delete" ON users
  FOR DELETE USING (is_admin());

-- ---------------------------------------------
-- 4. CONTACTS — mọi user đã đăng nhập xem được; manager+ mới được ghi
-- ---------------------------------------------
CREATE POLICY "contacts_select" ON contacts
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "contacts_write" ON contacts
  FOR INSERT WITH CHECK (is_manager_or_admin());
CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE USING (is_manager_or_admin());

-- ---------------------------------------------
-- 5. NGHIỆP VỤ HẰNG NGÀY (imports/grinding/exports/weighing)
--    Bất kỳ role hợp lệ (staff+) đều ghi được phiếu mới; chỉ manager+ sửa/xoá.
-- ---------------------------------------------
CREATE POLICY "imports_select" ON imports
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "imports_insert" ON imports
  FOR INSERT WITH CHECK (has_any_role());
CREATE POLICY "imports_update" ON imports
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "imports_delete" ON imports
  FOR DELETE USING (is_manager_or_admin());

CREATE POLICY "grinding_select" ON grinding
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "grinding_insert" ON grinding
  FOR INSERT WITH CHECK (has_any_role());
CREATE POLICY "grinding_update" ON grinding
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "grinding_delete" ON grinding
  FOR DELETE USING (is_manager_or_admin());

CREATE POLICY "exports_select" ON exports
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "exports_insert" ON exports
  FOR INSERT WITH CHECK (has_any_role());
CREATE POLICY "exports_update" ON exports
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "exports_delete" ON exports
  FOR DELETE USING (is_manager_or_admin());

CREATE POLICY "weighing_sessions_select" ON weighing_sessions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "weighing_sessions_insert" ON weighing_sessions
  FOR INSERT WITH CHECK (has_any_role());
CREATE POLICY "weighing_sessions_update" ON weighing_sessions
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "weighing_sessions_delete" ON weighing_sessions
  FOR DELETE USING (is_manager_or_admin());

CREATE POLICY "weighing_bags_select" ON weighing_bags
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "weighing_bags_insert" ON weighing_bags
  FOR INSERT WITH CHECK (has_any_role());
CREATE POLICY "weighing_bags_update" ON weighing_bags
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "weighing_bags_delete" ON weighing_bags
  FOR DELETE USING (is_manager_or_admin());

-- ---------------------------------------------
-- 6. TÀI CHÍNH (expenses/advances) — chỉ manager+ được xem và ghi
--    (chi phí, ứng lương là thông tin nhạy cảm, không cho staff xem)
-- ---------------------------------------------
CREATE POLICY "expenses_all" ON expenses
  FOR SELECT USING (is_manager_or_admin());
CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (is_manager_or_admin());
CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (is_manager_or_admin());

CREATE POLICY "advances_all" ON advances
  FOR SELECT USING (is_manager_or_admin());
CREATE POLICY "advances_insert" ON advances
  FOR INSERT WITH CHECK (is_manager_or_admin());
CREATE POLICY "advances_update" ON advances
  FOR UPDATE USING (is_manager_or_admin());
CREATE POLICY "advances_delete" ON advances
  FOR DELETE USING (is_manager_or_admin());

-- ---------------------------------------------
-- 7. Tự động gắn created_by khi INSERT (không phụ thuộc client có gửi hay không)
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := current_user_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_created_by ON imports;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON imports
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS trg_set_created_by ON grinding;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON grinding
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS trg_set_created_by ON exports;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON exports
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS trg_set_created_by ON weighing_sessions;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON weighing_sessions
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS trg_set_created_by ON expenses;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS trg_set_created_by ON advances;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON advances
  FOR EACH ROW EXECUTE FUNCTION set_created_by();
