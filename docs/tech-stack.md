# Tech Stack

## Frontend

| Katman | Teknoloji |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| Dil | TypeScript |
| UI State | `useOptimistic` + `useTransition` (React 19) |
| Form/Veri | Server Actions (`'use server'`) |

## Backend

- **Supabase** — PostgreSQL (DB) + Auth (e-posta/şifre)
- **Server Actions** — API katmanı yok; form/buton action'ları doğrudan server'a gider
- **RPC Fonksiyonlar** — `get_or_create_daily_tasks`, `complete_onboarding` (Supabase'de tanımlı)
- **AI** — Vercel AI SDK (`ai` ^6) + `@ai-sdk/anthropic`; onboarding için Claude Haiku kullanılır

## Stil & UI

- **Tailwind CSS 4** (PostCSS)
- **Lucide React** — ikonlar
- Tasarim dili: Bevel Obsidian Dark (tam karanlik, keskin, veri-odakli)
  - Arka plan: `bg-neutral-950`, kartlar: `bg-neutral-900 border border-neutral-800`
  - Glassmorphism ve transparan beyaz arka planlar (`bg-white/*`, `backdrop-blur-*`) kullanilmaz
  - Metrik rozetler: enerji maliyeti (amber) + esneklik skoru (cyan), gorev kartlarinda goruntulenir
- Renk paleti: `neutral-950 / neutral-900 / neutral-800` gri skalasi; aksanlar `amber`, `cyan`, `green`, `red`

## Klasör Yapısı

```
src/
├── app/
│   ├── (auth)/            # Login / Signup sayfaları (korumasız)
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/       # Auth gerektiren sayfalar
│   │   ├── layout.tsx     # Sidebar + auth guard
│   │   ├── dashboard/
│   │   │   ├── page.tsx       # Günlük görev listesi (Server Component)
│   │   │   ├── actions.ts     # Server Actions (updateTaskStatus, rescheduleTask)
│   │   │   └── TaskCard.tsx   # Client Component
│   │   └── template/
│   │       ├── page.tsx       # Haftalık şablon CRUD sayfası (Server Component)
│   │       ├── actions.ts     # Server Actions (createTemplateBlock, updateTemplateBlock, deleteTemplateBlock)
│   │       └── TemplateManager.tsx  # Client Component — modal, form, optimistic UI
│   ├── api/
│   │   └── onboarding/route.ts  # AI ile skeleton_block üretimi
│   ├── auth/
│   │   ├── callback/route.ts
│   │   └── signout/route.ts
│   ├── onboarding/
│   │   ├── page.tsx
│   │   └── OnboardingForm.tsx
│   └── layout.tsx / globals.css / page.tsx
├── lib/
│   └── supabase/
│       ├── client.ts      # Browser client
│       ├── server.ts      # Server client (cookie tabanlı)
│       └── middleware.ts  # Session doğrulama + yönlendirme
├── types/
│   └── supabase.ts        # Otomatik üretilmiş DB tipleri (supabase gen types)
└── middleware.ts           # Next.js middleware → updateSession'ı çağırır
```

### Kurallar

- **Route = `page.tsx`** — her route kendi klasöründe, sadece veri çeker ve bileşenlere aktarır.
- **İş mantığı = `actions.ts`** — Server Action'lar `'use server'` direktifiyle, route'un yanında.
- **Etkileşim = Client Component** — sadece `useTransition`/`useOptimistic` gereken bileşenler `'use client'`.
- **DB tipler** — elle yazılmaz; `npm run db:types` ile `src/types/supabase.ts` güncellenir.
