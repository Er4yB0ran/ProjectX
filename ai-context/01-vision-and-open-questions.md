# Genişleyen Vizyon ve Açık Sorular

Bu dosya, 2026-08-11 tarihli konuşmada ortaya çıkan yeni yön ile mevcut BrainMap vizyonu (`_BrainMap/01 - Proje Vizyonu.md`) arasındaki farkı ve henüz karara bağlanmamış noktaları takip eder. BrainMap dosyalarına dokunulmadı — kullanıcı bu notların ayrı tutulmasını istedi.

## BrainMap'in mevcut resmi duruşu (2026-08-11 itibarıyla)

`01 - Proje Vizyonu.md` → "Kapsam Dışı (Şu An)" listesi: push bildirimleri, takvim entegrasyonu, ekip/paylaşım, **mobil native uygulama**, çoklu dil. Mevcut model tamamen "pull": kullanıcı panoyu kendi açar, manuel işaretler.

## Kullanıcının anlattığı yeni vizyon

- Kullanıcı uygulamayı yükler, kendine uygun **ortalama bir iskelet**i tamamlar (mükemmel olması gerekmiyor, zamanla iyileşecek — mevcut onboarding + skeleton_blocks akışıyla örtüşüyor)
- **Bildirimli onay döngüsü**: görev penceresi bittikten birkaç dakika sonra (örn. 18-19 arası kitap okuma görevi için 19:15 gibi) kullanıcıya bildirim gider, bildirimden doğrudan cevaplanır: **yapıldı / ertelendi / yapılmadı**
- **Ön hatırlatma**: görev başlamadan ~15 dk önce ayrı bir hatırlatma bildirimi
- İki seçenekten biri: (a) ertelendi/yapılmadı anında bildirimden düzenleme yapılır, ya da (b) gün sonunda toplu düzenleme — kesinleşmedi
- **AI davranış analizi**: günlük/haftalık/aylık — günün hangi saatlerinde başarı yüksek, hangi görev tipleri zamanında yapılıyor, hangileri erteleniyor. Bu, AI'ın kullanıcıyı "tanıyıp" ona göre şekillenmesini sağlayacak (mevcut Close Day refleksiyonunun ötesinde, pattern/agregasyon katmanı — BrainMap'in "Gelecek AI Potansiyeli" fikir listesine yakın ama oradan daha somut)
- **Düşük yük prensibi**: kullanıcı normal akışını bozmadan, kilit ekranından bile durum güncelleyebilmeli
- **Şeffaflık**: ertelenen/yapılmayan görevin nereye taşındığı kullanıcıya mutlaka bildirilmeli
- **Motivasyon UI'ı**: kullanıcının "verimli alanı" (günlük/haftalık başarıyla tamamlanan görevler) görsel olarak gösterilir — bu veri aynı zamanda AI'ın girdisi

## Platform stratejisi (düzeltildi — 2026-08-11, ikinci mesaj)

- **DÜZELTME**: iOS-first sıralı yayın değil — kullanıcı hem iOS hem web'i **aynı anda / baştan** hedefliyor, ikisinde de tam kullanılabilir olacak. Masaüstü geliştirme ortamı olarak kullanılacak ama masaüstü de bir istemci hedefi.
- Teknik sonuç: iOS tarafında native APNs kullanılabilir → action-butonlu bildirimler (yapıldı/ertelendi/yapılmadı) lock screen'den doğrudan çalışır. (Web tarafı için Web Push planı — bkz. aşağıdaki "Web vs iOS sorumluluk ayrımı" bölümü — **iptal edildi**, web'de bildirim hiç olmayacak.)
- "Canlı etkinlik" muhtemelen iOS Live Activity / Dynamic Island (ActivityKit) — native veya native-modüllü React Native gerektirir, web'de karşılığı yok (web'de en fazla persistent bildirim/banner ile taklit edilebilir).
- Masaüstü adaptasyonu: web istemcisinin responsive/masaüstü hali yeterli olabilir, ayrı bir native masaüstü uygulaması şu an gündemde değil (teyit edilmedi, varsayım).

## Kapsam netliği (ÖNEMLİ — kullanıcı 2026-08-11'de ikinci mesajında teyit etti)

Kullanıcı açıkça belirtti: mesajlarda anlatılan her şey artık **kesin vizyon**, "kapsam dışı" ihtiyatı geçersiz. BrainMap'teki eski "kapsam dışı" listesi (push bildirimleri, mobil native) tamamen güncelliğini yitirdi — bu proje artık bildirim-merkezli, çok platformlu bir ürün olarak ilerliyor.

## Web vs iOS sorumluluk ayrımı (netleşti — 2026-08-11, üçüncü mesaj)

- **Bildirim/hatırlatma sistemi SADECE iOS'ta olacak.** Web'de push/hatırlatma YOK.
- Web'in amacı: telefonun küçük ekranı yerine bilgisayarda **geniş ekranda** görmek isteyen kullanıcılar için bir istemci. Yani birincil kullanım durumu "masaüstünde geniş görünüm", "hareket halinde bildirim" değil.
- Web'de durum güncellemesi (yapıldı/ertelendi/yapılmadı) **manuel** olacak — kullanıcı siteye girip kendi işaretleyecek, bildirimle tetiklenmeyecek. (Bu zaten mevcut `TaskCard`/`updateTaskStatus` akışıyla örtüşüyor, ek bir şey gerekmiyor.)
- Fonksiyonel parite: mobilde yapılabilen her şey (görev tamamlama, erteleme, şablon düzenleme, AI özetini görme, "verimli alan" analizini görme) web'de de yapılabilecek — sadece bildirim/hatırlatma tetikleyicisi olmayacak.
- Pratik sonuç: **Web Push altyapısına hiç gerek yok.** Bu, önceki yol haritasındaki "Web Push ile uçtan uca doğrula" adımını gereksiz kılıyor — onun yerine web zaten var olan manuel akışla test/doğrulama yapılabilir, asıl bildirim işi doğrudan iOS'a (APNs + Live Activity) odaklanabilir.

## Açık mimari sorular

1. ~~Bildirim yanıtları için veri modeli~~ — **KARARLAŞTIRILDI (2026-08-12)**: ayrı bir `task_notifications` log tablosu. `tasks` tablosuna dokunulmayacak; her hatırlatma/onay bildirimi kendi satırında tutulacak (gönderildi mi, ne zaman, tür, cevap, gecikme). Gerekçe: Faz 5'teki davranış analizi zaman-damgalı geçmiş veri istiyor, `tasks.status` sadece anlık durumu tutuyor.
2. Davranışsal analiz katmanının mimarisi: günlük/haftalık/aylık agregasyonlar nasıl hesaplanacak — DB'de materialized view/cron mu, yoksa her istek anında mı hesaplanacak?
3. Bildirim tetikleme altyapısı: APNs entegrasyonu nasıl kurulacak (hangi backend — Supabase Edge Function + cron, ya da ayrı bir servis)?
4. ~~Ertelenen/yapılmayan görev ne zaman yeniden planlanır~~ — **KARARLAŞTIRILDI (2026-08-12)**: anında, bildirimden. Kullanıcı "ertelendi" yanıtı verdiği an mevcut `rescheduleTask` algoritması hemen çalışır, şeffaflık için taşınan yeni slot bilgisi anında dönülür. Gün sonu toplu işleme yok.
5. iOS istemci teknolojisi: tam native (Swift/SwiftUI) mi, React Native (native ActivityKit modülüyle) mi — henüz konuşulmadı

## Kayıt notu

Somut fazlı yol haritası artık [[02-roadmap]] dosyasında. Bu dosya (01) vizyon/karar geçmişini, 02 ise "şu an nerede duruyoruz, sırada ne var"ı tutar.
