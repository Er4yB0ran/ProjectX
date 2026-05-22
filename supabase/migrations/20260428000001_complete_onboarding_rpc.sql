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

  INSERT INTO skeleton_blocks (user_id, day_of_week, start_time, end_time, title, is_hard_constraint)
  SELECT
    p_user_id,
    (block->>'day_of_week')::SMALLINT,
    (block->>'start_time')::TIME,
    (block->>'end_time')::TIME,
    block->>'title',
    (block->>'is_hard_constraint')::BOOLEAN
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
