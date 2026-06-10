# Nuxy Eklentileri: Detaylı Analiz

Nuxy projesinde yer alan tüm eklentiler (extensions), uygulamanın temel işlevlerini modüler parçalar halinde sunar. Aşağıda, sistemde yüklü olan ve tasarlanan tüm eklentilerin ne işe yaradığı, avantajları (artıları), sınırlılıkları (eksileri) ve geleceğe yönelik gelişim noktaları incelenmiştir.

---

## 1. Yönetim ve Arayüz Çekirdek Eklentileri

### 1.1. Nuxy Shell (`com.nuxy.shell`)

- **Ne İşe Yarar?**: Nuxy'nin ana arama ve komut barı (OmniBar) arayüzüdür. Kullanıcının klavye kısayoluyla tetiklediği spotlight penceresini yönetir, arama sonuçlarını listeler ve klavye odağını koordine eder.
- **Artıları**:
  - Hızlı, akıcı ve klavye dostu (keyboard-driven) etkileşim sunar.
  - Alt kısımda dinamik kısayol ipuçları (footer) göstererek kullanıcı deneyimini artırır.
  - Eklentilerden gelen sonuçları ortak bir tasarım şablonuyla gösterir.
- **Eksileri**:
  - Nuxy tamamen bu eklentiye bağımlıdır. Shell eklentisi çöker veya yüklenemezse kullanıcı tamamen boş bir ekranla karşılaşır.
- **Gelişim Noktaları**:
  - Sürecin çökme ihtimaline karşı yerleşik (hardcoded) bir kurtarma/fallback arayüzü eklenebilir.
  - Arama geçmişine dayalı akıllı sıralama (frecent - frequency + recency) algoritması entegre edilebilir.

### 1.2. Ayarlar (`com.nuxy.settings`)

- **Ne İşe Yarar?**: Nuxy sisteminin ve tüm aktif eklentilerin yapılandırıldığı kontrol panelidir.
- **Artıları**:
  - Klavye ile sekmeler arası geçiş ve iki panelli arayüz düzeni oldukça başarılıdır.
  - Global ayarların yanı sıra eklenti bazlı depolanan ayarları tek noktadan yönetir.
- **Eksileri**:
  - Her eklentinin ayar sayfası arayüzü ayrı ayrı kodlanmak zorundadır.
- **Gelişim Noktaları**:
  - Eklentilerin `manifest.json` dosyasında tanımlayacakları şemalardan otomatik (auto-generated) ayar sayfaları üretebilen bir mekanizma kurulabilir.
  - Yapılandırma ayarlarını dışa aktarma (export) ve içe aktarma (import) desteği eklenebilir.

---

## 2. Akıllı Yönlendirme ve AI Eklentileri

### 2.1. AI Orchestrator (`com.nuxy.ai-orchestrator`)

- **Ne İşe Yarar?**: Kullanıcının OmniBar'a girdiği doğal dil sorgularını analiz ederek yerel Ollama (`functiongemma` modeli) üzerinden uygun eklentilere (Hesap makinesi, takvim, zaman dönüştürücü vb.) yönlendirir (intent routing/tool calling).
- **Artıları**:
  - Kullanıcıyı belirli komut şablonlarını ezberlemekten kurtarır (Örn: "istanbul saat kaç" -> zaman dönüştürücü).
  - Eğer sorgu bir eklentiyle eşleşmezse otomatik olarak genel sohbet chatbotuna (`com.nuxy.ollama`) delege eder.
- **Eksileri**:
  - Local LLM sorguları CPU/GPU kaynaklarına bağlı olarak yüksek gecikme (latency) sürelerine yol açabilir.
  - Eklenti şemalarının bir kısmı (`BUILTIN_TOOL_SCHEMAS`) kod içinde statik olarak tanımlanmıştır.
- **Gelişim Noktaları**:
  - Eklenti şemaları eklentilerin kendisinden dinamik olarak çekilmelidir.
  - Çevrimdışı ve anlık çalışan Regex/kural tabanlı hızlı bir ön-sınıflandırıcı (pre-classifier) eklenerek basit sorgularda yapay zekaya gitmeden sıfır gecikme sağlanabilir.

### 2.2. Ollama (`com.nuxy.ollama`)

- **Ne İşe Yarar?**: `localhost:11434` üzerinde çalışan Ollama servisine bağlanarak yerel yapay zeka sohbet (chatbot) arayüzü sunar.
- **Artıları**:
  - Tamamen yerel ve gizlilik dostudur, internet bağlantısı gerektirmez.
  - Yerel sistemde yüklü modelleri dinamik olarak listeleyebilir ve ayarlar üzerinden yapılandırılabilir.
- **Eksileri**:
  - Gelen yanıtlar şu anda akış (stream) halinde değil, toplu olarak beklenip gösterilmektedir (bekleme hissi oluşturur).
- **Gelişim Noktaları**:
  - Yazıların ekranda anlık belirmesi için HTTP Stream API desteği ön yüze entegre edilmelidir.
  - Sistem promptu (persona) özelleştirme alanı eklenebilir.

---

## 3. Üretkenlik ve Araç Eklentileri

### 3.1. Notlar (`com.nuxy.notes`)

- **Ne İşe Yarar?**: Markdown biçiminde notlar oluşturmayı, aramayı ve yönetmeyi sağlar. Ayrıca OpenAI Whisper API'si üzerinden ses kaydını metne dönüştürme (Voice Notes) yeteneğine sahiptir.
- **Artıları**:
  - SQLite FTS5 (Full-Text Search) kullanarak çok hızlı not içi arama yapar.
  - Sesli not özelliği eller serbest kullanım için büyük kolaylık sağlar.
- **Eksileri**:
  - Sesli transkripsiyon için harici OpenAI Whisper servisine bağımlıdır (API anahtarı gerektirir ve ses verisini dışarı gönderir).
- **Gelişim Noktaları**:
  - Gizlilik hassasiyeti için yerel transkripsiyon (örneğin WebAssembly tabanlı Whisper.cpp veya yerel bir Python/Node kütüphanesi) entegre edilebilir.
  - Notlara etiket (tag) ve kategori desteği getirilebilir.

### 3.3. Video İndirici (`com.nuxy.video-downloader`)

- **Ne İşe Yarar?**: `yt-dlp` komut satırı aracını kullanarak YouTube ve diğer desteklenen sitelerden video/ses indirmeyi sağlar.
- **Artıları**:
  - Format ve kalite seçimi (çözünürlük, codec vb.) sunar.
  - İndirme işlemlerini arka planda yürütür ve yüzde olarak ilerleme çubuğu gösterir.
- **Eksileri**:
  - Sistemde `yt-dlp` ve format birleştirme için `ffmpeg` kurulu olmasını zorunlu kılar.
- **Gelişim Noktaları**:
  - Sistemde bu bağımlılıkların eksik olması durumunda otomatik indirme veya kullanıcıyı yönlendirme asistanı eklenebilir.
  - Oynatma listesi (playlist) indirme desteği eklenebilir.

### 3.4. ANGRYsearch (`com.nuxy.angrysearch`)

- **Ne İşe Yarar?**: Tüm dosya sistemini (`/`) tarayarak SQLite FTS4 sanal tablosuna indeksler ve anlık dosya ismi/konumu araması sağlar.
- **Artıları**:
  - İndeks oluştuktan sonra anında (real-time) arama sonuçları üretir.
  - Düzenli ifadeler (regex) ile arama yapmayı destekler.
- **Eksileri**:
  - İndeksleme aşaması diski yoğun şekilde taradığı için kaynak tüketimi yüksektir.
  - Dosya sistemindeki anlık değişiklikleri (yeni dosya ekleme/silme) hemen yakalayamaz (6 saatte bir güncellenir).
- **Gelişim Noktaları**:
  - Sıfırdan tüm diski taramak yerine işletim sisteminin yerleşik indeksleyicileriyle (Linux tracker/locate, macOS Spotlight, Windows Search) entegre edilebilir veya `inotify` ile gerçek zamanlı klasör takibi yapılabilir.

### 3.5. Bitwarden (`com.nuxy.bitwarden`)

- **Ne İşe Yarar?**: Bitwarden CLI (`rbw` veya `bw`) aracılığıyla kullanıcının şifre kasasında hızlı arama yapmasını ve şifre/kullanıcı adı/TOTP kodlarını panoya kopyalamasını sağlar.
- **Artıları**:
  - Güvenlik için panoya kopyalanan hassas verileri 30 saniye sonra otomatik olarak temizler.
  - Sistem anahtarlığıyla entegre çalışan Rust tabanlı `rbw` istemcisini öncelikli kullanarak performansı artırır.
- **Eksileri**:
  - Kasayı açmak (unlock) için terminal veya CLI bağımlılıklarının kurulu ve yetkilendirilmiş olmasını gerektirir.
- **Gelişim Noktaları**:
  - Kilit açma şifresini Nuxy arayüzü içinden güvenli şekilde alıp kasayı açabilen yerleşik bir giriş ekranı tasarlanabilir.

### 3.6. Pano Yöneticisi (`com.nuxy.clipboard`)

- **Ne İşe Yarar?**: Kullanıcının kopyaladığı metinlerin geçmişini tutar ve arama yaparak geçmiş ögeleri tekrar yapıştırmaya imkan tanır.
- **Artıları**:
  - Kopyalanan verileri sqlite'ta saklar ve hızlıca erişilebilir kılar.
- **Eksileri**:
  - Şifre yöneticilerinden kopyalanan hassas şifreleri de indeksleme riski taşır.
- **Gelişim Noktaları**:
  - Bitwarden gibi bilinen şifre yöneticilerinden veya belirli uygulamalardan gelen kopyalama verilerini otomatik algılayıp geçmişe kaydetmeyen bir filtreleme mekanizması (privacy filter) kurulmalıdır.
  - Resim ve dosya kopyalama geçmişi desteği eklenebilir.

### 3.7. Emoji Seçici (`com.nuxy.emoji-picker`)

- **Ne İşe Yarar?**: Emojiler arasında arama yapmayı ve seçilen emojiyi doğrudan hedef uygulamaya yapıştırmayı sağlar.
- **Artıları**:
  - Hafif ve hızlıdır, klavye ile kolayca emoji seçilebilir.
- **Eksileri**:
  - Arama algoritması sadece İngilizce/anahtar kelime bazlıdır.
- **Gelişim Noktaları**:
  - Kullanıcının sık kullandığı emojileri en üstte gösteren "Sık Kullanılanlar" bölümü eklenebilir.

### 3.8. Hesap Makinesi (`com.nuxy.calculator`) & Zaman Dönüştürücü (`com.nuxy.time-calculator`)

- **Ne İşe Yarar?**: OmniBar'a yazılan matematiksel ifadeleri ve dünya saat dilimi dönüşümlerini anlık olarak çözen sağlayıcılardır (providers).
- **Artıları**:
  - Arayüz açmaya gerek kalmadan doğrudan OmniBar içinde sonuç gösterirler.
  - Güvenli matematik değerlendirme (safe math eval) filtresine sahiptirler.
- **Eksileri**:
  - İşlevleri oldukça sınırlıdır (sadece temel matematik ve saat dönüştürme).
- **Gelişim Noktaları**:
  - Hesap makinesine birim dönüştürme (fiziksel büyüklükler, döviz kurları) yetenekleri entegre edilebilir.
  - Tarih hesaplamaları (Örn: "Bugünden 45 gün sonrası hangi gün?") eklenebilir.

### 3.9. n8n (`com.nuxy.n8n`)

- **Ne İşe Yarar?**: Yerel veya uzak n8n otomasyon sunucusuna bağlanarak kayıtlı iş akışlarını (workflows) tetikler ve durumlarını izler.
- **Artıları**:
  - Masaüstünden tek tuşla karmaşık otomasyon zincirlerini tetikleme imkanı verir.
- **Eksileri**:
  - n8n API anahtarının güvenli bir şekilde saklanması gerekmektedir.
- **Gelişim Noktaları**:
  - Nuxy'nin geliştirmekte olduğu şifreli gizli depolama (`core.storage.writeSecret`) altyapısına geçirilerek güvenlik açıkları kapatılmalıdır.

### 3.10. Takvim ve Hatırlatıcı (`com.nuxy.calendar`)

- **Ne İşe Yarar?**: Etkinlik oluşturma, ajanda takibi ve arka planda çalışıp zamanı geldiğinde sistem bildirimi (notification) gönderen hatırlatıcı servisidir.
- **Artıları**:
  - İzole iş parçacığından Kernel üzerinden sistem bildirim servislerine erişim sağlar.
- **Eksileri**:
  - Google Calendar, Outlook veya CalDAV senkronizasyonu yoktur, tamamen yereldir.
- **Gelişim Noktaları**:
  - CalDAV standardı entegre edilerek Nextcloud, iCloud ve Google takvimleriyle çift yönlü senkronizasyon sağlanmalıdır.

---

## 4. Tema ve Stil Eklentileri

### 4.1. Glassmorphism (`com.nuxy.theme-glassmorphism`) & Ocean (`com.nuxy.theme-ocean`)

- **Ne İşe Yarar?**: Nuxy'nin CSS değişkenlerini değiştirerek arayüze modern şeffaf (cam efekti) veya okyanus temalı renk paletleri uygulayan tema eklentileridir.
- **Artıları**:
  - Arayüz koduna dokunmadan sadece CSS değişkenleri (design tokens) üzerinden uygulamanın havasını tamamen değiştirebilirler.
- **Eksileri**:
  - Temalardaki bazı kontrast hataları okunabilirliği azaltabilir.
- **Gelişim Noktaları**:
  - Kullanıcıların kendi CSS dosyalarını yükleyerek veya arayüzden renk seçerek kendi temalarını oluşturabileceği bir Tema Editörü entegre edilebilir.

### 4.2. Gradient (`com.nuxy.gradient`)

- **Ne İşe Yarar?**: Ön yüz için gradyan arka planlar ve renk geçişleri sağlayan bir yardımcı araçtır.

### 4.3. Default UIKit (`com.nuxy.ui-default`) & Icons (`com.nuxy.icons-default`)

- **Ne İşe Yarar?**: Eklentilerin ortak kullanması gereken Lit tabanlı custom element bileşen kütüphanesi ve varsayılan ikon paketidir.
- **Artıları**:
  - Eklenti geliştiricilerinin sıfırdan buton, input veya scrollbar tasarlamasını engeller, uygulamanın tutarlı görünmesini garanti eder.
- **Eksileri**:
  - UI Kit güncellendiğinde tüm eklentilerin bu yeni bileşen yapısına uyum sağlaması gerekir.
