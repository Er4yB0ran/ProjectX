# 🎨 Tasarım Sistemi

← [[06 - ⚡ Server Actions & API]] | → [[08 - 🤖 AI Entegrasyonu]]

---

## 🎭 Genel Estetik

> [!quote] Tasarım Felsefesi
> **Bevel Obsidian Dark** — Koyu, cam efektli, nüanslı bir karanlık tema.
> Yüzeyler tamamen opak değil; arka planı hafifçe gösteren bir derinlik var.

---

## 🎨 Renk Paleti

### Temel Renkler

```
bg-neutral-900  → #171717  Ana arka plan (en derin)
bg-neutral-950  → #0a0a0a  Sidebar, modal overlay
bg-neutral-800  → #262626  Kartlar, input alanları
bg-neutral-700  → #404040  Hover states, borders
```

### Aksent Renkler

| Renk | Tailwind | Kullanım |
|------|----------|---------|
| Violet | `violet-400` / `violet-500` | Primary aksiyon, aktif state |
| Amber | `amber-400` / `amber-500` | Energy cost, ertele butonu |
| Cyan | `cyan-400` / `cyan-500` | Flexibility score |
| Red | `red-400` / `red-500` | Hard constraint, iptal |
| Green | `green-400` / `green-500` | Tamamlama, başarı |
| Emerald | `emerald-400` | Tamamlanan görevler |

### Gün Renk Kodlaması (TemplateManager)

```
Pazartesi  → violet
Salı       → blue
Çarşamba   → cyan
Perşembe   → teal
Cuma       → emerald
Cumartesi  → amber
Pazar      → red
```

---

## 🪟 Glass-morphism Efekti

> [!tip] Tekrarlayan Pattern
> Kartlar ve modallar için kullanılan CSS:

```css
/* Temel glass panel */
backdrop-filter: blur(10px);
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 12px;
```

**Tailwind Karşılığı:**
```
bg-white/5 backdrop-blur-md border border-white/10 rounded-xl
```

---

## ✍️ Tipografi

| Element | Boyut | Ağırlık | Renk |
|---------|-------|---------|------|
| Sayfa başlığı | `text-2xl` | `font-bold` | `text-white` |
| Bölüm başlığı | `text-lg` | `font-semibold` | `text-white` |
| Kart başlığı | `text-sm` | `font-medium` | `text-neutral-200` |
| Body text | `text-sm` | `font-normal` | `text-neutral-400` |
| Placeholder | `text-xs` | - | `text-neutral-500` |
| Renk badge | `text-xs` | `font-medium` | (renge göre) |

**Font Ailesi:** Sistem varsayılanı (Next.js varsayılan sans-serif stack)

---

## 💫 Animasyonlar

### `fade-up` — Onboarding Adım Geçişi

```css
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Kullanım:** Onboarding'de her adım geçişinde bileşen yukarı kayarak beliriyor.

---

### `bloom-pulse` — Özel Animasyon

```css
@keyframes bloom-pulse {
  0%, 100% { 
    opacity: 0.6; 
    transform: scale(1); 
  }
  50% { 
    opacity: 1; 
    transform: scale(1.05); 
  }
}
```

**Kullanım:** Yükleme veya bekleme durumlarında yumuşak nabız efekti.

---

## 🔲 Spacing & Layout

### Dashboard Layout

```
┌──────────────────────────────────────┐
│ SIDEBAR (w-64)  │  CONTENT           │
│                 │                    │
│ [Bugün]         │  Görev listesi     │
│ [Şablon]        │                    │
│ [Görevler]      │                    │
│                 │                    │
└──────────────────────────────────────┘
```

### Boşluk Sistemi
- Sayfa padding: `p-6` veya `p-8`
- Kart içi padding: `p-4`
- Elemanlar arası: `gap-3` / `gap-4`
- Bölümler arası: `space-y-6`

---

## 🃏 Kart Yapısı

### TaskCard Anatomisi

```
┌─────────────────────────────────────────┐
│ ⏰ 09:00 - 10:00          [PENDING]     │
│                                          │
│ 📋 Görev Başlığı                         │
│    Açıklama (varsa)                      │
│                                          │
│ ⚡ Enerji: ████░ (4/5)                   │
│ 🔄 Esneklik: ███░░ (3/5)                 │
│                                          │
│              [✅]  [➡️]  [❌]             │
└─────────────────────────────────────────┘
```

### BlockCard (TemplateManager) Anatomisi

```
┌─────────────────────────────────────────┐
│ [VIOLET] ● Pazartesi    [HARD LOCK 🔒]  │
│                                          │
│ 📋 Derin Çalışma                         │
│ ⏰ 09:00 - 11:00                          │
│                                          │
│ ⚡ 4  🔄 2               [✏️]  [🗑️]       │
└─────────────────────────────────────────┘
```

---

## 🔘 Buton Stilleri

### Primary Button
```
bg-violet-500 hover:bg-violet-600 text-white
font-medium px-4 py-2 rounded-lg
transition-colors duration-200
```

### Secondary Button
```
bg-neutral-700 hover:bg-neutral-600 text-neutral-200
border border-neutral-600
```

### Aksiyon Butonları (Küçük)
```
Tamamla: bg-green-500/20 hover:bg-green-500/30 text-green-400 (w-8 h-8 rounded-full)
Ertele:  bg-amber-500/20 hover:bg-amber-500/30 text-amber-400
İptal:   bg-red-500/20   hover:bg-red-500/30   text-red-400
```

---

## 📱 Responsive Tasarım

> [!info] Mobile-first yaklaşım

```
Sidebar:
- Mobile: gizli veya alt nav (sm:hidden)
- Desktop: sabit sol panel (sm:flex)

TaskCard:
- Mobile: tam genişlik, butonlar altta
- Desktop: inline butonlar sağda
```

---

## 🎯 Energy Cost Renk Sistemi

| Skor | Renk | Anlam |
|------|------|-------|
| 1 | `green-400` | Çok hafif |
| 2 | `lime-400` | Hafif |
| 3 | `yellow-400` | Orta |
| 4 | `orange-400` | Yorucu |
| 5 | `red-400` | Çok yorucu |

---

#projectx #tasarim #css #tailwind #ui
