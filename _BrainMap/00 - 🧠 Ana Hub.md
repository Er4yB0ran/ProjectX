# 🧠 ProjectX — Ana Hub

> [!abstract] Proje Özeti
> **ProjectX**, kullanıcıların enerji döngülerine ve zaman kısıtlamalarına göre haftalık program şablonları oluşturan, günlük görevleri akıllıca yöneten ve AI destekli günlük refleksiyonlar sunan bir **Türkçe zaman yönetimi SaaS uygulaması**dır.

---

## 🗺️ Harita — Tüm Belgeler

| # | Belge | İçerik |
|---|-------|--------|
| 01 | [[01 - 🎯 Proje Vizyonu]] | Amaç, hedef kullanıcı, değer önerisi |
| 02 | [[02 - 🏗️ Mimari]] | Tech stack, klasör yapısı, mimari kararlar |
| 03 | [[03 - 🗄️ Veritabanı]] | Supabase şeması, RLS, RPC fonksiyonları |
| 04 | [[04 - 🔄 Kullanıcı Akışları]] | Auth, onboarding, günlük kullanım akışları |
| 05 | [[05 - 🧩 Bileşenler]] | React bileşen ağacı ve açıklamaları |
| 06 | [[06 - ⚡ Server Actions & API]] | Tüm sunucu tarafı iş mantığı |
| 07 | [[07 - 🎨 Tasarım Sistemi]] | Renkler, tipografi, animasyonlar |
| 08 | [[08 - 🤖 AI Entegrasyonu]] | Claude Haiku entegrasyonu |
| 09 | [[09 - 📁 Dosya Haritası]] | Tam dosya yapısı ve sorumluluklar |

---

## ⚡ Hızlı Referans

```
Framework    → Next.js (App Router)
Database     → Supabase (PostgreSQL)
AI           → Anthropic Claude Haiku 4.5
Language     → TypeScript + Türkçe UI
Styling      → Tailwind CSS 4 + Glass-morphism
Auth         → Supabase Auth
```

---

## 🔗 Kritik Dosyalar (Direkt Linkler)

### Sayfa Bileşenleri
- `src/app/page.tsx` → Kök yönlendirme
- `src/app/(dashboard)/dashboard/page.tsx` → Günlük görev görünümü
- `src/app/(dashboard)/template/page.tsx` → Haftalık şablon editörü
- `src/app/onboarding/page.tsx` → AI destekli kurulum sihirbazı

### İş Mantığı
- `src/app/(dashboard)/dashboard/actions.ts` → Görev mutasyonları (269 satır)
- `src/app/(dashboard)/template/actions.ts` → Şablon CRUD
- `src/app/api/onboarding/route.ts` → AI şablon üretimi

### Veritabanı
- `supabase/migrations/` → 6 SQL migration dosyası
- `src/types/supabase.ts` → Üretilen TypeScript tipleri

---

## 📊 Metrikler

| Metrik | Değer |
|--------|-------|
| Toplam Sayfa | 7 route |
| Veritabanı Tablosu | 4 |
| RPC Fonksiyon | 2 |
| Server Action | ~10 |
| AI Entegrasyon Noktası | 2 |
| UI Dili | Türkçe |
| Saat Dilimi | Europe/Istanbul |

---

## 🎯 Özellik Durumu

- [x] Authentication (email + şifre)
- [x] 5 adımlı Onboarding
- [x] AI ile haftalık şablon üretimi
- [x] Haftalık şablon CRUD (TemplateManager)
- [x] Günlük görev panosu
- [x] Akıllı görev yeniden zamanlama
- [x] AI günlük refleksiyonları (Close Day)
- [x] Zaman kilidi (time-lock) özelliği
- [ ] Bildirimler
- [ ] Mobil uygulama
- [ ] Çoklu dil desteği

---

#projectx #brainmap #index
