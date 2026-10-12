BEGIN;
CREATE OR REPLACE FUNCTION public.guard_posted_advance_amount() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF OLD.type IN ('advance','ung') AND NEW.amount IS DISTINCT FROM OLD.amount AND public.advance_used_amount(OLD.id)>0 THEN
  RAISE EXCEPTION 'Khoản đã đối soát/hoàn ứng không được đổi số tiền; ghi phiếu ứng bổ sung' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_posted_advance_amount BEFORE UPDATE ON public.advances FOR EACH ROW EXECUTE FUNCTION public.guard_posted_advance_amount();
REVOKE ALL ON FUNCTION public.guard_posted_advance_amount() FROM PUBLIC,anon,authenticated;
COMMIT;
