-- Onboarding AI sohbet özelliğinin token/maliyet muhasebesi. Mesaj/blok içeriği HİÇ
-- saklanmıyor — sadece sayaçlar. Faz 3'teki oturum bütçesi bu tablodan toplanacak,
-- Faz 5'teki admin özet raporu da buradan beslenecek.

CREATE TABLE public.ai_chat_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_id UUID NOT NULL,
  turn_type TEXT NOT NULL CHECK (turn_type IN ('relevant', 'irrelevant', 'clarification')),
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cache_read_tokens INTEGER,
  cache_write_tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own AI chat usage"
  ON public.ai_chat_usage FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX ai_chat_usage_session_idx ON public.ai_chat_usage (session_id);
