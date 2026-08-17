# Uygulama Yol Haritası

Bu dosya "şu an nerede duruyoruz, yeni bir chat açılınca hangi işten devam edilecek" sorusuna cevap verir — kronolojik bir günlük değil, bir durum özeti. Mimari/DB detayları için [[00-current-state]], karar gerekçeleri için [[01-vision-and-open-questions]], "şimdilik böyle ama ileride kesin değişecek" kararları için [[03-deferred-decisions]]. Görsel özet: Obsidian'da `_BrainMap/10 - 🚦 Şu An Neredeyiz (Web Dönemi).md` (mermaid diyagramlı).

## Şu an neredeyiz

**Web dönemi 3 adım + genişletme turu (Faz A-E) + onboarding AI-sohbet planı (Faz 1-5) tamamlandı.** Sıradaki gündem kullanıcıyla netleşecek — bu dosya güncellenene kadar "aktif iş yok" say.

**2026-08-13 kararı**: Kullanıcının geliştirme ortamı Windows PC + iPhone; Mac, Xcode, Apple Developer üyeliği yok. iOS native geliştirme sadece macOS'te mümkün olduğu için mobil/bildirim işi (aşağıdaki "Mobil dönem" bölümü) **tamamen durduruldu**, Mac + Apple Developer hesabı edinilene kadar gündeme gelmeyecek. Web Push gibi bir ikame değerlendirilip reddedildi — bildirim sadece iOS'a özel kalacak.

## Tamamlanan işler (özet — detay [[00-current-state]]'te)

### Web dönemi — 3 adım (2026-08-13/14)
- **Adım 1 — Cilalama**: erteleme rozeti, geniş ekran layout, `src/lib/date.ts`, dev-bypass zaman kilidi istisnası.
- **Adım 2 — Davranış analizi**: `/analiz` sayfası + `src/lib/analytics.ts` (`analyzeBehavior()`).
- **Adım 3 — Verimli alan görseli**: gün × saat-dilimi ısı haritası (`buildProductivityHeatmap()`).

### Web dönemi — genişletme turu, Faz A-E (2026-08-15/16)
Dosya çakışması olmayan 5 parça, paralel agent'larla:
- **A — Zaman kilidi esnekliği**: 15 dk tolerans.
- **B — Görev oluşturma/silme**: tekilleştirilmiş `createTask`/`deleteTask`.
- **C — Kademeli erteleme + görev bölme**: `rescheduleTask` 3 kademeli arama.
- **D — Admin paneli**: `is_admin` + `admin_list_users`/`admin_get_user_tasks` RPC'leri.
- **E — Kişisel öneri motoru**: `/analiz`'de "Şablon önerileri" (`generateSkeletonSuggestions`).

### Onboarding — AI sohbet ile iskelet düzenleme, Faz 1-5 (2026-08-16/17)
Kapsamlı bir grilling (mimari mülakat) sürecinin sonucu — kararlar `_BrainMap/11 - 🔥 Grilling - İskelet Chat Düzenleme.md`'de, uygulama planı `C:\Users\erayb\.claude\plans\breezy-marinating-pillow.md`'de. Maliyet önceliği: token bazlı bütçe (~25K/oturum) + prompt caching denemesi + platform genelinde manuel açma/kapama anahtarı (`app_config.ai_chat_enabled`, varsayılan kapalı).

- **Faz 1 — Altyapı**: `generate-skeleton`/`commit` route ayrımı, `app_config` + toggle, `phase='form'|'review'` + salt-okunur önizleme.
- **Faz 2 — Chat backend + patch + arayüz**: `edit-skeleton` route, `messages` array (projede ilk), halüsinasyon filtresi, `ChatPanel`/`SkeletonChatEditor`.
- **Faz 3 — Token bütçesi**: mesaj-öncesi bütçe kontrolü, `BudgetBanner` (%70/%90/%100), kilit UI.
- **Faz 4 — Prompt caching**: kod eklendi, gerçek testte etkisi doğrulanamadı (kök sebep analizi [[00-current-state]]'te).
- **Faz 5 — Admin kullanım özeti**: `admin_ai_chat_usage_summary()` RPC + `AiChatUsageSummaryCard`.

Yol boyunca çıkan ve düzeltilen genel-geçer teknik kısıtlar (Anthropic structured-output şema sınırları, `SECURITY DEFINER`+`RETURNS TABLE` ambiguous-column deseni) [[00-current-state]]'in ilgili bölümlerine taşındı — yeni kod yazarken oraya bak.

Tüm değişiklikler `feat/task-management-and-admin` branch'inde, henüz commit edilmedi (kullanıcı onayı bekleniyor).

Kapsam kasıtlı olarak sadece onboarding'le sınırlı tutuldu — aynı chat deneyiminin `/template` sayfasına genişletilmesi net bir "ileride yapılacak" karar, henüz başlanmadı: [[03-deferred-decisions]] madde 2.

## Mobil dönem — ileride (Mac + Apple Developer hesabı edinilince gündeme gelir)

Eski "Faz 1-6" planının mobile özel kısımları burada donduruldu:

- **Faz 1 (veri modeli) — kısmen tamamlandı**: `task_notifications` tablosu zaten var (bkz. [[00-current-state]]), ama hiçbir UI/backend onu kullanmıyor (Faz 2'yi bekliyor).
- **Faz 2 (bildirim tetikleme motoru)**: Supabase Edge Function + cron ile scheduler, APNs entegrasyonu, device token kaydı.
- **Faz 3 (iOS native istemci)**: Teknoloji kararı bekliyor (Swift/SwiftUI vs React Native, bkz. [[01-vision-and-open-questions]] açık soru #5). APNs kayıt/izin akışı, action-butonlu bildirim, Live Activity.

Platform kapsamı (kesin, karar değişmedi): iOS tam kapsam (bildirimli hatırlatma + gecikmeli onay + action-butonlu bildirim + Live Activity) — web'de bildirim/hatırlatma hiç olmayacak, sadece geniş ekran + manuel aksiyon.

## Her adım/faz için standart süreç (kullanıcı talimatı)

Bağımsız birden fazla faz varsa hepsi tek seferde özetlenip toplu onay alınabilir (paralel agent'larla uygulanabilir); riskli/şema değiştiren veya birbirine bağımlı fazlar için tek tek onay gerekir (bkz. `CLAUDE.md`). Her fazdan/adımdan önce:
1. **Sade dille anlat**: ne yapılacak, ne değişecek, ne eklenecek — teknik jargon olmadan.
2. **"Nasıl göreceğim?" sorusunu cevapla**: kullanıcının değişikliği somut olarak nasıl fark edeceğini/test edeceğini söyle.
3. **Onay bekle**: kullanıcı net şekilde onaylamadan koda geçilmez.
4. Onay geldikten sonra uygula, gerçek tarayıcıda test et, doğrula.
