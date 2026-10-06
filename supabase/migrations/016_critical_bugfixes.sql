-- =============================================
-- QA KHOPHE — Migration 016: Sửa lỗi tính lương & Ràng buộc toàn vẹn
-- Chạy SAU migration 015.
--
-- 1. FIX TRIGGER: compute_attendance_net_pay cộng thêm overtime_hours
--    Công thức: net_pay = (work_shift * daily_pay) + (overtime_hours * daily_pay * 1.5 / 8) - advance_pay
-- 2. Backfill: Cập nhật lại net_pay cho các bản ghi có tăng ca
-- 3. CONSTRAINT: Thêm UNIQUE(employee_id, date) cho attendance (tránh duplicate khi chấm công)
-- 4. CONSTRAINT: Thêm UNIQUE(session_id, bag_number) cho weighing_bags (tránh trùng số bao)
-- =============================================

-- ─────────────────────────────────────────────
-- 1. FIX TRIGGER: Cộng tiền tăng ca vào net_pay
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_attendance_net_pay()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.net_pay := GREATEST(0,
    (NEW.work_shift * NEW.daily_pay)
    + (COALESCE(NEW.overtime_hours, 0) * NEW.daily_pay * 1.5 / 8)
    - COALESCE(NEW.advance_pay, 0)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_net_pay ON attendance;
CREATE TRIGGER trg_attendance_net_pay BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION compute_attendance_net_pay();

-- ─────────────────────────────────────────────
-- 2. Cập nhật net_pay cho các bản ghi cũ bị sai (thiếu tăng ca)
-- ─────────────────────────────────────────────
UPDATE attendance
SET net_pay = GREATEST(0,
  (work_shift * daily_pay)
  + (COALESCE(overtime_hours, 0) * daily_pay * 1.5 / 8)
  - COALESCE(advance_pay, 0)
)
WHERE overtime_hours > 0;

-- ─────────────────────────────────────────────
-- 3. UNIQUE constraints tránh duplicate
-- ─────────────────────────────────────────────

-- Trước khi thêm constraint, xoá duplicate nếu có
-- (giữ lại bản ghi có net_pay cao nhất trong mỗi cặp trùng)
DELETE FROM attendance a
USING (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY employee_id, date
    ORDER BY net_pay DESC, created_at DESC
  ) AS rn
  FROM attendance
  WHERE employee_id IS NOT NULL
) ranked
WHERE a.id = ranked.id AND ranked.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_employee_date_uq'
  ) THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_employee_date_uq
      UNIQUE (employee_id, date);
  END IF;
END $$;

-- Xoá duplicate bao cân trùng số thứ tự nếu có
DELETE FROM weighing_bags a
USING (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY session_id, bag_number
    ORDER BY id
  ) AS rn
  FROM weighing_bags
) ranked
WHERE a.id = ranked.id AND ranked.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weighing_bags_session_bag_uq'
  ) THEN
    ALTER TABLE weighing_bags ADD CONSTRAINT weighing_bags_session_bag_uq
      UNIQUE (session_id, bag_number);
  END IF;
END $$;
