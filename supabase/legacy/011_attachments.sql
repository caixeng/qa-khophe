-- =============================================
-- QA KHOPHE — Migration 011: Đính kèm ảnh hoá đơn / chuyển khoản cho các phiếu
--
-- Chạy sau 010. An toàn khi chạy lại nhiều lần.
--
-- Vì sao cần: người nhập cân/nhận hàng ngoài xưởng thường có ảnh phiếu cân
-- giấy, hoá đơn viết tay, hoặc ảnh chụp màn hình chuyển khoản — hiện không có
-- chỗ nào lưu lại, nên khi có tranh chấp (giá, khối lượng, đã thanh toán chưa)
-- không có gì đối chiếu ngoài trí nhớ.
--
-- Thiết kế: 1 bảng `attachments` dùng chung cho mọi loại phiếu (như bảng
-- `payments`), thay vì thêm cột ảnh riêng trên từng bảng — một phiếu có thể
-- cần NHIỀU ảnh (ảnh cân + ảnh chuyển khoản), một cột URL duy nhất không đủ.
-- =============================================

-- ---------------------------------------------
-- 1. Storage bucket — KHÔNG public. Ảnh chuyển khoản có thể lộ số tài khoản,
--    không nên phát URL công khai đoán được; truy cập qua signed URL có hạn.
-- ---------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attachments', 'attachments', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "attachments_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "attachments_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "attachments_storage_delete" ON storage.objects;

CREATE POLICY "attachments_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "attachments_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attachments' AND has_any_role());

CREATE POLICY "attachments_storage_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'attachments' AND is_manager_or_admin());

-- ---------------------------------------------
-- 2. Bảng ghi chú metadata (ai đăng, khi nào, gắn với phiếu nào) —
--    storage.objects chỉ giữ file, không tiện query/hiện danh sách theo phiếu.
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_type TEXT NOT NULL CHECK (ref_type IN ('import', 'export', 'expense', 'advance', 'weighing_session')),
  ref_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_ref ON attachments(ref_type, ref_id);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attachments_select" ON attachments;
DROP POLICY IF EXISTS "attachments_insert" ON attachments;
DROP POLICY IF EXISTS "attachments_delete" ON attachments;

CREATE POLICY "attachments_select" ON attachments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "attachments_insert" ON attachments
  FOR INSERT WITH CHECK (has_any_role());

CREATE POLICY "attachments_delete" ON attachments
  FOR DELETE USING (is_manager_or_admin());

-- Dùng lại đúng hàm set_created_by() từ migration 003 (đã áp cho mọi bảng
-- chứng từ khác) — tự gắn người đăng khi client không gửi.
DROP TRIGGER IF EXISTS trg_set_created_by ON attachments;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON attachments
  FOR EACH ROW EXECUTE FUNCTION set_created_by();
