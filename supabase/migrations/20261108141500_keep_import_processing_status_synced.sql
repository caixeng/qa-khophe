-- =============================================================================
-- Migration: Keep imports.processing_status synced when updating imports
-- =============================================================================
-- Khi người dùng mở form Sửa phiếu nhập (hoặc lưu từ tab đang mở trước đó),
-- payload gửi lên có thể mang processing_status = 'pending' cũ làm ghi đè trạng thái
-- 'done' / 'grinding' đã được đồng bộ tự động từ bảng grinding.
-- Trigger BEFORE UPDATE trên bảng imports đảm bảo:
--   - Nếu tổng lượng đã đưa vào xay (SUM(input_qty_kg)) >= quantity_kg -> luôn là 'done'
--   - Nếu 0 < SUM(input_qty_kg) < quantity_kg và đang gửi 'pending' -> tự chuyển 'grinding'
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_import_processing_status_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used_kg NUMERIC;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR COALESCE(NEW.import_type, 'nvl') = 'thanh_pham' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(input_qty_kg), 0)
    INTO v_used_kg
    FROM public.grinding
   WHERE import_id = NEW.id
     AND deleted_at IS NULL;

  IF COALESCE(NEW.quantity_kg, 0) > 0 AND v_used_kg >= NEW.quantity_kg THEN
    NEW.processing_status := 'done';
  ELSIF v_used_kg > 0 AND v_used_kg < COALESCE(NEW.quantity_kg, 0) AND NEW.processing_status = 'pending' THEN
    NEW.processing_status := 'grinding';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_import_processing_status_on_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_import_processing_status ON public.imports;
CREATE TRIGGER trg_enforce_import_processing_status
  BEFORE UPDATE ON public.imports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_import_processing_status_on_update();

-- Đồng bộ lại toàn bộ các lô NVL đã xay hết nhưng trạng thái bị lệch
UPDATE public.imports i
   SET processing_status = 'done'
 WHERE i.deleted_at IS NULL
   AND COALESCE(i.import_type, 'nvl') = 'nvl'
   AND COALESCE(i.quantity_kg, 0) > 0
   AND i.processing_status <> 'done'
   AND COALESCE((
     SELECT SUM(g.input_qty_kg)
       FROM public.grinding g
      WHERE g.import_id = i.id
        AND g.deleted_at IS NULL
   ), 0) >= i.quantity_kg;
