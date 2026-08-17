-- Admin panelindeki AI sohbet kullanım özeti: ai_chat_usage tablosunun toplamı.
-- (Faz 5) admin_list_users/admin_get_user_tasks ile aynı desen: SECURITY DEFINER + is_admin kontrolü.

CREATE OR REPLACE FUNCTION admin_ai_chat_usage_summary()
RETURNS TABLE (
  total_turns BIGINT,
  total_input_tokens BIGINT,
  total_output_tokens BIGINT,
  total_tokens BIGINT,
  total_cache_read_tokens BIGINT,
  distinct_users BIGINT,
  distinct_sessions BIGINT
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
    count(*)::BIGINT,
    coalesce(sum(u.input_tokens), 0)::BIGINT,
    coalesce(sum(u.output_tokens), 0)::BIGINT,
    coalesce(sum(u.total_tokens), 0)::BIGINT,
    coalesce(sum(u.cache_read_tokens), 0)::BIGINT,
    count(DISTINCT u.user_id)::BIGINT,
    count(DISTINCT u.session_id)::BIGINT
  FROM public.ai_chat_usage u;
END;
$$;
