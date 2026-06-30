# 🔄 Kullanıcı Akışları

← [[03 - 🗄️ Veritabanı]] | → [[05 - 🧩 Bileşenler]]

---

## 1️⃣ Kimlik Doğrulama Akışı

```mermaid
flowchart TD
    A([Kullanıcı Giriş Yapıyor]) --> B{Hesap var mı?}
    
    B -- Hayır --> C[/signup sayfası/]
    C --> D[Ad, Email, Şifre gir]
    D --> E[Supabase signUp]
    E --> F[📧 Email gönderildi]
    F --> G[Kullanıcı email'i açıyor]
    G --> H[/auth/callback link tıklama/]
    H --> I{onboarding_completed?}
    
    B -- Evet --> J[/login sayfası/]
    J --> K[Email + Şifre gir]
    K --> L[Supabase signInWithPassword]
    L --> M{Başarılı?}
    M -- Evet --> I
    M -- Hayır --> N[❌ Hata mesajı]
    N --> J
    
    I -- Hayır --> O[/onboarding/]
    I -- Evet --> P[/dashboard/]
```

> [!info] Middleware Rolü
> `middleware.ts` her request'te auth cookie'yi kontrol eder.
> - Dashboard sayfaları → auth zorunlu
> - Login/signup → auth varsa /dashboard'a yönlendir

---

## 2️⃣ Onboarding Akışı (5 Adım)

```mermaid
flowchart LR
    S1["Adım 1\nUyku Takvimi\n⏰"] --> S2["Adım 2\nSabit Bloklar\n📅"]
    S2 --> S3["Adım 3\nEnerji Zirveleri\n⚡"]
    S3 --> S4["Adım 4\nSerbest Günler\n🌿"]
    S4 --> S5["Adım 5\nHafta Sonu &\nPlanlama Stili\n🎯"]
    S5 --> AI["🤖 AI\nŞablon Üretir"]
    AI --> DONE["✅ Dashboard'a\nYönlendir"]
```

### Adım Detayları

#### Adım 1: Uyku Takvimi
```
- Hafta içi kalkış saati
- Hafta içi uyku saati  
- Hafta sonu kalkış saati
- Hafta sonu uyku saati
```

#### Adım 2: Sabit Haftalık Bloklar
```
Kullanıcı ekliyor:
- İş / Okul blokları
- Tekrarlayan toplantılar
- Düzenli aktiviteler
Her blok: Gün + Başlangıç + Bitiş + Ad
```

#### Adım 3: Enerji Zirveleri
```
Sabah (06:00-12:00)    → Yüksek / Orta / Düşük
Öğleden Sonra (12-18)  → Yüksek / Orta / Düşük
Akşam (18:00-22:00)    → Yüksek / Orta / Düşük
```

#### Adım 4: Serbest Günler
```
Hangi günler daha az yüklenilmeli?
Checkbox: Pazartesi - Salı - ... - Pazar
```

#### Adım 5: Hafta Sonu & Planlama Stili
```
Hafta sonu rutini: Aktif / Dinlendirici / Karışık
Planlama stili: Sıkı / Dengeli / Esnek
```

---

## 3️⃣ AI Şablon Üretimi

```mermaid
sequenceDiagram
    participant F as OnboardingForm
    participant API as /api/onboarding
    participant AI as Claude Haiku 4.5
    participant DB as Supabase

    F->>API: POST {userData, fixedBlocks, energyPeaks}
    API->>AI: generateObject(prompt, zodSchema)
    Note over AI: Zod Schema:<br/>max 30 skeleton blocks<br/>her blok için tüm alanlar
    AI-->>API: {skeletonBlocks: [...]}
    API->>DB: complete_onboarding() RPC
    DB-->>API: success
    API-->>F: {success: true}
    F->>F: router.push('/dashboard')
```

> [!tip] AI Prompt Stratejisi
> Claude'a verilen bilgiler:
> - Kullanıcının enerji profili
> - Sabit bloklar (bunlara dokunma!)
> - Uyku/uyanış saatleri
> - Boş zaman aralıkları
> 
> Claude çıktısı: Her gün için skeleton block array'i

---

## 4️⃣ Günlük Dashboard Akışı

```mermaid
flowchart TD
    A[Sayfa Yükleniyor] --> B[get_or_create_daily_tasks]
    B --> C{Bugün için görev var mı?}
    C -- Hayır --> D[Skeleton blocks'tan oluştur]
    D --> E[Görevleri göster]
    C -- Evet --> E
    
    E --> F{Ertelenmiş görevler?}
    F -- Evet --> G[Bugünkü rescheduled\ntask'ları da getir]
    G --> H[Birleşik liste göster]
    F -- Hayır --> H
    
    H --> I{Kullanıcı eylemi}
    I --> J["✅ Tamamla"]
    I --> K["➡️ Ertele"]
    I --> L["❌ İptal et"]
    
    J --> J1[status = completed]
    K --> K1[Zaman kilidi kontrolü]
    K1 --> K2[Yarınki takvim analizi]
    K2 --> K3[Uygun slot bul]
    K3 --> K4[task_date güncelle]
    L --> L1[status = cancelled]
```

---

## 5️⃣ Görev Yeniden Zamanlama Algoritması

> [!abstract] Yeniden Zamanlama Mantığı
> Bu sistemin en kritik iş mantığı. `actions.ts` içinde `rescheduleTask()`.

```mermaid
flowchart TD
    A[rescheduleTask çağrıldı] --> B{is_hard_constraint?}
    B -- Evet --> ERR1[❌ Hard constraint ertelenemez]
    B -- Hayır --> C{flexibility_score == 1?}
    C -- Evet --> ERR2[❌ Çok katı, ertelenemez]
    C -- Hayır --> D[Yarınki skeleton blocks al]
    D --> E[Hard constraints hariç tut]
    E --> F{Orijinal slot boş mu?}
    F -- Evet --> G[Aynı saate ertele ✅]
    F -- Hayır --> H[Serbest slot ara]
    H --> I{Gün içinde boş slot var mı?}
    I -- Evet --> J[İlk uygun slota yerleştir ✅]
    I -- Hayır --> K{flexibility_score >= 4?}
    K -- Evet --> L{Süre trim edilebilir mi?\nmin 15 dakika?}
    L -- Evet --> M[Kısaltılmış hali ile ekle ✅]
    L -- Hayır --> N[status = cancelled ❌]
    K -- Hayır --> N
```

#### Algoritma Parametreleri
| Parametre | Değer | Açıklama |
|-----------|-------|---------|
| Minimum süre | 15 dakika | `MIN_DURATION = 15` |
| Yüksek esneklik eşiği | 4 | Trim için gerekli flexibility_score |
| Ertele süresi | +1 gün | Her zaman ertesi gün |

---

## 6️⃣ Close Day (Günü Kapat) Akışı

```mermaid
sequenceDiagram
    participant U as Kullanıcı
    participant C as CloseDay Component
    participant API as Server Action
    participant AI as Claude Haiku
    participant DB as Supabase

    U->>C: "Günü Kapat" butonu tıkla
    C->>API: closeDayAndReflect()
    API->>DB: Bugünün görevlerini getir
    DB-->>API: [completed: X, rescheduled: Y, cancelled: Z]
    API->>AI: Görev özetini ver + system prompt
    Note over AI: Sistem tonu:<br/>Sade, mekanik, no-cliché<br/>System-admin stili
    AI-->>API: Kısa özet metni
    API->>DB: daily_reflections INSERT
    DB-->>API: saved
    API-->>C: ai_message
    C-->>U: Özet göster (sayfa yenilenmez)
```

> [!note] AI Tonu
> System prompt özellikle belirtiliyor: **motivasyon klişesi yok**, mekanik rapor tonu.
> Örnek çıktı: *"3 görev tamamlandı. 'Derin Çalışma' yarına ertelendi. 1 görev iptal edildi."*

---

## ⏰ Time-Lock Özelliği

> [!warning] Zaman Kilidi
> Görev henüz başlamadıysa (start_time gelmediyse) butonlar devre dışı.
> Kullanıcı sabah 7'deki görevi gece yarısı tamamlayamaz.
> Istanbul timezone'a göre hesaplanır.

---

#projectx #kullanici-akislari #flows
