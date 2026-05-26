# Database Schema

Supabase (PostgreSQL) · Row Level Security tüm tablolarda aktif.

---

## Tablolar

### `profiles`

Kullanıcı başına bir satır. Supabase Auth'daki `auth.users` kaydına 1:1 bağlı (trigger ile otomatik oluşur).

| Kolon | Tip | Notlar |
|-------|-----|--------|
| `id` | uuid PK | `auth.users.id` ile eşleşir |
| `full_name` | text | nullable |
| `wake_up_time` | time | Örn. `07:00:00` |
| `bed_time` | time | Örn. `23:00:00` |
| `energy_peaks` | jsonb | `{ morning, afternoon, evening: 'high' \| 'medium' \| 'low' }` |
| `onboarding_completed` | boolean | `false` → onboarding sayfasına yönlenir |
| `updated_at` | timestamptz | |

---

### `skeleton_blocks`

Kullanıcının **haftalık şablonu**. Her satır haftanın bir günündeki bir zaman bloğunu temsil eder. Onboarding'de AI tarafından oluşturulur, `complete_onboarding` RPC ile kaydedilir.

| Kolon | Tip | Notlar |
|-------|-----|--------|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles | |
| `day_of_week` | smallint | 0 = Pazar … 6 = Cumartesi |
| `start_time` | time | |
| `end_time` | time | |
| `title` | text | |
| `is_hard_constraint` | boolean | Bkz. aşağı |
| `energy_cost` | smallint 1–5 | Bkz. aşağı |
| `flexibility_score` | smallint 1–5 | Bkz. aşağı |
| `created_at` | timestamptz | |

---

### `tasks`

Günlük görev örnekleri. `get_or_create_daily_tasks` RPC çalıştığında o güne ait `skeleton_blocks`'tan türetilir. Bir kullanıcı aynı günü ilk açtığında otomatik oluşur.

| Kolon | Tip | Notlar |
|-------|-----|--------|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles | |
| `skeleton_block_id` | uuid FK → skeleton_blocks | nullable (manuel görev eklenirse null) |
| `title` | text | skeleton_block'tan kopyalanır |
| `description` | text | nullable |
| `task_date` | date | Erteleme sonrası güncellenir |
| `start_time` | time | nullable |
| `end_time` | time | nullable |
| `energy_cost` | smallint 1–5 | skeleton_block'tan kopyalanır, nullable |
| `flexibility_score` | smallint 1–5 | skeleton_block'tan kopyalanır, default 3 |
| `status` | enum | `pending \| completed \| rescheduled \| cancelled` |
| `created_at` | timestamptz | |

---

---

### `daily_reflections`

Kullanicinin "Gunu Kapat" aksiyonuyla AI'in urettigi gunluk ozet mesajlarini saklar. Her kullanici icin gunluk bir kayit tutulur (`user_id + reflection_date` unique constraint ile). Insert-once modeldir; sonradan guncellenmez veya silinemez.

| Kolon | Tip | Notlar |
|-------|-----|--------|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles | `on delete cascade` |
| `reflection_date` | date | Ornek: `2026-05-26` |
| `ai_message` | text | AI'in urettigi 3-4 cumlelik Turkce ozet |
| `created_at` | timestamptz | |

**RLS:**
- `SELECT` — sadece `auth.uid() = user_id`
- `INSERT` — sadece `auth.uid() = user_id`
- `UPDATE` / `DELETE` — yok (gecmis ozetler degistirilemez)

---

## skeleton_blocks ↔ tasks İlişkisi

```
skeleton_blocks (haftalık şablon)
        │
        │  get_or_create_daily_tasks RPC
        │  (her güne bir kez çalışır, race condition için advisory lock)
        ▼
tasks (günlük örnekler)
  task_date = bugün
  skeleton_block_id = kaynak blok
  energy_cost, flexibility_score ← kopyalanır
```

Bir `skeleton_block` silinirse o bloğa bağlı `tasks` etkilenmez (`skeleton_block_id` null olabilir).

> **Önemli — `day_of_week` kodlaması:**
> DB'de `0 = Pazartesi … 5 = Cumartesi, 6 = Pazar` şeklindedir.
> (`dashboard/page.tsx`'teki `(jsDay + 6) % 7` dönüşümüne göre.)
> Belgede yazan `0 = Pazar … 6 = Cumartesi` ifadesi **yanlış**; kod implementasyonu esas alınmalıdır.

---

## Kritik Kolonlar

### `is_hard_constraint` (boolean, default `false`)

Bloğun **sabit** (esnetilemez) olduğunu belirtir.

- `true` → Ders, staj, randevu gibi değiştirilemeyen zaman dilimleri.
- `false` → Kullanıcının tercihine göre kaydırılabilir.
- **Etki:** `is_hard_constraint = true` olan bir göreve ait `tasks` satırı için `rescheduleTask` Server Action hata fırlatır. TaskCard bu görevde "Erteledim" butonunu hiç göstermez.
- AI onboarding kuralı: `is_hard_constraint = true` olan bloklar **her zaman** `flexibility_score = 1` alır.

### `flexibility_score` (smallint 1–5, default 3)

Görevin ne kadar esnek olduğunu sayısal olarak ifade eder.

| Değer | Anlam |
|-------|-------|
| 1 | Kesinlikle bu saatte olmalı (sabit görevlerle aynı) |
| 2 | Çok az esneklik |
| 3 | Orta esneklik (varsayılan) |
| 4 | Yüksek esneklik — sığmazsa **tıraşlanabilir** |
| 5 | Tam esnek — istediğin zaman yapabilirsin |

`rescheduleTask` içindeki karar ağacında `>= 4` eşiği önemlidir: gün sonuna sığmıyorsa görev `MIN_DURATION = 15 dk` koşuluyla kısaltılır; sığmıyorsa `cancelled` yapılır. Skoru 1–3 olan görevler kısaltılmaz, direkt `cancelled`.

---

## RPC Fonksiyonlar

| Fonksiyon | Ne yapar |
|-----------|----------|
| `get_or_create_daily_tasks(p_user_id, p_date, p_day_of_week)` | O gün için skeleton_blocks'tan tasks üretir, idempotent (advisory lock ile) |
| `complete_onboarding(p_user_id, p_blocks, p_wake_up, p_bed_time, p_peaks)` | Eski skeleton_blocks'ları siler, yenilerini ekler, profile'ı günceller |
