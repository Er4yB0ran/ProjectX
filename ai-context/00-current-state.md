# Mevcut Sistem — Özet

Kaynak: `_BrainMap/00`–`09` (2026-08-11 itibarıyla). Bu dosya BrainMap'in mermaid/callout'suz, sıkıştırılmış hali.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4
Supabase: `@supabase/ssr` + `@supabase/supabase-js`, Postgres + Auth + RLS
AI: `@ai-sdk/anthropic` + `ai` (Vercel AI SDK), model `claude-haiku-4-5-20251001`, `generateObject`/`generateText`, streaming yok
Zod ile şema doğrulama

## Route yapısı (`src/app`)

- `(auth)/login`, `(auth)/signup` — Supabase email+şifre auth, dev-bypass girişi var (`NEXT_PUBLIC_DEV_BYPASS=true`). Aynı flag, `TaskCard.tsx`'teki zaman kilidini de (görevin saati gelmeden Yaptım/Erteledim/Olmadı basılamaz) devre dışı bırakır — kilit yerine "DEV" etiketiyle butonlar aktif kalır, test için saatin gelmesini beklemeye gerek kalmaz. Zaman kilidinin kendisi de 15 dakikalık bir tolerans payı içeriyor (görev saatinden 15 dk öncesine kadar erken işaretlenebilir, 2026-08-15).
- `auth/callback`, `auth/signout` — route handler'lar
- `onboarding` — 5 adımlı form (uyku düzeni, sabit bloklar, enerji pikleri, serbest günler, rutin) → `/api/onboarding`'e POST
- `api/onboarding/route.ts` — `generateObject` ile haftalık `skeleton_blocks` şablonu üretir
- `(dashboard)/dashboard` — günün görevleri, `TaskCard`, `CloseDay`, `AddTaskButton` (manuel görev ekleme tetikleyicisi), `actions.ts` (`updateTaskStatus`, `rescheduleTask`, `closeDayAndReflect`, `getDailyReflection`)
- `(dashboard)/template` — haftalık şablon CRUD, `TemplateManager.tsx` (726 satır, en büyük bileşen), `actions.ts`
- `(dashboard)/tasks` — arşiv görünümü: `TasksView.tsx`, tarihe göre gruplama + durum filtresi (Tümü/Bekleyen/Tamamlanan/Ertelenen/İptal) + manuel görev ekleme (tarih seçilebilir) + silme. `actions.ts`: `createTask`/`deleteTask` — hem dashboard hem tasks sayfası bu tek implementasyonu kullanır (`src/components/TaskFormModal.tsx` paylaşılan form). Silme kuralı: `skeleton_block_id` NULL (manuel görev) → hard delete; DOLU (şablon kökenli) → `status='cancelled'` soft delete (aksi halde `get_or_create_daily_tasks` o günü "hiç materialize edilmemiş" sanıp şablonu yeniden oluşturur, bkz. aşağıdaki bilinen hata #1).
- `(dashboard)/analiz` — davranış analizi (Adım 2, 2026-08-14) + verimli alan görseli (Adım 3, 2026-08-14). `src/lib/analytics.ts`: `analyzeBehavior()` genel tamamlama oranı + saat dilimine göre (sabah/öğlen/akşam/gece) başarı + en çok ertelenen/iptal edilen görev başlıkları (en az 2 tekrarı olanlar arasından) üretir; `buildProductivityHeatmap()` gün × saat-dilimi kırılımında bir ısı haritası matrisi döner (tek renk/yeşil, orana göre koyulaşan dolgu — dataviz skill'ine göre: sequential/tek-hue, direct label olarak yüzde, boş hücre ile "0%" ayrışık, native `title` tooltip). Materialized view/cron yok, istek anında hesaplanıyor. **Şablon önerileri (Faz E, 2026-08-16)**: `actions.ts`'teki `generateSkeletonSuggestions()` — az veri varsa (< 10 sonuçlanmış görev) veya önerilebilecek esnek blok yoksa üretmiyor; varsa yukarıdaki analiz çıktısını (buckets/heatmap/worstTitles) + kullanıcının `is_hard_constraint=false` bloklarını (id'leriyle) `generateObject`'e verip en fazla 5 öneri (`skeleton_block_id`, `field` ∈ day_of_week/start_time/end_time, `suggested_value`, `rationale`) alıyor. AI'ın döndürdüğü id'ler kullanıcının kendi esnek bloklarına ait bir `Map`'e karşı süzülüyor (halüsinasyon koruması). Öneriler `skeleton_suggestions` tablosunda `status='pending'` olarak duruyor, `SuggestionsPanel.tsx`'te "Kabul et"/"Reddet" ile kullanıcı onaylamadan `skeleton_blocks`'a HİÇBİR otomatik değişiklik uygulanmıyor — kabul edilince ilgili tek alan güncelleniyor.
- `src/components/SidebarNav.tsx` — dashboard sol menü (Bugün/Haftalık Şablon/Görevler/Analiz), `isAdmin` true ise sona "Admin" linki eklenir.
- `admin` (2026-08-15, root'ta, `(dashboard)` route group'unun dışında — kendi `layout.tsx`'i var): sadece `profiles.is_admin = true` olan hesap girebilir (yoksa `/dashboard`'a, oturum yoksa `/login`'e yönlenir). `page.tsx` tüm kullanıcıları listeler (`admin_list_users` RPC), `[userId]/page.tsx` seçilen kullanıcının görevlerini (`admin_get_user_tasks` RPC) `src/lib/analytics.ts`'teki aynı `analyzeBehavior`/`buildProductivityHeatmap` fonksiyonlarına verip `/analiz` sayfasıyla birebir aynı görsel raporu üretir. Bu iki RPC `SECURITY DEFINER` olup içeride çağıranın `is_admin` olup olmadığını kontrol eder (değilse exception) — RLS'e ek bir admin politikası eklenmedi, erişim tamamen bu fonksiyonlar üzerinden.

Middleware (`src/middleware.ts` → `src/lib/supabase/middleware.ts`): `getUser()` doğrulama, 3sn timeout wrapper, korumalı rotalar `/dashboard`, `/template`, `/onboarding`.

## Veritabanı şeması (Supabase, RLS aktif her tabloda)

- **profiles** (1-1 auth.users): `full_name`, `wake_up_time`, `bed_time`, `energy_peaks` (jsonb: morning/afternoon/evening → high/medium/low), `onboarding_completed`, `is_admin` (2026-08-15 eklendi, admin paneli için)
- **skeleton_blocks**: `day_of_week` (0-6), `start_time`, `end_time`, `title`, `is_hard_constraint`, `energy_cost` (1-5), `flexibility_score` (1-5). Hard constraint ise flexibility otomatik 1.
- **tasks**: `skeleton_block_id` (FK, nullable), `title`, `description`, `task_date`, `original_date` (trigger ile korunur, erteleme geçmişi için), `start_time`, `end_time`, `energy_cost`, `flexibility_score`, `status` (`pending`/`completed`/`rescheduled`/`cancelled`)
- **daily_reflections**: `reflection_date`, `ai_message`, unique(user_id, reflection_date)

RPC: `get_or_create_daily_tasks(user_id, date, day_of_week)` (advisory lock ile idempotent), `complete_onboarding(...)` (onboarding'i tek transaction'da tamamlar), `admin_list_users()` / `admin_get_user_tasks(p_user_id)` (2026-08-15, `SECURITY DEFINER`, sadece admin çağırabilir)

- **skeleton_suggestions** (Faz E, 2026-08-16 eklendi): `user_id`, `skeleton_block_id` (FK, cascade), `field` (`day_of_week`/`start_time`/`end_time`), `current_value`/`suggested_value` (text), `rationale`, `status` (`pending`/`accepted`/`dismissed`). RLS: `Users can manage their own suggestions` (auth.uid()=user_id), normal (admin bypass'ı olmayan) bir politika — bu tablo hiçbir zaman service-role/SECURITY DEFINER gerektirmedi.

Trigger: `set_task_original_date` — task ertelenince de ilk tarih korunur

- **task_notifications** (Faz 1, 2026-08-12 eklendi): `user_id`, `task_id` (FK → tasks, cascade), `notification_type` (enum: `reminder`/`confirmation`), `scheduled_for`, `sent_at` (nullable), `response` (enum: `done`/`rescheduled`/`not_done`, nullable), `responded_at` (nullable). Gecikme süresi ayrı kolon değil, `responded_at - scheduled_for` ile hesaplanır. Kayıtları yalnızca backend (service role, Faz 2) oluşturacak — kullanıcı insert edemez, sadece kendi kaydını okuyup (`response`/`responded_at` üzerinden) güncelleyebilir. `scheduled_for` üzerinde `sent_at IS NULL` koşullu partial index var (Faz 2'nin scheduler sorgusu için).

Migration dosyaları: `supabase/migrations/` (15 dosya, `20260428`–`20260816` arası)

**Bilinen not**: Supabase migration history tablosunda eski dosya adlandırmasından kalma bir tutarsızlık var (bazı erken migration'lar remote'ta farklı versiyon numaralarıyla kayıtlı) — şema kendisi güncel ve doğru, sadece `supabase migration list` çıktısı bunu yansıtmıyor. Yeni migration eklerken `supabase db push` yerine `supabase db query --linked -f <dosya>` + `supabase migration repair --linked --status applied <versiyon>` kullanıldı (bkz. Faz 1 uygulaması), bu tutarsızlığa dokunulmadı.

## Bilinen düzeltilmiş hatalar (2026-08-13)

1. **Erteleme, hedef günün şablonunu yok ediyordu**: `get_or_create_daily_tasks` RPC'si "hiç görev yoksa şablonu materialize et" kontrolünü o tarihteki TÜM satırlara bakarak yapıyordu. Bir görev başka bir günden bu güne ertelendiğinde (`task_date` günceller, `original_date` değişmez), o tek satır yüzünden fonksiyon "bu günün görevleri zaten var" sanıp günün haftalık şablonundaki hiçbir görevi oluşturmuyordu. İki aşamalı düzeltildi: önce `original_date = task_date` kontrolü eklendi (`20260813_fix_daily_tasks_materialization.sql`), sonra bunun da bir açığı bulundu — o günün TÜM görevleri başka güne ertelenirse (task_date değişir, original_date değişmez) sayım yine 0'a düşüp şablonu ikinci kez (çift) oluşturuyordu. Son düzeltme (`20260813150000_fix_materialization_edge_case.sql`): kontrol artık sadece `original_date = p_date` (task_date'e bakılmaksızın) — original_date INSERT'te bir kere yazılır, hiç değişmez, bu yüzden "bu günün şablonu hiç materialize edildi mi" sorusunun tek doğru göstergesi budur. Gerçek kullanıcı verisiyle (test satırları oluşturulup sonunda silinerek) doğrulandı.
2. **`tasks`/`skeleton_blocks`'ta gereksiz nullable kolonlar**: `task_date`, `flexibility_score`, `status` (tasks) ve `is_hard_constraint` (skeleton_blocks) hiçbir kod yolunda null olmuyordu ama NOT NULL kısıtı yoktu — üretilen TS tipleri gereksiz yere nullable olup uygulama kodunda tip hatalarına yol açıyordu. `20260813130000` ve `20260813160000` migration'ları ile NOT NULL eklendi (önce mevcut satırlarda null olmadığı doğrulandı).
3. **`task_notifications` UPDATE RLS'i kolon ayrımı yapmıyordu**: politika sadece satır sahipliğini kontrol ediyordu, `response`/`responded_at` dışındaki (backend'e özel) alanları kullanıcının değiştirmesini engellemiyordu. `20260813140000_task_notifications_column_lock.sql` ile bir `BEFORE UPDATE` trigger'ı eklendi — `auth.role() = 'service_role'` dışında kalan istekler sadece `response`/`responded_at` değiştirebilir.
4. **`src/types/supabase.ts`'teki elle eklenmiş tip takma adları**: `npm run db:types` dosyanın tamamını CLI çıktısıyla değiştirdiği için `Profile`/`Task`/`TaskStatus`/`SkeletonBlock`/`DailyReflection` gibi elle eklenmiş export'lar siliniyor, build kırılıyordu (bu oturumda iki kez oldu). Dosyanın en altına bir uyarı yorumu + bu export'lar tekrar eklendi — **`db:types` her çalıştırıldığında bu blok dosyanın sonuna elle geri eklenmeli**, CLI'nin ürettiği içerik bunu otomatik korumuyor.

## Görev yeniden zamanlama algoritması (`rescheduleTask`, dashboard/actions.ts) — 2026-08-16'da 3 kademeli aramaya genişletildi

1. Hard constraint veya flexibility_score=1 → hata (ertelenemez)
2. Saatsiz görev → doğrudan ertesi güne taşınır (çakışma olamaz)
3. **Adım 1 — Aynı gün**: görevin kendi `task_date`'inde (bugünse şu andan itibaren, değilse gün başından) boş slot aranır.
4. **Adım 2 — Ertesi gün**: bulunamazsa ertesi günde (önce orijinal saat tercih edilir, sonra ilk boş slot) aranır.
5. **Bölme**: Adım 2'de tam sığmıyorsa ve `flexibility_score ≥ 4` ise, görev ikiye bölünmeye çalışılır — 1. parça ertesi güne (o günün en büyük boşluğuna, min 15 dk), 2. parça ertesi-günden-sonraki güne yerleştirilir. İki satır `linked_task_id` ile bağlanır, başlıklara `(1/2)`/`(2/2)` eklenir. `original_date` trigger'ı INSERT'te yeni tarihe eşitlediği için, doğru (bölünmemiş görevin gerçek) `original_date` ikinci bir UPDATE ile geri yazılır.
6. **Adım 3 — En yakın uygun gün**: bölme de olmazsa/uygun değilse, ertesi-günden-sonraki günden başlayarak 14 gün ileriye kadar tam sığan ilk gün aranır (bölünmeden).
7. Hiçbiri olmazsa → `status = cancelled`

`tasks.linked_task_id` (nullable, kendi tablosuna referans, `ON DELETE SET NULL`) — bölünmüş görevin 2. parçasında 1. parçanın id'sini tutar. `TaskCard.tsx`'te "⇢ 2/2 devamı" rozetiyle gösterilir.

## AI kullanım noktaları

1. **Onboarding** (`api/onboarding/route.ts`): kullanıcı profili + sabit bloklar → Zod şemalı `generateObject` ile max 30 bloklu haftalık şablon
2. **Close Day** (`dashboard/actions.ts` → `closeDayAndReflect`): günün tamamlanan/eksik görevlerinden `generateText` ile 2-3 cümlelik "system-admin" tonlu özet (motivasyon klişesi yok), günde 1 kez, `daily_reflections`'a yazılır

Maliyet tahmini (BrainMap'te): onboarding ~$0.007/kullanıcı, Close Day ~$0.0005/kullanıcı/gün → 1000 kullanıcı/ay ~$15

## Tasarım sistemi

"Bevel Obsidian Dark" — koyu tema, glass-morphism, gün renk kodlaması, `fade-up`/`bloom-pulse` animasyonları. Detay: `_BrainMap/07 - Tasarım Sistemi.md`

## Bilinen açık soru (BrainMap'te işaretli)

`skeleton_block` silindiğinde bağlı gelecek `task`'lar ne olacak — şu an otomatik silinmiyor, ele alınmamış edge case.
