-- Bir onceki duzeltme (20260813_fix_daily_tasks_materialization.sql) "bu gun icin sablon
-- olusturuldu mu" kontrolunu "task_date = p_date AND original_date = p_date" ile yapiyordu.
-- Ama bir kullanici o gunun TUM gorevlerini baska bir güne ertelerse (task_date degisir,
-- original_date degismez), artik hicbir satirda task_date = original_date = p_date olmaz --
-- fonksiyon "sablon hic olusturulmamis" sanip o gunun sablonunu SIFIRDAN tekrar ekler,
-- daha once ertelenerek tasinmis olanlarla birlikte cift gorev olusur.
--
-- original_date INSERT sirasinda bir kere yazilir ve UPDATE'te asla degismez (bkz.
-- set_task_original_date trigger'i), yani "original_date = p_date" tek basina, o gunun
-- sablonunun DAHA ONCE olusturulup olusturulmadiginin degismez ve dogru gostergesidir --
-- o gorevler sonradan baska bir güne tasinmis olsa bile.

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
  WHERE user_id = p_user_id AND original_date = p_date;

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
