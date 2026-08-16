-- tasks.linked_task_id: bir gorev ikiye bolunerek ertelendiginde iki parcayi birbirine baglar.
-- ON DELETE SET NULL kasitli: parcalardan biri silinirse digerinin FK'si kirilmasin.

ALTER TABLE public.tasks
  ADD COLUMN linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
