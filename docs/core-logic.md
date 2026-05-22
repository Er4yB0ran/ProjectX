# Core Logic

## Ürün Felsefesi

> "Kullanıcıya baskı kurma, suçluluk hissettirme. AI mükemmel plan yapmaz, esnek plan yapar."

- Görev tamamlanmadığında kullanıcıyı cezalandırma. Seçenekler sun: yaptım / ertele / olmadı.
- Erteleme bir başarısızlık değil; sisteme bilinçli bir bildirimdir.
- AI'ın rolü: onboarding'de kullanıcının rutinini anlayıp `skeleton_blocks` üretmek. Sonrası kullanıcının.

---

## Erteleme Motoru (Rescheduling Engine)

**Dosya:** `src/app/(dashboard)/dashboard/actions.ts` → `rescheduleTask(taskId)`

### Sabitler

```ts
END_OF_DAY  = 23 * 60 + 59  // 1439 dakika
MIN_DURATION = 15            // dakika
```

### Algoritma (adım adım)

```
1. Görevi ve bağlı skeleton_block'u çek
   ↓
2. Sabit görev kontrolü
   is_hard_constraint === true  →  HATA FİRLAT (ertelemez)
   flexibility_score === 1      →  HATA FİRLAT
   ↓
3. Hedef tarih = task_date + 1 gün (addOneDay)
   ↓
4. start_time veya end_time yoksa:
   → sadece task_date güncelle, status = 'rescheduled', ÇIK
   ↓
5. Süre hesapla: duration = end_time - start_time (dakika)
   targetStart = orijinal start_time
   ↓
6. Yarının görevlerini start_time ASC sırayla çek
   ↓
7. targetStart bölgesinde çakışma var mı?
   HAYIR → candidateStart = targetStart (orijinal saati koru)
   EVET  → boşluk tara:
           freeStart = targetStart
           for each tomorrowTask:
             tEnd <= freeStart → geç
             tStart > freeStart AND boşluk >= duration → candidateStart = freeStart, YERLEŞTİR, break
             başka → freeStart = tEnd
           if !placed → candidateStart = son tEnd sonrası
   ↓
8. Yerleşim kararı:
   candidateEnd = candidateStart + duration

   [A] candidateEnd <= END_OF_DAY
       → status = 'rescheduled', newStart/End = candidate değerleri

   [B] candidateEnd > END_OF_DAY AND flexibility_score >= 4
       available = END_OF_DAY - candidateStart
       available >= MIN_DURATION (15 dk)
         → TIRAŞLA: newEnd = END_OF_DAY, status = 'rescheduled'
       available < MIN_DURATION
         → status = 'cancelled', ÇIK

   [C] candidateEnd > END_OF_DAY AND flexibility_score < 4
       → status = 'cancelled', ÇIK
   ↓
9. tasks tablosunu güncelle:
   task_date = tomorrowStr
   start_time = newStartTime
   end_time   = newEndTime
   status     = newStatus
```

### Özet Tablo

| Durum | flexibility_score | Sonuç |
|-------|------------------|-------|
| Yarın orijinal saatte yer var | herhangi | `rescheduled` (aynı saat) |
| Yarın boşluk bulundu | herhangi | `rescheduled` (yeni saat) |
| Yarın gün sonuna sığmıyor | ≥ 4 | tıraşlanır → `rescheduled` (15 dk minimum) |
| Yarın gün sonuna sığmıyor, tıraş da yetmez | ≥ 4 | `cancelled` |
| Yarın gün sonuna sığmıyor | < 4 | `cancelled` |

---

## UI Kuralları

### 1. Sabit Görevlerde "Erteledim" Butonu Gizlenir

`TaskCard` `isFixed` prop'u alır. `isFixed = true` ise **"Erteledim" butonu DOM'a hiç eklenmez.**

```tsx
// TaskCard.tsx
{!isFixed && (
  <ActionButton label="Erteledim" onClick={handleReschedule} ... />
)}
```

`isFixed` değeri dashboard `page.tsx`'te şöyle hesaplanır:
```ts
const isFixed = task.skeleton_block_id
  ? fixedBlockIds.has(task.skeleton_block_id)
  : false
// fixedBlockIds = skeleton_blocks'ta is_hard_constraint === true olanların id seti
```

### 2. Ertelenen Görevlerde Şeffaf Döngü İkonu ve Kenarlık

Status `'rescheduled'` olduğunda:

- Kart stili: `bg-white/40 border-white/20 border-l-4 border-l-amber-400/50`
- Saat satırına `↺` eklenir (amber, %40 opacity): `text-amber-400/40`
- StatusIcon: `↷` (amber)

Bu görsel dil "Bu görev ertelendi, bitti sayılmadı" mesajını baskısız şekilde verir.

### 3. Buton Durumları

| Buton | Renk | Aktif koşul |
|-------|------|-------------|
| Yaptım | yeşil | `status === 'completed'` |
| Erteledim | amber | `status === 'rescheduled'` (sadece `!isFixed`) |
| Olmadı | kırmızı | asla aktif gösterilmez, tıklandığında `cancelled` yazar |

Aktif buton disabled + renkli görünür (tekrar tıklanamaz). Transition sırasında tüm butonlar disabled.

### 4. Optimistik Güncelleme

`useOptimistic` ile kullanıcı butona bastığında UI anında güncellenir, Server Action yanıtı beklenmez. Server Action başarısız olursa React state orijinaline döner.
