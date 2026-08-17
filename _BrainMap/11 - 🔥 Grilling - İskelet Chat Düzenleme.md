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

---

## Round 1 — Özet ve netleşen kararlar

Cevapların hepsini okudum. Netleşenler:

- **Kapsam**: sadece onboarding/iskelet oluşturma. `/template`'e chat eklemek ayrı, ileriki bir iş.
- **DB yazma**: tamamen draft — client tarafında tutulur, DB'ye hiç dokunulmaz, sadece "Devam et"te tek seferlik commit edilir (mevcut `complete_onboarding` RPC'si aynen kullanılabilir, tek fark: `p_blocks` artık formdan değil, chat'te düzenlenmiş draft'tan gelir).
- **Güncelleme**: patch tarzı (ekle/güncelle/sil operasyon listesi). "Beğenmedim" gibi genel/belirsiz bir mesajda AI netleştirici soru sorar, körlemesine tahmin/patch üretmez.
- **Konuşma geçmişi**: TAM geçmiş her turda modele gönderilir (stateless değil) — maliyet artışını kabul ediyorsun.
- **Alaka eşiği (Q5, sana bırakıldı)** → **KARARIM**: tek `generateObject` çağrısı, şemaya `is_relevant: boolean` + `rejection_reason?: string` eklenmiş hâliyle. Ayrı bir ön-kontrol çağrısı yapmıyoruz (maliyeti ~2 katına çıkarır, senin "maliyeti düşük tut" kısıtınla çelişir).
- **Kullanım sınırı**: token bazlı (mesaj sayısı değil).
- **Reddedilen mesajlar**: onlara da token sınırı konur; alakalı + alakasız mesajların tokenleri TEK bir ortak bütçede toplanır (ayrı sayaç yok).
- **Responsive**: şimdilik yok, sadece masaüstü varsayımıyla inşa edilecek.

Bir gerilim var, aşağıda not ettim: Q2'de "DB'ye ancak kullanıcı kesin kabul edince yazılır" dedin; kullanıcı notundaki "sistemin otomatik onaylayıp kullanıcıyı içeri sokması" önerisi bununla çelişebilir. Aşağıda buna nasıl çelişmeden çözüm bulunabileceğini anlatıyorum (Q10).

---

## Kullanıcı notuna yanıt — token sınırına "ortasında" yakalanma sorunu

Senin endişen haklı: sabit bir tavan koyarsak, kullanıcı tam işini bitirecekken ortada kalabilir ("son mesajda sınıra takılıp istediğini yaptıramama"). Ama "kullanıcıya çaktırmadan otomatik onaylayıp bir sonraki adıma sokmak" fikrini önermiyorum — sebebi:

1. **Q2'deki kendi kararınla çelişir.** Kullanıcı onayı olmadan DB'ye yazmak (draft'ı "otomatik kabul edilmiş" saymak), "kesin kabul edilmeden hiçbir şey commit edilmez" ilkesini bozar. Kullanıcı hiç sormadığı bir iskeletle karşılaşırsa (dashboard'da), bu güven kırar — özellikle "spor saatini akşama al dedim ama hâlâ sabah görünüyor" gibi bir senaryoda fark edilirse kötü bir sürpriz olur.
2. **"Çaktırmadan" yönlendirme, kullanıcıyı gerçek isteğinden saptırıp aceleye getirmek anlamına gelir** — bu bir güven/UX riski, "profesyonel" olanın tam tersi.

Bunun yerine iki basit mekanizmayla aynı sorunu, kullanıcıyı yanıltmadan çözebiliriz:

**(a) Kademeli, açık uyarı** — bütçenin örn. %70'inde ve %90'ında chat içinde nazik bir sistem mesajı belirir: *"Bu oturumda kullanabileceğin düzenleme hakkının bir kısmı kaldı, önemli değişiklikleri şimdi yapmanı öneririz."* Kullanıcı sınırın yaklaştığını görür, sürpriz olmaz.

**(b) Kesinti asla bir yanıtın ORTASINDA olmaz.** Bütçe kontrolü bir sonraki mesaj GÖNDERİLMEDEN ÖNCE yapılır, o an yeterli bütçe yoksa input o zaman kilitlenir — ama o ana kadarki SON işlenmiş mesaj/patch her zaman tam tamamlanmış olur. Yani kullanıcı "spor saatini akşama al" yazıp gönderdiyse, o istek bütçeyi aşsa bile o turun yanıtı/patch'i tam işlenir; kilitleme bir SONRAKİ mesaj için devreye girer. Senin tarif ettiğin "tam ihtiyacım olan son mesajda kesilme" senaryosunun büyük kısmı böylece zaten oluşmaz.

Kilide takılınca gösterilecek mesaj da pozitif çerçevelenir (kullanıcıyı suçlamayan/kısıtlanmış hissettirmeyen bir ton): *"İskeletin oldukça netleşti. Şimdilik bu haliyle devam edebilirsin — ince ayarları istediğin zaman tekrar yapabileceksin."* (ileride `/template` chat'i eklenince bu cümle gerçek de olur). "Devam et" butonu zaten ekranda duruyor, tek tıkla ilerlenebiliyor — yani kilit, kullanıcıyı çıkışsız bırakmıyor, sadece o oturumdaki chat'i kapatıyor.

Bunu Round 2'de Q10 olarak soruyorum, onayını bekliyorum.

---

## Round 2

❓ **Q9** — **Token bütçesi tavanı**: Tam geçmiş her turda gönderildiği için (Q4) maliyet konuşma uzadıkça katlanarak artıyor — 10. mesajda gönderilen istek, 1. mesajdakinden çok daha büyük olacak (geçmişin tamamı + sistem prompt + şema her seferinde tekrar gidiyor). Tek bir oturum için (relevant+irrelevant birleşik) toplam giriş+çıkış token bütçesi ne olsun?

➡️ **Güncellenmiş öneri (maliyet önceliğine göre)**: ~~40.000~~ → **oturum başına ~25.000 token** (giriş+çıkış toplam), kabaca 8-10 anlamlı turu karşılar. Haiku 4.5 fiyatlandırması $1/M giriş, $5/M çıkış — bu tavanla, caching olmadan bile oturum başı maliyet ~$0.04'e, prompt caching ile (aşağıya bak) ~$0.01-0.02'ye iner.
>
> **Ek karar (soru değil, doğrudan uygulanacak): Prompt caching açık olacak.** Anthropic'in `cache_control` mekanizmasıyla sistem prompt + o ana kadarki (değişmeyen) geçmiş önekini cache'leyeceğiz — her turda sadece yeni mesaj + şema gerçek fiyattan işlenir, geçmişin tekrar eden kısmı ~%90 daha ucuza gelir. Bu, kullanıcı deneyiminde (Q4'te kararlaştırdığın tam geçmiş hafızası) hiçbir taviz vermeden maliyeti düşürüyor — saf mühendislik optimizasyonu, UX'i etkilemiyor, o yüzden onayına gerek görmeden uygulama aşamasında ekleyeceğim.

> [!answer] karar verildi herhalde? verilmediyse ya da benden bir cevap bekliyorsan, lütfen bunu belirt.
>

**Kapandı.** Bu tamamen benim kararımdı (senin "maliyeti düşük tut" talimatına dayanarak), senden ek bir cevap beklemiyordum — sadece şeffaf olayım diye dosyaya yazdım. 25.000 token/oturum + prompt caching, uygulama aşamasında böyle gidecek.

---

❓ **Q10** — **Bütçe tükenince davranış**: Yukarıdaki (a)+(b) yaklaşımını (kademeli açık uyarı + kesinti asla bir yanıtın ortasında olmaz, hep bir sonraki mesaj için devreye girer + pozitif çerçeveli kilit mesajı) onaylıyor musun, yoksa farklı bir yön mü istersin (örn. otomatik-devam-et gibi)?

➡️ (a)+(b) öneriyorum — yukarıda gerekçelendirdim, Q2'deki "kesin onay olmadan DB'ye yazma yok" ilkesiyle çelişmeyen tek yol bu.

> [!answer] bütçe tükenirse. (en kötü ihtimalli harcanacak token maaliyetine göre.) örnek verecek olursam en kötü kullanıcı başı token maaliyeti (bu ai chat için bu arada) bakiyeden fazla ise, kullanıcının ekranına ai chat ile iskelet düzenleme çıkmayacak bile, kullanıcı oluşturulan temel iskeletten devam edecek, kendi düzenleyecek.
>
> bütçe tükenmesinden bahsettiğin şey sermaye bitiminden dolayı ai chat tokenı karşılayamama durumu ise evet dediklerim geçerli. ama başka bir şey ise lütfen belirt.
>
>

Bu, benim sorduğum şeyden (bir kullanıcının TEK oturumdaki 25K'lık kişisel bütçesi bitince ne olur) farklı bir konu — sen **platform genelinde toplam AI-chat maliyetinin senin karşılayabileceğin miktarı (sermaye) aşması** durumundan bahsediyorsun. İkisi de gerçek ve ayrı sorunlar, ikisini de dosyaya işliyorum: aşağıda **Q12** olarak açtım, çünkü bunun için ayrı bir mekanizma gerekiyor (kişisel token sayacından farklı — küresel bir açma/kapama anahtarı).

---

❓ **Q11** — **Netleştirici soru akışının teknik temsili**: Kullanıcı "beğenmedim" gibi belirsiz bir şey yazınca AI'ın netleştirici soru sorması (Q3'ün cevabı), şemada ayrı bir alan olarak mı temsil edilsin (`needs_clarification: boolean` + `clarification_question: string`, patch boş döner), yoksa bu da `is_relevant: true` + boş patch + düz asistan mesajı olarak mı ele alınsın? Bu tur da token bütçesinden düşsün mü (gerçek bir AI çağrısı yapıldığı için maliyeti var)?

➡️ Ayrı alan (`needs_clarification` + `clarification_question`) öneririm — hem UI'da "bu bir soru, bir onay değil" ayrımını netleştirir hem de ileride (örn. hangi bloğu kastettiğini tıklayarak seçme gibi) bir UI geliştirmek istersen zemin hazır olur. Ve evet, bütçeden düşmeli — gerçek bir çağrı, gerçek maliyet.

> [!answer] evet, A olur, senin önerdiğin tıklama ile seçme muhabbeti de kesinlikle olsun istiyorum bu arada bunu da notlar arasına kaydet.

**Kapandı.** `needs_clarification` + `clarification_question` alanları eklenecek, bu turlar da token bütçesinden düşecek. Ayrıca: netleştirici soru sorulduğunda, kullanıcı serbest metinle cevap yazmak yerine (isterse yine yazabilir ama) **hangi bloğu kastettiğini tıklayarak seçebileceği bir liste/buton grubu** gösterilecek — AI'ın `clarification_question` ile birlikte döndürdüğü aday blok id'lerinden UI otomatik üretilir. Bu, mimari nota da eklendi.

---

❓ **Q12** — **Küresel maliyet güvenlik anahtarı**: Tek kullanıcının oturum-içi 25K token bütçesinden (Q9) ayrı olarak, **platform genelinde** toplam AI-chat maliyeti senin karşılayabileceğin sermayeyi aşarsa, özelliğin tamamen kapanması gerekiyor (kullanıcı chat'i hiç görmez, direkt oluşturulan iskeletle devam eder — bu zaten mevcut/bugünkü akışın aynısı, sıfır ek risk). Bunu nasıl tetikleyelim: (a) basit bir manuel açma/kapama anahtarı (env var veya DB'de tek satır bir `ai_chat_enabled` bayrağı — sen ihtiyaç olduğunda elle kapatırsın), yoksa (b) otomatik/gerçek-zamanlı bir mekanizma (her çağrının maliyetini bir tabloya loglayıp, aylık toplam belirlediğin bir sınırı aşınca sistem kendini otomatik kapatır)?

➡️ Faz 1 için **(a) manuel anahtar** öneririm. Gerekçe: Anthropic'in gerçek zamanlı "bakiye" APIsi yok, (b)'yi düzgün yapmak (kullanım loglama tablosu + toplama job'ı + eşik mantığı) başlı başına bir mini-özellik, kullanıcı sayın küçükken gereksiz mühendislik. Manuel anahtar bugün beni durdurmaz, ihtiyaç olursa saniyeler içinde kapatılabilir; (b)'yi ileride kullanıcı sayısı gerçekten büyüyünce ayrı bir iş olarak ele alırız (o zaman zaten kullanım loglaması analiz için de faydalı olur).

> [!answer]
> maaliyeti toplama özelliği sakın bir köşeye atıp unutma ama, şimdilik a seçeneğini kullanacağız fakat ileride kesin olarak b'ye çevireceğiz.
>
>

**Kapandı.** Buna göre ayarladım: Faz 1'de anahtar manuel (a) olacak, AMA her `generateObject` çağrısının `usage` verisini (giriş/çıkış token) baştan itibaren hafif bir `ai_chat_usage` log tablosuna yazacağız (kullanıcı id, oturum, tokenler, tahmini maliyet, tarih). Böylece (b)'ye geçiş ileride sadece "bu tabloyu topla, eşiği aşınca bayrağı kapat" mantığını eklemek olacak — sıfırdan başlamayacağız, veri baştan birikmiş olacak. Bu, mimari nota da eklendi.

---

## Grilling tamamlandı — nihai karar özeti

Frontier boş, açık soru kalmadı. Uygulamaya geçmeden önce plan dosyasında referans alınacak nihai kararlar:

1. **Kapsam**: Sadece onboarding/iskelet oluşturma adımı. `/template` sonraki faz.
2. **Layout**: Masaüstü, sol %25 chat + sağ %75 tablo. Responsive tasarım şimdilik yok.
3. **State**: Tamamen client-side draft (`blocks[]` + `messages[]`), DB'ye hiç yazılmaz. Sadece "Devam et"te mevcut `complete_onboarding` RPC'sine gönderilir.
4. **Güncelleme**: Patch tarzı (ekle/güncelle/sil). Belirsiz geri bildirimde AI netleştirici soru sorar (`needs_clarification` + `clarification_question` + aday blok id'leri), UI bunları tıklanabilir seçeneklere çevirir.
5. **Konuşma geçmişi**: Tam geçmiş her turda gönderilir, prompt caching ile maliyeti düşürülür.
6. **Alaka eşiği**: Tek `generateObject` çağrısı, şemada `is_relevant` + `rejection_reason`.
7. **Bütçe**: Oturum başına ~25.000 token (giriş+çıkış, relevant+irrelevant+clarification hepsi dahil). Bütçe kontrolü her mesaj göndermeden önce yapılır (bir yanıtın ortasında asla kesilmez), %70/%90'da nazik uyarı, tükenince input kilitlenir + pozitif mesaj, "Devam et" hep aktif.
8. **Küresel anahtar**: `ai_chat_enabled` gibi manuel bir bayrak (env var veya DB). Baştan itibaren her çağrının kullanım/maliyet verisi `ai_chat_usage` tablosuna loglanır (ileride otomatik eşik-bazlı kapanmaya geçiş için temel).

---

## İlgili

Bu grilling'den çıkan, "şimdilik böyle ama ileride kesin değişecek" türü kararlar (madde 1 ve 8 yukarıda) → [[12 - ⏳ Ertelenmiş Kararlar]] içinde ayrıca listelendi. Uygulama sonrası mimari/DB durumu için → [[00 - 🧠 Ana Hub]], AI entegrasyonu genel bakış için → [[08 - 🤖 AI Entegrasyonu]].

---

## Mimari not (soru değil, bilgin olsun)

Draft state'in nerede tutulacağı bir tasarım kararı değil, doğrudan Q2+Q4'ün sonucu: iskelet dizisi (`blocks[]`) ve mesaj geçmişi (`messages[]`) tamamen **client-side React state** olarak tutulacak (parent component, örn. yeni bir `SkeletonChatEditor.tsx`). Her mesajda mevcut draft + tam geçmiş + yeni mesaj birlikte yeni bir API route'a (örn. `/api/onboarding/edit-skeleton`) gönderilir, dönen patch client'ta uygulanır. "Devam et"te bu son `blocks[]` hâli, mevcut `complete_onboarding` RPC'sine `p_blocks` olarak geçilir — DB tarafında yeni bir şey gerekmez.

Token bütçesi takibi, her `generateObject` çağrısının döndürdüğü `usage` (input+output token) alanları toplanarak client-side'da (veya route'ta bir session-scoped sayaç ile) yapılır — ayrı bir DB tablosu/kaydı gerekmez, oturum bitince (Devam et'e basılınca) sayaç zaten anlamsızlaşır.

**Netleştirici soru UI'ı (Q11 onaylandı)**: AI `needs_clarification: true` döndürdüğünde, şemadaki aday blok id'lerinden (`ambiguous_block_ids: string[]` gibi bir alan) chat içinde tıklanabilir bir buton/kart listesi otomatik üretilir — kullanıcı "spor bloğu" veya "çalışma bloğu" gibi bir seçeneğe tıklayınca o seçim yeni bir kullanıcı mesajı gibi gönderilir, AI artık hangi bloktan bahsedildiğini bilerek patch üretir. Serbest metinle cevap yazmak da hâlâ mümkün, buton sadece hızlı yol.

**Küresel maliyet loglama (Q12 kapandı)**: Yeni bir `ai_chat_usage` tablosu — her `generateObject` çağrısından sonra bir satır (`user_id`, `session_id` veya onboarding attempt referansı, `input_tokens`, `output_tokens`, `estimated_cost_usd`, `created_at`). Şimdilik sadece kayıt tutuluyor, otomatik bir eşik/kapanma mantığı yok — anahtar (`ai_chat_enabled`) manuel. İleride bu tablo üzerinden toplam harcama hesaplanıp otomatik kapanma eklenebilir.