-- Görev 1: skeleton_blocks tablosuna energy_cost ve flexibility_score kolonlarını ekle
ALTER TABLE skeleton_blocks
  ADD COLUMN energy_cost      SMALLINT NOT NULL DEFAULT 3 CHECK (energy_cost BETWEEN 1 AND 5),
  ADD COLUMN flexibility_score SMALLINT NOT NULL DEFAULT 3 CHECK (flexibility_score BETWEEN 1 AND 5);

-- Görev 1: complete_onboarding RPC — yeni kolonları da INSERT et
CREATE OR REPLACE FUNCTION complete_onboarding(
  p_user_id  UUID,
  p_blocks   JSONB,
  p_wake_up  TIME,
  p_bed_time TIME,
  p_peaks    JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM skeleton_blocks WHERE user_id = p_user_id;

  INSERT INTO skeleton_blocks (
    user_id, day_of_week, start_time, end_time,
    title, is_hard_constraint, energy_cost, flexibility_score
  )
  SELECT
    p_user_id,
    (block->>'day_of_week')::SMALLINT,
    (block->>'start_time')::TIME,
    (block->>'end_time')::TIME,
    block->>'title',
    (block->>'is_hard_constraint')::BOOLEAN,
    COALESCE((block->>'energy_cost')::SMALLINT, 3),
    COALESCE((block->>'flexibility_score')::SMALLINT, 3)
  FROM jsonb_array_elements(p_blocks) AS block;

  UPDATE profiles
  SET
    onboarding_completed = true,
    wake_up_time         = p_wake_up,
    bed_time             = p_bed_time,
    energy_peaks         = p_peaks,
    updated_at           = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Görev 2: get_or_create_daily_tasks — skeleton_blocks'tan energy_cost ve flexibility_score da kopyala
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
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_date::text));

  SELECT COUNT(*) INTO v_count
  FROM tasks
  WHERE user_id = p_user_id AND task_date = p_date;

  IF v_count = 0 THEN
    INSERT INTO tasks (
      user_id, skeleton_block_id, title, task_date,
      start_time, end_time, energy_cost, flexibility_score, status
    )
    SELECT
      p_user_id,
      sb.id,
      sb.title,
      p_date,
      sb.start_time,
      sb.end_time,
      sb.energy_cost,
      sb.flexibility_score,
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
