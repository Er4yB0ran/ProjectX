-- daily_reflections tablosu
-- Kullanicinin gunu kapatirken AI'in urettigi gunluk ozet mesajlarini saklar.
-- Her kullanici icin gunluk bir kayit tutulur (reflection_date + user_id unique).

create table if not exists public.daily_reflections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  reflection_date  date not null,
  ai_message       text not null,
  created_at       timestamptz not null default now(),
  unique (user_id, reflection_date)
);

-- Row Level Security
alter table public.daily_reflections enable row level security;

-- Kullanici yalnizca kendi kayitlarini okuyabilir
create policy "daily_reflections: kullanici kendi kayitlarini okur"
  on public.daily_reflections
  for select
  using (auth.uid() = user_id);

-- Kullanici yalnizca kendi adina insert yapabilir
create policy "daily_reflections: kullanici kendi kayitlarini olusturur"
  on public.daily_reflections
  for insert
  with check (auth.uid() = user_id);

-- Guncellemeye izin yok (insert-once modeli)
-- Delete de yok; gecmis ozetler korunur.
