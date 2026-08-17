-- Global tek-anahtar config tablosu (ör. ai_chat_enabled). Herkes okuyabilir,
-- yazma sadece admin_set_config RPC'si üzerinden (is_admin kontrollü) yapılabilir.

CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.app_config (key, value) VALUES ('ai_chat_enabled', 'false'::jsonb);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read app_config"
  ON public.app_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION admin_set_config(p_key TEXT, p_value JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;

  INSERT INTO app_config (key, value, updated_at)
  VALUES (p_key, p_value, NOW())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
END;
$$;
