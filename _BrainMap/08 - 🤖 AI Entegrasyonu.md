# 🤖 AI Entegrasyonu

← [[07 - 🎨 Tasarım Sistemi]] | → [[09 - 📁 Dosya Haritası]]

---

## 🧠 Genel Bakış

> [!abstract] AI Stratejisi
> ProjectX Claude Haiku 4.5 kullanıyor — **hız ve maliyet önceliği**.
> Çıktı küçük ve yapılandırılmış, streaming gerekmez (generateObject).

---

## 📍 AI Kullanım Noktaları

| Nokta | Dosya | Model | Amaç |
|-------|-------|-------|------|
| Onboarding şablonu | `api/onboarding/route.ts` | `claude-haiku-4-5` | Haftalık iskelet üret |
| Günlük refleksiyon | `dashboard/actions.ts` | `claude-haiku-4-5` | Günün özeti |

---

## 1️⃣ Onboarding — AI Şablon Üretimi

### Prompt Stratejisi

```typescript
const prompt = `
Sen bir verimlilik koçusun. Kullanıcının enerji profiline ve 
mevcut sabit bloklarına göre haftalık bir program taslağı oluştur.

KULLANICI PROFİLİ:
- Uyku: ${waketime} - ${bedtime}
- Enerji Zirveleri: ${energyPeaks}
- Sabit Bloklar: ${fixedBlocks}
- Serbest Günler: ${freeDays}
- Hafta Sonu Rutini: ${weekendRoutine}
- Planlama Stili: ${planningStyle}

KURALLAR:
1. Sabit blokları olduğu gibi ekle (is_hard_constraint: true)
2. Enerji zirvelerinde yoğun görevler planla
3. Düşük enerji dönemlerinde hafif veya serbest bloklar
4. Maximum 30 blok üret
5. Her bloğun süresi minimum 30 dakika
`
```

### Zod Schema (Çıktı Formatı)

```typescript
const skeletonSchema = z.object({
  skeletonBlocks: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    // 0=Pazartesi, 1=Salı, ..., 6=Pazar
    start_time: z.string(),
    // Format: "HH:MM:SS" örn: "09:00:00"
    end_time: z.string(),
    title: z.string().max(100),
    is_hard_constraint: z.boolean(),
    energy_cost: z.number().int().min(1).max(5),
    flexibility_score: z.number().int().min(1).max(5),
  })).max(30)
})
```

### API Çağrısı

```typescript
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

const { object } = await generateObject({
  model: anthropic('claude-haiku-4-5'),
  schema: skeletonSchema,
  prompt: prompt,
})
// object.skeletonBlocks → DB'ye kaydet
```

---

## 2️⃣ Close Day — Günlük Refleksiyon

### System Prompt

> [!quote] Ton Yönlendirmesi
> Refleksiyon prompt'u özellikle **motivasyon klişelerini** yasaklıyor.
> Ton: sade, mekanik, system-admin stili.

```typescript
const systemPrompt = `
Sen bir görev yönetim sisteminin raporlama modülüsün.
Kullanıcıya günlük bir özet sunuyorsun.

KURALLAR:
- Kısa ve öz ol (2-3 cümle)
- Motivasyon klişesi kullanma ("Harika bir gün!", "Mükemmelsin!" gibi ifadeler YOK)
- Sadece sayısal/olgusal bilgi ver
- Türkçe yaz
- Sistem raporu gibi yaz, motivasyon koçu gibi değil
`

const userMessage = `
Görev Özeti:
- Tamamlanan: ${completed.length} görev
- Ertelenen: ${rescheduled.length} görev  
- İptal edilen: ${cancelled.length} görev
Detaylar: ${taskDetails}
`
```

### Örnek AI Çıktısı

```
"Bugün 4 görev tamamlandı. 'Derin Çalışma' bloğu
 esneklik puanı nedeniyle yarına ertelendi.
 2 görev iptal edildi."
```

---

## 📦 Kullanılan Paketler

```json
{
  "@ai-sdk/anthropic": "^3.0.71",
  "ai": "latest"
}
```

> [!warning] Versiyon Notu
> `@ai-sdk/anthropic` v3.x kullanılıyor. API değişiklikleri için dikkatli ol.
> `generateObject` → yapılandırılmış çıktı için (streaming yok)

---

## 💰 Maliyet Analizi

### Claude Haiku 4.5 Fiyatları (2025)

| Token Tipi | Fiyat |
|-----------|-------|
| Input | $0.80 / 1M token |
| Output | $4.00 / 1M token |

### Tahmini Kullanım

**Onboarding (kişi başı 1 kez):**
```
Input: ~500-800 token
Output: ~1000-1500 token (30 blok × ~50 token)
Maliyet: ~$0.007 per user onboarding
```

**Close Day (günlük):**
```
Input: ~200-400 token
Output: ~50-100 token
Maliyet: ~$0.0005 per day per user
```

> [!success] Maliyet Etkin
> 1000 aktif kullanıcı × 30 gün = $15/ay AI maliyeti

---

## 🔑 API Güvenliği

> [!warning] Güvenlik
> `ANTHROPIC_API_KEY` sadece server-side'da.
> - Server Actions → güvenli (istemciye expose edilmez)
> - API Route `/api/onboarding` → Next.js server-side, güvenli
> - Client'ta hiçbir zaman key görünmez

---

## 🔄 Gelecek AI Potansiyeli

> [!tip] Gelecek Özellikler (Fikirler)
> - **Görev önceliklendirme**: "Bugün en önemli 3 görev hangisi?"
> - **Enerji tahminleri**: Geçmiş pattern'e göre enerji önerisi
> - **Haftalık analiz**: "Bu hafta en çok ne erteledim?"
> - **Adaptif şablon**: Kullanım alışkanlıklarına göre şablonu güncelle

---

#projectx #ai #claude #anthropic
