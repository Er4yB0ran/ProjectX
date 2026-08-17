-- tasks.task_date ve tasks.flexibility_score hicbir kod yolunda gercekten null olmuyor
-- (RPC her zaman task_date verir, rescheduleTask her zaman bir deger yazar, flexibility_score
-- DEFAULT 3 ile geliyor) ama kolonlarda NOT NULL hic yoktu. Bu, uretilen TypeScript tiplerini
-- gereksiz yere nullable yapip uygulama kodunda tip hatalarina yol aciyordu.
-- Once mevcut satirlarda null olmadigi dogrulandi (0 null, 12/12 satir dolu).

ALTER TABLE public.tasks
  ALTER COLUMN task_date SET NOT NULL,
  ALTER COLUMN flexibility_score SET NOT NULL;
