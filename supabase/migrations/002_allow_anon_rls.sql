-- =============================================
-- QA KHOPHE — Migration 002: RLS Allow All (Anon + Authenticated)
-- Paste vào Supabase SQL Editor để bật quyền truy cập cho app
-- URL: https://supabase.com/dashboard/project/ageezcxrthqmmacnrqpf/sql
-- =============================================

DROP POLICY IF EXISTS "Allow all for authenticated" ON users;
DROP POLICY IF EXISTS "Allow all for authenticated" ON contacts;
DROP POLICY IF EXISTS "Allow all for authenticated" ON imports;
DROP POLICY IF EXISTS "Allow all for authenticated" ON grinding;
DROP POLICY IF EXISTS "Allow all for authenticated" ON exports;
DROP POLICY IF EXISTS "Allow all for authenticated" ON weighing_sessions;
DROP POLICY IF EXISTS "Allow all for authenticated" ON weighing_bags;
DROP POLICY IF EXISTS "Allow all for authenticated" ON expenses;
DROP POLICY IF EXISTS "Allow all for authenticated" ON advances;

DROP POLICY IF EXISTS "Allow all" ON users;
DROP POLICY IF EXISTS "Allow all" ON contacts;
DROP POLICY IF EXISTS "Allow all" ON imports;
DROP POLICY IF EXISTS "Allow all" ON grinding;
DROP POLICY IF EXISTS "Allow all" ON exports;
DROP POLICY IF EXISTS "Allow all" ON weighing_sessions;
DROP POLICY IF EXISTS "Allow all" ON weighing_bags;
DROP POLICY IF EXISTS "Allow all" ON expenses;
DROP POLICY IF EXISTS "Allow all" ON advances;

CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON imports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON grinding FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON exports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON weighing_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON weighing_bags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON advances FOR ALL USING (true) WITH CHECK (true);
