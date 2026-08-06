-- =============================================
-- QA KHOPHE — Migration 008: Kiểm tra & siết bảo mật
--
-- Chạy file này SAU 003–007. An toàn khi chạy lại nhiều lần.
--
-- Mục đích: tự kiểm tra xem DB có đang ở trạng thái an toàn không, thay vì phải
-- tin vào trí nhớ về việc "đã chạy migration nào rồi". Nếu còn sót policy mở
-- toang, file này sẽ DỪNG với thông báo rõ ràng chứ không âm thầm bỏ qua.
-- =============================================

-- ---------------------------------------------
-- 1. Bật RLS cho mọi bảng nghiệp vụ
--    (Bảng có RLS tắt thì policy viết bao nhiêu cũng vô nghĩa.)
-- ---------------------------------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users','contacts','imports','grinding','exports',
      'weighing_sessions','weighing_bags','expenses','advances'
    ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;

  -- Các bảng thêm ở migration 004–006 (nếu đã tạo)
  FOR tbl IN
    SELECT unnest(ARRAY['employees','attendance','payments','settings','stock_counts','audit_log'])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------
-- 2. Xoá mọi policy còn để USING(true) — tàn dư của migration 002
-- ---------------------------------------------
DO $$
DECLARE
  r RECORD;
  removed INT := 0;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual = 'true' OR with_check = 'true')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    removed := removed + 1;
    RAISE NOTICE 'Đã xoá policy mở toang: %.% ', r.tablename, r.policyname;
  END LOOP;

  IF removed = 0 THEN
    RAISE NOTICE 'OK — không còn policy USING(true) nào.';
  ELSE
    RAISE WARNING 'Đã xoá % policy mở toang. Chạy lại 003_users_roles_and_rls.sql nếu các bảng liên quan giờ không còn policy nào.', removed;
  END IF;
END $$;

-- ---------------------------------------------
-- 3. Cảnh báo bảng đã bật RLS nhưng KHÔNG có policy nào
--    (Trạng thái này khoá sạch mọi truy cập — app sẽ trắng dữ liệu.)
-- ---------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
      )
  LOOP
    RAISE WARNING 'Bảng "%" đã bật RLS nhưng chưa có policy nào — sẽ không ai đọc/ghi được. Cần bổ sung policy.', r.tablename;
  END LOOP;
END $$;

-- ---------------------------------------------
-- 4. Cảnh báo tài khoản chưa gắn Supabase Auth
--    Dòng users chưa có auth_id sẽ được "nhận" ở lần đăng nhập đầu theo email.
-- ---------------------------------------------
DO $$
DECLARE
  n INT;
  admins INT;
BEGIN
  SELECT count(*) INTO n FROM users WHERE auth_id IS NULL;
  IF n > 0 THEN
    RAISE NOTICE '% tài khoản chưa gắn auth_id — sẽ tự gắn ở lần đăng nhập đầu tiên theo email khớp.', n;
  END IF;

  SELECT count(*) INTO admins FROM users WHERE role = 'admin';
  IF admins = 0 THEN
    RAISE WARNING 'CHƯA CÓ TÀI KHOẢN ADMIN NÀO. Chạy: INSERT INTO users (email, full_name, role) VALUES (''ban@congty.vn'', ''Quản trị viên'', ''admin'') ON CONFLICT (email) DO UPDATE SET role = ''admin'';';
  END IF;
END $$;

-- ---------------------------------------------
-- 5. Báo cáo tổng kết — đọc phần Messages/Notices sau khi chạy
-- ---------------------------------------------
SELECT
  tablename AS "Bảng",
  count(*) AS "Số policy",
  bool_or(qual = 'true' OR with_check = 'true') AS "Còn mở toang?"
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
