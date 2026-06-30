# 📁 Dosya Haritası

← [[08 - 🤖 AI Entegrasyonu]] | → [[00 - 🧠 Ana Hub]]

---

## 🗂️ Tam Dosya Ağacı

```
c:\Users\erayb\Documents\OPT\ProjectX\
│
├── 📁 src/
│   │
│   ├── 📁 app/
│   │   ├── 📄 layout.tsx                   ★ Kök HTML, lang="tr", metadata
│   │   ├── 📄 page.tsx                     → redirect /dashboard
│   │   ├── 📄 globals.css                  CSS reset, Tailwind, animasyonlar
│   │   │
│   │   ├── 📁 (auth)/                      Route grubu — URL'de görünmez
│   │   │   ├── 📄 layout.tsx               Merkezi ortalama layout
│   │   │   ├── 📁 login/
│   │   │   │   └── 📄 page.tsx             Email+şifre girişi, dev bypass
│   │   │   └── 📁 signup/
│   │   │       └── 📄 page.tsx             Kayıt formu, email onay mesajı
│   │   │
│   │   ├── 📁 auth/
│   │   │   ├── 📁 callback/
│   │   │   │   └── 📄 route.ts             Email doğrulama URL handler
│   │   │   └── 📁 signout/
│   │   │       └── 📄 route.ts             POST → supabase.auth.signOut()
│   │   │
│   │   ├── 📁 onboarding/
│   │   │   ├── 📄 page.tsx                 Auth kontrol + redirect, server
│   │   │   └── 📄 OnboardingForm.tsx       ★ 446 satır, 5-adım wizard
│   │   │
│   │   ├── 📁 (dashboard)/                 Route grubu — sidebar layout
│   │   │   ├── 📄 layout.tsx               Sidebar nav (Bugün/Şablon)
│   │   │   │
│   │   │   ├── 📁 dashboard/
│   │   │   │   ├── 📄 page.tsx             ★ Server, get_or_create_daily_tasks
│   │   │   │   ├── 📄 TaskCard.tsx         ★ 204 satır, useOptimistic
│   │   │   │   ├── 📄 CloseDay.tsx         50 satır, AI refleksiyon UI
│   │   │   │   └── 📄 actions.ts           ★ 269 satır, tüm task mutations
│   │   │   │
│   │   │   └── 📁 template/
│   │   │       ├── 📄 page.tsx             Server, skeleton_blocks yükle
│   │   │       ├── 📄 TemplateManager.tsx  ★ 726 satır, CRUD + modal
│   │   │       └── 📄 actions.ts           131 satır, skeleton CRUD
│   │   │
│   │   └── 📁 api/
│   │       └── 📁 onboarding/
│   │           └── 📄 route.ts             ★ 148 satır, AI şablon üretimi
│   │
│   ├── 📁 lib/
│   │   └── 📁 supabase/
│   │       ├── 📄 client.ts                createBrowserClient()
│   │       ├── 📄 server.ts                createServerClient() (cookie-based)
│   │       └── 📄 middleware.ts            updateSession() helper
│   │
│   └── 📁 types/
│       └── 📄 supabase.ts                  ★ Supabase CLI ile üretilen tipler
│
├── 📁 supabase/
│   ├── 📄 config.toml                      Supabase local dev ayarları
│   └── 📁 migrations/
│       ├── 📄 ..._initial_schema.sql       profiles, skeleton_blocks, tasks
│       ├── 📄 ..._add_rls.sql              Row Level Security policies
│       ├── 📄 ..._rpc_onboarding.sql       complete_onboarding() function
│       ├── 📄 ..._rpc_daily_tasks.sql      get_or_create_daily_tasks()
│       ├── 📄 ..._original_date.sql        set_task_original_date trigger
│       └── 📄 ..._advisory_lock.sql        Race condition fix
│
├── 📁 _BrainMap/                           ← Sen şu an buradasın 📍
│   ├── 📄 00 - 🧠 Ana Hub.md
│   ├── 📄 01 - 🎯 Proje Vizyonu.md
│   ├── 📄 02 - 🏗️ Mimari.md
│   ├── 📄 03 - 🗄️ Veritabanı.md
│   ├── 📄 04 - 🔄 Kullanıcı Akışları.md
│   ├── 📄 05 - 🧩 Bileşenler.md
│   ├── 📄 06 - ⚡ Server Actions & API.md
│   ├── 📄 07 - 🎨 Tasarım Sistemi.md
│   ├── 📄 08 - 🤖 AI Entegrasyonu.md
│   └── 📄 09 - 📁 Dosya Haritası.md
│
├── 📄 middleware.ts                         Next.js auth middleware (kök seviye)
├── 📄 next.config.ts                        Next.js config
├── 📄 tailwind.config.ts                    Tailwind v4 config
├── 📄 tsconfig.json                         TypeScript ayarları
├── 📄 package.json                          Bağımlılıklar
└── 📄 .env.local                            (gitignore) Çevre değişkenleri
```

---

## ⭐ Kritik Dosyalar (Değişince Dikkat Et)

> [!warning] Yüksek Etki Alanı

| Dosya | Neden Kritik |
|-------|-------------|
| `dashboard/actions.ts` | Görev reschedule algoritması burada |
| `api/onboarding/route.ts` | AI şablon üretimi + RPC çağrısı |
| `supabase/migrations/*.sql` | DB şeması — geri alınamaz |
| `src/types/supabase.ts` | DB'den üretilen tipler — elle değiştirme! |
| `middleware.ts` | Auth koruması — yanlış config = güvenlik açığı |

---

## 🔑 Dosya Boyutları (Satır Sayısı)

```
726 satır → TemplateManager.tsx     (en büyük)
446 satır → OnboardingForm.tsx
269 satır → dashboard/actions.ts
204 satır → TaskCard.tsx
148 satır → api/onboarding/route.ts
136 satır → dashboard/page.tsx
131 satır → template/actions.ts
 50 satır → CloseDay.tsx            (en küçük component)
```

---

## 🔄 Supabase Types Güncelleme

> [!tip] DB Şeması Değişince

```bash
# Supabase CLI ile tipleri yeniden üret
npx supabase gen types typescript --local > src/types/supabase.ts
```

---

## 📎 Config Dosyaları

### `next.config.ts`
```typescript
// Minimal config — App Router kullandığı için özel ayar gerekmez
```

### `tailwind.config.ts`
```typescript
// Tailwind v4 — @import syntax, PostCSS entegrasyonu
// özel renkler ve animasyonlar globals.css'de
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]  // @ → src/ alias
    }
  }
}
```

---

## 🧭 Import Alias

```typescript
// @ işareti src/ klasörüne eşleniyor
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
```

---

#projectx #dosya-haritasi #struktur
