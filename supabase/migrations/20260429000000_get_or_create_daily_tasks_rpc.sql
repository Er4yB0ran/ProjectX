CREATE OR REPLACE FUNCTION get_or_create_daily_tasks(
  p_user_id     UUID,
  p_date        DATE,
  p_day_of_week SMALLINT
)
RETURNS SETOF tasks
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Serialize concurrent calls for the same user+date to prevent duplicate inserts
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_date::text));

  SELECT COUNT(*) INTO v_count
  FROM tasks
  WHERE user_id = p_user_id AND task_date = p_date;

  IF v_count = 0 THEN
    INSERT INTO tasks (user_id, skeleton_block_id, title, task_date, start_time, end_time, status)
    SELECT
      p_user_id,
      sb.id,
      sb.title,
      p_date,
      sb.start_time,
      sb.end_time,
      'pending'::task_status
    FROM skeleton_blocks sb
    WHERE sb.user_id = p_user_id AND sb.day_of_week = p_day_of_week;
  END IF;

  RETURN QUERY
  SELECT * FROM tasks
  WHERE user_id = p_user_id AND task_date = p_date
  ORDER BY start_time ASC NULLS LAST;
END;
$$;
