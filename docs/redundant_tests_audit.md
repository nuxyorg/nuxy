# Nuxy Eklentileri (Extensions) Mükerrer Test Denetim Raporu

Bu doküman, Nuxy projesinin eklenti dizinlerindeki (`extensions/`) test kapsamını inceleyerek; gereksiz, mükerrer (redundant) ya da zaten çekirdek (`core`) entegrasyon testleri tarafından test edilen test senaryolarını tespit etmek ve test süresini/bakım maliyetini azaltacak önerileri sunmak amacıyla hazırlanmıştır.

---

## 📌 Genel Bulgular ve Temel Sorunlar

Eklenti testlerindeki mükerrerlik 3 ana başlık altında toplanmaktadır:

1. **Mükerrer E2E (Playwright) Testleri**:
   Birçok eklentinin kendi dizininde bir `e2e.spec.ts` dosyası bulunmaktadır ve bu testler tüm Electron uygulamasını ayağa kaldırarak UI/IPC etkileşimlerini test eder. Ancak bu testlerin büyük kısmı, çekirdek entegrasyon testleri (`src/e2e/extensions-integration.spec.ts`) veya genel kabuk testleri (`extensions/shell/e2e.spec.ts`) tarafından zaten uçtan uca kapsanmaktadır.
2. **Birim (Vitest) Testlerinde Mantık Çakışması**:
   Alt seviye algoritmalar/yardımcı fonksiyonlar kendi birim testlerinde (örneğin `safe-eval.test.ts`) detaylıca test edilmişken, IPC işleyici (handler) birim testlerinde (örneğin `backend.test.ts`) aynı matematik ve girdi varyasyonları birebir tekrar edilmektedir.
3. **Kopya Mock Kodları (Boilerplate Redundancy)**:
   Tüm eklenti backend testlerinde (14+ dosya) `createCore()` adında neredeyse aynı `CoreContext` mock yardımcı fonksiyonu bulunmaktadır. Tip tanımlamalarındaki bir değişiklik tüm bu testlerin tek tek güncellenmesini gerektirmekte ve ciddi bir bakım yükü oluşturmaktadır.

---

## 🔍 Detaylı Eklenti Analizi ve Redundant Test Listesi

### 1. Hesap Makinesi (`extensions/calculator`)

Bu eklenti, en yüksek mükerrerlik oranına sahip eklentilerden biridir.

| Dosya / Test Senaryosu                                                                                                                                                    | Redundant Durumu         | Gerekçe & Eşleşen Mevcut Test                                                                                                                                                                                                                                                                    |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`extensions/calculator/e2e.spec.ts`**<br>- `"2+2 shows '= 4'"`                                                                                                          | **Mükerrer**             | Çekirdek e2e testinde (`extensions/shell/e2e.spec.ts`) `"typing calculator query shows calculator result"` ve `"calculator provider shows result for math expression"` olarak test edilmektedir.                                                                                                 |
| **`extensions/calculator/e2e.spec.ts`**<br>- `"100/4+5*3 shows '= 40'"`<br>- `"(10+5)*2 shows '= 30'"`                                                                    | **Gereksiz E2E**         | Matematiksel öncelik kuralları zaten `safe-eval.test.ts` içinde birim testi düzeyinde test edilmektedir. UI katmanında tarayıcı açarak farklı formülleri denemek gereksiz yük oluşturur.                                                                                                         |
| **`extensions/calculator/e2e.spec.ts`**<br>- `"non-math query..."`                                                                                                        | **Mükerrer**             | `src/e2e/extensions-integration.spec.ts` -> `"eval returns empty items for non-math"` altında test edilmektedir.                                                                                                                                                                                 |
| **`extensions/calculator/e2e.spec.ts`**<br>- `"clears result when input is cleared"`                                                                                      | **Mükerrer**             | `extensions/shell/e2e.spec.ts` -> `"escape clears active search"` testi bu davranışı genel olarak kapsamaktadır.                                                                                                                                                                                 |
| **`extensions/calculator/backend.test.ts`**<br>- `"valid arithmetic"` (Addition, Precedence, Decimals vb.)<br>- `"returns empty items..."` (XSS, alert, process.exit vb.) | **Gereksiz Birim Testi** | `extensions/calculator/safe-eval.test.ts` dosyası, `safeEvalMath` fonksiyonunun tüm kural, hata ve XSS/güvenlik açıklarını (138 satır test) doğrudan test eder. Backend testi yalnızca IPC çağrısının yapıldığını ve şemanın döndüğünü doğrulamalıdır; matematik kurallarını tekrar etmemelidir. |

---

### 2. Zaman Hesaplayıcı (`extensions/time-calculator`)

| Dosya / Test Senaryosu                                                                                                                        | Redundant Durumu     | Gerekçe & Eşleşen Mevcut Test                                                                                                                                                                                                                                                                                          |
| :-------------------------------------------------------------------------------------------------------------------------------------------- | :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`extensions/time-calculator/e2e.spec.ts`**<br>- `"typing '12pm london'..."`<br>- `"typing '9am tokyo'..."`<br>- `"24-hour format query..."` | **Mükerrer / Yavaş** | `src/e2e/extensions-integration.spec.ts` -> `"eval with time query returns result"` ve `"convert channel performs time conversion"` altında IPC düzeyinde test edilmektedir. UI açılış/yazım akışları ise `extensions/shell/e2e.spec.ts` -> `"opens time calculator via keyboard navigation"` içinde doğrulanmaktadır. |
| **`extensions/time-calculator/e2e.spec.ts`**<br>- `"non-time query..."`                                                                       | **Mükerrer**         | `src/e2e/extensions-integration.spec.ts` -> `"eval with non-time query returns empty or hint"` test edilmektedir.                                                                                                                                                                                                      |

---

### 3. Emoji Seçici (`extensions/emoji-picker`)

| Dosya / Test Senaryosu                                                                                           | Redundant Durumu | Gerekçe & Eşleşen Mevcut Test                                                                                                       |
| :--------------------------------------------------------------------------------------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **`extensions/emoji-picker/e2e.spec.ts`**<br>- `"opens and shows emoji grid"`<br>- `"shows category navigation"` | **Mükerrer**     | `extensions/shell/e2e.spec.ts` -> `"opens emoji picker via keyboard navigation"` test edilmektedir.                                 |
| **`extensions/emoji-picker/e2e.spec.ts`**<br>- `"search filters emojis"` ve varyasyonları                        | **Mükerrer**     | `extensions/shell/e2e.spec.ts` -> `"emoji picker accepts search input"` testi eklenti içi arama filtrelemeyi zaten test etmektedir. |
| **`extensions/emoji-picker/e2e.spec.ts`**<br>- `"closing emoji picker returns to shell"`                         | **Mükerrer**     | `extensions/shell/e2e.spec.ts` -> `"escape from inside a tool returns to the shell"` testiyle birebir aynıdır.                      |

---

### 4. Pano Yöneticisi (`extensions/clipboard`)

| Dosya / Test Senaryosu                                                                     | Redundant Durumu        | Gerekçe & Eşleşen Mevcut Test                                                                                                                                    |
| :----------------------------------------------------------------------------------------- | :---------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`extensions/clipboard/e2e.spec.ts`**<br>- `"opens clipboard tool via search"`            | **Mükerrer**            | `extensions/shell/e2e.spec.ts` -> `"Enter opens the selected tool"` genel akışıyla kapsanmaktadır.                                                               |
| **`extensions/clipboard/e2e.spec.ts`**<br>- `"pressing Backspace... returns to shell"`     | **Mükerrer**            | `extensions/shell/e2e.spec.ts` -> `"Backspace on empty input inside a tool exits the tool"` ile tamamen aynıdır.                                                 |
| **`extensions/clipboard/e2e.spec.ts`**<br>- `"searching inside clipboard filters content"` | **Yetersiz / Gereksiz** | Bu test sadece girdi kutusuna `"test"` yazıp bırakmaktadır. Arama filtreleme davranışını doğrulamadığı gibi girdi yazma testi zaten kabuk testlerinde mevcuttur. |

---

### 5. Ayarlar (`extensions/settings`)

| Dosya / Test Senaryosu                                                                                  | Redundant Durumu | Gerekçe & Eşleşen Mevcut Test                                                                                                                                                                                                                                        |
| :------------------------------------------------------------------------------------------------------ | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`extensions/settings/e2e.spec.ts`**<br>- `"getSettings channel..."`<br>- `"saveSettings persists..."` | **Mükerrer**     | Eklenti ayarlarının yüklenmesi, kaydedilmesi ve default anahtarların birleştirilmesi Vitest birim testlerinde (`extensions/settings/backend.test.ts`) kapsamlı bir şekilde kapsanmaktadır. Bu kanalları Playwright tarayıcısında çağırmak fazladan süre kaybettirir. |

---

## 🛠️ Çözüm ve Refaktör Önerileri

> [!IMPORTANT]
> Test paketlerinin sadeleştirilmesi ve mükerrerliğin önlenmesi, hem yerel geliştirme aşamasındaki test koşum süresini düşürecek hem de CI/CD hatlarındaki kaynak kullanımını optimize edecektir.

### 1. Eklenti E2E Dosyalarının Kaldırılması/Sadeleştirilmesi

Aşağıdaki tamamen mükerrer olan Playwright test dosyaları güvenle silinebilir veya yalnızca özel UI etkileşimlerini barındıracak şekilde sadeleştirilebilir:

- 🗑️ `extensions/calculator/e2e.spec.ts` (Silinebilir - Tüm senaryolar birim testlerinde ve kabuk entegrasyon testlerinde mevcuttur.)
- 🗑️ `extensions/time-calculator/e2e.spec.ts` (Silinebilir - IPC ve kabuk testleri yeterlidir.)
- 🗑️ `extensions/clipboard/e2e.spec.ts` (Silinebilir - Çekirdek entegrasyon testleri pano geçmişini doğrulamaktadır.)
- 🔧 `extensions/emoji-picker/e2e.spec.ts` (Sadece klavye ile ızgara sınır geçişini test eden `"keyboard navigation traverses grid sections correctly"` senaryosu tutulup diğerleri silinebilir.)

### 2. Birim Testlerin Sınırlandırılması

- `extensions/calculator/backend.test.ts` içindeki tüm detaylı matematik testleri temizlenerek sadece IPC kaydı ve temel API dönüş şeması doğrulanmalıdır.
- Karmaşık iş mantıkları (business logic) her zaman saf JS/TS fonksiyonlarına ayrılmalı (örn: `safeEvalMath`) ve bu fonksiyonlar izole olarak test edilmelidir.

### 3. Ortak Mock Kütüphanesi Oluşturulması

Her eklentinin `backend.test.ts` dosyasında bulunan kopya `createCore()` fonksiyonlarını engellemek adına:

- `packages/extension-sdk` paketi altında test yardımcıları barındıran bir modül oluşturulmalıdır:
  ```typescript
  // packages/extension-sdk/src/testing.ts veya src/testing/mock-core.ts
  export function createMockCore(overrides?: Partial<CoreContext>): CoreContext {
    return {
      registry: { registerTool: vi.fn(), ... },
      ipc: { handle: vi.fn() },
      storage: { read: vi.fn(), write: vi.fn() },
      // ... tüm varsayılan mock metotları
      ...overrides
    }
  }
  ```
- Eklenti testleri bu ortak mock'u içe aktararak kullanmalıdır. Böylece `CoreContext` genişletildiğinde testlerin kırılması engellenir.
