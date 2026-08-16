-- Ayni gerekce: tasks.status (DEFAULT 'pending') ve skeleton_blocks.is_hard_constraint
-- (DEFAULT false) hicbir kod yolunda null olmuyor ama NOT NULL eksikti, uretilen tipleri
-- gereksiz nullable yapip uygulama kodunda tip hatalarina yol aciyordu.
-- Once mevcut satirlarda null olmadigi dogrulandi (0/0).

ALTER TABLE public.tasks
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.skeleton_blocks
  ALTER COLUMN is_hard_constraint SET NOT NULL;
