# ⏳ Ertelenmiş Kararlar

> [!info] Bu dosya sadece bir işaretçi
> Asıl içerik BrainMap dışında, repo kökündeki `ai-context/03-deferred-decisions.md` dosyasında tutuluyor (o klasör herhangi bir AI aracı/insan projeye baktığında görsün diye tasarlandı, bkz. `CLAUDE.md`). Burası sadece Obsidian'dan da bulunabilsin ve ilgili grilling dosyalarına graph üzerinden bağlı dursun diye eklenmiş kısa bir özet — güncel/detaylı hali her zaman `ai-context/03-deferred-decisions.md`'de.

"Şimdilik A yapıyoruz ama ileride kesin/muhtemelen B'ye geçeceğiz" şeklinde bilinçli olarak ertelenmiş kararların listesi. Aşağıda hangi grilling dosyasından çıktığına göre gruplandı.

## Kaynak grilling'ler

- [[11 - 🔥 Grilling - İskelet Chat Düzenleme]] → madde 1, 2
- [[13 - 🔥 Grilling - Takvim Entegrasyonu]] → madde 3-8

## Özet

### [[11 - 🔥 Grilling - İskelet Chat Düzenleme]]'den

1. **Küresel maliyet anahtarı**: şimdi `app_config.ai_chat_enabled` manuel admin toggle'ı; ileride **kesin** otomatik eşik-bazlı kapanmaya geçilecek. `ai_chat_usage` tablosu bunun temeli olarak baştan kuruldu.
2. **Chat ile düzenleme kapsamı**: şimdi sadece onboarding'deki ilk iskelet oluşturma; ileride `/template` sayfasına (mevcut haftalık şablon) da genişletilecek.

### [[13 - 🔥 Grilling - Takvim Entegrasyonu]]'ndan

3. **Push (takvime yazma) özelliği**: şimdi sadece pull (Google → bizim sistem); ileride **kesin** push eklenecek — amacı native iOS'a kadar mobil kullanıcılara takvim hatırlatmaları üzerinden bildirim ulaştırmak.
4. **Outlook desteği**: şimdi sadece Google Calendar; ileride Outlook (Microsoft Graph) ikinci sağlayıcı olarak eklenecek.
5. **Apple Calendar**: şimdilik es geçildi (modern API yok, sadece CalDAV + app-specific password, webhook yok) — kullanıcı özellikle "unutulmasın" dedi.
6. **Gerçek-zamanlı webhook senkron**: şimdi periyodik yoklama (polling, 15-30 dk); ileride Google'ın push/webhook mekanizmasına geçilecek.
7. **AI ile enerji tahmini**: şimdi çekilen görevlere sabit `energy_cost=3` atanıyor; MVP/genel kullanıma açılmadan hemen önce AI ile başlık-bazlı tahmine geçilecek.
8. **Çoklu hesap desteği**: şimdi tek Google hesabı; ileride çoklu hesap desteklenecek (en fazla 2 hesapla sınırlı).

### Grilling dışı (oturum-içi analiz)

3. **Prompt caching**: kod var ama etkisiz; iki olası düzeltme yolu (kompakt blok temsili / bütçe yükseltme) ölçülebilir ihtiyaç çıkarsa değerlendirilecek.

Tam gerekçe, kaynak alıntı (satır referanslı) ve durum bilgisi için → `ai-context/03-deferred-decisions.md`.

## Yeni bir grilling bittiğinde

Yeni bir grilling dosyasından ("13 - 🔥 Grilling - ...md" gibi) ertelenmiş bir karar çıkarsa:
1. O grilling dosyasının içine, en alta bu dosyaya (`[[12 - ⏳ Ertelenmiş Kararlar]]`) bir link ekle.
2. Bu dosyadaki "Kaynak grilling'ler" listesine yeni dosyayı satır olarak ekle, "Özet" altına yeni bir alt başlık aç.
3. `ai-context/03-deferred-decisions.md`'de karşılık gelen `## Kaynak: [[NN - ...]]` bölümünü aç/güncelle.

---

#projectx #brainmap #deferred
