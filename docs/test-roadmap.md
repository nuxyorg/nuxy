# Test Roadmap

Mevcut durum (2026-06-02): **47 dosya, 1461 test** — tümü yeşil.
Bu belge, spawn/ kapatıldıktan sonra kalan boşlukları öncelik sırasıyla listeler.

---

## P0 — Kritik (kör noktalar)

### 1. `bootstrap/preload.ts` unit testi
**Dosya:** `src/electron/bootstrap/preload.test.ts`

`contextBridge.exposeInMainWorld` çağrısını hiç doğrulamıyoruz; hatalı bir API değişikliği tüm renderer'ı sessizce kırar.

Mock stratejisi:
```ts
vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: vi.fn() },
  ipcRenderer: { invoke: vi.fn(), send: vi.fn(), on: vi.fn(), off: vi.fn() },
}))
```

Test edilecekler:
- `window.core` altında `ipc.invoke`, `window.*`, `icons.*`, `themes.*` alanlarının hepsinin expose edildiği
- `window.core.window.onShow` bir listener kaydeder ve cleanup fonksiyonu döner
- `ipc.invoke` → `ipcRenderer.invoke('ext:invoke', extId, channel, payload)` olarak çevrilir
- Preload startup: `getPreloads` çağrılır, dönen URL'ler `import()` ile yüklenir
- `window:preloads-loaded` her zaman (başarı veya hata sonrası) gönderilir
- `getPreloads` hata fırlatsa bile `window:preloads-loaded` gönderilir

---

### 2. E2E — Shell komut girişi ve output akışı
**Dosya:** `src/e2e/shell-interaction.spec.ts`

Uygulamanın temel kullanıcı akışı hiç e2e'de test edilmiyor.

Test edilecekler:
- Omnibar'a yazınca komut paleti açılır
- Extension seçilince tool wrapper görünür
- `Escape` tuşu tool'u kapatır / pencereyi gizler (escAction config'e göre)
- Omnibar input boşaltılınca palette'e geri dönülür
- Klavye navigasyonu: `ArrowDown/Up` seçimi değiştirir, `Enter` seçer
- `nuxy-shell-reset` event'i durumu sıfırlar

---

## P1 — Yüksek öncelik

### 3. E2E — Extension crash recovery
**Dosya:** `src/e2e/extension-resilience.spec.ts`

Worker crash sonrası kernel'ın ayakta kalması doğrulanmıyor.

```ts
// Electron main process'te worker'ı öldür
await electronApp.evaluate(({ ipcMain }, { extId }) => {
  const worker = (global as any).__activeWorkers?.get(extId)
  worker?.terminate()
}, { extId: 'com.nuxy.calculator' })
```

Test edilecekler:
- Bir extension worker crash etse de kernel yanıt vermeye devam eder
- Crash eden extension'a yapılan `ext:invoke` hata döner (app çökmez)
- Diğer extension'lar çalışmaya devam eder

---

### 4. E2E — Tema değiştirme akışı
**Dosya:** `src/e2e/theme-switching.spec.ts`

`theme-zoom.spec.ts` yalnızca zoom'u test ediyor; tam tema geçişi doğrulanmıyor.

Test edilecekler:
- `kernel:applyWindowSettings` ile tema değişince CSS custom property'ler güncellenir
- `listThemes` kernel channel'ı tema listesini döner
- `getThemeByName` belirli bir tema için doğru CSS variables döner
- Tema değişikliği kalıcı: `reloadConfig` sonrası hâlâ aktif

---

### 5. E2E — Permission reddi akışı
**Dosya:** `src/e2e/permission-denial.spec.ts`

Extension'ların izinsiz host channel'a erişimi hiç test edilmiyor.

Test edilecekler:
- `permissions` listesi olmayan extension clipboard okuyamaz
- Permission reddi `success: false`, `code: 'PERMISSION_DENIED'` döner
- Hata renderer'a iletilir (app çökmez)

---

### 6. Unit — `bootstrap/main.ts` (parsiyel)
**Dosya:** `src/electron/bootstrap/main.test.ts`

`main.ts` bütünüyle test edilemez (Electron lifecycle), ama çıkarılabilir mantıklar var.

Strateji: socket command dispatch logic'ini ayrı bir `socket-commands.ts`'e çıkar, onu test et.

```ts
// src/electron/bootstrap/socket-commands.ts
export function handleSocketCommand(cmd: string, win: BrowserWindow, isLoaded: () => boolean): void
```

Test edilecekler:
- `'toggle'` → görünürse gizler, gizliyse gösterir
- `'show'` → her zaman gösterir + `window:show` gönderir
- Preload'lar yüklü değilse komut yoksayılır
- Bilinmeyen komut sessizce görmezden gelinir

---

## P2 — Orta öncelik

### 7. Unit — `gradient.ts` pure fonksiyonlar
**Dosya:** `extensions/gradient/gradient.test.ts`

`gradient.ts` DOM/WebGL bağımlı ama bazı fonksiyonlar pure.

Test edilecekler:
```ts
// normalizeColor(0xFF0000) → [1, 0, 0]
// normalizeColor(0x000000) → [0, 0, 0]
// normalizeColor(0xFFFFFF) → [1, 1, 1]
```

`Gradient` class'ının DOM gerektirmeyen metodları:
- `shouldSkipFrame(timestamp)` → çift frame'de true döner
- `updateFrequency(delta)` → freqX ve freqY'yi artırır
- `toggleColor(index)` → 0 ↔ 1 toggle yapar

---

### 8. Unit — Shared `createCore()` helper
**Dosya:** `extensions/test-utils/create-core.ts`

14+ extension test dosyasında neredeyse aynı `createCore()` mock var. Tek bir shared utility'e çıkarılırsa:
- Yeni bir `CoreContext` alanı eklenince tek yerde güncellenir
- Test boilerplate %30 azalır

```ts
// extensions/test-utils/create-core.ts
export function createCore(overrides?: Partial<CoreContext>): CoreContext
```

---

### 9. E2E — Multi-extension cross-call
**Dosya:** `src/e2e/cross-extension.spec.ts`

Şu an sadece angrysearch + orchestrator test edilmiş. Gerçek cross-call senaryoları yok.

Test edilecekler:
- Extension A → `core.extensions.invoke(B, channel, payload)` → B yanıt verir
- Caller capability'si olmayan extension cross-call yapamaz
- Callable olmayan extension'a cross-call hata döner

---

## P3 — Düşük öncelik / Kabul edilebilir boşluk

### 10. Frontend-only helper extension'ları
`cursor-trail`, `particles`, `shortcut-overlay` — backend kodu yok, test edilecek logic yok.
Manifest şema doğrulaması zaten `scanner.test.ts` tarafından dolaylı kapsanıyor.
**Aksiyon gerekmez.**

### 11. Declarative extension'lar
`icons-default`, `theme-glassmorphism`, `theme-ocean`, `ui-default` — saf JSON/TSX veri.
**Aksiyon gerekmez.**

### 12. E2E — Performance / stress
Birden fazla extension yüklenirken performans regresyonu.
Mevcut CI bant genişliğiyle orantısız.
**Şimdilik ertelendi.**

---

## İş sırası

| # | Dosya | Tür | Tahmini test sayısı | Etki |
|---|---|---|---|---|
| 1 | `bootstrap/preload.test.ts` | unit | ~8 | Yüksek — API sözleşmesi |
| 2 | `e2e/shell-interaction.spec.ts` | e2e | ~10 | Yüksek — temel kullanıcı akışı |
| 3 | `e2e/extension-resilience.spec.ts` | e2e | ~5 | Yüksek — hata toleransı |
| 4 | `e2e/theme-switching.spec.ts` | e2e | ~6 | Orta |
| 5 | `e2e/permission-denial.spec.ts` | e2e | ~4 | Orta — güvenlik sınırı |
| 6 | `bootstrap/socket-commands.ts` refactor + test | unit | ~6 | Orta |
| 7 | `gradient/gradient.test.ts` | unit | ~8 | Düşük |
| 8 | `extensions/test-utils/create-core.ts` | refactor | — | Bakım |
| 9 | `e2e/cross-extension.spec.ts` | e2e | ~6 | Düşük |

**Hedef:** 9 iş tamamlandığında ~53 test dosyası, ~1520 test.
