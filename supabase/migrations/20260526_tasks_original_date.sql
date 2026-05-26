-- tasks.original_date kolonu
-- Gorev ilk olusturuldugunda hangi gune ait oldugunu saklar.
-- task_date erteleme sirasinda guncellense bile original_date degismez.
-- Bu sayede "bugunun gorevleri" listesi ertelenen gorevleri de gosterebilir.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS original_date date;

-- Mevcut satirlari doldur (geriye donuk orijinal tarih bilinmiyor, task_date kullanilir)
UPDATE public.tasks SET original_date = task_date WHERE original_date IS NULL;

ALTER TABLE public.tasks ALTER COLUMN original_date SET NOT NULL;

-- Trigger: sadece INSERT sirasinda calisir, UPDATE'te original_date'e dokunmaz
CREATE OR REPLACE FUNCTION public.set_task_original_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.original_date := NEW.task_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_set_original_date ON public.tasks;
CREATE TRIGGER tasks_set_original_date
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_original_date();
