-- Admin rolü: profiles.is_admin kolonu + admin panel icin iki SECURITY DEFINER RPC.
-- Bu iki fonksiyon RLS'i bypass ediyor; erisim tamamen fonksiyon icindeki admin kontrolu
-- uzerinden saglaniyor, bu yuzden ayrica profiles/tasks uzerinde yeni bir RLS politikasina
-- gerek yok.

ALTER TABLE public.profiles
  ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'erayboranagirdici@gmail.com');

-- Admin panelindeki kullanici listesi: email + profil bilgileri.
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
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    u.email::TEXT,
    p.full_name,
    p.onboarding_completed,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Admin panelindeki kullanici detay sayfasi: secili kullanicinin tum gorevleri.
CREATE OR REPLACE FUNCTION admin_get_user_tasks(p_user_id UUID)
RETURNS SETOF tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;

  RETURN QUERY
  SELECT * FROM public.tasks
  WHERE user_id = p_user_id
  ORDER BY task_date DESC, start_time ASC NULLS LAST;
END;
$$;
