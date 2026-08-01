-- =============================================
-- QA KHOPHE — Migration 007: Seed dữ liệu sổ tay thực tế
-- Paste vào Supabase SQL Editor SAU khi đã chạy migration 003-006.
-- Chuyển toàn bộ dữ liệu đang hardcode trong code (sổ tay tháng 6-7/2026)
-- vào database thật. An toàn để chạy lại nhiều lần (idempotent theo notes).
-- =============================================

-- 1. CONTACTS
INSERT INTO contacts (name, type, phone, address, notes)
SELECT 'Em Hoàn', 'supplier', '0912345678', NULL, 'Nhà cung cấp phế (1.796 kg ngày 28/07)'
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE name = 'Em Hoàn');
INSERT INTO contacts (name, type, phone, address, notes)
SELECT 'Đà Nẵng', 'supplier', NULL, NULL, 'Nguồn phế Đà Nẵng (7.445 kg ngày 28/07)'
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE name = 'Đà Nẵng');
INSERT INTO contacts (name, type, phone, address, notes)
SELECT 'Nhà máy Nhựa Việt', 'customer', NULL, 'KCN Sóng Thần', 'Khách mua phế xuất (18 bao ngày 28/07)'
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE name = 'Nhà máy Nhựa Việt');
INSERT INTO contacts (name, type, notes)
SELECT 'Nga', 'supplier', 'Tự động thêm từ dữ liệu sổ nhập phế'
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE name = 'Nga');
INSERT INTO contacts (name, type, notes)
SELECT 'Chị Hoan', 'supplier', 'Tự động thêm từ dữ liệu sổ nhập phế'
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE name = 'Chị Hoan');
INSERT INTO contacts (name, type, notes)
SELECT 'A Danh', 'supplier', 'Tự động thêm từ dữ liệu sổ nhập phế'
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE name = 'A Danh');
INSERT INTO contacts (name, type, notes)
SELECT 'A Ngâu', 'supplier', 'Tự động thêm từ dữ liệu sổ nhập phế'
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE name = 'A Ngâu');
INSERT INTO contacts (name, type, notes)
SELECT 'Đỗ Chung', 'supplier', 'Tự động thêm từ dữ liệu sổ nhập phế'
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE name = 'Đỗ Chung');
INSERT INTO contacts (name, type, notes)
SELECT 'Ph. Tuấn', 'supplier', 'Tự động thêm từ dữ liệu sổ nhập phế'
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE name = 'Ph. Tuấn');
INSERT INTO contacts (name, type, notes)
SELECT 'A Sâm', 'supplier', 'Tự động thêm từ dữ liệu sổ nhập phế'
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE name = 'A Sâm');
INSERT INTO contacts (name, type, notes)
SELECT 'Em Hồ', 'supplier', 'Tự động thêm từ dữ liệu sổ nhập phế'
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE name = 'Em Hồ');

-- 2. IMPORTS (nhập phế) — total_amount tự tính (generated column)
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-06-28', (SELECT id FROM contacts WHERE name = 'Em Hoàn' LIMIT 1), 1395, 'Tấm nhựa nano', 4000, 'paid', 'done', 'R Hoàn (Xay 29/06: 1.412kg)'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-06-28' AND quantity_kg = 1395 AND notes = 'R Hoàn (Xay 29/06: 1.412kg)');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-06-29', (SELECT id FROM contacts WHERE name = 'Nga' LIMIT 1), 2280, 'Tấm nhựa nano', 4000, 'paid', 'done', 'R Nga (Xay 29-30/06: 2.248kg)'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-06-29' AND quantity_kg = 2280 AND notes = 'R Nga (Xay 29-30/06: 2.248kg)');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-06-29', (SELECT id FROM contacts WHERE name = 'Em Hoàn' LIMIT 1), 2505, 'Tấm nhựa nano', 4000, 'paid', 'done', 'R Hoàn (Xay 30/06: 2.486kg)'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-06-29' AND quantity_kg = 2505 AND notes = 'R Hoàn (Xay 30/06: 2.486kg)');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-06-29', (SELECT id FROM contacts WHERE name = 'Chị Hoan' LIMIT 1), 1635, 'Tấm nhựa nano', 4000, 'paid', 'done', 'R CHoan (Xay 30/06: 1.521kg)'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-06-29' AND quantity_kg = 1635 AND notes = 'R CHoan (Xay 30/06: 1.521kg)');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-02', (SELECT id FROM contacts WHERE name = 'Em Hoàn' LIMIT 1), 2280, 'Tấm nhựa nano', 4000, 'paid', 'pending', 'chưa R Hoàn'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-02' AND quantity_kg = 2280 AND notes = 'chưa R Hoàn');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-04', (SELECT id FROM contacts WHERE name = 'A Danh' LIMIT 1), 1870, 'Tấm nhựa nano', 4000, 'paid', 'pending', 'chưa R A Danh'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-04' AND quantity_kg = 1870 AND notes = 'chưa R A Danh');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-06', (SELECT id FROM contacts WHERE name = 'Em Hoàn' LIMIT 1), 1920, 'Tấm nhựa nano', 4000, 'paid', 'pending', 'chưa R Hoàn'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-06' AND quantity_kg = 1920 AND notes = 'chưa R Hoàn');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-10', (SELECT id FROM contacts WHERE name = 'Em Hoàn' LIMIT 1), 1820, 'Tấm nhựa nano', 4000, 'paid', 'pending', 'chưa R Hoàn'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-10' AND quantity_kg = 1820 AND notes = 'chưa R Hoàn');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-12', (SELECT id FROM contacts WHERE name = 'Em Hoàn' LIMIT 1), 1045, 'Tấm nhựa nano', 4000, 'paid', 'pending', 'chưa R Hoàn'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-12' AND quantity_kg = 1045 AND notes = 'chưa R Hoàn');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-12', (SELECT id FROM contacts WHERE name = 'A Ngâu' LIMIT 1), 1170, 'Tấm nhựa nano', 4000, 'paid', 'pending', 'chưa R A Ngân (Ứng 5.000.000đ)'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-12' AND quantity_kg = 1170 AND notes = 'chưa R A Ngân (Ứng 5.000.000đ)');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-17', (SELECT id FROM contacts WHERE name = 'Đỗ Chung' LIMIT 1), 4840, 'Tấm nhựa nano', 4000, 'paid', 'pending', 'chưa R Đỗ Chung'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-17' AND quantity_kg = 4840 AND notes = 'chưa R Đỗ Chung');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-17', (SELECT id FROM contacts WHERE name = 'Ph. Tuấn' LIMIT 1), 865, 'Tấm nhựa nano', 4000, 'paid', 'done', 'chưa R Ph.Tuấn (Xay 17/07: 855kg)'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-17' AND quantity_kg = 865 AND notes = 'chưa R Ph.Tuấn (Xay 17/07: 855kg)');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-18', (SELECT id FROM contacts WHERE name = 'Em Hoàn' LIMIT 1), 1740, 'Tấm nhựa nano', 4000, 'paid', 'pending', 'chưa R Hoàn'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-18' AND quantity_kg = 1740 AND notes = 'chưa R Hoàn');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-20', (SELECT id FROM contacts WHERE name = 'Chị Hoan' LIMIT 1), 4195, 'Tấm nhựa nano', 4000, 'paid', 'pending', 'chưa R Chị Hoan'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-20' AND quantity_kg = 4195 AND notes = 'chưa R Chị Hoan');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-20', (SELECT id FROM contacts WHERE name = 'A Sâm' LIMIT 1), 1240, 'Tấm nhựa nano', 4000, 'paid', 'pending', 'chưa R A Sâm'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-20' AND quantity_kg = 1240 AND notes = 'chưa R A Sâm');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-21', (SELECT id FROM contacts WHERE name = 'Em Hoàn' LIMIT 1), 1350, 'Tấm nhựa nano', 4000, 'unpaid', 'pending', 'chưa R E Hoàn'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-21' AND quantity_kg = 1350 AND notes = 'chưa R E Hoàn');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-22', (SELECT id FROM contacts WHERE name = 'Em Hoàn' LIMIT 1), 790, 'Tấm nhựa nano', 4000, 'unpaid', 'pending', 'chưa R Em Hoàn'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-22' AND quantity_kg = 790 AND notes = 'chưa R Em Hoàn');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-24', (SELECT id FROM contacts WHERE name = 'A Danh' LIMIT 1), 2455, 'Tấm nhựa nano', 4000, 'unpaid', 'pending', 'chưa R A Danh'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-24' AND quantity_kg = 2455 AND notes = 'chưa R A Danh');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-26', (SELECT id FROM contacts WHERE name = 'Nga' LIMIT 1), 3695, 'Tấm nhựa nano', 4000, 'unpaid', 'pending', 'chưa R Nga'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-26' AND quantity_kg = 3695 AND notes = 'chưa R Nga');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-27', (SELECT id FROM contacts WHERE name = 'A Danh' LIMIT 1), 2085, 'Tấm nhựa nano', 4000, 'unpaid', 'pending', 'chưa A Danh'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-27' AND quantity_kg = 2085 AND notes = 'chưa A Danh');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-27', (SELECT id FROM contacts WHERE name = 'Em Hoàn' LIMIT 1), 2060, 'Tấm nhựa nano', 4000, 'unpaid', 'pending', 'chưa Hoàn'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-27' AND quantity_kg = 2060 AND notes = 'chưa Hoàn');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-28', (SELECT id FROM contacts WHERE name = 'Em Hoàn' LIMIT 1), 1796, 'Tấm nhựa nano', 4000, 'paid', 'pending', 'chưa Hoàn'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-28' AND quantity_kg = 1796 AND notes = 'chưa Hoàn');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-28', (SELECT id FROM contacts WHERE name = 'Đà Nẵng' LIMIT 1), 7445, 'Tấm nhựa nano', 4000, 'unpaid', 'pending', 'chưa Đà Nẵng'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-28' AND quantity_kg = 7445 AND notes = 'chưa Đà Nẵng');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-28', (SELECT id FROM contacts WHERE name = 'Em Hoàn' LIMIT 1), 1220, 'Tấm nhựa nano', 4000, 'unpaid', 'pending', 'Nhập phế ngày 28/07 (Sổ trang 1)'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-28' AND quantity_kg = 1220 AND notes = 'Nhập phế ngày 28/07 (Sổ trang 1)');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-29', (SELECT id FROM contacts WHERE name = 'Em Hoàn' LIMIT 1), 1240, 'Tấm nhựa nano', 4000, 'unpaid', 'pending', 'chưa Hoàn (Ngày 29/07)'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-29' AND quantity_kg = 1240 AND notes = 'chưa Hoàn (Ngày 29/07)');
INSERT INTO imports (date, contact_id, quantity_kg, material_type, price_per_kg, payment_status, processing_status, notes)
SELECT '2026-07-30', (SELECT id FROM contacts WHERE name = 'Em Hồ' LIMIT 1), 4750, 'Tấm nhựa nano', 4000, 'unpaid', 'pending', 'Nhập phế E Hồ 4750kg, đã trừ bì 20kg (Huế)'
WHERE NOT EXISTS (SELECT 1 FROM imports WHERE date = '2026-07-30' AND quantity_kg = 4750 AND notes = 'Nhập phế E Hồ 4750kg, đã trừ bì 20kg (Huế)');

-- 3. GRINDING (xay phế) — loss_kg/loss_pct tự tính (generated column)
INSERT INTO grinding (date, input_qty_kg, output_qty_kg, bags_count, worker, notes)
SELECT '2026-06-29', 1395, 1412, 56, 'Hoa', 'R Hoàn (Xay ra 1.412kg, dôi +17kg)'
WHERE NOT EXISTS (SELECT 1 FROM grinding WHERE date = '2026-06-29' AND input_qty_kg = 1395 AND notes = 'R Hoàn (Xay ra 1.412kg, dôi +17kg)');
INSERT INTO grinding (date, input_qty_kg, output_qty_kg, bags_count, worker, notes)
SELECT '2026-06-29', 2280, 2248, 90, 'Hoa', 'R Nga (Xay 29-30/06: 2.248kg)'
WHERE NOT EXISTS (SELECT 1 FROM grinding WHERE date = '2026-06-29' AND input_qty_kg = 2280 AND notes = 'R Nga (Xay 29-30/06: 2.248kg)');
INSERT INTO grinding (date, input_qty_kg, output_qty_kg, bags_count, worker, notes)
SELECT '2026-06-30', 2505, 2496, 100, 'Hoa', 'R Hoàn (Xay 30/06: 2.496kg)'
WHERE NOT EXISTS (SELECT 1 FROM grinding WHERE date = '2026-06-30' AND input_qty_kg = 2505 AND notes = 'R Hoàn (Xay 30/06: 2.496kg)');
INSERT INTO grinding (date, input_qty_kg, output_qty_kg, bags_count, worker, notes)
SELECT '2026-06-30', 1655, 1521, 61, 'Hoa', 'R CHoan (Xay 30/06: 1.521kg)'
WHERE NOT EXISTS (SELECT 1 FROM grinding WHERE date = '2026-06-30' AND input_qty_kg = 1655 AND notes = 'R CHoan (Xay 30/06: 1.521kg)');
INSERT INTO grinding (date, input_qty_kg, output_qty_kg, bags_count, worker, notes)
SELECT '2026-07-17', 865, 855, 34, 'Hoa', 'chưa R Ph.Tuấn (Xay 17/07: 855kg)'
WHERE NOT EXISTS (SELECT 1 FROM grinding WHERE date = '2026-07-17' AND input_qty_kg = 865 AND notes = 'chưa R Ph.Tuấn (Xay 17/07: 855kg)');
INSERT INTO grinding (date, input_qty_kg, output_qty_kg, bags_count, worker, notes)
SELECT '2026-07-28', 16200, 16200, 18, 'Hoa', 'Xay phế 18 bao (tăng ca 1 bao, tích lũy 26 bao trong kho)'
WHERE NOT EXISTS (SELECT 1 FROM grinding WHERE date = '2026-07-28' AND input_qty_kg = 16200 AND notes = 'Xay phế 18 bao (tăng ca 1 bao, tích lũy 26 bao trong kho)');
INSERT INTO grinding (date, input_qty_kg, output_qty_kg, bags_count, worker, notes)
SELECT '2026-07-29', 17100, 17100, 19, 'Hoa', 'Xay phế 19 bao (4 bao, tồn kho 60 bao ngày 29/07)'
WHERE NOT EXISTS (SELECT 1 FROM grinding WHERE date = '2026-07-29' AND input_qty_kg = 17100 AND notes = 'Xay phế 19 bao (4 bao, tồn kho 60 bao ngày 29/07)');

-- 4. EXPORTS (xuất phế) — total_amount tự tính (generated column)
INSERT INTO exports (date, contact_id, bags_count, total_kg, price_per_kg, payment_status, notes)
SELECT '2026-07-28', (SELECT id FROM contacts WHERE name = 'Nhà máy Nhựa Việt' LIMIT 1), 18, 16200, 6000, 'unpaid', 'Xuất phế 18 bao cho Nhà máy Nhựa Việt ngày 28/07/2026'
WHERE NOT EXISTS (SELECT 1 FROM exports WHERE date = '2026-07-28' AND total_kg = 16200 AND notes = 'Xuất phế 18 bao cho Nhà máy Nhựa Việt ngày 28/07/2026');
INSERT INTO exports (date, contact_id, bags_count, total_kg, price_per_kg, payment_status, notes)
SELECT '2026-07-29', (SELECT id FROM contacts WHERE name = 'Nhà máy Nhựa Việt' LIMIT 1), 17, 15300, 6000, 'unpaid', 'Xuất phế 17 bao ngày 29/07/2026'
WHERE NOT EXISTS (SELECT 1 FROM exports WHERE date = '2026-07-29' AND total_kg = 15300 AND notes = 'Xuất phế 17 bao ngày 29/07/2026');

-- 5. WEIGHING SESSIONS + BAGS (phiên cân)
-- Lưu ý: 1 CTE (WITH ins AS ...) chỉ dùng được cho ĐÚNG 1 câu lệnh theo sau,
-- nên phải gộp toàn bộ bao của 1 phiên vào MỘT INSERT duy nhất qua VALUES.
WITH ins AS (
  INSERT INTO weighing_sessions (date, material_type, total_bags, total_kg, notes)
  SELECT '2026-07-30', 'Cân Phế Nam (Không lết)', 25, 21050, 'Không lết - 25 bao phế Nam tổng 21.050 kg (Cân phế Nam 30/07)'
  WHERE NOT EXISTS (SELECT 1 FROM weighing_sessions WHERE date = '2026-07-30' AND notes = 'Không lết - 25 bao phế Nam tổng 21.050 kg (Cân phế Nam 30/07)')
  RETURNING id
)
INSERT INTO weighing_bags (session_id, bag_number, weight_kg, notes)
SELECT ins.id, v.bag_number, v.weight_kg, v.notes
FROM ins, (VALUES
    (1, 960, 'Không tốt'), (2, 711, 'Không tốt'), (3, 973, 'Không tốt'), (4, 856, 'Không tốt'),
    (5, 871, 'Không tốt'), (6, 902, 'Không tốt'), (7, 770, 'Không tốt'), (8, 789, 'Không tốt'),
    (9, 820, 'Không tốt'), (10, 824, 'Không tốt'), (11, 806, 'Không tốt'), (12, 878, 'Không tốt'),
    (13, 849, 'Không tốt'), (14, 821, 'Không tốt'), (15, 819, 'Không tốt'), (16, 894, 'Không tốt'),
    (17, 755, 'Không tốt'), (18, 813, 'Không tốt'), (19, 941, 'Không tốt'), (20, 813, 'Không tốt'),
    (21, 981, 'Không tốt'), (22, 876, 'Không tốt'), (23, 763, 'Không tốt'), (24, 926, 'Không tốt'),
    (25, 739, 'Không tốt')
) AS v(bag_number, weight_kg, notes);

WITH ins AS (
  INSERT INTO weighing_sessions (date, material_type, total_bags, total_kg, notes)
  SELECT '2026-07-29', 'Cân Phế Nam (Không lết)', 24, 20947, 'Không lết - 24 bao phế Nam tổng 20.947 kg (Cân phế Nam 29/07)'
  WHERE NOT EXISTS (SELECT 1 FROM weighing_sessions WHERE date = '2026-07-29' AND notes = 'Không lết - 24 bao phế Nam tổng 20.947 kg (Cân phế Nam 29/07)')
  RETURNING id
)
INSERT INTO weighing_bags (session_id, bag_number, weight_kg, notes)
SELECT ins.id, v.bag_number, v.weight_kg, v.notes
FROM ins, (VALUES
    (1, 844, 'Không tốt'), (2, 722, 'Không tốt'), (3, 990, 'Không tốt'), (4, 734, 'Không tốt'),
    (5, 885, 'Không tốt'), (6, 894, 'Không tốt'), (7, 829, 'Không tốt'), (8, 752, 'Không tốt'),
    (9, 1010, 'Không tốt'), (10, 835, 'Không tốt'), (11, 951, 'Không tốt'), (12, 871, 'Không tốt'),
    (13, 1015, 'Không tốt'), (14, 1009, 'Không tốt'), (15, 900, 'Không tốt'), (16, 836, 'Không tốt'),
    (17, 706, 'Không tốt'), (18, 870, 'Không tốt'), (19, 904, 'Không tốt'), (20, 827, 'Không tốt'),
    (21, 883, 'Không tốt'), (22, 875, 'Không tốt'), (24, 899, 'Không tốt'), (25, 903, 'Không tốt')
) AS v(bag_number, weight_kg, notes);

-- 6. EXPENSES (chi phí)
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-12', 'fuel', 830000, 'Xăng 830.000đ', 'Chi kho 12/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-12' AND amount = 830000 AND notes = 'Chi kho 12/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-13', 'parts', 2000000, '2 trục băng tải 2.000.000đ', 'Chi kho 13/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-13' AND amount = 2000000 AND notes = 'Chi kho 13/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-13', 'other', 85000, 'Thắp hương 85.000đ', 'Chi kho 13/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-13' AND amount = 85000 AND notes = 'Chi kho 13/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-14', 'fuel', 700000, 'Xăng 700.000đ', 'Chi kho 14/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-14' AND amount = 700000 AND notes = 'Chi kho 14/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-15', 'oil', 510000, 'Dầu máy 510.000đ', 'Chi kho 15/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-15' AND amount = 510000 AND notes = 'Chi kho 15/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-16', 'fuel', 400000, 'Xăng 400.000đ', 'Chi kho 16/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-16' AND amount = 400000 AND notes = 'Chi kho 16/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-18', 'fuel', 840000, 'Xăng 840.000đ (4 dao cắt bao phế)', 'Chi kho 18/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-18' AND amount = 840000 AND notes = 'Chi kho 18/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-19', 'other', 285000, '1 gói chè nấu nước 285.000đ', 'Chi kho 19/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-19' AND amount = 285000 AND notes = 'Chi kho 19/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-20', 'fuel', 940000, 'Xăng 940.000đ', 'Chi kho 20/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-20' AND amount = 940000 AND notes = 'Chi kho 20/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-22', 'fuel', 400000, 'Xăng 400.000đ', 'Chi kho 22/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-22' AND amount = 400000 AND notes = 'Chi kho 22/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-24', 'fuel', 700000, 'Xăng 700.000đ', 'Chi kho 24/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-24' AND amount = 700000 AND notes = 'Chi kho 24/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-25', 'fuel', 450000, 'Xăng 450.000đ', 'Chi kho 25/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-25' AND amount = 450000 AND notes = 'Chi kho 25/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-26', 'fuel', 900000, 'Xăng 900.000đ', 'Chi kho 26/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-26' AND amount = 900000 AND notes = 'Chi kho 26/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-27', 'fuel', 850000, 'Xăng 850.000đ', 'Chi kho 27/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-27' AND amount = 850000 AND notes = 'Chi kho 27/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-27', 'other', 85000, 'Thắp hương 85.000đ', 'Chi kho 27/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-27' AND amount = 85000 AND notes = 'Chi kho 27/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-28', 'fuel', 800000, 'Xăng 800.000đ', 'Chi kho 28/07'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-28' AND amount = 800000 AND notes = 'Chi kho 28/07');
INSERT INTO expenses (date, category, amount, description, notes)
SELECT '2026-07-30', 'fuel', 700000, 'Xăng 700.000đ', 'Chi kho 30/07 (Ghi nhận sổ 29/07)'
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE date = '2026-07-30' AND amount = 700000 AND notes = 'Chi kho 30/07 (Ghi nhận sổ 29/07)');

-- 7. ADVANCES (ứng tiền)
INSERT INTO advances (date, amount, person, type, notes)
SELECT '2026-07-18', 10000000, 'Chủ xưởng', 'advance', 'Ứng tiền kho 18/07 (Sổ tháng 7)'
WHERE NOT EXISTS (SELECT 1 FROM advances WHERE date = '2026-07-18' AND amount = 10000000 AND notes = 'Ứng tiền kho 18/07 (Sổ tháng 7)');
INSERT INTO advances (date, amount, person, type, notes)
SELECT '2026-07-24', 5000000, 'Chủ xưởng', 'advance', 'Ứng tiền kho 24/07 (Sổ tháng 7)'
WHERE NOT EXISTS (SELECT 1 FROM advances WHERE date = '2026-07-24' AND amount = 5000000 AND notes = 'Ứng tiền kho 24/07 (Sổ tháng 7)');

-- 8. EMPLOYEES (nhân viên)
INSERT INTO employees (name, role, daily_salary, phone, join_date, status, notes)
SELECT 'Hoa', 'grinder', 350000, '0988123456', '2026-01-15', 'active', 'Thợ xay chính xưởng phế (xay 18 bao ngày 28/07)'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE name = 'Hoa');
INSERT INTO employees (name, role, daily_salary, phone, join_date, status, notes)
SELECT 'Em Hoàn', 'weigher', 350000, '0912345678', '2026-02-01', 'active', 'Thợ phụ trách cân hàng phế'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE name = 'Em Hoàn');
INSERT INTO employees (name, role, daily_salary, phone, join_date, status, notes)
SELECT 'A. Danh', 'driver', 400000, '0901234567', '2026-03-10', 'active', 'Lái xe tải chở phế liệu'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE name = 'A. Danh');

-- 9. ATTENDANCE (chấm công) — net_pay tự tính (trigger)
INSERT INTO attendance (date, employee_id, work_shift, overtime_hours, daily_pay, advance_pay, payment_status, notes)
SELECT '2026-07-28', (SELECT id FROM employees WHERE name = 'Hoa' LIMIT 1), 1, 0, 350000, 0, 'paid', 'Chấm công ngày 28/07 - Xay 18 bao bột phế thành phẩm'
WHERE NOT EXISTS (SELECT 1 FROM attendance WHERE date = '2026-07-28' AND notes = 'Chấm công ngày 28/07 - Xay 18 bao bột phế thành phẩm');
INSERT INTO attendance (date, employee_id, work_shift, overtime_hours, daily_pay, advance_pay, payment_status, notes)
SELECT '2026-07-28', (SELECT id FROM employees WHERE name = 'Em Hoàn' LIMIT 1), 1, 0, 350000, 0, 'unpaid', 'Chấm công ngày 28/07 - Nhận lô phế 1.796 kg'
WHERE NOT EXISTS (SELECT 1 FROM attendance WHERE date = '2026-07-28' AND notes = 'Chấm công ngày 28/07 - Nhận lô phế 1.796 kg');