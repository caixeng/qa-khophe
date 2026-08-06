-- =============================================
-- QA KHOPHE — Migration 009: Bảng giá riêng theo đối tác
--
-- Chạy sau 008. An toàn khi chạy lại nhiều lần.
--
-- Vì sao cần: giá nhập/xuất đang hardcode 4.000 và 6.000 đ/kg trong form, trong
-- khi thực tế mỗi nhà cung cấp một giá và giá thay đổi theo thời điểm (dữ liệu
-- sổ tay đã có cả 4.000 lẫn 4.500). Người nhập phải sửa tay mỗi phiếu, và chỉ
-- cần quên một lần là sai tiền của cả lô.
-- =============================================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS default_price_per_kg NUMERIC(12, 2);

COMMENT ON COLUMN contacts.default_price_per_kg IS
  'Giá mặc định đ/kg cho đối tác này. Với nhà cung cấp là giá nhập, với khách hàng là giá xuất. NULL = dùng giá chung trong cài đặt.';

-- Giá không thể âm. Không đặt CHECK > 0 vì NULL (chưa cấu hình) là hợp lệ.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_default_price_non_negative'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_default_price_non_negative
      CHECK (default_price_per_kg IS NULL OR default_price_per_kg >= 0);
  END IF;
END $$;

-- ---------------------------------------------
-- Điền giá khởi tạo từ lịch sử giao dịch thật.
--
-- Lấy đơn giá của phiếu GẦN NHẤT thay vì giá trung bình: giá phế biến động
-- theo thị trường, nên lần giao dịch gần nhất mới là con số đáng dùng làm
-- mặc định cho lần tới. Chỉ điền cho đối tác chưa có giá, để không ghi đè
-- những giá đã được cấu hình tay.
-- ---------------------------------------------
UPDATE contacts c
SET default_price_per_kg = latest.price_per_kg
FROM (
  SELECT DISTINCT ON (contact_id) contact_id, price_per_kg
  FROM imports
  WHERE contact_id IS NOT NULL
    AND deleted_at IS NULL
    AND price_per_kg > 0
  ORDER BY contact_id, date DESC, created_at DESC
) latest
WHERE c.id = latest.contact_id
  AND c.type = 'supplier'
  AND c.default_price_per_kg IS NULL;

UPDATE contacts c
SET default_price_per_kg = latest.price_per_kg
FROM (
  SELECT DISTINCT ON (contact_id) contact_id, price_per_kg
  FROM exports
  WHERE contact_id IS NOT NULL
    AND deleted_at IS NULL
    AND price_per_kg > 0
  ORDER BY contact_id, date DESC, created_at DESC
) latest
WHERE c.id = latest.contact_id
  AND c.type IN ('customer', 'partner')
  AND c.default_price_per_kg IS NULL;

-- ---------------------------------------------
-- Báo cáo kết quả — đọc tab Results sau khi chạy
-- ---------------------------------------------
SELECT
  type AS "Loại đối tác",
  count(*) AS "Tổng",
  count(default_price_per_kg) AS "Đã có giá mặc định"
FROM contacts
GROUP BY type
ORDER BY type;
