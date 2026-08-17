# Mevcut Sistem — Özet

Kaynak: `_BrainMap/00`–`09` (2026-08-11 itibarıyla) + sonraki oturumlarda eklenen özellikler. Bu dosya BrainMap'in mermaid/callout'suz, sıkıştırılmış hali; "şu an ne var, nasıl çalışıyor" sorusuna cevap verir. Geçmiş kararların gerekçesi için [[01-vision-and-open-questions]], "hangi sırayla buraya geldik" için [[02-roadmap]], "şimdilik böyle ama ileride değişecek" kararları için [[03-deferred-decisions]].

## Stack

Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4
Supabase: `@supabase/ssr` + `@supabase/supabase-js`, Postgres + Auth + RLS
AI: `@ai-sdk/anthropic` + `ai` (Vercel AI SDK), model `claude-haiku-4-5-20251001`, `generateObject`/`generateText`, streaming yok
Zod ile şema doğrulama

## Route yapısı (`src/app`)

- `(auth)/login`, `(auth)/signup` — Supabase email+şifre auth, dev-bypass girişi var (`NEXT_PUBLIC_DEV_BYPASS=true`). Aynı flag `TaskCard.tsx`'teki zaman kilidini de devre dışı bırakır (kilit yerine "DEV" etiketiyle butonlar aktif kalır). Zaman kilidinin kendisi 15 dakikalık bir tolerans payı içerir (görev saatinden 15 dk öncesine kadar erken işaretlenebilir).
- `auth/callback`, `auth/signout` — route handler'lar
- `onboarding` — 5 adımlı form (uyku düzeni, sabit bloklar, enerji pikleri, serbest günler, rutin). Son adımda `api/onboarding/generate-skeleton`'a POST edip taslak blokları alır.
  - `app_config.ai_chat_enabled` **KAPALIYSA** (varsayılan): hemen `api/onboarding/commit`'i çağırıp `/dashboard`'a yönlenir (eski davranışla birebir).
  - **AÇIKSA**: `OnboardingForm.tsx` `phase='review'`e geçip `SkeletonChatEditor.tsx`'i render eder — sol %25 `ChatPanel.tsx` (sohbet), sağ %75 `SkeletonPreviewTable.tsx` (canlı taslak tablosu), altta "Devam et" → `commit`. Sohbet `api/onboarding/edit-skeleton`'a gider, dönen patch (`skeletonChatTypes.ts`'teki `applyPatch`) client-side draft state'e uygulanır — hiçbir ara adımda DB'ye yazılmaz.
- `api/onboarding/generate-skeleton/route.ts` — `generateObject` ile haftalık `skeleton_blocks` taslağını üretir, DB'ye YAZMAZ (sadece `{blocks}` döner). Zod şemasında `energy_cost`/`flexibility_score` için `.min()/.max()` kullanılmıyor (bkz. "Anthropic structured output kısıtları" aşağıda) — sınırsız `z.number()` + üretimden sonra `clampScore()` ile sunucu tarafında 1-5'e sıkıştırma yapılıyor.
- `api/onboarding/edit-skeleton/route.ts` — sohbet mesajını işler. `messages` array ile TAM konuşma geçmişi gönderilir (projede bunu kullanan tek yer — diğer tüm AI çağrıları tek `system`+`prompt`). Şema: `is_relevant`/`rejection_reason`, `needs_clarification`/`clarification_question`/`ambiguous_block_ids`, `patch` (düz/flat operasyon listesi, bkz. kısıtlar bölümü). Halüsinasyon filtresi: `update`/`delete` sadece client'ın gönderdiği gerçek `client_id`'lere uygulanabilir (`analiz/actions.ts`'teki id-whitelist desenine paralel). Her çağrı `ai_chat_usage`'a bir satır loglar (`turn_type`: relevant/irrelevant/clarification + token sayıları). `ai_chat_enabled` bayrağı sunucu tarafında da kontrol edilir (kapalıyken direkt API çağrısı da reddedilir).
  - **Bütçe kontrolü**: mesaj işlenmeden ÖNCE o `session_id`'nin `ai_chat_usage` toplamı (`src/lib/aiChatConfig.ts` → `AI_CHAT_TOKEN_BUDGET=25000`) kontrol edilir — aşılmışsa `{status:'budget_exceeded'}` döner, `generateObject` hiç çağrılmaz; aşılmamışsa mesaj HER ZAMAN tam işlenir (yanıt asla ortada kesilmez). `BudgetBanner.tsx` %70/%90/%100 eşiklerinde farklı mesaj gösterir, %100'de input+chip'ler kilitlenir ama "Devam et" her zaman aktif kalır.
  - **Prompt caching — kod var, ETKİSİ DOĞRULANAMADI**: system mesajına ve geçmişin son mesajına `providerOptions.anthropic.cacheControl={type:'ephemeral'}` eklendi, istek formatı doğru gönderiliyor ama gerçek testte `cache_creation_input_tokens`/`cache_read_input_tokens` hep `0` geldi. Muhtemel sebep: Haiku modellerinde cache breakpoint'i için gereken ~4096 token eşiği, her turda taze gömülen tam blok listesi (`buildBlockContext`) yüzünden cache'lenebilir (sabit) segmentin küçük kalmasıyla + 25K bütçe tavanının sohbeti bu eşiğe varmadan bitirmesiyle birleşiyor. Kod zararsız, bırakıldı; maliyet iyileştirmesi olarak DOĞRULANMIŞ sayılmamalı. `ai_chat_usage.cache_read_tokens`/`cache_write_tokens` pratikte hep 0/null. **Bilinçli olarak düzeltilmedi** — iki olası yol da başka bir önceliği zedeliyor: (a) her turda tam blok listesi yerine daha kompakt bir temsil (ör. sadece ilgili günün blokları) göndermek, ama bu modelin bağlamdan kopma riskini taşır; (b) 25K token bütçesini yükseltmek, ama bu "maliyeti düşük tut" önceliğiyle çelişir. Mevcut maliyet zaten bütçe tavanıyla garanti altında (caching çalışsa da çalışmasa da), kaybedilen sadece ek bir optimizasyon fırsatı — bu yüzden şimdilik ertelendi, ölçülebilir bir ihtiyaç çıkarsa (a)/(b) tekrar değerlendirilebilir. (Bkz. [[03-deferred-decisions]] madde 3.)
- `api/onboarding/commit/route.ts` — taslak blokları + form verisini alıp `complete_onboarding` RPC'sini çağırır.
- `src/lib/skeletonBlock.ts` — `DAY_NAMES`, `BlockSchema`/`BlockFormData`, `normalizeTime`, `applyBusinessRules`, `groupBlocksByDay`: hem `template/actions.ts` hem onboarding'in önizleme tablosu buradan import eder.
- `(dashboard)/dashboard` — günün görevleri, `TaskCard`, `CloseDay`, `AddTaskButton`, `actions.ts` (`updateTaskStatus`, `rescheduleTask`, `closeDayAndReflect`, `getDailyReflection`)
- `(dashboard)/template` — haftalık şablon CRUD, `TemplateManager.tsx` (726 satır, en büyük bileşen), `actions.ts`
- `(dashboard)/tasks` — arşiv görünümü: `TasksView.tsx`, tarihe göre gruplama + durum filtresi + manuel görev ekleme/silme. `actions.ts`: `createTask`/`deleteTask`, hem dashboard hem tasks sayfası kullanır (`src/components/TaskFormModal.tsx` paylaşılan form). Silme kuralı: `skeleton_block_id` NULL (manuel görev) → hard delete; DOLU (şablon kökenli) → `status='cancelled'` soft delete (aksi halde `get_or_create_daily_tasks` o günü "hiç materialize edilmemiş" sanıp şablonu yeniden oluşturur, bkz. bilinen hata #1).
- `(dashboard)/analiz` — davranış analizi + verimli alan görseli. `src/lib/analytics.ts`: `analyzeBehavior()` genel tamamlama oranı + saat dilimine göre başarı + en çok ertelenen/iptal edilen görev başlıkları; `buildProductivityHeatmap()` gün × saat-dilimi ısı haritası (dataviz skill'ine göre: tek renk/yeşil, direct label, boş hücre ile "0%" ayrışık, native `title` tooltip). Materialized view/cron yok, istek anında hesaplanır. **Şablon önerileri**: `actions.ts`'teki `generateSkeletonSuggestions()` — yeterli veri/esnek blok yoksa üretmiyor; varsa analiz çıktısını + kullanıcının esnek (`is_hard_constraint=false`) bloklarını `generateObject`'e verip en fazla 5 öneri alır. Döndürülen `skeleton_block_id`'ler halüsinasyona karşı kullanıcının kendi bloklarına süzülür. Öneriler `skeleton_suggestions`'ta `pending` durur, `SuggestionsPanel.tsx`'te kullanıcı onaylamadan (`skeleton_blocks`'a) hiçbir otomatik değişiklik uygulanmaz.
- `src/components/SidebarNav.tsx` — dashboard sol menü (Bugün/Haftalık Şablon/Görevler/Analiz), `isAdmin` true ise sona "Admin" linki eklenir.
- `admin` (root'ta, `(dashboard)` route group'unun dışında — kendi `layout.tsx`'i var): sadece `profiles.is_admin = true` girebilir. `page.tsx`: `AiChatConfigCard` (`app_config.ai_chat_enabled`'ı `admin_set_config` RPC'siyle aç/kapat) → `AiChatUsageSummaryCard` (`admin_ai_chat_usage_summary()`'den toplam mesaj/token/farklı kullanıcı/oturum, 4'lü stat-kart grid) → kullanıcı listesi (`admin_list_users` RPC). `[userId]/page.tsx` seçilen kullanıcının görevlerini (`admin_get_user_tasks` RPC) `/analiz` ile aynı `analyzeBehavior`/`buildProductivityHeatmap` fonksiyonlarına verip birebir aynı raporu üretir. Bu RPC'ler `SECURITY DEFINER`, içeride `is_admin` kontrolü yapar — RLS'e ek admin politikası yok, erişim tamamen bu fonksiyonlar üzerinden.

Middleware (`src/middleware.ts` → `src/lib/supabase/middleware.ts`): `getUser()` doğrulama, 3sn timeout wrapper, korumalı rotalar `/dashboard`, `/template`, `/onboarding`.

## Anthropic structured output kısıtları (undocumented gotcha — yeni `generateObject` şeması yazarken akılda tut)

Claude Haiku 4.5'in structured output'u JSON şemasında şunları DESTEKLEMİYOR: `number` tipinde `min`/`max`, `array` tipinde `maxItems`, Zod `discriminatedUnion`'ın ürettiği `oneOf`. Üçü de `edit-skeleton` şeması tasarlanırken hatayla (`output_config.format.schema`) keşfedildi. Çözüm deseni: şema tamamen düz/flat tutulur (iç içe obje/union yok), sınırlar üretimden SONRA kod tarafında uygulanır (`clampInt`/`clampScore`, `.slice(0, N)`).

## PL/pgSQL `SECURITY DEFINER` + `RETURNS TABLE(...)` kısıtı (3 kez tekrarlanan hata deseni)

`admin_list_users`, `admin_get_user_tasks`, `admin_ai_chat_usage_summary` — üçünde de aynı hata: fonksiyonun `RETURNS TABLE(...)` çıktı kolon adı (`id`, `total_tokens` vb.) sorgudaki kaynak tablonun kendi kolon adıyla çakışıp Postgres "column reference is ambiguous" hatası verdi. **Kural**: bu kalıpla yeni RPC yazılırken kaynak tabloya her zaman alias verilip (`FROM x t`) her kolon referansı nitelenmeli (`t.col`).

## Veritabanı şeması (Supabase, RLS aktif her tabloda)

- **profiles** (1-1 auth.users): `full_name`, `wake_up_time`, `bed_time`, `energy_peaks` (jsonb: morning/afternoon/evening → high/medium/low), `onboarding_completed`, `is_admin`
- **skeleton_blocks**: `day_of_week` (0-6), `start_time`, `end_time`, `title`, `is_hard_constraint`, `energy_cost` (1-5), `flexibility_score` (1-5). Hard constraint ise flexibility otomatik 1.
- **tasks**: `skeleton_block_id` (FK, nullable), `title`, `description`, `task_date`, `original_date` (trigger ile korunur), `start_time`, `end_time`, `energy_cost`, `flexibility_score`, `status` (`pending`/`completed`/`rescheduled`/`cancelled`), `linked_task_id` (nullable, kendi tablosuna referans, bölünmüş görevler için)
- **daily_reflections**: `reflection_date`, `ai_message`, unique(user_id, reflection_date)
- **task_notifications**: `user_id`, `task_id` (FK, cascade), `notification_type` (`reminder`/`confirmation`), `scheduled_for`, `sent_at` (nullable), `response` (`done`/`rescheduled`/`not_done`, nullable), `responded_at` (nullable). Kayıtları yalnızca backend (service role) oluşturur — kullanıcı insert edemez, sadece kendi kaydını `response`/`responded_at` üzerinden güncelleyebilir (bir `BEFORE UPDATE` trigger'ı bu iki kolon dışındaki alanları kilitler). `scheduled_for` üzerinde `sent_at IS NULL` koşullu partial index var (henüz kullanan bir scheduler yok, mobil dönem bekliyor).
- **skeleton_suggestions**: `user_id`, `skeleton_block_id` (FK, cascade), `field` (`day_of_week`/`start_time`/`end_time`), `current_value`/`suggested_value` (text), `rationale`, `status` (`pending`/`accepted`/`dismissed`). RLS: normal `auth.uid()=user_id` politikası, admin bypass'ı yok.
- **app_config**: tek satırlık global anahtar-değer config (`key` PK, `value` jsonb). Şu an tek satırı `ai_chat_enabled` (varsayılan `false`). Herkes okuyabilir, yazma yok — sadece `admin_set_config(p_key, p_value)` RPC'si (SECURITY DEFINER, is_admin kontrollü).
- **ai_chat_usage**: `user_id`, `session_id` (bir onboarding-chat oturumunu gruplar, client `crypto.randomUUID()`), `turn_type` (`relevant`/`irrelevant`/`clarification`), `input_tokens`/`output_tokens`/`total_tokens`, `cache_read_tokens`/`cache_write_tokens`. RLS: `auth.uid()=user_id`. Mesaj/blok İÇERİĞİ hiç saklanmaz, sadece token muhasebesi. **Amaç sadece admin özet ekranı değil**: bu tablo baştan "ileride otomatik eşik-bazlı kapanmaya geçiş için temel" olarak tasarlandı (bkz. plan) — yani platform genelinde bir toplam-maliyet eşiği aşılınca `ai_chat_enabled`'ı otomatik `false` yapacak bir mekanizma. Şu an bu mekanizma YOK, sadece manuel admin toggle'ı var; loglama zaten yapıldığı için ileride eklenmesi ek bir migration gerektirmeyecek. (Bu KESİN bir ileride-yapılacak karar — detay [[03-deferred-decisions]] madde 1.)

RPC: `get_or_create_daily_tasks(user_id, date, day_of_week)` (advisory lock ile idempotent), `complete_onboarding(...)`, `admin_list_users()` / `admin_get_user_tasks(p_user_id)`, `admin_set_config(p_key, p_value)`, `admin_ai_chat_usage_summary()` — hepsi `SECURITY DEFINER` + admin/RLS kontrollü.

Trigger'lar: `set_task_original_date` (task ertelenince ilk tarih korunur), `task_notifications` üzerinde kolon kilidi (yukarıda).

Migration dosyaları: `supabase/migrations/` (19 dosya, `20260428`–`20260817` arası).

**Bilinen not**: Supabase migration history tablosunda eski dosya adlandırmasından kalma bir tutarsızlık var (bazı erken migration'lar remote'ta farklı versiyon numaralarıyla kayıtlı) — şema kendisi güncel ve doğru, sadece `supabase migration list` çıktısı bunu yansıtmıyor. Yeni migration eklerken `supabase db push` yerine `supabase db query --linked -f <dosya>` + `supabase migration repair --linked --status applied <versiyon>` kullanılıyor, bu tutarsızlığa dokunulmadı.

## Bilinen düzeltilmiş hatalar

1. **Erteleme, hedef günün şablonunu yok ediyordu**: `get_or_create_daily_tasks` RPC'si "hiç görev yoksa şablonu materialize et" kontrolünü tarihteki TÜM satırlara bakarak yapıyordu; erteleme senaryolarında yanlış sayım nedeniyle şablon hiç ya da çift oluşuyordu. Son düzeltme: kontrol artık sadece `original_date = p_date` (task_date'e bakılmaksızın) — `original_date` INSERT'te bir kere yazılır, hiç değişmez, bu yüzden "bu günün şablonu materialize edildi mi" sorusunun tek doğru göstergesi budur.
2. **`tasks`/`skeleton_blocks`'ta gereksiz nullable kolonlar**: `task_date`, `flexibility_score`, `status` (tasks) ve `is_hard_constraint` (skeleton_blocks) hiçbir kod yolunda null olmuyordu ama NOT NULL kısıtı yoktu — üretilen TS tipleri gereksiz nullable olup tip hatalarına yol açıyordu. NOT NULL eklendi.
3. **`task_notifications` UPDATE RLS'i kolon ayrımı yapmıyordu**: politika sadece satır sahipliğini kontrol ediyordu. Bir `BEFORE UPDATE` trigger'ı eklendi — `service_role` dışında kalan istekler sadece `response`/`responded_at` değiştirebilir.
4. **`src/types/supabase.ts`'teki elle eklenmiş tip takma adları**: `npm run db:types` dosyanın tamamını CLI çıktısıyla değiştirdiği için `Profile`/`Task`/`TaskStatus`/`SkeletonBlock`/`DailyReflection`/`TaskNotification`/`NotificationType`/`NotificationResponse` gibi elle eklenmiş export'lar siliniyor, build kırılıyor. **`db:types` her çalıştırıldığında bu blok dosyanın sonuna elle geri eklenmeli** — CLI'nin ürettiği içerik bunu otomatik korumuyor.
5. **`admin_list_users`/`admin_get_user_tasks`/`admin_ai_chat_usage_summary` ambiguous column**: bkz. yukarıdaki "PL/pgSQL kısıtı" bölümü.

## Görev yeniden zamanlama algoritması (`rescheduleTask`, dashboard/actions.ts) — 3 kademeli arama

1. Hard constraint veya flexibility_score=1 → hata (ertelenemez)
2. Saatsiz görev → doğrudan ertesi güne taşınır (çakışma olamaz)
3. **Adım 1 — Aynı gün**: görevin kendi `task_date`'inde (bugünse şu andan itibaren, değilse gün başından) boş slot aranır.
4. **Adım 2 — Ertesi gün**: bulunamazsa ertesi günde (önce orijinal saat tercih edilir, sonra ilk boş slot) aranır.
5. **Bölme**: Adım 2'de tam sığmıyorsa ve `flexibility_score ≥ 4` ise, görev ikiye bölünür — 1. parça ertesi güne (o günün en büyük boşluğuna, min 15 dk), 2. parça ertesi-günden-sonraki güne yerleştirilir. İki satır `linked_task_id` ile bağlanır, başlıklara `(1/2)`/`(2/2)` eklenir. `original_date` trigger'ı INSERT'te yeni tarihe eşitlediği için, doğru `original_date` ikinci bir UPDATE ile geri yazılır.
6. **Adım 3 — En yakın uygun gün**: bölme de olmazsa/uygun değilse, ertesi-günden-sonraki günden başlayarak 14 gün ileriye kadar tam sığan ilk gün aranır (bölünmeden).
7. Hiçbiri olmazsa → `status = cancelled`

`tasks.linked_task_id` — bölünmüş görevin 2. parçasında 1. parçanın id'sini tutar. `TaskCard.tsx`'te "⇢ 2/2 devamı" rozetiyle gösterilir.

## AI kullanım noktaları

1. **Onboarding — iskelet üretimi** (`api/onboarding/generate-skeleton`): kullanıcı profili + sabit bloklar → Zod şemalı `generateObject` ile max 30 bloklu haftalık şablon
2. **Onboarding — sohbetle düzenleme** (`api/onboarding/edit-skeleton`, `ai_chat_enabled` bayrağı arkasında): patch tarzı düzenleme, bkz. yukarıdaki route açıklaması
3. **Analiz — şablon önerileri** (`analiz/actions.ts` → `generateSkeletonSuggestions`): davranış analizinden en fazla 5 somut şablon değişikliği önerir
4. **Close Day** (`dashboard/actions.ts` → `closeDayAndReflect`): günün tamamlanan/eksik görevlerinden 2-3 cümlelik "system-admin" tonlu özet (motivasyon klişesi yok), günde 1 kez, `daily_reflections`'a yazılır

Maliyet tahmini (BrainMap'te, güncellenmedi): onboarding ~$0.007/kullanıcı, Close Day ~$0.0005/kullanıcı/gün → 1000 kullanıcı/ay ~$15. Sohbetle düzenleme ~25K token/oturum tavanına bağlı (bkz. yukarı).

## Tasarım sistemi

"Bevel Obsidian Dark" — koyu tema, glass-morphism, gün renk kodlaması, `fade-up`/`bloom-pulse` animasyonları. Detay: `_BrainMap/07 - Tasarım Sistemi.md`

## Bilinen açık soru (BrainMap'te işaretli)

`skeleton_block` silindiğinde bağlı gelecek `task`'lar ne olacak — şu an otomatik silinmiyor, ele alınmamış edge case.
