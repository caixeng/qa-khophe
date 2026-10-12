-- =============================================
-- QA KHOPHE — Migration 010: Tự động cập nhật trạng thái xay của lô nhập
--
-- Chạy sau 009. An toàn khi chạy lại nhiều lần.
--
-- Vì sao cần: tạo phiếu xay có chọn "lô phế nhập" (imports.processing_status),
-- nhưng KHÔNG có chỗ nào trong ứng dụng cập nhật lại trạng thái của lô nhập đó
-- sau khi xay xong. Kết quả: cảnh báo "N lô phế chưa xay" trên Dashboard đứng
-- yên vĩnh viễn dù đã xay hết — người quản lý không còn tin vào cảnh báo này
-- nữa. Sửa bằng trigger ở tầng DB thay vì gọi thêm ở client, để đúng bất kể
-- ai/ứng dụng nào ghi vào bảng grinding (kể cả sửa tay qua SQL Editor).
-- =============================================

CREATE OR REPLACE FUNCTION public.sync_import_processing_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
BEGIN
  -- Xét lại TẤT CẢ lô nhập bị ảnh hưởng bởi thay đổi này: lô đang được gán
  -- (NEW.import_id) và lô vừa bị gỡ ra/xoá phiếu xay (OLD.import_id) — cùng
  -- một logic cho INSERT, UPDATE (kể cả đổi lô hoặc xoá mềm deleted_at), và
  -- DELETE thật.
  FOR target_id IN
    SELECT DISTINCT id FROM (
      SELECT NEW.import_id AS id WHERE TG_OP IN ('INSERT', 'UPDATE') AND NEW.import_id IS NOT NULL
      UNION
      SELECT OLD.import_id AS id WHERE TG_OP IN ('UPDATE', 'DELETE') AND OLD.import_id IS NOT NULL
    ) affected
  LOOP
    IF EXISTS (SELECT 1 FROM grinding WHERE import_id = target_id AND deleted_at IS NULL) THEN
      -- Còn ít nhất 1 phiếu xay sống tham chiếu tới lô này → đã xay.
      -- Chỉ chuyển từ 'pending', không đụng vào 'grinding' (trạng thái người
      -- dùng tự chọn tay để đánh dấu "đang xay dở").
      UPDATE imports SET processing_status = 'done'
      WHERE id = target_id AND processing_status = 'pending';
    ELSE
      -- Không còn phiếu xay nào tham chiếu → quay lại chưa xay.
      UPDATE imports SET processing_status = 'pending'
      WHERE id = target_id AND processing_status = 'done';
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_import_processing_status ON grinding;
CREATE TRIGGER trg_sync_import_processing_status
  AFTER INSERT OR UPDATE OR DELETE ON grinding
  FOR EACH ROW EXECUTE FUNCTION sync_import_processing_status();

-- ---------------------------------------------
-- Đồng bộ lại dữ liệu đã có sẵn (một lần, ngay khi chạy migration) — các lô
-- đã thực sự được xay từ trước nhưng đang bị kẹt ở 'pending' vì trigger chưa
-- tồn tại lúc đó.
-- ---------------------------------------------
UPDATE imports i SET processing_status = 'done'
WHERE i.processing_status = 'pending'
  AND EXISTS (SELECT 1 FROM grinding g WHERE g.import_id = i.id AND g.deleted_at IS NULL);
