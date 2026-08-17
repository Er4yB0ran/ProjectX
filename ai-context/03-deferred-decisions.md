# Ertelenmiş Kararlar — "Şimdilik Böyle, İleride Şuna Geçeceğiz"

Bu dosya, projede "şimdilik A yapıyoruz ama ileride kesin/muhtemelen B'ye geçeceğiz" şeklinde bilinçli olarak ertelenmiş kararları TEK yerde toplar. Amaç: bu tür notlar [[00-current-state]]/[[02-roadmap]] içine veya farklı agent oturumlarına dağılıp kaybolmasın, gelecekte "bunu neden hâlâ yapmadık / bunu yapacağımızı söylemiştik" sorusu çıkınca tek yerden bakılabilsin. Her madde ilgili teknik dosyada da (bağlamıyla birlikte) durmaya devam ediyor — burası sadece o notların kısa, taranabilir bir listesi.

**Gruplama**: maddeler, hangi grilling/oturumdan çıktığına göre gruplanır — her grup bir kaynağa (genelde bir `_BrainMap` grilling dosyasına) karşılık gelir. Yeni bir grilling'den yeni ertelenmiş kararlar çıkarsa, o grilling için yeni bir `## Kaynak: ...` bölümü açılır (aşağıdaki "Yeni bir madde eklerken" kısmına bak).

Her madde formatı: **Şimdi ne yapılıyor** → **İleride ne yapılacak** → **Neden şimdi değil** → **Durum**.

---

## Kaynak: [[11 - 🔥 Grilling - İskelet Chat Düzenleme]]

Onboarding'in AI-sohbetle iskelet düzenleme özelliği için yürütülen grilling sürecinden çıkan iki karar.

### 1. Küresel maliyet anahtarı: manuel toggle → otomatik eşik-bazlı kapanma

- **Şimdi**: `app_config.ai_chat_enabled` sadece admin panelinden elle açılıp kapatılan bir bayrak (varsayılan `false`).
- **İleride (KESİN karar, "belki" değil)**: platform genelindeki toplam AI-chat maliyeti belirlenen bir eşiği aşınca sistem bu bayrağı **otomatik** `false` yapacak.
- **Neden şimdi değil**: kullanıcı sayısı küçükken gerçek-zamanlı eşik/toplama mantığı gereksiz mühendislik; Anthropic'in gerçek-zamanlı "bakiye" API'si de yok. Manuel anahtar bugün için yeterli ve saniyeler içinde elle kapatılabilir.
- **Temel şimdiden atıldı**: `ai_chat_usage` tablosu (Faz 2) baştan bu geçiş için tasarlandı — her çağrının token/maliyet verisi zaten loglanıyor. (b)'ye geçiş ileride sadece "bu tabloyu topla, eşiği aşınca bayrağı kapat" mantığını eklemek olacak, veri toplamaya sıfırdan başlanmayacak.
- **Grilling'deki yeri**: Q12 (satır 184-193) — kullanıcının kendi sözü: *"maaliyeti toplama özelliği sakın bir köşeye atıp unutma ama, şimdilik a seçeneğini kullanacağız fakat ileride kesin olarak b'ye çevireceğiz."*
- **Durum**: sadece loglama (a) var. Otomatik kapanma mantığı (b) yazılmadı.

### 2. Chat ile düzenleme kapsamı: sadece onboarding → `/template` sayfasına genişleme

- **Şimdi**: AI-sohbetle iskelet düzenleme SADECE onboarding'deki ilk iskelet oluşturma anında var (`SkeletonChatEditor.tsx`, `edit-skeleton` route).
- **İleride**: aynı chat deneyimi, kullanıcının onboarding sonrası zaten var olan haftalık şablonunu (`/template` sayfası, bugün `TemplateManager.tsx` ile manuel CRUD) düzenlemesi için de eklenecek.
- **Neden şimdi değil**: "ilk kurulumda kabaca doğru bir iskelete hızlı ulaşmak" ile "sonradan hassas düzenleme" farklı problemler — ikisini aynı anda çözmeye çalışmak kapsamı büyütürdü, ayrı bir faz olarak ele alınması netleşti.
- **Grilling'deki yeri**: Q1 (satır 19-23) — kullanıcı cevabı: *"ilk adım olarak sadece iskelet sekmesinde bulunsun, geliştirme ile template yani normal onboarding haftalık tablo üzerinde değişimine de gideriz. ama ilk adım olarak sadece iskelet oluşumu."* + round-1 özeti (satır 113).
- **Durum**: onboarding tarafı 5 fazda tamamlandı (bkz. [[02-roadmap]]). `/template`'e chat eklenmesi hiç başlanmadı, ayrı bir faz/plan gerekiyor.

---

## Kaynak: oturum-içi analiz (grilling dışı — 2026-08-17, iskelet-chat Faz 4 sonrası)

Bir BrainMap grilling dosyasına bağlı değil, doğrudan bu oturumda kullanıcının "bu hata bize ne gibi bir soruna mal etti, düzeltebilir miyiz?" sorusuna verilen yanıttan çıktı.

### 3. Prompt caching — etkisiz çıktı, iki olası düzeltme yolu bekletiliyor

- **Şimdi**: `edit-skeleton` route'unda Anthropic `cache_control` kodu var ama gerçek testte hiç tetiklenmedi (kök sebep [[00-current-state]]'te).
- **İleride (gerekirse — diğer iki madde gibi "kesin" değil, "ölçülebilir ihtiyaç çıkarsa")**: (a) her turda tam blok listesi yerine daha kompakt/ilgili-günü-öncelikleyen bir temsil göndermek, veya (b) 25K token bütçesini yükseltmek.
- **Neden şimdi değil**: (a) modelin bağlamdan kopma riski taşıyor, ayrı bir tasarım kararı gerektiriyor; (b) doğrudan "maliyeti düşük tut" önceliğiyle çelişiyor. Mevcut maliyet zaten bütçe tavanıyla garanti altında — kaybedilen sadece ek bir optimizasyon fırsatı, acil değil.
- **Durum**: bilinçli olarak dokunulmadı, kod zararsız halde duruyor.

---

## Kaynak: [[13 - 🔥 Grilling - Takvim Entegrasyonu]]

Google Calendar entegrasyonu (ilk sürüm: sadece pull) için yürütülen grilling sürecinden çıkan altı karar.

### 3. Push (takvime yazma) özelliği: sadece pull → pull + push

- **Şimdi**: sadece pull — Google Calendar'daki etkinlikler `tasks`'a çekiliyor. Sistem hiçbir şeyi Google'a geri yazmıyor.
- **İleride (KESİN karar)**: bizim şablonumuz/görevlerimiz Google Calendar'a da yazılacak (push). Asıl motivasyon: native iOS uygulaması gelene kadar (~1 yıl, Mac + Apple Developer hesabı bekleniyor) mobil kullanıcılara ulaşmanın yolu, takvim hatırlatmaları üzerinden bildirim göndermek olacak.
- **Neden şimdi değil**: iki yönü aynı anda, tam çakışma çözümüyle yapmak ilk sürümün karmaşıklığını/hata yüzeyini çok büyütür (sonsuz döngü riski dahil). Push ayrıca `skeleton_blocks` seviyesinde senkronu da gerektiriyor (bkz. madde aşağıda), bu da ayrı bir veri-katmanı genişlemesi.
- **Bilinen sınırlama**: takvim hatırlatmaları sadece bilgilendirici — orijinal vizyondaki aksiyon-butonlu (yapıldı/ertelendi/yapılmadı) bildirim orada yok. Bu, push tasarımına geçilince tekrar ele alınacak.
- **Grilling'deki yeri**: Q1 — kullanıcının kendi sözü: *"Push özelliği geç de olsa kesin olarak olacak."*
- **Durum**: pull hiç başlanmadı, tasarım netleşti (bkz. [[13 - 🔥 Grilling - Takvim Entegrasyonu]]).

### 4. Takvim sağlayıcı kapsamı: sadece Google → + Outlook

- **Şimdi**: sadece Google Calendar hedefleniyor.
- **İleride**: Outlook (Microsoft Graph) ikinci sağlayıcı olarak eklenecek — API açısından Google'a çok benzer (ücretsiz, hem web hem mobil Outlook'u tek API kapsıyor, Entra ID üzerinden app kaydı).
- **Neden şimdi değil**: iki sağlayıcıyı aynı anda yazmak ilk sürümün "çalışıyor mu" doğrulamasını geciktirir; Google'da senkron mantığı bir kere doğru oturunca ikinci sağlayıcı eklemek görece ucuz.
- **Grilling'deki yeri**: Q10.
- **Durum**: hiç başlanmadı.

### 5. Apple Calendar — es geçildi, unutulmamalı

- **Şimdi**: Apple Calendar entegrasyonu yok.
- **İleride**: belirsiz — kullanıcı "şimdilik es geçebiliriz, fakat bir kenara yaz, unutulmasın" dedi, KESİN bir taahhüt değil ama backlog'dan düşürülmemeli.
- **Neden şimdi değil**: Apple'ın modern REST/OAuth API'si yok, sadece eski CalDAV + kullanıcının Apple ID'sinde 2FA gerektiren uygulamaya özel şifre (gerçek OAuth değil), webhook/push desteği yok (sürekli yoklama gerekir) — Google/Outlook'a göre çok daha zayıf/kırılgan bir entegrasyon deneyimi.
- **Grilling'deki yeri**: Q11.
- **Durum**: değerlendirilmedi, hiç başlanmadı.

### 6. Senkron mekanizması: polling → gerçek-zamanlı webhook

- **Şimdi**: periyodik yoklama (polling), örn. her 15-30 dakikada bir, Vercel Cron + Next.js API route ile.
- **İleride**: Google'ın push bildirim mekanizmasına (webhook — değişiklik olduğu an Google bizim sunucumuza haber verir) geçilecek.
- **Neden şimdi değil**: webhook, halka açık bir HTTPS uç nokta + kanal yenileme (Google'ın kanalları en fazla 1 hafta geçerli, sürekli yenilenmesi gerekiyor) gibi ek karmaşıklık getiriyor; polling "birkaç dakika gecikmeli ama çalışan" bir ilk sürüm için yeterli.
- **Grilling'deki yeri**: Q19 — kullanıcının kendi sözü: *"ilerleyen aşamalarda google bizim serverımıza haber verecek. bunu da bir yere not al unutulmasın."*
- **Durum**: hiç başlanmadı, polling de henüz kurulmadı.

### 7. Çekilen görevlerde enerji tahmini: sabit varsayılan → AI tahmini

- **Şimdi (geliştirme aşamasında)**: Google'dan çekilen bir etkinliğe sabit `energy_cost=3` (orta) atanacak — bu alan Google'da hiç yok.
- **İleride (MVP/genel kullanıma açılmadan HEMEN ÖNCE)**: AI, etkinlik başlığından/açıklamasından `energy_cost`'u tahmin edecek (ör. "Diş hekimi randevusu" → yüksek).
- **Neden şimdi değil**: her çekilen etkinlik için ekstra bir AI çağrısı = ekstra maliyet + gecikme; `energy_cost`'un çekilen görevler için gerçekte ne kadar önemli olduğu (hangi ekranlarda kullanıldığı) henüz görülmedi.
- **Grilling'deki yeri**: Q18 — kullanıcının kendi sözü: *"bu durum kalıcı olacağı anlamına gelmez, proje kullanıcılara açılmadan yani MVP çıkmadan hemen önce bu durum AI ile başlık analizine göre belirlensin."*
- **Durum**: hiç başlanmadı (entegrasyonun kendisi de henüz başlanmadı).

### 8. Takvim hesap bağlantısı: tek hesap → en fazla 2 hesap

- **Şimdi**: kullanıcı sadece tek bir Google hesabı bağlayabilecek.
- **İleride**: çoklu hesap (iş + kişisel gibi) desteklenecek, ama **en fazla 2 hesapla sınırlı** (sınırsız değil).
- **Neden şimdi değil**: çoklu hesap, bağlama UI'ında hesap yönetimi (ekle/çıkar/hangisi aktif) gerektirir — ilk sürümde gereksiz karmaşıklık.
- **Grilling'deki yeri**: Q23.
- **Durum**: hiç başlanmadı.

---

## Ayrıca bkz. (kendi başına büyük olduğu için burada ayrı madde yapılmadı)

- **Mobil dönem tamamı** — Mac + Apple Developer hesabı edinilene kadar donduruldu. Bu da bir "şimdilik X, ileride Y" kararı ama kapsamı tek bir maddeden çok daha büyük; kaynağı bir grilling dosyası değil, 2026-08-13 tarihli doğrudan bir kullanıcı kararı (bkz. [[01-vision-and-open-questions]]). Tam detay [[02-roadmap]]'in "Mobil dönem — ileride" bölümünde.

## Yeni bir madde eklerken

Bir konuşmada ("grilling" dahil) "şimdilik böyle yapalım ama ileride kesin/muhtemelen şuna geçeceğiz" türü bir karar çıkarsa:
1. Kaynak bir grilling dosyasıysa (`_BrainMap/NN - ...Grilling...md`), o dosya için zaten bir `## Kaynak: [[NN - ...]]` bölümü varsa altına yeni bir `### N. Başlık` maddesi ekle; yoksa yeni bir `## Kaynak:` bölümü aç.
2. Kaynak bir grilling dosyası değilse (düz bir oturum/konuşma), "oturum-içi analiz" tarzı ayrı bir `## Kaynak:` bölümü aç.
3. `_BrainMap/12 - ⏳ Ertelenmiş Kararlar.md`'deki özet listeyi de güncelle (bkz. o dosyanın kendisi) ve yeni grilling dosyasından `12`'ye bir `[[wikilink]]` eklendiğinden emin ol.

`ai-context/*.md` içindeki ilgili teknik notlar silinmez, sadece burada da özetlenir.
