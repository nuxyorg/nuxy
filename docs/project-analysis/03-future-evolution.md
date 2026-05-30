# Nuxy Projesinin Gelecekteki Evrimi ve Yol Haritası

Nuxy'nin "Modüler Çekirdek" mimarisi, onu klasik masaüstü uygulamalarından çok daha esnek bir platform haline getirmektedir. Projenin uzun vadede nereye evrilebileceği ve ekosistemin nasıl büyütülebileceği aşağıda 5 ana başlık altında analiz edilmiştir.

---

## 1. Nuxy Eklenti Mağazası (Marketplace) ve Dağıtım Modeli

Şu anda eklentiler yerel diskte `~/.nuxy/extensions/` dizinine manuel olarak yerleştirilerek yüklenmektedir. Projenin büyümesi için bu sürecin demokratikleştirilmesi gerekir:

- **Merkezi Olmayan Eklenti Deposu (Extension Store)**: Kullanıcıların Nuxy arayüzü içerisinden tek tıkla eklenti arayabileceği, yükleyebileceği ve güncelleyebileceği bir eklenti mağazası altyapısı kurulmalıdır.
- **Güvenli Eklenti İmzalama (Code Signing)**: Üçüncü taraf geliştiricilerin eklentileri Nuxy ekibi tarafından otomatik veya manuel denetimlerden geçirilerek imzalanmalıdır. İmzasız eklentiler yüklendiğinde kullanıcıya "Güvenli Olmayan Eklenti" uyarısı gösterilmelidir.
- **Sürüm Yönetimi ve Otomatik Güncelleme**: Eklenti manifestolarında yer alan sürüm bilgileri taranarak arka planda sessiz veya onaylı güncellemeler tetiklenebilmelidir.

---

## 2. Gelişmiş Güvenlik Sınırları ve Dinamik İzin Yönetimi

Şu anki `worker_threads` yapısı bellek izolasyonu sağlasa da süreçlerin yetkilerini kısıtlamada bazı açıklara sahiptir. Gelecekte güvenlik katmanı şu şekilde evrilebilir:

- **`isolated-vm` Entegrasyonu**: Node.js worker'ları yerine, V8 motorunun sihirli izole odalarını (`isolated-vm`) kullanarak backend kodları çalıştırılabilir. Bu sayede eklentinin Node.js runtime API'lerine (global nesneler, process nesnesi vb.) erişimi %100 kesilir ve tam bir kum havuzu (sandbox) oluşturulur.
- **Çalışma Zamanı İzin Onayları (Runtime Consent Dialogs)**: Android ve iOS işletim sistemlerinde olduğu gibi, bir eklenti hassas bir API'yi (örneğin panoyu okuma veya diskten dosya çalıştırma) ilk kez kullanmak istediğinde, kullanıcıya bir onay kutusu gösterilmelidir:
  > _"Bitwarden eklentisi panonuza veri yazmak istiyor. İzin veriyor musunuz? [Her zaman] [Yalnızca bu sefer] [Reddet]"_

---

## 3. Akıllı Kaynak Yönetimi ve Worker Uyutma (Hibernation)

Her eklentinin arka planda sürekli çalışan bir Worker Thread'e sahip olması, eklenti sayısı arttıkça RAM kullanımını ciddi ölçüde artıracaktır:

- **Lazy Loading ve Otomatik Uyutma (Hibernation)**: Sistem, belirli bir süre (örneğin 5 dakika) aktif olarak kullanılmayan veya OmniBar aramalarında çağrılmayan eklenti worker'larını otomatik olarak bellekten boşaltmalıdır (uyutmalıdır).
- **Anlık Uyanma (Nanosaniye Seviyesinde Tepki)**: Kullanıcı OmniBar'a o eklentiyle ilgili bir kelime yazmaya başladığında, Worker Thread milisaniyeler içinde arka planda ayağa kalkarak yanıt vermeye hazır hale gelmelidir. Bu yöntem sayesinde Nuxy, 50 aktif eklentiyle bile 100MB RAM sınırının altında kalabilir.

---

## 4. Yerel Küçük Dil Modelleri (SLM) ve Multi-Agent Orkestrasyonu

Yapay zeka orkestrasyonu şu an harici bir Ollama sunucusuna bağımlıdır. Nuxy'nin gelecekteki yapay zeka vizyonu şu şekilde şekillenebilir:

- **WebGPU Destekli Yerleşik SLM**: Nuxy, harici bir Ollama kurulumuna gerek kalmadan, doğrudan kendi Electron paketi içerisinde çok küçük ama optimize edilmiş dil modellerini (örn: Phi-3, Gemma-2B) WebGPU veya WebAssembly yardımıyla doğrudan ekran kartı üzerinde çalıştırabilir. Bu, yapay zekanın sıfır kurulumla çalışmasını sağlar.
- **Çoklu Ajan (Multi-Agent) Zincirleme İş Akışları**: Eklentiler arası güvenli IPC kanalları geliştirilerek, yapay zekanın karmaşık görevleri birden fazla eklentiyi sırayla tetikleyerek çözmesi sağlanabilir.
  - _Kullanıcı Sorgusu:_ "Yarınki takvimimi kontrol et, boşluk varsa Ahmet'e 'Toplantıyı onayladım' şeklinde e-posta at."
  - _AI Yönlendirmesi:_ Önce `calendar` eklentisini çağırır, boş zamanı öğrenir. Ardından elde edilen veriyi kullanarak `n8n` veya bir e-posta eklentisini tetikler.

---

## 5. Çapraz Platform Entegrasyonu ve Mobil Yardımcı Uygulama

Nuxy'nin sistem entegrasyonu derinleştirilerek masaüstü deneyimi zenginleştirilebilir:

- **Derin İşletim Sistemi Entegrasyonu**: Linux MPRIS (medya kontrolü), macOS MenuBar entegrasyonu ve Windows System Tray entegrasyonları standart hale getirilmelidir.
- **Nuxy Companion (Mobil Yardımcı Uygulama)**: Kullanıcının telefonu ile bilgisayarındaki Nuxy'yi eşleştiren bir mobil arayüz. Telefon kamerasını geçici web kamerası yapmak, telefondan sesli not alıp bilgisayardaki `com.nuxy.notes` eklentisine kaydetmek veya ortak pano (shared clipboard) paylaşımı sağlamak gibi yetenekler eklenebilir.
