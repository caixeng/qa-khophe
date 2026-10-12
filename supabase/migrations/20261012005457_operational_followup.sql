CREATE OR REPLACE FUNCTION public.set_business_settings(p_loss numeric,p_overtime numeric,p_raw_open numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Chỉ quản trị được sửa cấu hình' USING ERRCODE='42501'; END IF;
  IF p_loss IS NULL OR p_loss NOT BETWEEN 0 AND 100 OR p_overtime IS NULL OR p_overtime NOT BETWEEN 1 AND 5
    OR p_raw_open IS NULL OR p_raw_open<0 THEN RAISE EXCEPTION 'Cấu hình không hợp lệ' USING ERRCODE='23514'; END IF;
  INSERT INTO public.settings(key,value) VALUES ('loss_warning_pct',p_loss::text),('overtime_multiplier',p_overtime::text),('opening_raw_stock_kg',p_raw_open::text)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.set_business_settings(numeric,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_business_settings(numeric,numeric,numeric) TO authenticated;
CREATE OR REPLACE FUNCTION public.snapshot_stock_count()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
  NEW.system_kg:=(public.get_inventory_summary()->>'currentStockKg')::numeric;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_snapshot_stock_count BEFORE INSERT ON public.stock_counts FOR EACH ROW EXECUTE FUNCTION public.snapshot_stock_count();
REVOKE ALL ON FUNCTION public.snapshot_stock_count() FROM PUBLIC,anon,authenticated;
