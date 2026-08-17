-- task_notifications UPDATE RLS politikasi sadece satir sahipligini kontrol ediyordu
-- (auth.uid() = user_id), hangi KOLONLARIN degistirilebilecegini degil. Politika yorumu
-- "kullanici sadece response/responded_at gunceller" diyordu ama bunu zorlayan bir mekanizma
-- yoktu -- kullanici notification_type/scheduled_for/sent_at gibi backend'e ozel alanlari da
-- REST uzerinden dogrudan degistirebilirdi. Postgres RLS kolon bazli kisitlama desteklemedigi
-- icin bunu bir BEFORE UPDATE trigger ile zorluyoruz.

CREATE OR REPLACE FUNCTION public.task_notifications_lock_backend_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Backend (service role, Faz 2'nin scheduler'i) bu kilidin disinda tutulur --
  -- kisit sadece normal kullanici oturumlari (authenticated) icin gecerli.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.task_id IS DISTINCT FROM OLD.task_id
     OR NEW.notification_type IS DISTINCT FROM OLD.notification_type
     OR NEW.scheduled_for IS DISTINCT FROM OLD.scheduled_for
     OR NEW.sent_at IS DISTINCT FROM OLD.sent_at
  THEN
    RAISE EXCEPTION 'Bu alanlar yalnizca backend tarafindan degistirilebilir';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS task_notifications_column_lock ON public.task_notifications;
CREATE TRIGGER task_notifications_column_lock
  BEFORE UPDATE ON public.task_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.task_notifications_lock_backend_columns();
