# 🚦 Şu An Neredeyiz (Web Dönemi)

> [!note] Bu dosya hakkında
> Bu not, 2026-08-13 tarihli bir Claude Code oturumunda otomatik oluşturuldu — senin elle yazdığın 00-09 notlarından farklı olarak istediğin gibi düzenleyebilir ya da silebilirsin. Amacı: mobil/bildirim işi ertelendikten sonra "şu an ne durumdayız, sırada ne var" sorusuna tek bakışta cevap vermek. Detaylı mimari için [[03 - 🗄️ Veritabanı]] ve [[04 - 🔄 Kullanıcı Akışları]]'na bak.

---

## 1️⃣ Neden sadece web?

Mobil (iOS) uygulama, bildirim-merkezli vizyonun çekirdeğiydi ama iOS geliştirmek için **Mac + Xcode** ve **Apple Developer Program üyeliği** (yıllık ~$99) şart. Şu an elimizde sadece bir Windows PC ve bir iPhone var (geliştirme ortamı olarak değil, test cihazı olarak). Bu yüzden:

```mermaid
%%{init: {"theme":"neutral", "themeVariables": {"fontSize":"12px"}, "flowchart": {"nodeSpacing": 15, "rankSpacing": 25}}}%%
flowchart TD
    Start([Şimdi]) --> Fix["Hata düzeltmeleri ✅"]
    Fix --> S1["Adım 1<br/>Cilalama"]
    S1 --> S2["Adım 2<br/>Analiz"]
    S2 --> S3["Adım 3<br/>Verimli Alan"]
    S3 -.-> Mobile[["📱 Mobil<br/>(Mac gerekiyor)"]]

    style Mobile stroke-dasharray: 5 5,fill:#00000000
```

Mobil tamamen iptal olmadı, sadece rafa kalktı — Mac/hesap edinilince buraya geri dönülecek.

---

## 2️⃣ Mevcut akış (bugünkü hata düzeltmelerinden sonra)

```mermaid
%%{init: {"theme":"neutral", "themeVariables": {"fontSize":"12px"}, "flowchart": {"nodeSpacing": 15, "rankSpacing": 20}}}%%
flowchart TD
    A(["Dashboard açılır"]) --> B{"İlk kez mi?"}
    B -- Evet --> C["Şablondan görevler oluşur"]
    B -- Hayır --> D["Görevler gösterilir"]
    C --> D
    D --> E["Yaptım / Erteledim / Olmadı"]
    E -- Erteledim --> F["Yarının boş yerine taşınır"]
    F --> G["Yarının şablonu da doğru oluşur ✅"]
    E -- "Yaptım / Olmadı" --> H["Durum kaydedilir"]
    G --> I["Gün sonu AI özeti"]
    H --> I
```

> [!info] Bugün düzeltilen hata
> Daha önce bir görevi ertelemek, taşındığı günün TÜM normal programını sessizce siliyordu (o günün şablonu hiç oluşmuyordu). Artık düzeltildi ve gerçek veriyle test edildi.

---

## 3️⃣ Hedef akış (3 adım tamamlandıktan sonra)

```mermaid
%%{init: {"theme":"neutral", "themeVariables": {"fontSize":"12px"}, "flowchart": {"nodeSpacing": 12, "rankSpacing": 20}}}%%
flowchart TD
    S1["🧹 Adım 1: Cilalama"] --> S2["📊 Adım 2: Analiz"] --> S3["🌱 Adım 3: Verimli Alan"]
    S1 -.-> S1a["taşınma bilgisi + geniş ekran"]
    S2 -.-> S2a["başarı örüntüsü"]
    S3 -.-> S3a["haftalık/aylık görsel"]
```

---

## 4️⃣ Sıradaki adım

**Adım 1 — Cilalama** onayını bekliyor. Onaylanınca: `TaskCard.tsx`'e taşınma bilgisi eklenir, `layout.tsx` geniş ekrana göre düzenlenir.
