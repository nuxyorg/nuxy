# Eksik / Tamamlanmamış Öğeler

Audit tamamlandı, testler 657/657 geçiyor. Aşağıdakiler ya düzeltilmedi ya da kasıtlı olarak ertelendi.

---

## 🔴 Kritik (Kural ihlali, düzeltilmeli)

### 1. `calendar` manifest — `caller: false` yanlış

`extensions/calendar/manifest.json`:
```json
"capabilities": { "callable": true, "caller": false }
```

`extensions/calendar/backend.ts:48` şunu çağırıyor:
```ts
await core.extensions.invoke('kernel', 'notification:send', { ... })
```

Kural: "caller: true must be set in manifest when making cross-extension calls."  
**Düzeltme:** `"caller": true` yap.

---

### 2. `calculator` — `types.ts` yok

`extensions/calculator/` klasöründe `types.ts` yok. Backend `{ id, title, subtitle, value }` nesnesi döndürüyor — bu non-trivial veri. Kural: her extension'ın kendi veri modellerini tanımlayan `types.ts` dosyası olmalı.

**Düzeltme:** `extensions/calculator/types.ts` oluştur, `CalcResultItem` ve `EvalResult` interface'lerini ekle, backend'de kullan.

---

## 🟡 Önemli (Test kapsamı eksik)

### 3. `settings` backend — error path testi yok

`extensions/settings/backend.test.ts` 24 test içeriyor ama hiçbirinde storage failure (`mockRejectedValue`) senaryosu yok. `getSettings`, `saveSettings`, `getExtensionSettingValues`, `saveExtensionSettingValues` — hepsinin storage hata yolu test edilmeli.

### 4. `bitwarden` backend — error path testi çok ince

18 test var, yalnızca 2 tanesinde hata senaryosu (`throw new Error('not found')`, `throw new Error('locked')`). `bw:search` başarısız olduğunda, `bw:unlock` zaman aşımına uğradığında, `bw:sync` başarısız olduğunda ne olacağı test edilmiyor.

---

## 🔵 UIKit — Önerilen ama implement edilmeyen componentler

Agentlar şu ortak pattern'ları tespit etti ama `ui-default`'a eklenmedi. Birden fazla extension'da tekrar eden her biri:

| Component | Nerede tekrarlıyor | Açıklama |
|-----------|-------------------|----------|
| `SectionHeader` `action` prop slot | n8n (flex wrapper ile workaround yapıldı) | Sağ tarafa hizalanmış ikincil içerik alanı (ör. Refresh butonu) |
| `ChatMessage` / `ChatList` | ollama, ai-orchestrator | Kullanıcı/asistan mesajlarını gösteren sıralı konuşma listesi |
| `FormField` / `FieldList` | calendar (create form), settings | `formFieldIdx` + `activeSelect` + `SelectBox` pattern'ını kapsayan form satırı |
| `WizardSection` | bitwarden (4 kez) | İkon + başlık satırı (setup ekranları için) |
| `TabHeader` (horizontal) | bitwarden (OS sekmeleri) | `TabBar`'ın yatay `Button` satırı varyantı |
| `PropertiesPanel` | clipboard (sağ panel) | Etiket/değer grid'i, üstte bölüm başlığı |
| `ConversionCard` | time-calculator | Sol kaynak → ok → sağ hedef iki sütunlu karşılaştırma kartı |
| `Chip` / `HintChip` | time-calculator (örnek ifadeler) | Salt okunur pill-shaped metin etiketi |
| `DownloadListItem` | video-downloader | MediaPreview + progress + badge + "Aç / Klasörü Aç" ipuçları |
| `useTwoPanelNav` polyfill | video-downloader, settings | Her iki frontend aynı no-op fallback'i tanımlıyor |

### Mevcut ama kullanılmayan
`CodeBlock` component `ui-default`'ta mevcut (`extensions/ui-default/src/components/Code/`) ama bitwarden'ın `<pre>` + `<code>` + Kopyala butonu pattern'ı hâlâ inline olarak yazılmış. Bitwarden frontend'i `CodeBlock` kullanacak şekilde güncellenebilir.

---

## ⚪ Küçük / Düşük Öncelikli

### 5. `gradient` — e2e spec yok

`extensions/gradient/frontend.tsx` mevcut ama `e2e.spec.ts` yok. Gradient sadece görsel bir arka plan efekti olduğu için kullanıcı etkileşimi az — e2e test gerekli mi tartışmalı, ama kural "interactive frontends için e2e spec ekle" diyor.

### 6. Bitwarden `CodeBlock` kullanmıyor

Kurulum sihirbazında 4 adet `<pre><code>...</code><Button>Kopyala</Button></pre>` bloğu var. `window.UI.CodeBlock` zaten mevcut — bu bloklar `CodeBlock` component'ına taşınabilir.

---

## Öncelik sırası

1. `calendar` manifest `caller: true` → **şimdi düzelt** (runtime crash riski)
2. `calculator` `types.ts` → **şimdi düzelt** (kural ihlali)
3. `settings` error path testleri → **kısa vadede**
4. `bitwarden` error path testleri → **kısa vadede**
5. UIKit component'ları → **planlı sprint**
