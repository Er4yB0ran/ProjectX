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

### 1. Zaman Kilidi (Anti-Cheat) — Gelecek Görevlerde Butonlar Kilitlenir

**Dosya:** `src/app/(dashboard)/dashboard/TaskCard.tsx` → `isTimeLocked()`

Kullanıcı disiplinini korumak için görevin başlangıç zamanı henüz gelmemişse aksiyon butonları (`Yaptım`, `Erteledim`, `Olmadı`) tamamen gizlenir; yerlerine `--` metni olan soluk bir span bırakılır.

#### Kilit Mantığı

```ts
function isTimeLocked(taskDate: string, startTime: string | null): boolean {
  const now = new Date()

  if (startTime) {
    // "YYYY-MM-DDTHH:MM:SS" → yerel Date nesnesi
    const taskStart = new Date(`${taskDate}T${startTime}`)
    return taskStart > now          // başlangıç saati geçmediyse kilitli
  }

  // Saat bilgisi yoksa yalnızca günü karşılaştır
  const todayStr = now.toLocaleDateString('sv-SE') // "YYYY-MM-DD" (yerel)
  return taskDate > todayStr        // ileriki günse kilitli, bugünse açık
}
```

#### Karar Tablosu

| `start_time` | Karşılaştırma | Sonuç |
|---|---|---|
| Var | `task_date + start_time` > şu an | `--` gösterilir, butonlar kaldırılır |
| Var | `task_date + start_time` ≤ şu an | Butonlar aktif |
| Yok | `task_date` > bugün | `--` gösterilir, butonlar kaldırılır |
| Yok | `task_date` ≤ bugün | Butonlar aktif |

#### UI Davranışı

- **Kilitliyken:** Butonlar DOM'dan tamamen kaldırılır (render edilmez). Yerlerine `title="Bu görevin saati henüz gelmedi"` nitelikli, `text-neutral-700` renginde `--` metni içeren bir span konur. Kullanıcı hiçbir şekilde aksiyonu tetikleyemez.
- **Kilit açıldığında:** Sayfa yeniden render edildiğinde (`new Date()` güncel değere döner) butonlar otomatik olarak görünür hale gelir.
- **Tarih kaynağı:** Tüm karşılaştırma **kullanıcının yerel saatine** (`new Date()`, `toLocaleDateString('sv-SE')`) göre yapılır. UTC veya sunucu saatine bağımlılık yoktur.

#### Mimari Karar

Kilit sunucu tarafında değil **istemci tarafında** uygulanır; bu, sayfa yenilenmeden kilit durumunun değişmesine izin verir. Sunucu action'ları (`updateTaskStatus`, `rescheduleTask`) buton render'ı engellediği için çağrılamaz; ancak ek güvenlik için sunucu tarafında da `task_date + start_time` doğrulaması yapılabilir.

---

### 2. Sabit Görevlerde "Erteledim" Butonu Gizlenir

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

### 3. Ertelenen Görevlerde Sol Kenarlık ve Sembol

Status `'rescheduled'` olduğunda:

- Kart stili: `bg-neutral-900 border-y border-r border-neutral-800 border-l-4 border-l-amber-500/50`
- Saat satırına `~` sembolü eklenir (`text-amber-500/50`)
- StatusIcon: `->` (amber, `text-amber-400`)

Bu görsel dil "Bu görev ertelendi, bitti sayılmadı" mesajını baskısız şekilde verir.

### 4. Buton Durumları

| Buton | Renk | Aktif koşul |
|-------|------|-------------|
| Yaptım | yeşil | `status === 'completed'` |
| Erteledim | amber | `status === 'rescheduled'` (sadece `!isFixed`) |
| Olmadı | kırmızı | asla aktif gösterilmez, tıklandığında `cancelled` yazar |

Aktif buton disabled + renkli görünür (tekrar tıklanamaz). Transition sırasında tüm butonlar disabled.

### 5. Optimistik Güncelleme

`useOptimistic` ile kullanıcı butona bastığında UI anında güncellenir, Server Action yanıtı beklenmez. Server Action başarısız olursa React state orijinaline döner.

---

### 6. Tasarim Felsefesi — Bevel Obsidian Dark

Arayüz "Bevel: AI Health Coach" uygulamasinin estetik felsefesinden ilham alır: karanlik, keskin, veriye odakli, minimal.

#### Temel Kurallar

- Arka plan: `bg-neutral-950` (tam karanlik)
- Panel/sidebar: `bg-neutral-900`
- Kart: `bg-neutral-900 border border-neutral-800 rounded-xl`
- **Glassmorphism tamamen yasak:** `backdrop-blur-*`, `bg-white/*`, `bg-blue-50` ve benzeri transparan/beyaz arka planlar kullanilmaz.
- Kenarlik: 1px, `border-neutral-800` (varsayilan) veya `border-neutral-700` (ic kart)

#### Metin Hiyerarsisi

| Katman | Sinif |
|---|---|
| Birincil baslik | `text-white` |
| Ikincil/aciklama | `text-neutral-400` |
| Soluk/ipucu | `text-neutral-600` |
| Monospace/saat | `text-neutral-500 font-mono tabular-nums` |

#### Metrik Rozetler

Gorev kartlarinda enerji maliyeti ve esneklik skoru kucuk, yuksek kontrastli rozetlerle gosterilir:

- Enerji (E): `text-amber-400 bg-amber-500/10 border border-amber-500/20`
- Esneklik (F): `text-cyan-400 bg-cyan-500/10 border border-cyan-500/20`
- Sabit gorev (SAB): `text-red-400 bg-red-500/10 border border-red-500/20`

#### Buton Felsefesi

Butonlar varsayilan durumda minimal ve dusuk kontrast gorünür; sadece hover veya aktif durumda renklenir. Büyük, dikkat cekici CTA butonlari kullanilmaz.

- Aksiyon butonlari (Yaptim/Erteledim/Olmadi): yarim saydam arka plan + ince kenarlik, sadece etkilesimde belirgin hale gelir.
- Birincil eylem butonu (Yeni Blok): `bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white`
