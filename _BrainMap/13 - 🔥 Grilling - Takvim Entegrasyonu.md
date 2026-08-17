# 🔥 Grilling — Takvim Entegrasyonu (Google Calendar)

← [[00 - 🧠 Ana Hub]]

---

Konu: Kullanıcıların ProjectX'e geçmeden önce zaten Google Calendar (veya benzeri) kullanıyor olması bekleniyor — sıfırdan şablon kurma iş yükünü azaltmak için sistem, kullanıcının takvimindeki mevcut etkinlikleri çekip kendi yapısına (skeleton/task) entegre edebilecek. İleride tersi de (bizim şablonumuzu takvime yazma) eklenecek. Bu dosya, o entegrasyonun kapsamını, veri modelini, çakışma-çözme mantığını ve altyapısını netleştiren mimari mülakatı kayıt altına alıyor.

> [!info] Tespit edilen gerçek (soru değil, sadece bağlam)
> - Mevcut sistemde `skeleton_blocks` (haftalık, tarihsiz, tekrarlayan şablon) ve `tasks` (tarihli, somut günlük görev, `get_or_create_daily_tasks` ile materialize edilir) net bir ayrım. Google Calendar etkinlikleri doğası gereği tarihli/somut — bu yüzden entegrasyonun doğal karşılığı `tasks` seviyesi.
> - Zaten var olan `rescheduleTask` algoritması (aynı gün → ertesi gün → esnekse bölme → 14 gün ileri arama, bkz. `ai-context/00-current-state.md`) çakışma çözümü için yeniden kullanılabilir.
> - Faz E'de kurulan `skeleton_suggestions` deseni ("AI önerir, kullanıcı kabul/red eder, otomatik uygulama yok") bu entegrasyonun çakışma senaryolarında da referans alındı.
> - **BrainMap'in resmi vizyon dosyası** (`01 - 🎯 Proje Vizyonu.md`, "Kapsam Dışı" listesi) hâlâ "Takvim entegrasyonu (Google/Apple)"ı kapsam dışı sayıyor — bu, bildirim/mobil için daha önce geçersiz sayılan listenin aynısı (bkz. `ai-context/01-vision-and-open-questions.md`). Bu grilling, takvim entegrasyonunu da (Google için) kesin vizyona dahil ediyor; 01 dosyasına elle dokunulmadı (BrainMap'in kendi kuralı: elle yazılan 00-09 dosyalarına dokunma), delta `ai-context/` tarafında takip ediliyor.

---

## Round 1 — Temel kapsam

❓ **Q1 — Senkronizasyon yönü**: İlk sürümde push mü, pull mü, yoksa baştan iki yönlü mü?

➡️ Pull-only ile başla, push (bizim şablonu Google'a yazma) daha basit bir yan-özellik olarak sonra eklenebilir. İkisini aynı anda tam çakışma çözümüyle yapmak ilk sürüm için karmaşıklığı çok büyütür.

> [!answer] Evet, başta ilk olarak pull özelliğini yapalım. Çalışır seviyeye geldiğinde push da eklenecek — **kesin olarak olacak, geç de olsa**. Sebep: ilk çıkış website olarak olacak, mobil kullanıcılara erişmek için hem web hem mobilde çalışan Google Calendar/Outlook gibi uygulamalarla bağlantılı çalışıp, mobile gönderemeyeceğimiz bildirimleri bu uygulamalar üzerinden gönderteceğiz. Sebep: native iOS uygulaması için Mac + yıllık ~$100 Apple Developer hesabı gerekiyor, bu ~1 yıl sonraya ertelendi; bu süre boyunca mobil kullanıcıya erişim köprüsü takvim uygulamaları olacak.

❓ **Q2 — Hangi veri katmanı senkronize edilecek**: `skeleton_blocks` mi, `tasks` mı, ikisi mi?

➡️ `tasks` seviyesinde çalış — Google Calendar etkinlikleri tarihli/somut, skeleton'ın soyut "her Pazartesi" kavramı ekstra bir karmaşıklık katmanı gerektirir.

> [!answer] İlk olarak task tabanlı, haklısın. Ama Q1'i desteklemek için (push/2. seviye geliştirme için) haftalık şablon veri katmanını da mecburen yollamamız gerekecek.

❓ **Q3 — Takvim kapsamı**: Sadece Google Calendar mı, yoksa baştan çoklu-sağlayıcı soyutlama mı?

➡️ Sadece Google Calendar — "hypothetical future requirement" için baştan soyutlama kurmak gereksiz karmaşıklık.

> [!answer] Ana hedef hem web hem mobil erişimi olan büyük firmalar. Google Calendar ikisini de karşılıyor. Outlook/Apple Calendar'ın durumu bilinmiyor — varsa dahil edilecek, yoksa es geçilecek. *(→ araştırma sonucu aşağıda, Q10/Q11'de karara bağlandı.)*

❓ **Q4 — Google OAuth/API kurulumu**: Kullanıcı zaten bir Google Cloud projesi açmış, API almış ama sonraki adımları bilmiyor. Maliyet var mı?

> [!answer] Evet, proje kurdum, API aldım ama nasıl ilerleyeceğimi bilmiyorum, detaylı yönlendirilmeliyim. Google Cloud tarafının **kesinlikle ücretsiz olmasını istiyorum** — maliyet gerektiriyor mu, gerektiriyorsa ne kadar, netleştir.

---

## Araştırma arası — Google/Outlook/Apple Calendar API gerçekleri

Bir sub-agent ile doğrulandı (kaynaklar: [Google Calendar quota](https://developers.google.com/workspace/calendar/api/guides/quota), [OAuth sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification), Microsoft Graph & Apple CalDAV dokümantasyonu):

- **Google Calendar API**: Tamamen ücretsiz standart kullanım için (proje başına günde 1M istek tavanı, küçük bir uygulamanın yaklaşması imkânsız). Faturalandırma hesabı formalite, kart çekilmiyor. **OAuth "Testing" modu** (100 test-kullanıcıya kadar) hiç Google incelemesi gerektirmiyor, hemen kullanılabilir — calendar scope'ları "hassas" (sensitive) kategoride, "kısıtlı" (restricted) değil, sadece 100 kullanıcıyı aşıp herkese açık olunca doğrulama (gizlilik politikası + demo video, günler-haftalar) gerekiyor.
- **Microsoft Graph (Outlook)**: Google'a çok benzer — ücretsiz, tek API hem web hem mobil Outlook'u kapsıyor, kurulum Entra ID (eski Azure AD) üzerinden app kaydı.
- **Apple Calendar**: Modern REST/OAuth API yok. Sadece eski **CalDAV** protokolü + kullanıcının Apple ID'sinde 2FA gerektiren **uygulamaya özel şifre** (gerçek OAuth değil), webhook/push desteği yok (sürekli yoklama gerekir). Web+mobil erişilebilir ama entegrasyon deneyimi çok daha zayıf/kırılgan.

---

## Round 2 — Davranış / çakışma mantığı

❓ **Q5 — Çekilen etkinlik taşınabilir mi**: İmport edilen etkinlik taşınamaz (`is_hard_constraint=true`) kabul edilip çakışırsa bizim esnek görevlerimiz mi taşınsın?

➡️ Evet — push olmadan çekilen etkinliği yerel taşımak, Google'daki gerçek konumuyla senkronu bozar.

> [!answer] (Zımni onay — Q5-Q9 birlikte sorulup Round 3'te tüm önerilerle birlikte onaylandı, bkz. aşağıdaki "Round 1-2 toplu onay" notu.)

❓ **Q6 — "Verimli yer" kontrolü neye göre**: Basit boş/dolu kontrolü mü, yoksa `analyzeBehavior`/heatmap-farkında akıllı yerleştirme mi?

➡️ İlk sürümde basit kontrol yeterli; heatmap-farkında yerleştirme `rescheduleTask`'ı değiştirmeyi gerektirir, ayrı riskli bir iş.

❓ **Q7 — Tekrarlayan Google etkinlikleri**: Her gün ayrı `task` olarak mı çekilecek, yoksa tekrar deseni tanınıp `skeleton_suggestions` gibi bir öneri mi sunulacak?

➡️ İlk sürümde sadece somut günlük `task` — desen tanıma ayrı, daha akıllı bir faz.

❓ **Q8 — Senkron tetikleme (ilk taslak)**: Manuel buton mu, otomatik arka plan mı?

➡️ Manuel buton ile başla (bu karar sonradan Q15/Q19'da otomatik sürekli senkrona çevrildi).

❓ **Q9 — Hangi takvimler çekilecek**: Tüm takvimler mi, sadece primary mi?

➡️ Sadece "primary" takvim — çoklu takvim seçimi (iş/doğum günü/tatil gibi gürültülü kaynakları filtreleme) gereksiz ilk-sürüm karmaşıklığı.

> [!answer] Q5 önerin okey, çekilen görev muhtemelen taşınamayacak zaten. Q6: ilk sürümde basit kontrol okey. Q7: ilk sürümde günlük task olarak çekilmesi okey. Q8/Q9: (aşağıda Round 3-6'da detaylandırıldı ve kısmen değişti).

---

## Round 3 — Sağlayıcı kapsamı, UX yerleşimi, idempotency

❓ **Q10 — Outlook dahil edilsin mi**: Google ile aynı anda mı, yoksa sonra ikinci sağlayıcı olarak mı?

➡️ Sonra — aynı anda iki sağlayıcı yazmak ilk sürümün doğrulanmasını geciktirir.

> [!answer] İlk olarak Google eklensin, sonrasında Outlook ekleriz.

❓ **Q11 — Apple Calendar dahil edilsin mi**: Modern API yok, sadece CalDAV + app-specific password + webhook yok.

➡️ Şimdilik es geç — kullanıcı deneyimi de zayıf (Apple ID ayarlarına girip özel şifre üretme), native iOS gelince zaten APNs'e geçilecek.

> [!answer] Şimdilik es geçebiliriz, **fakat bir kenara yaz, unutulmasın.**

❓ **Q12 — Takvim bağlama nereden yapılacak**: Yeni bir sayfa mı, var olan bir sayfaya mı eklensin?

➡️ Yeni bir sayfa — "Entegrasyonlar" kavramsal olarak şablon/görev yönetiminden ayrı, ileride büyüyecek bir alan.

> [!answer] Şimdilik belli bir sayfaya ata, tamamen sana bağlı. İleride UI tasarımına karar verdiğimizde nereye/nasıl konumlandırılacağına geliriz.

❓ **Q13 — Senkron tekrar çalıştırılınca ne olur (idempotency)**: `external_event_id` ile eşleştirip güncelle/sil mi, yoksa sadece yeni ekleme mi?

➡️ Eşleştir + güncelle/sil (duplicate önlemek şart); "bizim tarafta elle değiştirilen görev ezilsin mi" ayrı bir soru (→ Q16).

> [!answer] Önerin okey. Kafamdaki akış: kullanıcı girer, Google bağlantısı önerilir, sonrasında kullanmaya devam eder. Ama bağlantı koparsa akış senin önerdiğin şekilde olabilir, evet.

❓ **Q14 — Senkron zaman penceresi**: 14 gün mü, farklı bir aralık mı?

➡️ 14 gün — mevcut `rescheduleTask`'ın arama ufkuyla tutarlı, çok ileriye gitmek gereksiz veri çeker.

> [!answer] 14 gün ideal, ileride yetersiz gelirse artırabiliriz.

---

## Round 4 — Senkron netleştirmesi, öncelik, onboarding yerleşimi

❓ **Q15 — Senkron tetikleme netleştirmesi**: Q13'teki "sonrasına kullanmaya devam eder" ifadesi otomatik sürekli senkron mu demek?

> [!answer] Evet tam olarak bu — kullanıcı takvim uygulamasında bir şeyi değiştirir ve bu değişiklik bizim sisteme işlemezse, bağlantının bir amacı kalmaz. **(Q8'deki "manuel buton" kararı böylece geçersiz oldu.)**

❓ **Q16 — Bizim değişikliğimiz mi kazanır, Google'ın güncellemesi mi**: Kullanıcı bizim tarafta elle değiştirdiği bir göreve Google güncellemesi uygulanmasın mı?

➡️ Bizim taraf öncelikli olsun (`status != pending` olan task'a Google güncellemesi uygulanmaz).

> [!answer] Önerini tamamıyla onaylıyorum.

❓ **Q17 — Takvim bağlama önerisi ne zaman gösterilecek**: Onboarding'in içinde mi, dashboard'da mı?

➡️ Dashboard'da ayrı banner — onboarding zaten dolu, OAuth eklemek tamamlanma oranını düşürebilir.

> [!answer] İskelet oluşturulma aşamasında, iskelet oluşmadan ÖNCEki adımlarda, ergonomik bir konumda sorulacak — kullanıcı iskeletini oluştururken diğer takvim uygulamalarındaki (zaten kararlaştırılmış) etkinliklerini bizim iskelet yapımızda görüntüleyebilsin. İstemezse sonradan da bağlanabilir, sistem kendini o zaman aldığı verilere göre şekillendirir. **Bu kullanıcı onayı ile olacak** — sistem sorgulamadan direkt değiştirirse kullanıcıya uğraş çıkarır. **(Q15/Q19'daki "onay gerektiren değişiklikler" ayrımının kaynağı bu not — bkz. Q20.)**

❓ **Q18 — Çekilen görevlere varsayılan alan değerleri**: Sabit varsayılan mı, AI tahmini mi?

➡️ Sabit varsayılan (`energy_cost=3`) ile başla, AI tahmini şimdilik gereksiz ekstra maliyet/gecikme.

> [!answer] İlk olarak (development aşamasında) varsayılan bir enerji atansın. Ama bu kalıcı değil — proje kullanıcılara açılmadan, **MVP çıkmadan hemen önce** AI ile başlık analizine göre belirlenecek.

---

## Round 5 — Teknik mekanizma, onay deseni, onboarding UI konumu

❓ **Q19 — Sürekli senkron nasıl çalışacak**: Polling (periyodik yoklama) mi, Google'ın push/webhook mekanizması mı?

➡️ Polling ile başla (örn. 15-30 dk) — webhook'un kanal yenileme/doğrulama karmaşıklığı ilk sürüm için gerekli değil.

> [!answer] Onaylıyorum. **Fakat ilerleyen aşamalarda Google bizim sunucumuza haber verecek (webhook) — bunu da bir yere not al, unutulmasın.**

❓ **Q20 — Hangi değişiklikler otomatik uygulanır, hangileri onay ister**: Çakışmasız yeni etkinlik otomatik eklensin, çakışan durumlar `skeleton_suggestions` deseninde onaylı mı olsun?

➡️ Evet — bu ayrım hem "bağlantının amacı olsun" (Q15) hem "sistem sormadan değiştirmesin" (Q17) isteklerini birlikte karşılıyor, var olan bir UI desenini tekrar kullanıyor.

> [!answer] Onaylıyorum.

❓ **Q21 — Onboarding'de takvim bağlama nereye eklenecek**: 5 adımlık formun içine mi, sonuna mı?

➡️ 5 adımdan sonra, iskelet üretiminden hemen önce ayrı bir ara ekran — forma en başa koymak OAuth yönlendirmesiyle erken karşılaşıp onboarding'i yarıda bıraktırma riski taşır.

> [!answer] Onaylıyorum.

---

## Round 6 — Bağlantı yönetimi, çoklu hesap, altyapı

❓ **Q22 — Bağlantı koparsa ne olur**: Daha önce çekilmiş görevler kalsın mı, silinsin mi?

➡️ Kalsın, sadece senkron durur — kullanıcı zaten üstünde işlem yapmış olabilir, geçmiş veriyi silmek kayıp hissi yaratır.

> [!answer] Kalsın, fakat kullanıcıya bildirim de verilsin — **sadece Google tarafından bağlantı kesilirse** (sağ altta kısa bir uyarı/pop-up). Kullanıcı kendi kestiyse bildirime gerek yok, zaten biliyor.

❓ **Q23 — Tek hesap mı çoklu hesap mı**: Şimdilik tek, ileride çoklu?

➡️ Tek hesapla başla — çoklu hesap, hesap yönetimi UI'ı gerektirir.

> [!answer] İlk olarak evet sadece tek hesap yeterli. **Ama ileride çoklu hesap bağlanabilsin — en fazla 2 hesapla sınırlı.**

❓ **Q24 — Polling nerede çalışacak**: Proje hiçbir yere deploy edilmemiş (Vercel config yok, Supabase Edge Function yok). Vercel Cron mu, Supabase pg_cron + Edge Function mı?

➡️ Vercel Cron + Next.js API route öneriyorum — proje zaten Next.js/Vercel ekosisteminde, ayrı bir Deno/Edge Function ortamı öğrenme+bakım yükü ekler.

> [!answer] Evet, Vercel/Next.js/Supabase altyapısı benim için okey — zaten öncesinde bu stack üzerinde proje geliştirdim, veritabanımız da Supabase üzerinde. Önerilerin sistemimizle tam uyumlu.

---

## Grilling tamamlandı — nihai karar özeti

Frontier boş, kullanıcı özeti onayladı ("evet tüm sorularındaki önerilerini onaylıyorum").

1. **Yön**: Sadece pull (Google → bizim sistem). Push kesin gelecek (geç de olsa) — amacı, native iOS'a kadar mobil kullanıcılara takvim hatırlatmaları üzerinden bildirim ulaştırmak (aksiyon butonlu değil, sadece bilgilendirici — bu fark push tasarımında tekrar konuşulacak).
2. **Sağlayıcı**: Sadece Google Calendar. Outlook sonra (2. sağlayıcı). Apple Calendar es geçildi (unutulmasın).
3. **Veri katmanı**: `tasks` seviyesi (günlük somut görev). `skeleton_blocks` seviyesi push (2. seviye) için sonra gerekecek.
4. **Çakışma mantığı**: Çekilen etkinlik taşınamaz kabul edilir (`is_hard_constraint=true`). Çakışmasız yeni etkinlik otomatik eklenir. Çakışan durumda bizim esnek görevimiz taşınır ama bu **onay gerektiren bir öneri** olarak sunulur (`skeleton_suggestions` deseni) — otomatik uygulanmaz. Basit boş/dolu kontrolü (heatmap-farkında yerleştirme yok, ilk sürümde).
5. **Tekrarlayan etkinlikler**: Her gün ayrı `task` olarak çekilir, şablona otomatik yansıtma yok.
6. **Kapsam**: Sadece primary takvim, 14 günlük pencere.
7. **Senkron mekanizması**: Sürekli/otomatik arka plan, polling (15-30 dk) ile — Vercel Cron + Next.js API route. Google'ın gerçek-zamanlı webhook mekanizması ileride eklenecek (unutulmasın).
8. **Öncelik kuralı**: Kullanıcının elle değiştirdiği (`status != pending`) bir göreve Google güncellemesi bir daha uygulanmaz.
9. **Idempotency**: `external_event_id` ile eşleştirme, tekrar senkronda duplicate oluşmaz.
10. **Varsayılan alanlar**: `energy_cost=3` sabit (ilk sürüm) → MVP'den hemen önce AI ile başlık-bazlı tahmine geçilecek (unutulmasın).
11. **Onboarding yerleşimi**: 5 adımlık formdan SONRA, iskelet üretiminden hemen önce isteğe bağlı bir ara ekran ("bağlarsan AI mevcut randevularını da görür").
12. **Bağlantı yönetimi sayfası**: Yeni bir "Bağlantılar" sayfası (yer/tasarım detayı sonra netleşecek). Tek Google hesabı (ilk sürüm) → ileride en fazla 2 hesap (unutulmasın).
13. **Bağlantı koparsa**: Geçmiş veriler kalır, sadece senkron durur. Google tarafından kopmuşsa kullanıcıya kısa bir bildirim (pop-up) gösterilir; kullanıcı kendi kesmişse bildirim yok.
14. **OAuth/maliyet**: Google Calendar API tamamen ücretsiz (standart kullanımda), OAuth "Testing" modu (100 test-kullanıcıya kadar) hiç inceleme gerektirmiyor — kurulum adımları implementasyon aşamasında adım adım anlatılacak.
15. Token güvenliği (soru olarak sorulmadı, teknik varsayım olarak onaylandı): OAuth access/refresh token'ları Supabase'de RLS korumalı, servis-rolü dışında erişilemeyen bir tabloda saklanacak (`task_notifications` gibi hassas tabloların izlediği desene benzer).

---

## Ertelenmiş kararlar

Bu grilling'den çıkan, "şimdilik böyle ama ileride kesin/muhtemelen değişecek" türü kararlar → [[12 - ⏳ Ertelenmiş Kararlar]] içinde ayrıca listelendi (Push özelliği, Outlook desteği, Apple Calendar, gerçek-zamanlı webhook senkron, AI enerji tahmini, çoklu hesap desteği).

---

## İlgili

Uygulamaya geçilmeden önce, CLAUDE.md kuralı gereği fazlara bölünüp sade dille anlatılacak ve onay alınacak.

- [[00 - 🧠 Ana Hub]] — belge haritası
- [[08 - 🤖 AI Entegrasyonu]] — AI entegrasyonu genel bakış
- [[12 - ⏳ Ertelenmiş Kararlar]] — bu grilling'den çıkan ertelenmiş kararlar

---

#projectx #brainmap #grilling #takvim #google-calendar
