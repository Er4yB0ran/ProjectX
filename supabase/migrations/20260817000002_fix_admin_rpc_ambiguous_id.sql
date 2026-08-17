-- admin_list_users ve admin_get_user_tasks, IF NOT EXISTS kontrolünde "id = auth.uid()" ifadesini
-- niteliksiz (unqualified) kullanıyordu. Fonksiyonların çıktı sütunlarında da bir "id" bulunduğu için
-- (RETURNS TABLE(id UUID, ...) ve RETURNS SETOF tasks — tasks.id) PL/pgSQL bunu "column reference
-- id is ambiguous" hatasıyla reddediyordu. profiles.id olarak nitelendirilerek düzeltildi.
--
-- Ayrıca admin_list_users, profiles.created_at diye var olmayan bir kolona referans veriyordu
-- (profiles tablosunda böyle bir kolon hiç yok) — kayıt tarihi için auth.users.created_at kullanılıyor.

CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
  id                    UUID,
  email                 TEXT,
  full_name             TEXT,
  onboarding_completed  BOOLEAN,
  created_at            TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    u.email::TEXT,
    p.full_name,
    p.onboarding_completed,
    u.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION admin_get_user_tasks(p_user_id UUID)
RETURNS SETOF tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;

  RETURN QUERY
  SELECT * FROM public.tasks
  WHERE user_id = p_user_id
  ORDER BY task_date DESC, start_time ASC NULLS LAST;
END;
$$;
