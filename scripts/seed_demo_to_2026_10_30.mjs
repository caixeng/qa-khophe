// Seed comprehensive, realistic demo data up to 2026-10-30 for testing & demo.
// Safe to run once on top of the current database snapshot (2026-10-26).
import { resolve } from 'node:path';

const env = process.loadEnvFile
  ? (() => {
      try {
        process.loadEnvFile(resolve('.env'));
      } catch {}
      return process.env;
    })()
  : process.env;

const token = env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error('Missing SUPABASE_ACCESS_TOKEN in .env');
const project = env.SUPABASE_PROJECT_REF || 'ageezcxrthqmmacnrqpf';

async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SQL query failed (${response.status}): ${errText}`);
  }
  return response.json();
}

const sql = `
BEGIN;

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (SELECT auth_id FROM public.users WHERE role = 'admin' AND auth_id IS NOT NULL ORDER BY created_at LIMIT 1),
    'role', 'authenticated'
  )::text,
  true
);

-- 1. Làm sạch & chuẩn hóa Danh bạ đối tác (contacts)
DELETE FROM public.contacts
WHERE name LIKE 'Test Contact%'
  AND id NOT IN (SELECT contact_id FROM public.imports WHERE contact_id IS NOT NULL)
  AND id NOT IN (SELECT contact_id FROM public.exports WHERE contact_id IS NOT NULL)
  AND id NOT IN (SELECT contact_id FROM public.weighing_sessions WHERE contact_id IS NOT NULL);

UPDATE public.contacts SET name = 'Đại lý Đà Nẵng', address = 'Q. Liên Chiểu, Đà Nẵng', default_price_per_kg = 4500 WHERE name = 'Đại lí Đà Nẵnh';
UPDATE public.contacts SET name = 'Đại lý Quảng Trị', address = 'TP. Đông Hà, Quảng Trị', default_price_per_kg = 4500 WHERE name = 'Đại lí - Quãng Trị';
UPDATE public.contacts SET name = 'Đại lý Huế', address = 'TX. Hương Thủy, TT-Huế', default_price_per_kg = 4500 WHERE name = 'Đại lí - Huế';

UPDATE public.contacts
SET type = 'customer', default_price_per_kg = 6000, phone = '0905112233', address = 'KCN Hòa Khánh, Đà Nẵng'
WHERE name = 'Cty Nhựa SH Plus Việt Nam';

UPDATE public.contacts
SET default_price_per_kg = 6000, phone = '0905223344', address = 'KCN Phú Bài, TT-Huế'
WHERE name = 'Nhà máy Nhựa SH Plus Việt Nam' AND type = 'customer';

-- Điền SĐT, địa chỉ và đơn giá mặc định cho các NCC chưa có
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM public.contacts
)
UPDATE public.contacts c
SET
  phone = COALESCE(c.phone, '091' || lpad((3000000 + numbered.rn * 13579)::text, 7, '0')),
  address = COALESCE(c.address, CASE (numbered.rn % 4)
    WHEN 0 THEN 'Khu vực Đà Nẵng'
    WHEN 1 THEN 'Khu vực Quảng Nam'
    WHEN 2 THEN 'Khu vực TT-Huế'
    ELSE 'Khu vực Quảng Trị'
  END),
  default_price_per_kg = CASE
    WHEN c.default_price_per_kg IS NULL OR c.default_price_per_kg <= 0 THEN
      CASE WHEN c.type = 'customer' THEN 6000 ELSE 4500 END
    ELSE c.default_price_per_kg
  END
FROM numbered
WHERE c.id = numbered.id;

-- 2. Chuẩn hóa Nhân sự (employees) — không còn nhân sự lương 0đ
UPDATE public.employees SET daily_salary = 500000, phone = COALESCE(phone, '0905888999'), address = COALESCE(address, 'Đà Nẵng') WHERE name = 'Anh Nam' AND daily_salary <= 0;
UPDATE public.employees SET daily_salary = 350000, phone = COALESCE(phone, '0905666777'), address = COALESCE(address, 'Đà Nẵng') WHERE name = 'Mimi' AND daily_salary <= 0;

WITH emp_num AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn FROM public.employees
)
UPDATE public.employees e
SET
  phone = COALESCE(e.phone, '098' || lpad((2100000 + emp_num.rn * 24681)::text, 7, '0')),
  address = COALESCE(e.address, 'Đà Nẵng')
FROM emp_num
WHERE e.id = emp_num.id;

-- 3. Cấu hình Tồn kho đầu kỳ (01/08/2026) và tham số hệ thống
INSERT INTO public.settings (key, value, updated_at) VALUES
  ('opening_stock_kg', '42000', now()),
  ('opening_raw_stock_kg', '35000', now()),
  ('low_stock_threshold_kg', '30000', now()),
  ('kg_per_bag', '900', now()),
  ('overtime_multiplier', '1.5', now()),
  ('loss_warning_pct', '5', now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 4. Bổ sung Phiếu Nhập phế (imports) từ 03/10/2026 đến 30/10/2026 (nếu chưa có sau 02/10)
DO $$
DECLARE
  v_admin_id uuid := (SELECT id FROM public.users WHERE role = 'admin' ORDER BY created_at LIMIT 1);
  v_existing_oct int := (SELECT count(*) FROM public.imports WHERE deleted_at IS NULL AND date > '2026-10-02');
  v_suppliers uuid[];
  v_sup_names text[];
  v_idx int;
  v_d date;
  v_qty numeric;
  v_price numeric;
  v_mat text;
  v_pay_status text;
BEGIN
  IF v_existing_oct = 0 THEN
    SELECT array_agg(id), array_agg(name)
    INTO v_suppliers, v_sup_names
    FROM (
      SELECT id, name FROM public.contacts
      WHERE type = 'supplier' AND name IN ('Đỗ Chung', 'E Hoàn', 'A Danh', 'A Sâm', 'E Lý', 'A Ngân', 'Em Hồ', 'Nguyễn Hữu Hội', 'Đại lý Huế', 'Đại lý Quảng Trị')
      ORDER BY name LIMIT 10
    ) s;

    FOR v_idx IN 1..36 LOOP
      v_d := DATE '2026-10-03' + ((v_idx - 1) * 27 / 35);
      -- Đảm bảo ngày 26/10 và 30/10 đều có phiếu nhập
      IF v_idx IN (29, 30) THEN v_d := DATE '2026-10-26'; END IF;
      IF v_idx IN (35, 36) THEN v_d := DATE '2026-10-30'; END IF;

      v_qty := 6200 + ((v_idx * 730) % 4800); -- 6.200 kg -> 10.900 kg / chuyến
      v_price := CASE WHEN (v_idx % 3) = 0 THEN 4600 WHEN (v_idx % 2) = 0 THEN 4500 ELSE 4400 END;
      v_mat := CASE WHEN (v_idx % 2) = 0 THEN 'Tấm nhựa nano' ELSE 'Phế nhựa NVL' END;
      v_pay_status := CASE
        WHEN v_idx >= 33 THEN 'unpaid'
        WHEN v_idx = 32 THEN 'partial'
        ELSE 'paid'
      END;

      INSERT INTO public.imports (
        date, contact_id, material_type, import_type, quantity_kg, price_per_kg,
        payment_status, processing_status, notes, created_by, created_at
      ) VALUES (
        v_d,
        v_suppliers[1 + (v_idx % array_length(v_suppliers, 1))],
        v_mat,
        'nvl',
        v_qty,
        v_price,
        v_pay_status,
        'pending',
        'Nhập ' || lower(v_mat) || ' chuyến #' || v_idx || ' tháng 10',
        v_admin_id,
        (v_d::text || ' 09:30:00+07')::timestamptz
      );
    END LOOP;
  END IF;
END $$;

-- 5. Chuẩn hóa & Bổ sung Phiếu Xay phế (grinding) gắn trực tiếp với các lô nhập từ 01/08 đến 30/10/2026
-- Xóa mềm 2 phiếu xay cũ chưa gắn lô nhập và hao hụt 0% để tránh cảnh báo lỗi trên trang Đối soát
UPDATE public.grinding
SET deleted_at = now()
WHERE deleted_at IS NULL AND import_id IS NULL;

DO $$
DECLARE
  v_admin_id uuid := (SELECT id FROM public.users WHERE role = 'admin' ORDER BY created_at LIMIT 1);
  v_imp record;
  v_seq int := 0;
  v_total_imp int := (SELECT count(*) FROM public.imports WHERE deleted_at IS NULL AND coalesce(import_type, 'nvl') = 'nvl');
  v_loss_pct numeric;
  v_out_kg numeric;
  v_bags int;
  v_worker text;
  v_loss_cat text;
  v_loss_note text;
  v_grind_date date;
BEGIN
  FOR v_imp IN
    SELECT id, date, quantity_kg, material_type
    FROM public.imports
    WHERE deleted_at IS NULL
      AND coalesce(import_type, 'nvl') = 'nvl'
      AND NOT EXISTS (SELECT 1 FROM public.grinding g WHERE g.import_id = public.imports.id AND g.deleted_at IS NULL)
    ORDER BY date ASC, id ASC
  LOOP
    v_seq := v_seq + 1;
    -- Giữ lại 4 lô nhập mới nhất cuối tháng 10 ở trạng thái Chưa xay ('pending') để demo cảnh báo Dashboard
    IF v_seq <= (v_total_imp - 4) THEN
      -- Hao hụt thực tế từ 2.1% đến 4.2%
      v_loss_pct := 2.1 + ((v_seq * 7) % 22) * 0.1;
      v_out_kg := round(v_imp.quantity_kg * (100.0 - v_loss_pct) / 100.0);
      v_bags := greatest(1, round(v_out_kg / 900.0));
      v_worker := CASE (v_seq % 4)
        WHEN 0 THEN 'Anh Tam'
        WHEN 1 THEN 'Phan Xuân Tú'
        WHEN 2 THEN 'Phan Văn Hoàng'
        ELSE 'Trần Quốc Mạnh'
      END;
      v_loss_cat := CASE (v_seq % 4)
        WHEN 0 THEN 'moisture'
        WHEN 1 THEN 'sorting'
        WHEN 2 THEN 'machine'
        ELSE 'transport'
      END;
      v_loss_note := CASE v_loss_cat
        WHEN 'moisture' THEN 'Hao độ ẩm phế nguyên liệu'
        WHEN 'sorting' THEN 'Loại bỏ tạp chất, nẹp kim loại khi phân loại'
        WHEN 'machine' THEN 'Bụi mịn thất thoát qua sàng máy xay'
        ELSE 'Rơi vãi nhẹ khi cẩu hàng lên băng tải'
      END;

      v_grind_date := least(DATE '2026-10-30', v_imp.date + ((v_seq % 2)));
      IF v_imp.date = DATE '2026-10-26' THEN v_grind_date := DATE '2026-10-26'; END IF;

      INSERT INTO public.grinding (
        date, import_id, input_qty_kg, output_qty_kg,
        bags_count, worker, loss_category, loss_notes, notes, created_by, created_at
      ) VALUES (
        v_grind_date,
        v_imp.id,
        v_imp.quantity_kg,
        v_out_kg,
        v_bags,
        v_worker,
        v_loss_cat,
        v_loss_note,
        'Xay lô ' || v_imp.material_type || ' (' || v_bags || ' bao Jumbo)',
        v_admin_id,
        (v_grind_date::text || ' 15:00:00+07')::timestamptz
      );
    END IF;
  END LOOP;
END $$;

-- 6. Bổ sung Phiên cân (weighing_sessions & weighing_bags) và Phiếu Xuất phế (exports) đến 30/10/2026
DO $$
DECLARE
  v_admin_id uuid := (SELECT id FROM public.users WHERE role = 'admin' ORDER BY created_at LIMIT 1);
  v_cust1 uuid := (SELECT id FROM public.contacts WHERE name = 'Cty Nhựa SH Plus Việt Nam' LIMIT 1);
  v_cust2 uuid := (SELECT id FROM public.contacts WHERE name = 'Nhà máy Nhựa SH Plus Việt Nam' AND type = 'customer' LIMIT 1);
  v_existing_exp int := (SELECT count(*) FROM public.exports WHERE deleted_at IS NULL AND date > '2026-09-23');
  v_dates date[] := ARRAY[
    DATE '2026-09-25', DATE '2026-09-29',
    DATE '2026-10-03', DATE '2026-10-07', DATE '2026-10-11',
    DATE '2026-10-15', DATE '2026-10-19', DATE '2026-10-22',
    DATE '2026-10-26', DATE '2026-10-28', DATE '2026-10-30'
  ];
  v_idx int;
  v_d date;
  v_session_id uuid;
  v_cust uuid;
  v_bags int;
  v_bag_idx int;
  v_bag_w numeric;
  v_total_kg numeric;
  v_price numeric;
BEGIN
  -- Gắn contact_id cho các phiên cân cũ chưa có đối tác
  UPDATE public.weighing_sessions SET contact_id = v_cust1 WHERE contact_id IS NULL;

  IF v_existing_exp = 0 THEN
    FOR v_idx IN 1..array_length(v_dates, 1) LOOP
      v_d := v_dates[v_idx];
      v_cust := CASE WHEN (v_idx % 3) = 0 THEN COALESCE(v_cust2, v_cust1) ELSE v_cust1 END;
      v_bags := CASE WHEN (v_idx % 3) = 0 THEN 22 ELSE 24 END;
      v_total_kg := 0;
      v_session_id := gen_random_uuid();

      INSERT INTO public.weighing_sessions (
        id, date, material_type, total_bags, total_kg, tare_kg, contact_id, notes, created_by, created_at
      ) VALUES (
        v_session_id,
        v_d,
        'Cân phế Không ba lết',
        v_bags,
        0,
        0,
        v_cust,
        'Phiên cân xuất hàng chuyến #' || v_idx,
        v_admin_id,
        (v_d::text || ' 14:00:00+07')::timestamptz
      );

      FOR v_bag_idx IN 1..v_bags LOOP
        v_bag_w := 835 + ((v_idx * 17 + v_bag_idx * 23) % 70); -- 835 -> 904 kg/bao
        v_total_kg := v_total_kg + v_bag_w;
        INSERT INTO public.weighing_bags (session_id, bag_number, weight_kg)
        VALUES (v_session_id, v_bag_idx, v_bag_w);
      END LOOP;

      UPDATE public.weighing_sessions SET total_kg = v_total_kg WHERE id = v_session_id;

      v_price := CASE WHEN v_d >= DATE '2026-10-15' THEN 6100 ELSE 6000 END;

      INSERT INTO public.exports (
        date, contact_id, export_type, bags_count, total_kg, price_per_kg,
        payment_status, weighing_session_id, notes, created_by, created_at
      ) VALUES (
        v_d,
        v_cust,
        'thanh_pham',
        v_bags,
        v_total_kg,
        v_price,
        'unpaid',
        v_session_id,
        'Xuất thành phẩm theo phiên cân ' || v_bags || ' bao Jumbo',
        v_admin_id,
        (v_d::text || ' 16:30:00+07')::timestamptz
      );
    END LOOP;
  END IF;
END $$;

-- 7. Ghi nhận Sổ thanh toán Công nợ (payments) cho các phiếu Xuất và Nhập
DO $$
DECLARE
  v_admin_id uuid := (SELECT id FROM public.users WHERE role = 'admin' ORDER BY created_at LIMIT 1);
  v_exp record;
  v_imp record;
  v_seq int := 0;
  v_total_exp int := (SELECT count(*) FROM public.exports WHERE deleted_at IS NULL);
BEGIN
  IF (SELECT count(*) FROM public.payments) = 0 THEN
    -- Thanh toán cho các phiếu Xuất phế:
    -- + Tháng 8 & nửa đầu tháng 9: Đã thu đủ 100%
    -- + Giữ 1 phiếu ngày 17/09 thu 1 phần (để có 1 khoản nợ quá hạn > 30 ngày cho cảnh báo Dashboard)
    -- + Tháng 9 cuối & nửa đầu tháng 10: Đã thu đủ
    -- + 4 phiếu cuối tháng 10 (22/10 - 30/10): Giữ lại chưa thu / thu 1 phần để test Công nợ & Gạch nợ FIFO
    FOR v_exp IN
      SELECT id, date, total_amount
      FROM public.exports
      WHERE deleted_at IS NULL
      ORDER BY date ASC, id ASC
    LOOP
      v_seq := v_seq + 1;
      IF v_exp.date = DATE '2026-09-17' THEN
        -- Trả 1 phần (còn nợ quá hạn 49.300.000đ)
        INSERT INTO public.payments (ref_type, ref_id, amount, date, method, notes, created_by)
        VALUES ('export', v_exp.id, v_exp.total_amount - 49300000, v_exp.date + 5, 'transfer', 'Khách chuyển khoản đợt 1 (còn nợ lại)', v_admin_id);
      ELSIF v_seq <= (v_total_exp - 4) THEN
        INSERT INTO public.payments (ref_type, ref_id, amount, date, method, notes, created_by)
        VALUES ('export', v_exp.id, v_exp.total_amount, least(DATE '2026-10-28', v_exp.date + 3), 'transfer', 'Thu đủ tiền hàng qua chuyển khoản', v_admin_id);
      ELSIF v_seq = (v_total_exp - 3) THEN
        -- Phiếu ngày 22/10: đã thu 80 triệu, còn lại chưa thu
        INSERT INTO public.payments (ref_type, ref_id, amount, date, method, notes, created_by)
        VALUES ('export', v_exp.id, 80000000, v_exp.date + 1, 'transfer', 'Khách tạm ứng trước tiền hàng đợt 1', v_admin_id);
      END IF;
    END LOOP;

    -- Ghi nhận thanh toán cho các phiếu Nhập phế tháng 10 đang ở trạng thái 'partial'
    FOR v_imp IN
      SELECT id, date, total_amount
      FROM public.imports
      WHERE deleted_at IS NULL AND payment_status = 'partial'
    LOOP
      INSERT INTO public.payments (ref_type, ref_id, amount, date, method, notes, created_by)
      VALUES ('import', v_imp.id, round(v_imp.total_amount * 0.5), v_imp.date, 'cash', 'Trả trước 50% tiền phế tại bãi', v_admin_id);
    END LOOP;
  END IF;
END $$;

-- 8. Phân loại & Đối soát Sổ ứng tiền (advances) + Bổ sung Chi phí xưởng (expenses) đến 30/10/2026
DO $$
DECLARE
  v_admin_id uuid := (SELECT id FROM public.users WHERE role = 'admin' ORDER BY created_at LIMIT 1);
  v_adv record;
BEGIN
  -- Phân loại các phiếu ứng cũ đang 'unclassified' sang 'workshop' và tạo hoàn ứng quyết toán
  FOR v_adv IN
    SELECT id, date, amount, person
    FROM public.advances
    WHERE purpose = 'unclassified' AND type IN ('advance', 'ung')
    ORDER BY date ASC
  LOOP
    UPDATE public.advances SET purpose = 'workshop' WHERE id = v_adv.id;
    IF NOT EXISTS (SELECT 1 FROM public.advances r WHERE r.original_advance_id = v_adv.id)
       AND NOT EXISTS (SELECT 1 FROM public.expenses e WHERE e.advance_id = v_adv.id) THEN
      INSERT INTO public.advances (
        date, amount, person, type, purpose, original_advance_id, notes, created_by
      ) VALUES (
        least(DATE '2026-09-28', v_adv.date + 5),
        v_adv.amount,
        v_adv.person,
        'settlement',
        'workshop',
        v_adv.id,
        'Quyết toán hoàn ứng chi phí vận hành xưởng',
        v_admin_id
      );
    END IF;
  END LOOP;

  -- Bổ sung Chi phí xưởng từ 25/09 đến 30/10/2026 nếu chưa có
  IF (SELECT count(*) FROM public.expenses WHERE date > '2026-09-23') = 0 THEN
    INSERT INTO public.expenses (date, category, amount, description, notes, created_by) VALUES
      ('2026-09-26', 'blade', 3200000, 'Mài và thay bộ lưỡi dao máy xay lớn', 'Xưởng cơ khí Hòa Khánh', v_admin_id),
      ('2026-09-29', 'fuel', 1450000, 'Mua dầu DO chạy xe nâng cuối tháng 9', 'Cây xăng Hòa Hiệp', v_admin_id),
      ('2026-10-02', 'other', 8500000, 'Tiền điện sản xuất xưởng phế kỳ tháng 09/2026', 'Điện lực Liên Chiểu', v_admin_id),
      ('2026-10-04', 'parts', 2150000, 'Thay dây curoa và bạc đạn trục máy xay số 1', 'Vật tư cơ khí Minh Phát', v_admin_id),
      ('2026-10-07', 'fuel', 1680000, 'Đổ dầu xe nâng và xe tải nội bộ', 'Phiếu xăng dầu #102', v_admin_id),
      ('2026-10-10', 'maintenance', 2800000, 'Bảo dưỡng hệ thống tủ điện 3 pha và bơm nước làm mát', 'Thợ điện công nghiệp', v_admin_id),
      ('2026-10-13', 'oil', 950000, 'Mua nhớt thủy lực và mỡ bò tra ổ bi máy xay', 'Cửa hàng dầu nhờn Quốc Bảo', v_admin_id),
      ('2026-10-16', 'blade', 1800000, 'Mài 2 bộ dao máy xay nhựa', 'Gia công mài phẳng', v_admin_id),
      ('2026-10-19', 'transport', 3500000, 'Thuê xe cẩu hỗ trợ bốc dỡ lô tấm nhựa nano', 'Vận tải Tuấn Hùng', v_admin_id),
      ('2026-10-21', 'fuel', 1750000, 'Mua dầu DO xe nâng đợt 3 tháng 10', 'Cây xăng Hòa Hiệp', v_admin_id),
      ('2026-10-24', 'parts', 4200000, 'Mua 200 vỏ bao Jumbo 1 tấn đóng hàng xuất', 'Bao bì công nghiệp Miền Trung', v_admin_id),
      ('2026-10-26', 'maintenance', 1250000, 'Vệ sinh công nghiệp và cân chỉnh sàng máy xay', 'Chi phí bảo trì định kỳ', v_admin_id),
      ('2026-10-28', 'fuel', 1600000, 'Đổ dầu DO xe nâng cuối tháng 10', 'Cây xăng Hòa Hiệp', v_admin_id),
      ('2026-10-30', 'other', 9200000, 'Tạm tính tiền điện sản xuất và nước xưởng tháng 10/2026', 'Hóa đơn điện nước tháng 10', v_admin_id);
  END IF;

  -- Thêm 1 phiếu ứng mới cuối tháng 10 để demo
  IF (SELECT count(*) FROM public.advances WHERE date >= '2026-10-01') = 0 THEN
    INSERT INTO public.advances (date, amount, person, type, purpose, notes, created_by) VALUES
      ('2026-10-28', 5000000, 'Phan Xuân Tú', 'advance', 'workshop', 'Ứng tiền chi mua vật tư phụ và tiếp khách bãi cuối tháng 10', v_admin_id);
  END IF;
END $$;

-- 9. Bổ sung Chấm công (attendance) từ 22/09 đến 30/10/2026 & Chốt lương tháng 08, 09/2026
DO $$
DECLARE
  v_admin_id uuid := (SELECT id FROM public.users WHERE role = 'admin' ORDER BY created_at LIMIT 1);
  v_emp record;
  v_d date;
  v_dow int;
  v_ot numeric;
  v_adv numeric;
BEGIN
  IF (SELECT count(*) FROM public.attendance WHERE date > '2026-09-21' AND work_shift > 0) = 0 THEN
    FOR v_emp IN
      SELECT id, name, daily_salary
      FROM public.employees
      WHERE status = 'active' AND name NOT IN ('Anh Nam', 'Mimi')
      ORDER BY name
    LOOP
      v_d := DATE '2026-09-22';
      WHILE v_d <= DATE '2026-10-30' LOOP
        v_dow := extract(dow FROM v_d);
        -- Nghỉ Chủ nhật (dow = 0), đi làm Thứ 2 -> Thứ 7
        IF v_dow <> 0 THEN
          v_ot := CASE WHEN (extract(day FROM v_d)::int % 5) = 0 THEN 2 ELSE 0 END;
          v_adv := CASE WHEN v_d = DATE '2026-10-15' AND v_emp.name IN ('Anh Tam', 'Phan Xuân Tú', 'Trần Quốc Mạnh') THEN 2000000 ELSE 0 END;

          INSERT INTO public.attendance (
            date, employee_id, employee_name_snapshot, work_shift, overtime_hours, overtime_multiplier,
            daily_pay, advance_pay, payment_status, notes, created_by
          ) VALUES (
            v_d,
            v_emp.id,
            v_emp.name,
            1,
            v_ot,
            1.5,
            v_emp.daily_salary,
            v_adv,
            'unpaid',
            CASE WHEN v_ot > 0 THEN 'Làm đủ công + tăng ca ' || v_ot || 'h' ELSE 'Làm đủ công ngày' END,
            v_admin_id
          );
        END IF;
        v_d := v_d + 1;
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- Chốt lương kỳ 2026-08 và 2026-09 (giữ kỳ 2026-10 chưa chốt để test trên giao diện)
DO $$
DECLARE
  v_admin_id uuid := (SELECT id FROM public.users WHERE role = 'admin' ORDER BY created_at LIMIT 1);
  v_emp record;
  v_period date;
  v_end date;
  v_gross numeric;
  v_adv numeric;
  v_net numeric;
  v_open numeric;
  v_settle_id uuid;
BEGIN
  FOREACH v_period IN ARRAY ARRAY[DATE '2026-08-01', DATE '2026-09-01'] LOOP
    v_end := (v_period + interval '1 month')::date;
    FOR v_emp IN SELECT id FROM public.employees ORDER BY id LOOP
      IF NOT EXISTS (SELECT 1 FROM public.payroll_settlements WHERE employee_id = v_emp.id AND period = v_period) THEN
        SELECT coalesce(closing_balance, 0) INTO v_open
        FROM public.payroll_settlements
        WHERE employee_id = v_emp.id AND period < v_period
        ORDER BY period DESC LIMIT 1;
        v_open := coalesce(v_open, 0);

        IF EXISTS (SELECT 1 FROM public.attendance WHERE employee_id = v_emp.id AND date >= v_period AND date < v_end) OR v_open <> 0 THEN
          SELECT
            coalesce(sum(round(work_shift * daily_pay + coalesce(overtime_hours, 0) * daily_pay * overtime_multiplier / 8)), 0),
            coalesce(sum(advance_pay), 0),
            coalesce(sum(net_pay) FILTER (WHERE payment_status <> 'paid'), 0)
          INTO v_gross, v_adv, v_net
          FROM public.attendance
          WHERE employee_id = v_emp.id AND date >= v_period AND date < v_end;

          INSERT INTO public.payroll_settlements (
            employee_id, period, gross_amount, advance_amount, net_amount,
            opening_balance, cash_paid, closing_balance, paid_at, paid_by, notes
          ) VALUES (
            v_emp.id, v_period, v_gross, v_adv, v_net,
            v_open, greatest(v_open + v_net, 0), least(v_open + v_net, 0),
            now(), v_admin_id, 'Quyết toán lương định kỳ tháng ' || to_char(v_period, 'MM/YYYY')
          ) RETURNING id INTO v_settle_id;

          UPDATE public.attendance
          SET payment_status = 'paid', paid_at = now(), paid_by = v_admin_id, payroll_settlement_id = v_settle_id
          WHERE employee_id = v_emp.id AND date < v_end AND payment_status <> 'paid';
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 10. Bổ sung Phiếu Kiểm kê kho (stock_counts) cuối tháng 08, 09, 10/2026
DO $$
DECLARE
  v_admin_id uuid := (SELECT id FROM public.users WHERE role = 'admin' ORDER BY created_at LIMIT 1);
  v_inv jsonb := public.get_inventory_summary();
  v_sys_kg numeric := coalesce((v_inv->>'currentStockKg')::numeric, 0);
  v_sys_bags int := greatest(0, round(v_sys_kg / 900.0));
BEGIN
  IF (SELECT count(*) FROM public.stock_counts WHERE date > '2026-08-07') = 0 THEN
    INSERT INTO public.stock_counts (date, counted_bags, counted_kg, system_kg, notes, created_by) VALUES
      ('2026-08-31', 58, 52100, 52220, 'Kiểm kê định kỳ cuối tháng 08/2026 — lệch nhẹ do độ ẩm', v_admin_id),
      ('2026-09-30', 74, 66550, 66480, 'Kiểm kê định kỳ cuối tháng 09/2026 — khớp thực tế kho', v_admin_id),
      ('2026-10-30', v_sys_bags, v_sys_kg - 45, v_sys_kg, 'Kiểm kê tổng kết cuối tháng 10/2026 trước khi chốt sổ tháng 11', v_admin_id);
  END IF;
END $$;

COMMIT;
`;

await query(sql);

const [summary] = await query(`
  SELECT
    public.get_inventory_summary() AS inventory,
    (SELECT count(*) FROM public.imports WHERE deleted_at IS NULL) AS active_imports,
    (SELECT max(date) FROM public.imports WHERE deleted_at IS NULL) AS max_import_date,
    (SELECT count(*) FROM public.grinding WHERE deleted_at IS NULL) AS active_grinding,
    (SELECT max(date) FROM public.grinding WHERE deleted_at IS NULL) AS max_grinding_date,
    (SELECT count(*) FROM public.exports WHERE deleted_at IS NULL) AS active_exports,
    (SELECT max(date) FROM public.exports WHERE deleted_at IS NULL) AS max_export_date,
    (SELECT count(*) FROM public.weighing_sessions) AS total_sessions,
    (SELECT count(*) FROM public.payments) AS total_payments,
    (SELECT count(*) FROM public.expenses) AS total_expenses,
    (SELECT count(*) FROM public.attendance) AS total_attendance,
    (SELECT count(*) FROM public.payroll_settlements) AS total_settlements,
    (SELECT count(*) FROM public.stock_counts) AS total_stock_counts
`);

console.log('Seed demo data up to 2026-10-30 completed successfully:');
console.log(JSON.stringify(summary, null, 2));
