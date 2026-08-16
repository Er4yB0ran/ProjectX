# ProjectX

Türkçe, AI destekli zaman/görev yönetimi uygulaması. Kullanıcının enerji döngüsüne göre haftalık bir "iskelet" (skeleton) oluşturur, bunu günlük görevlere çevirir.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- Supabase (Postgres + Auth + RLS), Server Actions ağırlıklı (tek REST route: `/api/onboarding`)
- AI: Anthropic Claude Haiku 4.5, Vercel AI SDK (`generateObject`/`generateText`, streaming yok)

## Context dosyaları

Detaylı mimari/şema bilgisi ve proje vizyonu için önce şunları oku (BrainMap'in tamamını okumadan önce). Bu dosyalar `.claude/` altında değil, repo kökünde düz bir klasörde — herhangi bir AI aracı veya insan projeye baktığında görsün diye:

- [ai-context/00-current-state.md](ai-context/00-current-state.md) — mevcut kurulu sistemin özeti (routes, DB şeması, server actions, AI kullanım noktaları)
- [ai-context/01-vision-and-open-questions.md](ai-context/01-vision-and-open-questions.md) — genişleyen vizyon (iOS'ta bildirim+Live Activity, web'de manuel/geniş-ekran, AI davranış analizi), BrainMap ile çelişen noktalar, açık mimari sorular
- [ai-context/02-roadmap.md](ai-context/02-roadmap.md) — **fazlı yol haritası + "şu an neredeyiz" durumu. Yeni bir oturumda işe başlamadan önce MUTLAKA bu dosyayı oku.**

Kaynak doküman: `_BrainMap/` (Obsidian vault, kullanıcının kendi notları — mermaid/callout ağırlıklı, **düzenleme yapma**, sadece oku).

## Kurallar

- **PROJE ŞEKİL ALDIKÇA VE DEĞİŞTİKÇE `ai-context/*.md` DOSYALARINI GÜNCELLE.** Yeni bir mimari karar alındığında, vizyon netleştiğinde veya büyük bir özellik eklendiğinde bu dosyaları güncel tut. Bu klasör herkese (başka AI araçları dahil) açık — `.claude/` gibi araca özel bir yere taşıma/kopyalama.
- `_BrainMap/**` kullanıcının Obsidian vault'u — kullanıcı özellikle istemedikçe buraya yazma.
- Supabase şema değişikliğinden sonra `npm run db:types` ile tipleri güncelle.
- **Her fazdan önce sade dille açıkla, onay bekle, sonra uygula.** [ai-context/02-roadmap.md](ai-context/02-roadmap.md)'deki her faza başlamadan önce: o fazda ne yapılacağını, neyin değişip neyin ekleneceğini, kullanıcının bu değişikliği nasıl göreceğini/test edeceğini teknik jargondan arındırılmış, anlaşılır bir dille anlat. Kullanıcı açıkça onaylamadan (Plan Mode onayı ya da net bir "başla/onaylıyorum") o fazın koduna geçme.
