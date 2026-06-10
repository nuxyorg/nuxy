# Electron ve Renderer Analizi

`src/electron/`, `src/renderer/`, `src/preload.ts`, `packages/extension-host/` tarandı.

---

## Electron Main Process

### Bootstrap sırası race condition

`src/electron/main.ts` başlatma adımları:

1. Protokol kayıt
2. IPC handler kayıt
3. Window yarat
4. Extension tara ve spawn et

5. adım async — extension'lar spawn edilirken window zaten açık. Renderer ilk render'ında extension'lar henüz hazır olmayabilir. Shell bu durumu `tools.length === 0` ile handle ediyor ama race condition şeffaf değil.

**Düzeltme**: Extension spawn'ı tamamlanmadan önce window'u gösterme, veya "loading" state renderer'a sinyal olarak gönder.

### `ipc/register.ts` — 600+ satır monolitik IPC handler kaydı

Tüm `ipcMain.handle()` çağrıları tek dosyada. Konular: config, theme, icons, window, extensions, clipboard, media, storage. Her birinin kendi modülünde olması gerekir.

Sorunlar:

- `ext:invoke` handler içinde switch-case ile built-in channel routing — yeni built-in eklemek tek dosyayı şişiriyor
- Handler'lar arasında paylaşılan state: `copiedItem`, `toasterQueue` gibi değerler closure'da tutuluyor, test edilemiyor
- Bazı handler'lar `async` ama `await` etmiyor — unhandled rejection

### `extensions/scanner.ts` — 612 satır, fazla sorumluluk

Scanner şunları yapıyor:

1. `~/.nuxy/extensions/` dizinini tara
2. `manifest.json` parse et ve validate et
3. Worker thread spawn et
4. Theme JSON oku ve register et
5. Icon pack JSON oku ve register et
6. Dev mode'da kaynak kopyala

Bunlar ayrı modüller olmalı: `ManifestLoader`, `WorkerManager`, `ThemeRegistrar`, `IconRegistrar`, `DevSync`.

**Manifest validation yok**: `manifest.json` eksik field'larla kabul ediliyor. `id` field'ı yoksa `undefined` ile devam ediyor.

**Extension yükleme hatası sessiz**:

```ts
try {
  const manifest = JSON.parse(fs.readFileSync(...))
  spawnWorker(manifest)
} catch (e) {
  console.error('Failed to load extension', e)
  // extension registry'e kaydedilmiyor
}
```

Shell extension'ı yüklü sanıyor, `core.registry.registerTool` çağrılmıyor, tool listesi eksik.

### Preload başarısız olursa da `ready` sinyali

`src/preload.ts`:

```ts
try {
  contextBridge.exposeInMainWorld('core', { ... })
} catch (e) {
  console.error(e)
}
window.dispatchEvent(new Event('nuxy:ready'))  // hata olsa bile
```

`nuxy:ready` event'i renderer'ın `window.core` hazır olduğunu anladığı sinyal. Hata olursa `window.core` undefined, event yine de dispatch ediliyor. Shell crash ediyor.

### Unix socket hata yönetimi

`/tmp/nuxy.sock` EADDRINUSE hatası durumunda eski socket temizlenip tekrar deneniyor ama temizleme başarısız olursa process askıda kalıyor.

---

## Renderer Bootstrap

### `src/renderer/bootstrap.ts` — initialization sırası kırılgan

```ts
window.addEventListener('nuxy:ready', async () => {
  await loadUiKit() // ui-default frontend.js yükle
  await applyTheme() // theme tokens al
  mountShellView() // nuxy-shell-view createElement
})
```

`loadUiKit()` başarısız olursa (network timeout, parse error) `applyTheme()` hâlâ çağrılıyor. Her adım önceki adıma bağımlı ama hata propagation yok.

**`window.UI` undefined kalırsa**: Button, Card gibi stub'lar `null` dönüyor ama bu hata sessizce geçiyor.

### Theme fetch hata durumunda

```ts
const theme = await window.core.themes.getThemeByName(name)
// theme null veya undefined olursa sonraki satır crash
Object.entries(theme.variables).forEach(...)
```

Null check yok.

### Custom element kayıt sırası bağımlılığı

`nuxy-shell-view` import edildiğinde bağımlı elementleri (`nuxy-shell`, `nuxy-shell-omni-bar`, vb.) import ediyor. Circular import riski ve kayıt sırası bağımlılığı var.

---

## Protokol Katmanı

### `nuxy-ext://` privileged protokol

`src/electron/protocol/register.ts`: Extension asset'leri bu protokol üzerinden servis ediliyor. CORS ve CSP ayarları var.

**Sorun**: Protocol handler `nuxy-ext://<ext-id>/path` formatında URL parse ediyor ama `ext-id` validation yok. Herhangi bir string path olarak kabul ediliyor — directory traversal riski:

```
nuxy-ext://../../etc/passwd
```

Path sanitization eklenmeli.

---

## Window Management

### Spring-physics animasyon thread-safe değil

`window/spring.ts` `WindowSpringController`, ana thread'de `setInterval` ile çalışıyor. Electron main thread bloklandığında animasyon takılıyor. Bu worker'a taşınabilir ama mevcut yapıda mümkün değil.

### `windowPosition` parsing tutarsız

`window/runtime.ts` config'den position parse ediyor:

- `"center"` → merkez
- `"50%"` → yüzde
- `"1/3"` → kesir
- `"200px"` → pixel
- `"x y"` → koordinat

5 farklı format için ayrı regex yok — string manipulation ile parse ediliyor. Edge case'ler test edilmemiyor.

---

## Extension Scanner / IPC Broker İletişimi

### Worker thread'lere timeout yok

`spawn/spawn.ts` Worker thread başlatıyor. Thread cevap vermezse:

- `host:call` için bekleyen promise asla resolve olmuyor
- Extension kaydı tamamlanmıyor
- Thread zombie olarak devam ediyor

30s timeout ile Worker terminate edilmeli, extension `failed` olarak işaretlenmeli.

### Worker error event handle edilmiyor

```ts
worker.on('error', (err) => console.error(err))
```

Hata loglanıyor ama extension `failed` state'e geçmiyor ve UI bilgilendirilmiyor.

---

## Özet

| Katman            | Kritik Sorun                                |
| ----------------- | ------------------------------------------- |
| `main.ts`         | Extension spawn race condition              |
| `ipc/register.ts` | Monolit, test edilemiyor                    |
| `scanner.ts`      | 612 satır, manifest validation yok          |
| `preload.ts`      | Hata olsa bile `nuxy:ready` dispatch ediyor |
| `bootstrap.ts`    | Zincir hata propagation yok                 |
| `protocol`        | Path traversal validation eksik             |
| `spawn.ts`        | Worker timeout yok, error event pasif       |
