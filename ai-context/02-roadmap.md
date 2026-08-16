# Uygulama Yol Haritası

Bu dosya "şu an nerede duruyoruz, yeni bir chat açılınca hangi işten devam edilecek" sorusuna cevap verir. Vizyon/karar geçmişi için [[01-vision-and-open-questions]]'a bak. Görsel bir özet için Obsidian'da `_BrainMap/10 - 🚦 Şu An Neredeyiz (Web Dönemi).md` dosyasına bakabilirsin (mermaid diyagramlı).

## Durum: WEB DÖNEMİ — Adım 1, 2, 3 ve genişletme turu (Faz A/B/C/D/E) tamamlandı

**2026-08-13 kararı**: Kullanıcının geliştirme ortamı Windows PC + bir iPhone'dan ibaret; Mac, Xcode ve Apple Developer Program üyeliği yok. iOS native geliştirme sadece macOS'te mümkün olduğu için **mobil/bildirim işi (aşağıdaki "Mobil dönem — ileride" bölümü) tamamen durduruldu**, Mac + Apple Developer hesabı edinilene kadar hiç konuşulmuyor. Web Push gibi geçici bir ikame de değerlendirilip kullanıcı tarafından reddedildi — orijinal vizyona sadık kalınıyor (bildirim sadece iOS'a özel, ileride).

Bu yüzden şu an tek gündem **web dönemi**: karmaşık "Faz 1-6" numaralandırması yerine, kafa karıştırmaması için 3 basit adıma indirildi.

## Web dönemi — 3 adım

### ✅ Adım 1 — Cilalama (tamamlandı, 2026-08-13/14)
- Ana sayfadaki (`TaskCard.tsx`) görev kartına, arşiv sayfasındaki gibi "→ [yeni tarih]" rozeti eklendi — ertelenen bir görevin nereye taşındığı artık her yerde görünüyor
- Geniş ekranda içerik artık dar bir sütuna sıkışmıyor: `dashboard/page.tsx` 2 sütunlu grid + üstte yan yana istatistikler, `tasks/page.tsx` genişletildi
- Tarih formatlama mantığı `src/lib/date.ts`'e taşındı (tekrar önlendi)
- Bonus: `NEXT_PUBLIC_DEV_BYPASS=true` iken `TaskCard`'daki zaman kilidi de devre dışı kalıyor (test kolaylığı, "DEV" etiketiyle belli ediliyor)

### ✅ Adım 2 — Davranış analizi (tamamlandı, 2026-08-14)
- Yeni `/analiz` sayfası + `src/lib/analytics.ts` (`analyzeBehavior()`): genel tamamlama oranı, saat dilimine göre (sabah/öğlen/akşam/gece) başarı oranı, en çok ertelenen/iptal edilen görev başlıkları
- İstek anında hesaplanıyor, cron/materialized view yok (veri hacmi küçükken gerek yok)
- Sidebar'a "Analiz" linki eklendi

### ✅ Adım 3 — Verimli alan görseli (tamamlandı, 2026-08-14)
- `/analiz` sayfasına gün × saat-dilimi ısı haritası eklendi (`buildProductivityHeatmap()`): hangi günün hangi diliminde tamamlama oranı yüksek/düşük, tek bakışta görünüyor
- `dataviz` skill'i takip edildi: tek renk (yeşil) sequential dolgu, orana göre koyulaşma, direct label (yüzde), boş hücre (veri yok) ile "%0" (veri var, başarısız) görsel olarak ayrışık, hücre üstünde native `title` tooltip ile tam sayılar
- Bu, "web dönemi 3 adım" planının son adımıydı — sıradaki gündem kullanıcıyla netleşecek (mobil dönem hâlâ Mac/Apple hesabı bekliyor)

## Bu oturumda ayrıca düzeltilen (Adım 1'den önce, ayrı bir hata avı turunda)

`get_or_create_daily_tasks` RPC'sindeki erteleme/materialization hatası (bkz. [[00-current-state]] "Bilinen düzeltilmiş hatalar") ve bununla bağlantılı 3 ek sorun (nullable kolonlar, `task_notifications` RLS kolon kilidi, `db:types` sonrası silinen elle eklenmiş tipler) düzeltildi ve gerçek veriyle test edildi.

## Web dönemi — genişletme turu (2026-08-15/16, tamamlandı)

3 adımlık plan bittikten sonra kullanıcıyla netleşen 5 yeni parça, dosya çakışması olmayanlar paralel agent'larla yapıldı:

- **Faz A — Zaman kilidi esnekliği (tamamlandı)**: `TaskCard.tsx`'teki zaman kilidine 15 dakikalık tolerans eklendi (`TIME_LOCK_GRACE_MS`), görev saatinden 15 dk öncesine kadar erken işaretlenebiliyor.
- **Faz B — Görev oluşturma/silme (tamamlandı)**: `tasks/actions.ts`'te tek bir `createTask`/`deleteTask` implementasyonu, hem Bugün hem Görevler sayfası `src/components/TaskFormModal.tsx` üzerinden bunu kullanıyor. Silme kuralı: `skeleton_block_id` NULL (manuel görev) → hard delete; DOLU (şablon kökenli) → `status='cancelled'` soft delete — aksi halde `get_or_create_daily_tasks` o günü "hiç materialize edilmemiş" sanıp şablonu yeniden oluşturur (bkz. [[00-current-state]] bilinen hata #1).
- **Faz D — Admin paneli (tamamlandı)**: `profiles.is_admin` kolonu + `admin_list_users()`/`admin_get_user_tasks()` RPC'leri (`20260815090000_admin_role.sql`, canlı Supabase projesine uygulandı). `/admin` route'u (`(dashboard)` dışında, kendi layout guard'ı var) tüm kullanıcıları listeliyor, kullanıcı detayında `/analiz` ile birebir aynı görsel raporu (aynı `analyzeBehavior`/`buildProductivityHeatmap` fonksiyonları) gösteriyor. Sadece `erayboranagirdici@gmail.com` admin.
- **Faz C — Kademeli erteleme algoritması + görev bölme (tamamlandı, 2026-08-16)**: `rescheduleTask` artık aynı gün → ertesi gün → (esnekse, `flexibility_score ≥ 4`) 2 güne bölme → en yakın uygun gün (14 gün) sırasıyla arıyor. `tasks.linked_task_id` kolonu eklendi (`20260816090000_task_split_link.sql`), bölünen görevler `(1/2)`/`(2/2)` başlık eki ve `TaskCard`'da rozetle gösteriliyor. Detay: [[00-current-state]].
- **Faz E — Kişisel veri havuzu / öneri motoru (tamamlandı, 2026-08-16)**: `/analiz` sayfasına "Şablon önerileri" bölümü eklendi. `generateSkeletonSuggestions()` mevcut `analyzeBehavior`/`buildProductivityHeatmap` çıktısını + kullanıcının esnek (`is_hard_constraint=false`) bloklarını AI'a verip en fazla 5 somut öneri (gün/saat değişikliği + 1 cümlelik gerekçe) üretiyor, `skeleton_suggestions` tablosunda `pending` olarak bekliyor. Kullanıcı "Kabul et" demeden `skeleton_blocks`'a hiçbir otomatik değişiklik uygulanmıyor. AI'ın döndürdüğü `skeleton_block_id`'ler halüsinasyona karşı kullanıcının kendi bloklarına süzülüyor. Detay: [[00-current-state]].

Web dönemi genişletme turunun 5 fazı (A/B/C/D/E) burada tamamlandı. Sıradaki gündem kullanıcıyla netleşecek.

## Mobil dönem — ileride (Mac + Apple Developer hesabı edinilince gündeme gelir)

Eski "Faz 1-6" planının mobile özel kısımları burada donduruldu:

- **Faz 1 (veri modeli) — kısmen tamamlandı**: `task_notifications` tablosu (migration + RLS + partial index) zaten var (2026-08-12), ama şu an hiçbir UI/backend onu kullanmıyor (Faz 2'yi bekliyor).
- **Faz 2 (bildirim tetikleme motoru)**: Supabase Edge Function + cron ile scheduler, APNs entegrasyonu, device token kaydı. Scheduler'ın salt "doğru zamanda doğru satırı oluşturma" mantığı teorik olarak Apple hesabı gerektirmeden yazılabilir ama şimdilik ertelendi.
- **Faz 3 (iOS native istemci)**: Teknoloji kararı bekliyor (Swift/SwiftUI vs React Native, bkz. 01'deki açık soru #5). APNs kayıt/izin akışı, action-butonlu bildirim, Live Activity.

Platform kapsamı (kesin, karar değişmedi): iOS tam kapsam (bildirimli hatırlatma + gecikmeli onay + action-butonlu bildirim + Live Activity) — web'de bildirim/hatırlatma hiç olmayacak, sadece geniş ekran + manuel aksiyon.

## Her adım/faz için standart süreç (kullanıcı talimatı — 2026-08-12)

Her adımdan/fazdan önce mutlaka:
1. **Sade dille anlat**: ne yapılacak, ne değişecek, ne eklenecek — teknik jargon olmadan.
2. **"Nasıl göreceğim?" sorusunu cevapla**: kullanıcının değişikliği somut olarak nasıl fark edeceğini/test edeceğini söyle.
3. **Onay bekle**: kullanıcı net şekilde onaylamadan ("başla", "onaylıyorum" vb.) koda geçilmez.
4. Onay geldikten sonra uygula, gerçek tarayıcıda test et, doğrula.
