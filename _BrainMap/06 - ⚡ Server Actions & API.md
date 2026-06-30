# ⚡ Server Actions & API

← [[05 - 🧩 Bileşenler]] | → [[07 - 🎨 Tasarım Sistemi]]

---

## 📍 Genel Bakış

> [!info] Mimari Yaklaşım
> ProjectX neredeyse tamamen **Server Actions** kullanıyor.
> Tek REST API endpoint: `/api/onboarding` (AI çağrısı için POST gerektiğinden)

| Dosya | Açıklama | Action Sayısı |
|-------|---------|--------------|
| `dashboard/actions.ts` | Görev işlemleri | ~4 action |
| `template/actions.ts` | Skeleton CRUD | ~4 action |
| `api/onboarding/route.ts` | AI şablon üretimi | 1 POST endpoint |

---

## 📂 `dashboard/actions.ts` — 269 satır

### `updateTaskStatus(taskId, status)`

```typescript
// Kullanım: Tamamla veya İptal et
'use server'
async function updateTaskStatus(taskId: string, status: 'completed' | 'cancelled')
```

**Adımlar:**
1. Supabase server client oluştur
2. Auth kullanıcısını doğrula
3. `tasks` tablosunu güncelle (RLS kendi user_id'sini kontrol eder)
4. `revalidatePath('/dashboard')`

---

### `rescheduleTask(taskId)` — Ana İş Mantığı

> [!abstract] En Karmaşık Action — ~120 satır

```typescript
'use server'
async function rescheduleTask(taskId: string)
```

**Algoritma (adım adım):**

```
1. Görevi getir (skeleton_block_id dahil)
2. skeleton_block.is_hard_constraint → throw Error
3. skeleton_block.flexibility_score === 1 → throw Error
4. yarın = task_date + 1 gün
5. Yarınki skeleton_blocks al (hard constraint hariç)
6. Yarınki mevcut task'ları al
7. Çakışma hesapla:
   - Boş slotları bul (DAG benzeri aralık analizi)
8. Orijinal saat aralığı (task.start_time - task.end_time) boş mu?
   - Evet → aynı saatte ertele
   - Hayır → serbest slotlara bak
9. Serbest slot bulunduysa → o slota yerleştir
10. Slot yoksa:
    - flexibility_score >= 4 → günün son uygun yerine sıkıştır (min 15dk)
    - Değilse → status = 'cancelled'
11. task_date, start_time, end_time güncelle
12. revalidatePath('/dashboard')
```

---

### `closeDayAndReflect()`

```typescript
'use server'
async function closeDayAndReflect()
```

**Adımlar:**
1. Auth kullanıcısını doğrula
2. Bugünün tüm görevlerini getir (`task_date = today`)
3. Görevleri grupla: completed / rescheduled / cancelled
4. Claude Haiku'ya gönder (system prompt + görev listesi)
5. AI mesajını `daily_reflections` tablosuna kaydet
6. Mesajı döndür (revalidation yok — client state'e yazıyor)

---

### `getDailyReflection()`

```typescript
'use server'
async function getDailyReflection()
```

Mevcut günün refleksiyonunu döndürür. `CloseDay` component mount olduğunda çağırır.

---

## 📂 `template/actions.ts` — 131 satır

### `createSkeletonBlock(data)`

```typescript
'use server'
async function createSkeletonBlock(data: SkeletonBlockInsert)
```

Hard constraint ise `flexibility_score = 1` override edilir.

### `updateSkeletonBlock(id, data)`

```typescript
'use server'
async function updateSkeletonBlock(id: string, data: Partial<SkeletonBlockInsert>)
```

### `deleteSkeletonBlock(id)`

```typescript
'use server'
async function deleteSkeletonBlock(id: string)
```

Bir skeleton block silindiğinde bağlantılı future task'lar ne olur?
> [!question] Açık Soru
> Mevcut kodda skeleton_block silinince ilişkili gelecek task'lar otomatik silinmiyor.
> Bu bir edge case — düşünülmeli.

---

## 📂 `api/onboarding/route.ts` — 148 satır

> [!info] Tek REST Endpoint
> Server Action yerine REST API çünkü `generateObject` streaming response kullanıyor.

### POST `/api/onboarding`

**Request Body:**
```typescript
{
  userId: string,
  sleepSchedule: SleepSchedule,
  fixedBlocks: FixedBlock[],
  energyPeaks: EnergyPeaks,
  freeDays: number[],
  weekendRoutine: string,
  planningStyle: string
}
```

**Zod Output Schema:**
```typescript
z.object({
  skeletonBlocks: z.array(z.object({
    day_of_week: z.number().min(0).max(6),
    start_time: z.string(),  // "HH:MM:SS"
    end_time: z.string(),
    title: z.string(),
    is_hard_constraint: z.boolean(),
    energy_cost: z.number().min(1).max(5),
    flexibility_score: z.number().min(1).max(5),
  })).max(30)
})
```

**Akış:**
1. Request body doğrula
2. Kullanıcı profilini al (Supabase)
3. AI prompt oluştur (kullanıcı verileriyle)
4. `generateObject(claude-haiku-4-5, zodSchema, prompt)` çağır
5. `complete_onboarding` RPC çağır
6. `{ success: true }` döndür

---

## 🛡️ Auth Güvenlik Paterni

> [!success] Her Action'da Zorunlu

```typescript
// Her server action'ın başında
const supabase = await createClient()
const { data: { user }, error } = await supabase.auth.getUser()
if (!user) throw new Error('Unauthorized')
```

RLS zaten DB seviyesinde koruma sağlıyor, ama action seviyesinde de kontrol var.

---

## 🔁 Revalidation Stratejisi

| Action | revalidatePath |
|--------|---------------|
| updateTaskStatus | `/dashboard` |
| rescheduleTask | `/dashboard` |
| createSkeletonBlock | `/template` |
| updateSkeletonBlock | `/template` |
| deleteSkeletonBlock | `/template` |
| closeDayAndReflect | ❌ (client state kullanıyor) |

---

#projectx #server-actions #api #backend
