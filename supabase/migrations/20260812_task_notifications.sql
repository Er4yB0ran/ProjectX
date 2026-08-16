-- task_notifications tablosu
-- Faz 1: iOS bildirim akisinin (on hatirlatma + gorev-sonrasi onay) veri modeli.
-- Her hatirlatma/onay bildirimi ayri bir satirda tutulur; tasks tablosuna dokunulmaz.
-- Gonderme islemini Faz 2'deki backend (Edge Function/cron, service role) yapacak.

create type public.notification_type as enum ('reminder', 'confirmation');
create type public.notification_response as enum ('done', 'rescheduled', 'not_done');

create table if not exists public.task_notifications (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  task_id            uuid not null references public.tasks(id) on delete cascade,
  notification_type  public.notification_type not null,
  scheduled_for       timestamptz not null,
  sent_at            timestamptz,
  response           public.notification_response,
  responded_at       timestamptz,
  created_at         timestamptz not null default now()
);

-- Faz 2 scheduler'in "gonderilmesi gereken bildirimler" sorgusu icin
create index if not exists task_notifications_pending_idx
  on public.task_notifications (scheduled_for)
  where sent_at is null;

-- Row Level Security
alter table public.task_notifications enable row level security;

-- Kullanici yalnizca kendi bildirim kayitlarini okuyabilir
create policy "task_notifications: kullanici kendi kayitlarini okur"
  on public.task_notifications
  for select
  using (auth.uid() = user_id);

-- Kullanici yalnizca kendi bildirimine cevap verebilir (response/responded_at)
-- Insert yok: kayitlari yalnizca backend (service role) olusturur.
create policy "task_notifications: kullanici kendi bildirimine cevap verir"
  on public.task_notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
