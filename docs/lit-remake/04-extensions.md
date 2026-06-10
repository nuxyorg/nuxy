# Bundled Extensions Analizi

`extensions/notes/`, `extensions/nyaa/`, `extensions/settings/`, `extensions/calculator/`, `extensions/gradient/` tarandı.

---

## notes extension

### Genel durum: temiz ama eksik

`nuxy-tool-notes.ts` doğru pattern'i izliyor: `NuxyToolElement` implement ediyor, `query`/`committedQuery`/`extensionId` setter'ları var, `connectedCallback`/`disconnectedCallback` düzgün. Backend `core.ipc.handle` ile channel açıyor.

### Silinmiş: `notes-dom.ts`

`notes-dom.ts` dosyası silindi (git status'ta `D extensions/notes/notes-dom.ts`). Bu, shell-dom.ts'e yapılan refactor'la paralel — DOM factory fonksiyonları custom element'lere taşındı. Doğru yön.

### EXT_ID hard-coded

```ts
const EXT_ID = 'nuxy-notes'
```

Tüm extension'larda bu pattern var. Manifest'ten veya `extensionId` setter'ından alınmalı. Hard-code değişince her yerde güncelleniyor.

### Backend'de dangling async yok

notes backend temiz — her async işlem `await` ile sarılıyor, unhandled rejection yok.

---

## nyaa extension

### Genel durum: temiz

Benzer pattern, `nyaa-dom.ts` silindi. Fetch-based search, `query` setter'ına tepki veriyor.

### `.catch(() => {})` — sessiz hata yutma

```ts
core.ipc.handle('search', async (query) => {
  return fetch(url)
    .then((r) => r.json())
    .catch(() => {})
})
```

Fetch başarısız olursa `undefined` dönüyor, shell bu durumu handle etmiyor. En azından `{ error: string }` dönmeli.

### AbortController yok

Kullanıcı yazarken her keystroke için yeni fetch başlatılıyor, eski istek iptal edilmiyor. Network isteği birikebilir. AbortController ile önceki istek iptal edilmeli.

---

## settings extension

### En karmaşık extension — 3 büyük sorun var

**1. Backend'de `async` olmayan `await`**

`backend.ts` içinde bazı handler'lar:

```ts
core.ipc.handle('getConfig', () => {
  return core.storage.get('config') // Promise — ama await yok
})
```

Return değeri Promise olduğu için shell bu değeri resolve etmeden kullanabilir.

**2. Settings state management senkron değil**

Ayar değiştiğinde frontend state güncelleniyor, backend'e yazılıyor, ama backend konfirmasyonu beklenmeden UI güncelleniyor. Hızlı değişimlerde race condition.

**3. `SelectBox` options attribute olarak JSON string alıyor**

```ts
selectBox.setAttribute('options', JSON.stringify(themeList))
```

Tip güvenliği yok, parse hatası sessiz geçiyor. Property setter olmalı.

### Test coverage eksik

`backend.test.ts` mevcut ama sadece happy path test ediliyor. Storage hatası, eksik config key, geçersiz değer senaryoları test edilmiyor.

---

## calculator extension

### Sadece frontend, backend yok

Calculator tamamen client-side. Yine de `manifest.json` içinde `entry.backend` tanımlı. Backend boş modül olarak yükleniyor. Gereksiz worker thread harcaması.

### `eval()` kullanımı

```ts
const result = eval(expression)
```

Matematiksel ifadeler için bile `eval` kabul edilemez — expression injection riski var. `math.js` veya güvenli bir parser kullanılmalı.

### Hata durumunda `NaN` veya `Infinity` gösteriliyor

`eval` hata fırlatırsa try-catch var ama `Infinity`, `NaN`, `undefined` durumları kontrol edilmiyor.

---

## gradient extension

### Tamamen senkron, basit

Gradient hesaplama client-side. Backend yok, hesaplama saf fonksiyon. Sorun yok.

### CSS output validasyonu yok

Kullanıcı geçersiz renk girerse output geçersiz CSS property değeri üretiyor. Validation yok.

### Renk picker aksesibilite yok

Native `<input type="color">` kullanılıyor — keyboard erişimi native sağlıyor, sorun yok. Ama label eksik.

---

## Tüm Extension'larda Ortak Sorunlar

### EXT_ID hard-coding

Her extension'da:

```ts
const EXT_ID = 'nuxy-notes' // notes
const EXT_ID = 'nuxy-nyaa' // nyaa
const EXT_ID = 'nuxy-settings' // settings
```

Bu değerler manifest.json'daki `id` field'ıyla eşleşmeli ama elle yönetiliyor. `extensionId` setter zaten geliyor — oradan kullanılmalı.

### `.catch(() => {})` — hata yutma

nyaa ve settings extension'larında yaygın. Her unhandled catch en azından `console.warn` ile log atmalı.

### Frontend'de `window.core` null check yok

```ts
window.core.ipc.invoke(EXT_ID, 'search', query)
```

`window.core` preload başarısız olursa `undefined`. Hiçbir extension bu durumu handle etmiyor.

### Test'ler sadece happy path

Extension test'leri `CoreContext` mock'larken sadece başarılı senaryoları test ediyor. Storage hatası, IPC timeout, geçersiz payload senaryoları test edilmiyor.

---

## Özet

| Extension  | Sorun Seviyesi | Ana Sorun                              |
| ---------- | -------------- | -------------------------------------- |
| notes      | Düşük          | EXT_ID hard-code                       |
| nyaa       | Orta           | Sessiz hata, AbortController yok       |
| settings   | Yüksek         | Async hatalar, race condition          |
| calculator | Yüksek         | `eval()` kullanımı, boş backend worker |
| gradient   | Düşük          | Validation yok, label eksik            |
