-- =============================================================================
-- Migration: Smart Import Processing Status Sync on Partial vs Full Grinding
-- =============================================================================
-- Trước đây: sync_import_processing_status() chuyển thẳng imports.processing_status
-- từ 'pending' sang 'done' ngay khi có bất kỳ 1 phiếu xay nào tham chiếu tới lô,
-- kể cả khi mới xay 1 mẻ nhỏ (ví dụ 11.290 kg / 37.132 kg).
--
-- Nay: Đối chiếu tổng khối lượng đã đưa vào xay (SUM(input_qty_kg)) với
-- khối lượng lô nhập (imports.quantity_kg):
--   1. Chưa xay (used = 0)            -> 'pending' (nếu trước đó là 'done')
--   2. Đang xay dở (0 < used < total) -> 'grinding' ("Đang xay")
--   3. Đã xay hết (used >= total)     -> 'done' ("Hoàn thành")
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_import_processing_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
  v_total_kg NUMERIC;
  v_used_kg NUMERIC;
BEGIN
  FOR target_id IN
    SELECT DISTINCT id FROM (
      SELECT NEW.import_id AS id WHERE TG_OP IN ('INSERT', 'UPDATE') AND NEW.import_id IS NOT NULL
      UNION
      SELECT OLD.import_id AS id WHERE TG_OP IN ('UPDATE', 'DELETE') AND OLD.import_id IS NOT NULL
    ) affected
  LOOP
    SELECT coalesce(quantity_kg, 0)
      INTO v_total_kg
      FROM public.imports
     WHERE id = target_id
       AND deleted_at IS NULL;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    SELECT coalesce(sum(input_qty_kg), 0)
      INTO v_used_kg
      FROM public.grinding
     WHERE import_id = target_id
       AND deleted_at IS NULL;

    IF v_used_kg <= 0 THEN
      UPDATE public.imports
         SET processing_status = 'pending'
       WHERE id = target_id
         AND processing_status = 'done';
    ELSIF v_total_kg > 0 AND v_used_kg < v_total_kg THEN
      UPDATE public.imports
         SET processing_status = 'grinding'
       WHERE id = target_id
         AND processing_status IN ('pending', 'done');
    ELSE
      UPDATE public.imports
         SET processing_status = 'done'
       WHERE id = target_id
         AND processing_status IN ('pending', 'grinding');
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_import_processing_status() FROM PUBLIC, anon, authenticated;
