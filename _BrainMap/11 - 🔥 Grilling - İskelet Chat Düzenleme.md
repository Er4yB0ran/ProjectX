\# 🔥 Grilling — İskelet Oluşturma Chat'i

Konu: Onboarding'de üretilen ilk iskeletin, kullanıcının solda %25 genişlikte bir AI chat'i ile (sağda %75 tablo) canlı olarak düzenlenebilmesi. Maliyeti korumak için mesaj sınırı + "bu mesaj gerçekten tabloyla mı ilgili" eşiği var. Kullanıcı "Devam et" ile normal akışa (günlük görevler) geçiyor.

Nasıl kullanılır: Her sorunun altına `> [!answer]` callout'unun içine cevabını yaz (istersen callout'u silip düz yazabilirsin, fark etmez). Ben buradan okuyup bir sonraki round'u aynı dosyaya ekleyeceğim.

---

## Tespit ettiğim gerçek (soru değil, sadece bağlam)

Mevcut onboarding tek adımda çalışıyor: form gönderilince `generateObject` ile iskelet üretiliyor, aynı istekte `complete_onboarding` RPC'siyle DB'ye direkt yazılıyor, sonra kullanıcı doğrudan `/dashboard`'a yönleniyor. Ara bir "önizleme/inceleme" ekranı hiç yok — bu chat özelliği mevcut akışa yeni bir adım ekliyor.

Roadmap'te (Faz E, öneri motoru) zaten şu ilke var: *"öneri, otomatik uygulama değil — kullanıcı kararı"*. Aşağıdaki sorularda bu precedent'e referans verdim.

---

## Round 1

❓ **Q1** — **Kapsam**: Bu AI-chat düzenleme deneyimi sadece onboarding'deki ilk iskelet oluşturma anında mı olacak, yoksa kullanıcı daha sonra `/template` sayfasından şablonunu değiştirmek istediğinde de aynı chat arayüzünü kullanabilecek mi (yani mevcut `TemplateManager.tsx` manuel CRUD editörünün yanına/yerine mi geçecek)?

➡️ Sadece onboarding'e özel tutmanı öneririm — ilk kurulumda "kabaca doğru" bir iskelete hızlı ulaşmak farklı bir problem, sonradan hassas düzenleme (`/template`) farklı bir problem. İkisini aynı bileşende çözmeye çalışmak kapsamı büyütür. `/template`'e chat eklemek ayrı bir faz olarak sonra değerlendirilebilir.

> [!answer] ilk adım olarak sadece iskelet sekmesinde bulnsonn geliştirme ile template yani normal onboardınng haftalık tablo üzerinde değişimine de gideriz. ama ilk adım olarak sadece iskelet oluşumu.
>

---

❓ **Q2** — **DB yazma zamanlaması**: Chat üzerinden yapılan her değişiklik anında `skeleton_blocks` tablosuna mı yazılır, yoksa "Devam et" butonuna basılana kadar sadece ekranda (draft/geçici state, DB'ye hiç dokunmadan) mı tutulur?

➡️ Draft'ta tut, sadece "Devam et"te commit et. Gerekçe: (1) mevcut `complete_onboarding` RPC'si zaten tek seferlik tam-yazma için tasarlanmış, tur tur DB'ye yazıp geri okumak gereksiz karmaşıklık + gecikme katar; (2) kullanıcı yarım bıraksa (sekmeyi kapatsa) DB'de tutarsız/yarım bir iskelet kalmaz; (3) Faz E'deki "öneri, otomatik uygulama değil" ilkesiyle örtüşüyor.

> [!answer] evet draftta tutmak çok daha mantıklı olacaktır. en son her şey kesin olduğunda ve kullanıcı iskeleti kabul ettiğinde veritabanına gönderilir.
>
>

---

❓ **Q3** — **Güncelleme mekanizması**: Kullanıcı bir mesaj yazınca AI, tablonun TAMAMINI mı yeniden üretsin (mevcut `generateObject` deseniyle bire bir aynı, ama ilgisiz blokları da yanlışlıkla değiştirme riski var), yoksa sadece değişen blokları mı döndürsün (ekle/güncelle/sil operasyonları, patch tarzı)?

➡️ Patch tarzı (ekle/güncelle/sil operasyon listesi) öneririm. "Spor saatini akşama al" gibi bir istekte tüm tabloyu yeniden üretmek, alakasız bir bloğun (örn. bir sabit iş bloğunun) sebepsiz yere kaymasına yol açabilir — kullanıcı güvenini kırar. Patch, hem daha ucuz (daha az token) hem daha öngörülebilir.

> [!answer] kullanıcının istediği blokları eklesin silsin veya güncellesin. kullanıcı genelleme olarak beğenmedim gibi bir ifade verirse hangisini beğenmediğini sorarız.
>

---

❓ **Q4** — **Konuşma geçmişi**: Her turda modele TÜM chat geçmişi mi gönderilir (kullanıcı "az önce dediğim gibi" tarzı referanslar kurabilir, ama maliyet konuşma uzadıkça artar), yoksa sadece güncel tablo durumu + son mesaj mı (stateless, ucuz ve öngörülebilir, ama bağlam hafızası yok)?

➡️ Stateless: sadece güncel tablo + son mesaj. Bu, senin zaten koyacağını söylediğin mesaj sınırıyla (Q6) doğal olarak örtüşüyor — konuşma zaten kısa tutulacaksa geçmiş biriktirmenin getirisi düşük, maliyet + karmaşıklık kazancı daha yüksek.

> [!answer] sadece ilk adımda chat kullanılacağı için 10-15 mesajj sürebilecek konuşmalarda hafıza tabiki de kaydedilsin. maaliyet açısından mecburen burada böyle bir adıma gitmek zorundayız.
>

---

❓ **Q5** — **Alaka eşiği mekanizması**: "Bu mesaj gerçekten tabloyla ilgili mi?" kontrolü ayrı, ucuz bir ön-çağrı olarak mı yapılır (mesaj başına 2 AI çağrısı: önce alaka kontrolü, sonra asıl güncelleme), yoksa asıl güncelleme çağrısının şemasına bir `is_relevant`/`rejection_reason` alanı eklenip tek çağrıda mı halledilir?

➡️ Tek çağrı, şemaya alan ekleyerek. Ayrı bir ön-kontrol çağrısı, mesaj başına maliyeti ve gecikmeyi neredeyse ikiye katlar — senin zaten "maliyeti koru" dediğin bir özellikte bu ters bir seçim olur. Tek `generateObject` çağrısı, şema içinde önce `is_relevant: boolean` + `rejection_reason?: string`, sonra (relevant ise) patch operasyonlarını döndürebilir.

> [!answer] burada maaliyeti korumak ve düşükte tutmak için tamamen senin seçimine bırakıyorum.
>

---

❓ **Q6** — **Kullanım sınırı**: Sınır ne üzerinden konulacak — oturum başına sabit bir mesaj sayısı mı (örn. 15 mesaj), yoksa süre/token bazlı bir bütçe mi? Sınıra ulaşılınca ne olur: chat input tamamen kilitlenir mi (sadece "Devam et" kalır), yoksa sadece uyarı gösterilip devam edilebilir mi?

➡️ Basit mesaj sayısı sınırı (örn. oturum başına 15 kullanıcı mesajı) — token/süre bazlı bütçe takibi gereksiz karmaşıklık, sabit sayı hem kullanıcı için öngörülebilir hem senin için maliyet tavanı net. Sınıra ulaşınca input kilitlenir, sadece "Devam et" aktif kalır (yumuşak uyarı değil, sert sınır — maliyet garantisi için).

> [!answer] bu konuda aslında kararsızım önceki mesajlarda da 10-15 mesaj arası dedim fakat senin önerdiğin tokena göre sınır mantığı benim kafama çok daha fazla yattı. token ile sınırlandırabiliriz.
>

---

❓ **Q7** — **Reddedilen (alakasız) mesaj UX'i**: Eşiği geçemeyen bir mesaj gönderildiğinde chat'te bir ret cevabı görünür mü ("Bu isteğin iskeletle ilgisi yok" gibi), ve bu mesaj Q6'daki sayaçtan düşer mi, yoksa bedavaya mı sayılır (sayaçtan düşmez)?

➡️ Kısa bir ret mesajı gösterilir (kullanıcı neden hiçbir şey değişmediğini anlamalı) ama sayaçtan DÜŞMEZ — aksi halde kötü niyetli/yanlışlıkla yazılan alakasız mesajlar kullanıcının gerçek düzenleme hakkını yer, bu da özelliği kullanışsız hissettirir.
>
> Not: bu, kötüye kullanıma açık olabilir — biri bilerek sürekli alakasız mesaj atıp sınırsız ücretsiz çağrı yaptırabilir. Bu riski dengelemek için ayrıca bir toplam-deneme sınırı (relevant+irrelevant toplam, örn. 30) eklemeyi düşünebiliriz — istersen bunu Round 2'de ayrı soru olarak açarım.

> [!answer] 30 maaliyet açısından bizi sıkıntıya düşürebilir. ona da belli bir token sınırı koyalım. en son olarak da normal mesaj ve alakasız mesaj token sınırlarımız toplansın ve ortlama kullanıcı başı giderimiz oluşsun.
>

---

❓ **Q8** — **Responsive davranış**: %25/%75 yan yana layout, dar ekranda (telefon tarayıcısı) nasıl davranacak — chat tabloyla yer değiştirip üstte/altta mı yığılacak, yoksa bu özellik sadece geniş ekranda (masaüstü) mi aktif olacak ve dar ekranda chat'siz eski (form → direkt dashboard) akış mı çalışacak?

➡️ Dar ekranda chat'i tabloya göre altına yığmanı öneririm (masaüstünde yan yana, mobilde dikey stack) — BrainMap vizyonunda web zaten "geniş ekran istemcisi" olarak konumlanmış ama tamamen devre dışı bırakmak, aynı özelliğin iki farklı akışta var olmasını (bakım yükü) gerektirir. Basit bir responsive stack, tek akışı korur.

> [!answer] tasarım konusuna sistem çalıştıktan sonra karar vereceğim. sen mevcut olarak sadece masaüstünü varsayarak UI tasarım yerleştir. ilk önce çalışsın sonra şekillendiririz
>

---

## UI tasarımı (henüz konuşulmadı — burada ayrıca ele alınacak)

Chat sohbet kutusunun ve tablo görünümünün somut tasarımı (renk, tipografi, mesaj balonu stili, tablonun canlı güncellenirken nasıl bir animasyon/vurgu göstereceği — "Bevel Obsidian Dark" tasarım sistemine nasıl oturacağı) bu round'da soru olarak sorulmadı. Round 1'deki mimari kararlar netleşince, ayrı bir bölüm olarak buraya (veya istersen ayrı bir dosyaya) ekleyeceğim.


	!!!! KULLANICI NOTU !!


ai chat sınırı konusunda şöyle bir sıkıntı olabilir kullanıcı 14k tokene kadar düzenleyip son mesajda token sınırına yakalanıp istediğini yaptıramayabilir. bunun önğüne geçmek için kullanıcıya çok çaktıramadan belli başlı düzenlemelerden sonra bir şekilde sistem iskeleti otomatik onaylayıp kullanıcıyı diğer adımların içerisine sokmalı.
(bu adımın nasıl yapılacağğı hakkında tam olarak kesin ve net bir fikrim yok)

sence bu durumu nasıl profesyonelce bir şekilde ele alabiliriz? nasıl sıyrılabiliriz bu işten? senin bir önerin var mıdır?