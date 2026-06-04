# Open Issues

_Son güncelleme: 2026-06-01_

---

## Kritik / Bug

### 1. ~~`window-show` typo — renderer show event'i kaçırıyor~~ ✅ Çözüldü

**Dosya:** `src/electron/window/manager.ts:78`

`'window-show'` → `'window:show'` düzeltildi.

---

## Mimari

### 2. ~~Extension yüklenme hataları gizleniyor~~ ✅ Çözüldü

**Dosya:** `src/electron/spawn/spawn.ts`

`registry:error` alındığında `activeWorkers.delete(extId)` eklendi — bozuk extension artık 15 sn timeout'a düşmüyor, `invokeWorker` anında "Worker not found" döndürüyor.

### 3. ~~`CoreContext.registry` kayıtlar işlenmiyor~~ ✅ Çözüldü

**Dosya:** `packages/extension-host/src/core-proxy.ts`

`registerTool/registerProvider/registerOrchestrator` kayıtları artık `registeredEntries[]` dizisinde saklanıyor ve `registry:sync` payload'una ekleniyor. `ExtensionRuntimeMeta` tipi `RegistryEntry[]` alanı ile genişletildi.

---

## Performans

### 4. ~~Senkron `fs` çağrıları hot IPC path'inde~~ ✅ Çözüldü

**Dosya:** `src/electron/config/nuxyconfig.ts`

File watcher callback'i artık `reloadConfigAsync()` kullanıyor (`fs/promises` tabanlı). Startup path (tek seferlik) `readFileSync` ile kalmaya devam ediyor.

### 5. ~~Worker mesaj listener birikimi~~ ✅ Çözüldü

**Dosya:** `src/electron/spawn/spawn.ts`

Worker oluşturulurken `worker.setMaxListeners(100)` eklendi. `worker-invoke.ts`'deki `worker.off` call'u zaten mevcuttu.

---

## Dokümantasyon

### 6. ~~`docs/architecture.md` — var olmayan dosyaya referans~~ ✅ Çözüldü

`docs/14-rebuild-roadmap.md:21`'deki `electron/core/ipc.ts` referansı `src/electron/ipc/register.ts` olarak güncellendi.

### 7. `docs/restructure-plan.md` — checklist güncel değil

Phase 0'ın `dist-electron/` maddesi işaretlendi. Phase 1 (`src/` → `apps/desktop/`) hâlâ pending.

### 8. `docs/DOCUMENTATION.md` — 5 eski dosya yolu

Kontrol edildi — tüm yollar zaten güncel (`src/electron/ipc/broker.ts`, `src/electron/spawn/spawn.ts` vb.). Bu issue kapatıldı.

---

## Commit edilmemiş değişiklikler

71 dosya staged ama commit edilmemiş:

- Tüm extension'lara `locales/en.json` + `locales/tr.json` eklendi (i18n sistemi)
- `settings.json` şema dosyaları eklendi (angrysearch, bitwarden, calendar, clipboard, n8n, notes, ollama)
- `manifest.json` dosyaları `locales` alanıyla güncellendi
- `backend.ts` dosyaları i18n entegrasyonuyla güncellendi

---

## Related Documents

| Topic                            | Document                                     | Notes                                            |
| -------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| Pain points and remediation plan | [pain-points-plan.md](./pain-points-plan.md) | Phased fixes for architectural and security gaps |
| Feature implementation status    | [DOCUMENTATION.md](./DOCUMENTATION.md)       | Implemented vs planned feature tracker           |
